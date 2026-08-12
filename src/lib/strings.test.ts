import { describe, expect, it } from 'vitest'

import { isCloseEnough, levenshtein, normalizeText, similarity } from '@/lib/strings'

describe('String utilities', () => {
  it('normalizes case, punctuation and spaces', () => {
    expect(normalizeText('  Hello, World!  ')).toBe('hello world')
    expect(normalizeText("Don't stop")).toBe("don't stop")
  })

  it('calcula distancia de Levenshtein', () => {
    expect(levenshtein('kitten', 'kitten')).toBe(0)
    expect(levenshtein('kitten', 'sitting')).toBe(3)
  })

  it('perfect similarity for identical texts', () => {
    expect(similarity('hello', 'hello')).toBe(1)
    expect(similarity('', 'x')).toBe(0)
  })

  it('isCloseEnough accepts minimal variations', () => {
    expect(isCloseEnough('hello friend', 'Hello friend!')).toBe(true)
    expect(isCloseEnough('apple', 'orange')).toBe(false)
  })
})
