import { useCallback, useEffect, useState } from 'react'

import {
  cancelSpeech,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  loadVoices,
  speak as speakText,
  type VoiceInfo,
} from '@/engine/speech'
import { useAuraStore } from '@/state/store'

export interface SpeechController {
  speak: (text: string, onEnd?: () => void) => void
  stop: () => void
  speaking: boolean
  voices: VoiceInfo[]
  supported: boolean
  recognitionSupported: boolean
}

/**
Controlador de voz (TTS + reconocimiento) conectado a la configuración.
 */
export function useSpeech(): SpeechController {
  const rate = useAuraStore((state) => state.ttsRate)
  const voiceURI = useAuraStore((state) => state.ttsVoiceURI)
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    void loadVoices().then(setVoices)
  }, [])

  const stop = useCallback(() => {
    cancelSpeech()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!isSpeechSynthesisSupported()) {
        onEnd?.()
        return
      }
      setSpeaking(true)
      speakText(text, {
        rate,
        ...(voiceURI !== undefined && { voiceURI }),
        onEnd: () => {
          setSpeaking(false)
          onEnd?.()
        },
      })
    },
    [rate, voiceURI],
  )

  return {
    speak,
    stop,
    speaking,
    voices,
    supported: isSpeechSynthesisSupported(),
    recognitionSupported: isSpeechRecognitionSupported(),
  }
}
