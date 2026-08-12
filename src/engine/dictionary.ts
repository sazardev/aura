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

/**
 * Looks up a word in the full WordNet (index + data) served by the Rust
 * backend. Returns `undefined` outside of Tauri.
 */
export async function lookupWord(word: string): Promise<DictionaryEntry | undefined> {
  const result = await invokeOptional<DictionaryEntry>('lookup_word', { word })
  return result
}
