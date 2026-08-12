import subtlex from 'subtlex-word-frequencies'

export type FrequencyTier = 'very-common' | 'common' | 'uncommon' | 'rare' | 'very-rare'

export const FREQUENCY_TIER_LABELS: Record<FrequencyTier, string> = {
  'very-common': 'Very common',
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  'very-rare': 'Very rare',
}

export interface FrequencyEntry {
  count: number
  rank: number
}

const INDEX = new Map<string, FrequencyEntry>()

for (const [index, entry] of subtlex.entries()) {
  INDEX.set(entry.word.toLowerCase(), { count: entry.count, rank: index + 1 })
}

/**
 * Frequency of a word (count and rank in the SUBTLEX-US corpus, 74k words).
 */
export function frequencyOf(word: string): FrequencyEntry | undefined {
  return INDEX.get(word.toLowerCase())
}

/**
 * Frequency tier based on the rank in the corpus.
 */
export function frequencyTierOf(word: string): FrequencyTier | undefined {
  const entry = frequencyOf(word)
  if (entry === undefined) return undefined
  if (entry.rank <= 1000) return 'very-common'
  if (entry.rank <= 3000) return 'common'
  if (entry.rank <= 8000) return 'uncommon'
  if (entry.rank <= 25_000) return 'rare'
  return 'very-rare'
}

/**
 * Difficulty score 1..5 (1 = most common).
 */
export function wordDifficulty(word: string): number {
  const tier = frequencyTierOf(word)
  switch (tier) {
    case 'very-common': {
      return 1
    }
    case 'common': {
      return 2
    }
    case 'uncommon': {
      return 3
    }
    case 'rare': {
      return 4
    }
    case 'very-rare': {
      return 5
    }
    default: {
      return 3
    }
  }
}

/**
 * The most common words (by default the first 2000) as a Set.
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
