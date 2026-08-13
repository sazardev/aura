export interface VoiceInfo {
  name: string
  lang: string
  localService: boolean
  default: boolean
}

export interface SpeakOptions {
  rate?: number
  pitch?: number
  volume?: number
  voiceURI?: string
  onEnd?: () => void
}

export interface SpeechRecognizer {
  start(): void
  stop(): void
}

export interface RecognizerOptions {
  lang?: string
  interimResults?: boolean
  onResult: (transcript: string, isFinal: boolean, confidence: number) => void
  onEnd: () => void
  onError: (error: string) => void
}

/**
 * Returns true if the runtime supports speech recognition (not available in WebKitGTK).
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return window.SpeechRecognition !== undefined || window.webkitSpeechRecognition !== undefined
}

/**
 * Returns true if the runtime supports speech synthesis (TTS).
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in globalThis
}

function readVoices(): VoiceInfo[] {
  if (!isSpeechSynthesisSupported()) return []
  return speechSynthesis.getVoices().map((voice) => ({
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
    default: voice.default,
  }))
}

/**
 * Loads the available voices (getVoices can be asynchronous).
 */
export async function loadVoices(): Promise<VoiceInfo[]> {
  if (!isSpeechSynthesisSupported()) return []
  const voices = readVoices()
  if (voices.length > 0) return voices
  await new Promise<void>((resolve) => {
    speechSynthesis.addEventListener('voiceschanged', () => resolve(), { once: true })
    setTimeout(resolve, 1000)
  })
  return readVoices()
}

const NATURAL_VOICE_HINTS = [
  'natural',
  'neural',
  'enhanced',
  'premium',
  'samantha',
  'aria',
  'jenny',
  'sonia',
  'tessa',
  'emma',
  'olivia',
  'daniel',
  'karen',
  'moira',
  'libby',
  'amelie',
  'google uk english female',
  'google us english',
]

/**
 * Returns the best available English voice, preferring natural-sounding
 * (neural/premium) local voices for a realistic synthesizer.
 */
export function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  if (!isSpeechSynthesisSupported()) return undefined
  const voices = speechSynthesis.getVoices()
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'))
  if (english.length === 0) return undefined

  const rank = (voice: SpeechSynthesisVoice): number => {
    const name = voice.name.toLowerCase()
    const hints = NATURAL_VOICE_HINTS.reduce(
      (score, hint) => score + (name.includes(hint) ? 1 : 0),
      0,
    )
    const local = voice.localService ? 1 : 0
    const us = voice.lang.toLowerCase() === 'en-us' ? 2 : 0
    return hints * 4 + us * 2 + local
  }

  return english.toSorted((a, b) => rank(b) - rank(a))[0]
}

/**
 * Speaks a text with TTS.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  stopGuided()
  if (!isSpeechSynthesisSupported()) {
    options.onEnd?.()
    return
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = options.rate ?? 0.9
  utterance.pitch = options.pitch ?? 1
  utterance.volume = options.volume ?? 1
  const voice = pickEnglishVoice()
  if (
    voice !== undefined &&
    (options.voiceURI === undefined || options.voiceURI === voice.voiceURI)
  ) {
    utterance.voice = voice
  } else if (options.voiceURI !== undefined) {
    const selected = speechSynthesis
      .getVoices()
      .find((candidate) => candidate.voiceURI === options.voiceURI)
    if (selected !== undefined) utterance.voice = selected
  }
  utterance.addEventListener('end', () => options.onEnd?.())
  utterance.addEventListener('error', () => options.onEnd?.())
  speechSynthesis.cancel()
  speechSynthesis.speak(utterance)
}

/**
 * Stops any speech currently playing.
 */
export function cancelSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    speechSynthesis.cancel()
  }
}

interface RecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}

function getRecognitionConstructor(): (new () => SpeechRecognition) | undefined {
  if (typeof window === 'undefined') return undefined
  const recognitionWindow = window as unknown as RecognitionWindow
  return recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition
}

/**
 * Creates a speech recognizer. Returns `undefined` when not supported.
 */
export function createRecognizer(options: RecognizerOptions): SpeechRecognizer | undefined {
  const Constructor = getRecognitionConstructor()
  if (Constructor === undefined) return undefined

  const recognition = new Constructor()
  recognition.lang = options.lang ?? 'en-US'
  recognition.interimResults = options.interimResults ?? true
  recognition.continuous = false
  recognition.maxAlternatives = 3

  let finalTranscript = ''

  recognition.onresult = (event) => {
    let interim = ''
    let confidence = 0
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results.item(index)
      const alternative = result.item(0)
      confidence = Math.max(confidence, alternative.confidence)
      if (result.isFinal) {
        finalTranscript = `${finalTranscript} ${alternative.transcript}`.trim()
      } else {
        interim = `${interim} ${alternative.transcript}`.trim()
      }
    }
    const transcript = `${finalTranscript} ${interim}`.trim()
    options.onResult(transcript, transcript === finalTranscript && interim.length === 0, confidence)
  }

  recognition.addEventListener('error', (event: Event) => {
    const errorEvent = event as SpeechRecognitionErrorEvent
    options.onError(errorEvent.error)
  })

  recognition.addEventListener('end', () => {
    options.onEnd()
  })

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  }
}

/* ----------
Guided reading (read-along with word highlighting)
---------- */

export interface GuidedSpeechOptions extends SpeakOptions {
  onWord?: (wordIndex: number) => void
  onSentence?: (sentenceIndex: number) => void
}

export interface GuidedSpeechController {
  stop: () => void
}

interface GuidedSession {
  cancelled: boolean
  timers: number[]
}

let guidedSession: GuidedSession | undefined

/**
 * Cancels any active guided reading session (timers + speech).
 */
export function stopGuided(): void {
  if (guidedSession !== undefined) {
    guidedSession.cancelled = true
    for (const timer of guidedSession.timers) clearTimeout(timer)
    guidedSession.timers = []
  }
  cancelSpeech()
}

/**
 * Splits a text into sentences, keeping each sentence's absolute start offset.
 */
function guidedSentences(text: string): { text: string; start: number }[] {
  const sentences: { text: string; start: number }[] = []
  let cursor = 0
  for (const match of text.matchAll(/(?<=[.!?…])\s+/g)) {
    const end = match.index + match[0].length
    const piece = text.slice(cursor, match.index).trimEnd()
    if (piece.length > 0) sentences.push({ text: piece, start: cursor })
    cursor = end
  }
  const tail = text.slice(cursor).trimEnd()
  if (tail.length > 0) sentences.push({ text: tail, start: cursor })
  return sentences
}

/**
 * Absolute start offsets of every word in a text (aligned with the reader's
 * tokenizer, so highlight indices match the visible words).
 */
export function wordOffsetsOf(text: string): number[] {
  const offsets: number[] = Array.from(text.matchAll(/[A-Za-z0-9']+/g), (match) => match.index)
  return offsets
}

/**
 * Estimated spoken duration (ms) of each word — used to drive the word
 * highlight on platforms without speech "boundary" events.
 */
export function estimateWordDurations(text: string, rate = 1): number[] {
  const words = text.match(/[A-Za-z0-9']+/g) ?? []
  return Array.from(words, (word) => (countSyllables(word) * 90 + 70) / Math.max(0.25, rate))
}

function countSyllables(word: string): number {
  const lower = word.toLowerCase().replaceAll(/[^a-z0-9']/g, '')
  const stripped = lower.replaceAll(/[^aeiouy0-9]+$/g, '').replaceAll(/e$/g, '')
  const groups = stripped.match(/[aeiouy]+/g)
  return Math.max(1, groups?.length ?? 1)
}

/**
 * Speaks a text sentence by sentence (natural prosody) while reporting the
 * spoken word/sentence through callbacks — the engine behind guided reading.
 */
export function speakGuided(
  text: string,
  options: GuidedSpeechOptions = {},
): GuidedSpeechController {
  stopGuided()
  const session: GuidedSession = { cancelled: false, timers: [] }
  guidedSession = session

  if (!isSpeechSynthesisSupported()) {
    options.onEnd?.()
    return { stop: stopGuided }
  }

  const sentences = guidedSentences(text)
  const globalWords = wordOffsetsOf(text)
  const boundarySupported =
    'onboundary' in (SpeechSynthesisUtterance.prototype as { onboundary?: unknown })

  const wordIndexAtChar = (charIndex: number): number => {
    let low = 0
    let high = globalWords.length - 1
    let result = -1
    while (low <= high) {
      const mid = (low + high) >> 1
      const start = globalWords[mid]
      if (start === undefined) break
      if (start <= charIndex) {
        result = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }
    return result
  }

  const speakSentence = (sentenceIndex: number) => {
    if (session.cancelled) return
    const sentence = sentences[sentenceIndex]
    if (sentence === undefined) {
      if (options.onEnd !== undefined) options.onEnd()
      return
    }

    const utterance = new SpeechSynthesisUtterance(sentence.text)
    utterance.lang = 'en-US'
    utterance.rate = options.rate ?? 0.9
    utterance.pitch = options.pitch ?? 1
    utterance.volume = options.volume ?? 1
    const voice = pickEnglishVoice()
    if (
      voice !== undefined &&
      (options.voiceURI === undefined || options.voiceURI === voice.voiceURI)
    ) {
      utterance.voice = voice
    } else if (options.voiceURI !== undefined) {
      const selected = speechSynthesis
        .getVoices()
        .find((candidate) => candidate.voiceURI === options.voiceURI)
      if (selected !== undefined) utterance.voice = selected
    }

    const sentenceWords = wordOffsetsOf(sentence.text)
    const sentenceStart = sentence.start

    if (boundarySupported) {
      utterance.addEventListener('boundary', (event: SpeechSynthesisEvent) => {
        if (session.cancelled || event.name !== 'word') return
        const index = wordIndexAtChar(sentenceStart + event.charIndex)
        if (index >= 0) options.onWord?.(index)
      })
    } else {
      const durations = estimateWordDurations(sentence.text, utterance.rate)
      let elapsed = 0
      for (const [localIndex, localStart] of sentenceWords.entries()) {
        const index = wordIndexAtChar(sentenceStart + localStart)
        const timer = window.setTimeout(() => {
          if (!session.cancelled && index >= 0) options.onWord?.(index)
        }, elapsed)
        session.timers.push(timer)
        elapsed += durations[localIndex] ?? 90
      }
    }

    utterance.addEventListener('end', () => {
      if (session.cancelled) return
      options.onSentence?.(sentenceIndex)
      speakSentence(sentenceIndex + 1)
    })
    utterance.addEventListener('error', () => {
      if (!session.cancelled && options.onEnd !== undefined) options.onEnd()
    })

    speechSynthesis.speak(utterance)
  }

  speakSentence(0)
  return { stop: stopGuided }
}
