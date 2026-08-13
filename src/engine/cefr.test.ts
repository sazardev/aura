import { describe, expect, it } from 'vitest'

import { cefrFromRank, cefrLevelOf, estimateCefr } from '@/engine/cefr'

describe('CEFR levels', () => {
  it('maps frequency ranks to levels', () => {
    expect(cefrFromRank(10)).toBe('A1')
    expect(cefrFromRank(800)).toBe('A2')
    expect(cefrFromRank(2500)).toBe('B1')
    expect(cefrFromRank(5000)).toBe('B2')
    expect(cefrFromRank(12_000)).toBe('C1')
    expect(cefrFromRank(90_000)).toBe('C2')
  })

  it('resolves common words from the corpus', () => {
    expect(cefrLevelOf('the')).toBe('A1')
    expect(cefrLevelOf('zebrafish')).toBeUndefined()
  })

  it('estimates the learner level from known words', () => {
    expect(estimateCefr([])).toBe('A1')
    expect(estimateCefr([10, 20, 100])).toBe('A1')
    expect(estimateCefr([10, 20, 800, 900])).toBe('A2')
  })
})
