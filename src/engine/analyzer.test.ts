import { describe, expect, it } from 'vitest'

import { analyzeText } from '@/engine/analyzer'

describe('Analizador de textos', () => {
  it('descompone un texto simple', async () => {
    const result = await analyzeText('The beautiful cat runs quickly to the park and eats food.')
    expect(result.totalWords).toBeGreaterThan(0)
    expect(result.sentences).toBe(1)
    expect(result.uniqueWords).toBeGreaterThan(0)
    expect(result.readability.length).toBeGreaterThan(0)
    expect(result.topWords.length).toBeGreaterThan(0)
    expect(result.posDistribution).toBeDefined()
  })

  it('calcula legibilidad y sentimiento', async () => {
    const result = await analyzeText(
      'I love this wonderful amazing day. It is full of happiness and joy.',
    )
    const ease = result.readability.find((score) => score.name === 'Flesch Reading Ease')
    expect(ease).toBeDefined()
    expect(ease?.value).toBeGreaterThan(0)
    expect(result.sentiment).toBeGreaterThan(0)
  })

  it('recolecta notas de estilo sin romper', async () => {
    const result = await analyzeText(
      'It is pretty hard to read. There are a lot of things that are not simple. Very very very slow.',
    )
    expect(Array.isArray(result.notes)).toBe(true)
    expect(Array.isArray(result.unknownWords)).toBe(true)
  })

  it('maneja texto vacío', async () => {
    const result = await analyzeText(' '.repeat(3))
    expect(result.totalWords).toBe(0)
    expect(result.readability).toHaveLength(0)
  })
})
