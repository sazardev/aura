import { invokeOptional } from '@/lib/tauri'

export interface WordnetSense {
  partOfSpeech: string
  gloss: string
  synonyms: string[]
  antonyms: string[]
  hypernyms: string[]
  hyponyms: string[]
  examples: string[]
}

export interface DictionaryEntry {
  word: string
  senses: WordnetSense[]
}

const cache = new Map<string, DictionaryEntry | undefined>()
const CACHE_LIMIT = 300

/**
 * Looks up a word in the full WordNet (index + data) served by the Rust
 * backend. Returns `undefined` outside of Tauri. Results are cached in memory
 * so repeat lookups skip the IPC round-trip.
 */
export async function lookupWord(word: string): Promise<DictionaryEntry | undefined> {
  const key = word.toLowerCase()
  const cached = cache.get(key)
  if (cached !== undefined || cache.has(key)) return cached

  const result = await invokeOptional<DictionaryEntry>('lookup_word', { word: key })
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, result)
  return result
}
