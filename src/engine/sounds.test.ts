import { describe, expect, it } from 'vitest'

import {
  isSoundEnabled,
  playSound,
  primeAudio,
  setSoundEnabled,
  type SoundKind,
} from '@/engine/sounds'

const KINDS: SoundKind[] = [
  'click',
  'correct',
  'wrong',
  'success',
  'achievement',
  'levelup',
  'heart',
  'page',
  'streak',
]

describe('Sound effects', () => {
  it('is enabled by default', () => {
    expect(isSoundEnabled()).toBe(true)
  })

  it('no-ops safely without Web Audio (jsdom)', () => {
    expect(() => {
      for (const kind of KINDS) playSound(kind)
      primeAudio()
    }).not.toThrow()
  })

  it('respects the enabled flag', () => {
    setSoundEnabled(false)
    expect(() => playSound('correct')).not.toThrow()
    setSoundEnabled(true)
    expect(isSoundEnabled()).toBe(true)
  })
})
