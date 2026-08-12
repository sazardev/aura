import { describe, expect, it } from 'vitest'

import { lookupVocab, randomVocabEntry, searchVocab, vocabularySize } from '@/engine/vocabulary'

describe('Vocabulary bank (data/vocabulary.json)', () => {
  it('is a giant, validated bank', () => {
    expect(vocabularySize()).toBeGreaterThan(3000)
  })

  it('looks up words instantly and case-insensitively', () => {
    const entry = lookupVocab('first')
    expect(entry).toBeDefined()
    expect(entry?.meaning.length).toBeGreaterThan(0)
    expect(entry?.rank).toBeGreaterThan(0)
    expect(lookupVocab('FIRST')?.word).toBe('first')
    expect(lookupVocab('zzqqxx')).toBeUndefined()
  })

  it('entries carry meaning, pos, synonyms and examples', () => {
    const entry = lookupVocab('walk')
    expect(entry?.pos).toBeTruthy()
    expect(Array.isArray(entry?.synonyms)).toBe(true)
  })

  it('searches by prefix', () => {
    const results = searchVocab('hap')
    expect(results.length).toBeGreaterThan(0)
    for (const result of results) {
      expect(result.word.startsWith('hap')).toBe(true)
    }
  })

  it('returns a random word', () => {
    const entry = randomVocabEntry()
    expect(entry).toBeDefined()
    expect(entry?.word.length).toBeGreaterThan(0)
  })
})
