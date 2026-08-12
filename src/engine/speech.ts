export interface VoiceInfo {
  name: string
  lang: string
  localService: boolean
  default: boolean
}

export interface SpeakOptions {
  rate?: number
  pitch?: number
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

/**
 * Returns the preferred English voice (prefers local en-US).
 */
export function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  if (!isSpeechSynthesisSupported()) return undefined
  const voices = speechSynthesis.getVoices()
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'))
  return (
    english.find((voice) => voice.lang.toLowerCase() === 'en-us' && voice.localService) ??
    english.find((voice) => voice.lang.toLowerCase() === 'en-us') ??
    english[0]
  )
}

/**
 * Speaks a text with TTS.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSynthesisSupported()) {
    options.onEnd?.()
    return
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = options.rate ?? 0.9
  utterance.pitch = options.pitch ?? 1
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
