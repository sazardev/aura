import type {
  LibraryBook,
  LibraryChapter,
  LibraryIndex,
  LibraryIndexBook,
  LibrarySection,
} from '@/engine/types'

import libraryIndexData from '@/data/library.json'
import {
  frequencyOf,
  type FrequencyTier,
  frequencyTierOf,
  wordDifficulty,
} from '@/engine/frequency'
import { libraryBookSchema, libraryIndexSchema } from '@/engine/schemas'
import { hashString, mulberry32, sample } from '@/lib/random'
import { normalizeText } from '@/lib/strings'

export const LIBRARY: LibraryIndex = libraryIndexSchema.parse(libraryIndexData)

const bookCache = new Map<string, LibraryBook>()
const bookLoads = new Map<string, Promise<LibraryBook>>()

/**
 * Loads a full book (chapters and sections) on demand. Books are code-split
 * into per-book JSON chunks so the index stays small and only the opened book
 * is parsed. Results are cached for the lifetime of the app.
 */
export async function loadBook(id: string): Promise<LibraryBook> {
  const cached = bookCache.get(id)
  if (cached !== undefined) return cached
  let pending = bookLoads.get(id)
  if (pending === undefined) {
    pending = (async () => {
      const module = (await import(`@/data/library/${id}.json`)) as { default: unknown }
      const book = libraryBookSchema.parse(module.default)
      bookCache.set(id, book)
      return book
    })()
    bookLoads.set(id, pending)
  }
  return pending
}

export const WORDS_PER_MINUTE = 200

export type ReadingQuestion =
  | { id: string; type: 'cloze'; sentence: string; answer: string; options: string[] }
  | { id: string; type: 'order'; sentences: string[]; answer: number[] }

export interface SectionNewWord {
  word: string
  tier: FrequencyTier
  rank: number
}

export interface BookExpression {
  phrase: string
  count: number
  example: string
}

const STOPWORDS = new Set(
  'a an and are as at be but by for from had has have he her hers him his i if in into is it its my no not of on or our out over said so she that the their them then there they this to up was we were when which who will with would you your'.split(
    ' ',
  ),
)

/**
Splits a text into sentences on punctuation boundaries.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
}

/**
Counts the words in a text (roughly).
 */
export function countWords(text: string): number {
  return text.match(/[A-Za-z']+/g)?.length ?? 0
}

/**
Estimated reading time in minutes for a word count.
 */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

export function sectionText(section: LibrarySection): string {
  return section.paragraphs.join(' ')
}

export function bookById(id: string): LibraryIndexBook | undefined {
  return LIBRARY.find((book) => book.id === id)
}

export function chapterById(book: LibraryBook, chapterId: string): LibraryChapter | undefined {
  return book.chapters.find((chapter) => chapter.id === chapterId)
}

export function sectionById(
  book: LibraryBook,
  sectionId: string,
): { chapter: LibraryChapter; section: LibrarySection } | undefined {
  for (const chapter of book.chapters) {
    const section = chapter.sections.find((candidate) => candidate.id === sectionId)
    if (section !== undefined) return { chapter, section }
  }
  return undefined
}

export function bookReadingMinutes(book: { words: number }): number {
  return readingMinutes(book.words)
}

export function chapterReadingMinutes(chapter: LibraryChapter): number {
  const words = chapter.sections.reduce((sum, section) => sum + countWords(sectionText(section)), 0)
  return readingMinutes(words)
}

/**
Unique words of a section (lowercased).
 */
export function sectionWordSet(section: LibrarySection): Set<string> {
  const words = new Set<string>()
  for (const paragraph of section.paragraphs) {
    for (const word of normalizeText(paragraph).split(' ')) {
      if (word.length > 0) words.add(word)
    }
  }
  return words
}

/**
 * Deterministically generated reading-comprehension questions for a section
 * (seeded by the section id, so they are stable and testable).
 */
export function sectionQuestions(section: LibrarySection): ReadingQuestion[] {
  const rng = mulberry32(hashString(section.id))
  const questions: ReadingQuestion[] = []
  const allSentences = section.paragraphs.flatMap((paragraph) => splitSentences(paragraph))
  const candidates = allSentences.filter((sentence) => countWords(sentence) >= 6)

  for (const picked of sample(candidates, rng, 2)) {
    const cloze = makeCloze(picked, section, rng)
    if (cloze !== undefined) questions.push(cloze)
  }

  const orderParagraph = section.paragraphs.find(
    (paragraph) => splitSentences(paragraph).length >= 4,
  )
  const order = makeOrder(orderParagraph ?? section.paragraphs.join(' '), section.id, rng)
  if (order !== undefined) questions.push(order)

  return questions
}

function makeCloze(
  sentence: string,
  section: LibrarySection,
  rng: () => number,
): ReadingQuestion | undefined {
  const words = sentence.split(' ').filter((word) => /^[A-Za-z][A-Za-z'-]*$/.test(word))
  const blanks = words.filter(
    (word) => word.length >= 4 && !STOPWORDS.has(word.toLowerCase()) && wordDifficulty(word) >= 2,
  )
  if (blanks.length === 0) return undefined

  const answer = sample(blanks, rng, 1)[0]
  if (answer === undefined) return undefined

  const sentenceLower = sentence.toLowerCase()
  const distractors = sample(
    [...sectionWordSet(section)].filter(
      (word) =>
        word !== answer.toLowerCase() &&
        word.length >= 3 &&
        wordDifficulty(word) >= 2 &&
        !sentenceLower.includes(word),
    ),
    rng,
    3,
  )
  if (distractors.length < 3) return undefined

  const options = [...distractors, answer]
  const swapIndex = Math.floor(rng() * options.length)
  const last = options.at(-1)!
  options[options.length - 1] = options[swapIndex]!
  options[swapIndex] = last

  const sentenceWithBlank = sentence.replace(
    new RegExp(String.raw`\b${escapeRegExp(answer)}\b`),
    '______',
  )
  return {
    id: `cloze-${hashString(sentence)}`,
    type: 'cloze',
    sentence: sentenceWithBlank,
    answer,
    options,
  }
}

function makeOrder(
  text: string,
  sectionId: string,
  rng: () => number,
): ReadingQuestion | undefined {
  const sentences = splitSentences(text)
  if (sentences.length < 4) return undefined

  const start = Math.floor(rng() * (sentences.length - 3))
  const run = sentences.slice(start, start + 3)
  if (run.length < 3 || run.some((sentence) => countWords(sentence) < 4)) return undefined

  const shuffled = [...run]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1))
    const current = shuffled[index]
    if (current === undefined) continue
    shuffled[index] = shuffled[other]!
    shuffled[other] = current
  }
  const answer = run.map((sentence) => shuffled.indexOf(sentence))

  return { id: `order-${sectionId}`, type: 'order', sentences: shuffled, answer }
}

export function checkReadingAnswer(question: ReadingQuestion, answer: string | number[]): boolean {
  if (question.type === 'cloze') {
    return typeof answer === 'string' && answer === question.answer
  }
  return Array.isArray(answer) && arraysEqual(answer, question.answer)
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function escapeRegExp(input: string): string {
  return input.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

const expressionsCache = new Map<string, BookExpression[]>()

/**
 * Frequent 2-3 word phrases in the book (a first pass over "real English"
 * collocations), with an example sentence straight from the text.
 */
export function bookExpressions(book: LibraryBook, limit = 8): BookExpression[] {
  const cached = expressionsCache.get(book.id)
  if (cached !== undefined) return cached.slice(0, limit)

  const counts = new Map<string, number>()
  for (const chapter of book.chapters) {
    for (const section of chapter.sections) {
      for (const paragraph of section.paragraphs) {
        const words = normalizeText(paragraph).split(' ')
        for (let size = 2; size <= 3; size += 1) {
          for (let index = 0; index <= words.length - size; index += 1) {
            const ngram = words.slice(index, index + size)
            if (isExpression(ngram)) {
              const phrase = ngram.join(' ')
              counts.set(phrase, (counts.get(phrase) ?? 0) + 1)
            }
          }
        }
      }
    }
  }

  const expressions = [...counts]
    .filter(([, count]) => count >= 2)
    .toSorted((a, b) => b[1] - a[1] || b[0].split(' ').length - a[0].split(' ').length)
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count, example: exampleFor(book, phrase) }))

  expressionsCache.set(book.id, expressions)
  return expressions
}

function isExpression(ngram: string[]): boolean {
  const last = ngram.at(-1)
  if (last === undefined || STOPWORDS.has(last)) return false
  return ngram.some((word) => !STOPWORDS.has(word))
}

function exampleFor(book: LibraryBook, phrase: string): string {
  for (const chapter of book.chapters) {
    for (const section of chapter.sections) {
      for (const paragraph of section.paragraphs) {
        const normalized = normalizeText(paragraph)
        if (normalized.includes(phrase)) {
          const sentence = splitSentences(paragraph).find((candidate) =>
            normalizeText(candidate).includes(phrase),
          )
          if (sentence !== undefined) return sentence
        }
      }
    }
  }
  return ''
}

const tierRankCache = new Map<string, { tier: FrequencyTier; rank: number }>()

function tierRankOf(word: string): { tier: FrequencyTier; rank: number } | undefined {
  const key = word.toLowerCase()
  const cached = tierRankCache.get(key)
  if (cached !== undefined) return cached
  const frequency = frequencyOf(key)
  const tier = frequencyTierOf(key)
  if (frequency === undefined || tier === undefined) return undefined
  const entry = { tier, rank: frequency.rank }
  tierRankCache.set(key, entry)
  return entry
}

/**
 * The rarest words in a section (not yet known) — a pre-reading list of what
 * to watch out for. Sorted from rarest to most common.
 */
export function sectionNewWords(
  section: LibrarySection,
  knownWords: ReadonlySet<string>,
  limit = 12,
): SectionNewWord[] {
  const candidates: SectionNewWord[] = []
  const seen = new Set<string>()
  for (const word of sectionWordSet(section)) {
    if (seen.has(word)) continue
    seen.add(word)
    if (knownWords.has(word)) continue
    const entry = tierRankOf(word)
    if (entry !== undefined && entry.tier !== 'very-common' && entry.tier !== 'common') {
      candidates.push({ word, ...entry })
    }
  }
  return candidates
    .toSorted((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ word, tier, rank }) => ({ word, tier, rank }))
}

/**
 * Builds a library book from any pasted/imported text (used by the PDF/TXT/MD
 * importer). Long documents are truncated to keep localStorage small.
 */
export function documentToBook(
  text: string,
  title: string,
  source = 'Imported document',
): {
  book: LibraryBook
  truncated: boolean
} {
  const MAX_CHARS = 150_000
  const truncated = text.length > MAX_CHARS
  const limited = truncated ? text.slice(0, MAX_CHARS) : text

  const paragraphs = limited
    .split(/\n\s*\n/)
    .map((block) => block.replaceAll(/\s+/g, ' ').trim())
    .filter((block) => block.length > 0)

  const sections: LibrarySection[] = []
  for (let index = 0; index < paragraphs.length; index += 5) {
    sections.push({
      id: `s1-${sections.length + 1}`,
      paragraphs: paragraphs.slice(index, index + 5),
    })
  }

  const slug =
    title
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-|-$/g, '') || 'document'

  return {
    truncated,
    book: {
      id: `import-${slug}`,
      title,
      author: 'Imported document',
      year: new Date().getFullYear(),
      genre: 'Imported',
      difficulty: 3,
      tags: ['Imported'],
      description: "A document you imported to read with Aura's guided reading tools.",
      source,
      words: countWords(limited),
      chapters: [{ id: 'c1', title: 'Document', sections }],
    },
  }
}
