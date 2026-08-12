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
 * Busca una palabra en el WordNet completo (índice + data) servido por el
 * backend Rust. Fuera de Tauri devuelve `undefined`.
 */
export async function lookupWord(word: string): Promise<DictionaryEntry | undefined> {
  const result = await invokeOptional<DictionaryEntry>('lookup_word', { word })
  return result
}
