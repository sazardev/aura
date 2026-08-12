/// <reference types="vite/client" />

declare module 'subtlex-word-frequencies' {
  export interface SubtlexEntry {
    word: string
    count: number
  }
  const entries: SubtlexEntry[]
  export default entries
}

declare module 'afinn-165' {
  const afinn165: Record<string, number>
  export { afinn165 }
}

declare module 'wink-lemmatizer' {
  export function lemmatizeNoun(word: string): string
  export function lemmatizeVerb(word: string): string
  export function lemmatizeAdjective(word: string): string
}

declare module '@/data/course.json' {
  const data: unknown
  export default data
}
