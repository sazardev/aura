import { describe, expect, it } from 'vitest'

import { commonWords, frequencyOf, frequencyTierOf, wordDifficulty } from '@/engine/frequency'

describe('Word frequency', () => {
  it('recognizes corpus words', () => {
    const entry = frequencyOf('the')
    expect(entry).toBeDefined()
    expect(entry?.rank).toBeGreaterThan(0)
    expect(frequencyOf('zzqqxx')).toBeUndefined()
  })

  it('is case-insensitive', () => {
    expect(frequencyOf('The')?.count).toBe(frequencyOf('the')?.count)
  })

  it('classifies by frequency tier', () => {
    expect(frequencyTierOf('the')).toBe('very-common')
    expect(frequencyTierOf('zzqqxx')).toBeUndefined()
  })

  it('wordDifficulty mapea bandas a 1..5', () => {
    expect(wordDifficulty('the')).toBe(1)
    expect(wordDifficulty('zzqqxx')).toBe(3)
  })

  it('commonWords respects the limit', () => {
    const words = commonWords(100)
    expect(words.size).toBe(100)
    expect(words.has('the')).toBe(true)
  })
})
