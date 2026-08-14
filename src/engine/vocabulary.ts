import type { VocabularyEntry } from '@/engine/types'

import vocabularyData from '@/data/vocabulary.json'
import { vocabularySchema } from '@/engine/schemas'

const BANK = new Map<string, VocabularyEntry>()
const ENTRIES: VocabularyEntry[] = []

for (const entry of vocabularySchema.parse(vocabularyData)) {
  BANK.set(entry.word, entry)
  ENTRIES.push(entry)
}

/**
Looks up a word in the local vocabulary bank (O(1), instant, offline).
 */
export function lookupVocab(word: string): VocabularyEntry | undefined {
  return BANK.get(word.toLowerCase())
}

/**
Total number of words in the vocabulary bank.
 */
export function vocabularySize(): number {
  return BANK.size
}

/**
All entries in the vocabulary bank (for building quiz distractors).
 */
export function allVocabEntries(): readonly VocabularyEntry[] {
  return ENTRIES
}

/**
Returns a random word from the bank (for exploration/surprise).
 */
export function randomVocabEntry(): VocabularyEntry | undefined {
  if (ENTRIES.length === 0) return undefined
  return ENTRIES[Math.floor(Math.random() * ENTRIES.length)]
}

/**
Prefix search over the bank, up to `limit` results.
 */
export function searchVocab(query: string, limit = 12): VocabularyEntry[] {
  const q = query.toLowerCase()
  if (q.length === 0) return []
  const results: VocabularyEntry[] = []
  for (const entry of ENTRIES) {
    if (!entry.word.startsWith(q)) {
      continue
    }

    results.push(entry)
    if (results.length >= limit) break
  }
  return results
}
