import { useCallback, useEffect, useRef, useState } from 'react'

import {
  cancelSpeech,
  estimateWordDurations,
  type GuidedSpeechOptions,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  loadVoices,
  speakGuided as speakGuidedText,
  speak as speakText,
  type VoiceInfo,
  wordOffsetsOf,
} from '@/engine/speech'
import { invokeOptional, isTauriRuntime } from '@/lib/tauri'
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
 * Estimated total spoken duration (ms) of a text at a given rate — used to
 * drive onEnd/word highlights when we fall back to the OS speech engine
 * (which reports no boundary events).
 */
function estimatedDurationMs(text: string, rate: number): number {
  return estimateWordDurations(text, rate).reduce((total, duration) => total + duration, 0)
}

/**
Speech controller (TTS + recognition) wired to the settings. When "voice" is
turned off, every speak call becomes a silent no-op.
 
On Linux the Tauri webview (WebKitGTK) has no Web Speech API, so the app
falls back to the OS speech engine through a Tauri command (`speak_text`).
 */
export function useSpeech(): SpeechController {
  const rate = useAuraStore((state) => state.ttsRate)
  const pitch = useAuraStore((state) => state.ttsPitch)
  const voiceURI = useAuraStore((state) => state.ttsVoiceURI)
  const ttsEnabled = useAuraStore((state) => state.ttsEnabled)
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [guiding, setGuiding] = useState(false)
  const [fallbackAvailable, setFallbackAvailable] = useState(false)
  const fallbackTimers = useRef<number[]>([])
  const fallbackCancelled = useRef(false)

  useEffect(() => {
    void loadVoices().then(setVoices)
  }, [])

  useEffect(() => {
    if (!isTauriRuntime()) return
    void invokeOptional<boolean>('tts_available').then((available) => {
      if (available === true) setFallbackAvailable(true)
    })
  }, [])

  const supported = isSpeechSynthesisSupported() || fallbackAvailable

  const clearFallbackTimers = () => {
    for (const timer of fallbackTimers.current) clearTimeout(timer)
    fallbackTimers.current = []
  }

  const stopFallback = useCallback(() => {
    fallbackCancelled.current = true
    clearFallbackTimers()
    void invokeOptional('stop_speech')
  }, [])

  const stop = useCallback(() => {
    cancelSpeech()
    stopFallback()
    setSpeaking(false)
    setGuiding(false)
  }, [stopFallback])

  const scheduleFallback = (timer: number) => {
    fallbackTimers.current.push(timer)
  }

  const speak = useCallback(
    (text: string, onEnd?: () => void, rateOverride?: number) => {
      if (!ttsEnabled) {
        setSpeaking(false)
        onEnd?.()
        return
      }
      if (isSpeechSynthesisSupported()) {
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
        return
      }
      if (!fallbackAvailable) {
        onEnd?.()
        return
      }
      fallbackCancelled.current = false
      setSpeaking(true)
      setGuiding(false)
      void invokeOptional('speak_text', { text, rate: rateOverride ?? rate })
      scheduleFallback(
        window.setTimeout(
          () => {
            setSpeaking(false)
            onEnd?.()
          },
          estimatedDurationMs(text, rateOverride ?? rate),
        ),
      )
    },
    [fallbackAvailable, pitch, rate, ttsEnabled, voiceURI],
  )

  const speakGuided = useCallback(
    (text: string, options: GuidedSpeechOptions = {}) => {
      if (!ttsEnabled) {
        setGuiding(false)
        options.onEnd?.()
        return
      }
      if (isSpeechSynthesisSupported()) {
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
        return
      }
      if (!fallbackAvailable) {
        options.onEnd?.()
        return
      }
      fallbackCancelled.current = false
      setGuiding(true)
      setSpeaking(false)
      const durations = estimateWordDurations(text, rate)
      const offsets = wordOffsetsOf(text)
      let elapsed = 0
      for (let index = 0; index < offsets.length; index += 1) {
        const wordIndex = index
        const timer = window.setTimeout(() => {
          if (!fallbackCancelled.current) options.onWord?.(wordIndex)
        }, elapsed)
        scheduleFallback(timer)
        elapsed += durations[index] ?? 90
      }
      scheduleFallback(
        window.setTimeout(() => {
          setGuiding(false)
          options.onEnd?.()
        }, elapsed),
      )
      void invokeOptional('speak_text', { text, rate })
    },
    [fallbackAvailable, pitch, rate, ttsEnabled, voiceURI],
  )

  return {
    speak,
    stop,
    speakGuided,
    speaking,
    guiding,
    voices,
    supported,
    recognitionSupported: isSpeechRecognitionSupported(),
  }
}
