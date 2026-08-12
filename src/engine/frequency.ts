import subtlex from 'subtlex-word-frequencies'

export type FrequencyTier = 'muy-comun' | 'comun' | 'poco-comun' | 'rara' | 'muy-rara'

export interface FrequencyEntry {
  count: number
  rank: number
}

const INDEX = new Map<string, FrequencyEntry>()

for (const [index, entry] of subtlex.entries()) {
  INDEX.set(entry.word.toLowerCase(), { count: entry.count, rank: index + 1 })
}

/**
Frecuencia de una palabra (count y rank en el corpus SUBTLEX-US, 74k palabras).
 */
export function frequencyOf(word: string): FrequencyEntry | undefined {
  return INDEX.get(word.toLowerCase())
}

/**
Banda de frecuencia según el rango en el corpus.
 */
export function frequencyTierOf(word: string): FrequencyTier | undefined {
  const entry = frequencyOf(word)
  if (entry === undefined) return undefined
  if (entry.rank <= 1000) return 'muy-comun'
  if (entry.rank <= 3000) return 'comun'
  if (entry.rank <= 8000) return 'poco-comun'
  if (entry.rank <= 25_000) return 'rara'
  return 'muy-rara'
}

/**
Puntaje de dificultad 1..5 (1 = más común).
 */
export function wordDifficulty(word: string): number {
  const tier = frequencyTierOf(word)
  switch (tier) {
    case 'muy-comun': {
      return 1
    }
    case 'comun': {
      return 2
    }
    case 'poco-comun': {
      return 3
    }
    case 'rara': {
      return 4
    }
    case 'muy-rara': {
      return 5
    }
    default: {
      return 3
    }
  }
}

/**
Las palabras más comunes (por defecto las 2000 primeras) como Set.
 */
export function commonWords(limit = 2000): Set<string> {
  const result = new Set<string>()
  let index = 0
  for (const entry of subtlex) {
    if (index >= limit) break
    result.add(entry.word.toLowerCase())
    index += 1
  }
  return result
}
