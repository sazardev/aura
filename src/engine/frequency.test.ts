import { describe, expect, it } from 'vitest'

import { commonWords, frequencyOf, frequencyTierOf, wordDifficulty } from '@/engine/frequency'

describe('Frecuencia de palabras', () => {
  it('reconoce palabras del corpus', () => {
    const entry = frequencyOf('the')
    expect(entry).toBeDefined()
    expect(entry?.rank).toBeGreaterThan(0)
    expect(frequencyOf('zzqqxx')).toBeUndefined()
  })

  it('es insensible a mayúsculas', () => {
    expect(frequencyOf('The')?.count).toBe(frequencyOf('the')?.count)
  })

  it('clasifica por banda de frecuencia', () => {
    expect(frequencyTierOf('the')).toBe('muy-comun')
    expect(frequencyTierOf('zzqqxx')).toBeUndefined()
  })

  it('wordDifficulty mapea bandas a 1..5', () => {
    expect(wordDifficulty('the')).toBe(1)
    expect(wordDifficulty('zzqqxx')).toBe(3)
  })

  it('commonWords respeta el límite', () => {
    const words = commonWords(100)
    expect(words.size).toBe(100)
    expect(words.has('the')).toBe(true)
  })
})
