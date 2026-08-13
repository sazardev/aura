import { frequencyOf } from '@/engine/frequency'

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const RANK_BOUNDS: readonly { level: CefrLevel; maxRank: number }[] = [
  { level: 'A1', maxRank: 500 },
  { level: 'A2', maxRank: 1500 },
  { level: 'B1', maxRank: 3500 },
  { level: 'B2', maxRank: 8000 },
  { level: 'C1', maxRank: 20_000 },
]

/**
 * Maps a SUBTLEX-US frequency rank to a CEFR level. Words more frequent than
 * rank 500 are assumed A1; the rarest tail falls into C2.
 */
export function cefrFromRank(rank: number): CefrLevel {
  for (const bound of RANK_BOUNDS) {
    if (rank <= bound.maxRank) return bound.level
  }
  return 'C2'
}

/**
 * CEFR level of a word (based on its frequency rank), or undefined for words
 * not present in the corpus.
 */
export function cefrLevelOf(word: string): CefrLevel | undefined {
  const entry = frequencyOf(word)
  return entry === undefined ? undefined : cefrFromRank(entry.rank)
}

/**
 * Average CEFR level of a set of known words (their ranks), as an estimate of
 * the learner's overall level. Returns 'A1' when there is no data.
 */
export function estimateCefr(ranks: readonly number[]): CefrLevel {
  if (ranks.length === 0) return 'A1'
  const total = ranks.reduce((sum, rank) => sum + CEFR_LEVELS.indexOf(cefrFromRank(rank)), 0)
  const index = Math.round(total / ranks.length)
  return CEFR_LEVELS[Math.max(0, Math.min(CEFR_LEVELS.length - 1, index))] ?? 'A1'
}

/**
 * Same estimate, but from a list of words (looks up their frequency ranks).
 */
export function estimateCefrFromWords(words: readonly string[]): CefrLevel {
  const ranks: number[] = []
  for (const word of words) {
    const entry = frequencyOf(word)
    if (entry !== undefined) ranks.push(entry.rank)
  }
  return estimateCefr(ranks)
}
