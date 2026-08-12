interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  readonly length: number
  readonly isFinal: boolean
  item(index: number): SpeechRecognitionAlternative
  readonly [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  readonly [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onaudioend: ((this: SpeechRecognition, event: Event) => void) | null
  onaudiostart: ((this: SpeechRecognition, event: Event) => void) | null
  onend: ((this: SpeechRecognition, event: Event) => void) | null
  onerror: ((this: SpeechRecognition, event: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((this: SpeechRecognition, event: SpeechRecognitionEvent) => void) | null
  onspeechend: ((this: SpeechRecognition, event: Event) => void) | null
  onstart: ((this: SpeechRecognition, event: Event) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}
