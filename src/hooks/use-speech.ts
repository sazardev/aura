import { useCallback, useEffect, useState } from 'react'

import {
  cancelSpeech,
  type GuidedSpeechOptions,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  loadVoices,
  speakGuided as speakGuidedText,
  speak as speakText,
  type VoiceInfo,
} from '@/engine/speech'
import { useAuraStore } from '@/state/store'

export interface SpeechController {
  speak: (text: string, onEnd?: () => void, rate?: number) => void
  stop: () => void
  speakGuided: (text: string, options?: GuidedSpeechOptions) => void
  speaking: boolean
  guiding: boolean
  voices: VoiceInfo[]
  supported: boolean
  recognitionSupported: boolean
}

/**
Speech controller (TTS + recognition) wired to the settings. When "voice" is
turned off, every speak call becomes a silent no-op.
 */
export function useSpeech(): SpeechController {
  const rate = useAuraStore((state) => state.ttsRate)
  const pitch = useAuraStore((state) => state.ttsPitch)
  const voiceURI = useAuraStore((state) => state.ttsVoiceURI)
  const ttsEnabled = useAuraStore((state) => state.ttsEnabled)
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [guiding, setGuiding] = useState(false)

  useEffect(() => {
    void loadVoices().then(setVoices)
  }, [])

  const stop = useCallback(() => {
    cancelSpeech()
    setSpeaking(false)
    setGuiding(false)
  }, [])

  const speak = useCallback(
    (text: string, onEnd?: () => void, rateOverride?: number) => {
      if (!ttsEnabled || !isSpeechSynthesisSupported()) {
        setSpeaking(false)
        onEnd?.()
        return
      }
      setSpeaking(true)
      setGuiding(false)
      speakText(text, {
        rate: rateOverride ?? rate,
        pitch,
        ...(voiceURI !== undefined && { voiceURI }),
        onEnd: () => {
          setSpeaking(false)
          onEnd?.()
        },
      })
    },
    [pitch, rate, ttsEnabled, voiceURI],
  )

  const speakGuided = useCallback(
    (text: string, options: GuidedSpeechOptions = {}) => {
      if (!ttsEnabled || !isSpeechSynthesisSupported()) {
        setGuiding(false)
        options.onEnd?.()
        return
      }
      setGuiding(true)
      setSpeaking(false)
      speakGuidedText(text, {
        rate,
        pitch,
        ...(voiceURI !== undefined && { voiceURI }),
        ...options,
        onEnd: () => {
          setGuiding(false)
          options.onEnd?.()
        },
      })
    },
    [pitch, rate, ttsEnabled, voiceURI],
  )

  return {
    speak,
    stop,
    speakGuided,
    speaking,
    guiding,
    voices,
    supported: isSpeechSynthesisSupported(),
    recognitionSupported: isSpeechRecognitionSupported(),
  }
}
