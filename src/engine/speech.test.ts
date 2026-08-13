import { describe, expect, it } from 'vitest'

import { estimateWordDurations, wordOffsetsOf } from '@/engine/speech'

describe('Guided speech helpers', () => {
  it('finds every word offset in order', () => {
    const offsets = wordOffsetsOf("Alice's cat, sleeping on the mat!")
    expect(offsets.length).toBe(6)
    expect(offsets[0]).toBe(0)
    expect(offsets[5]).toBe(29)
  })

  it('estimates one duration per word, faster at higher rates', () => {
    const slow = estimateWordDurations('The quick brown fox jumps', 0.9)
    const fast = estimateWordDurations('The quick brown fox jumps', 1.5)
    expect(slow.length).toBe(5)
    expect(fast.length).toBe(5)
    for (const [index, duration] of slow.entries()) {
      expect(duration > (fast[index] ?? 0)).toBe(true)
    }
  })

  it('estimates positive durations for empty text', () => {
    expect(estimateWordDurations('')).toEqual([])
  })
})
