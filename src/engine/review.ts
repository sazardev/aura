import type {
  CardExercise,
  ChoiceExercise,
  ListenExercise,
  TapExercise,
  TypeExercise,
} from '@/engine/exercises'
import type { FrequencyTier } from '@/engine/frequency'
import type { ReviewGrade, SrsCard } from '@/engine/srs'

import { allLessons, unitForLesson } from '@/engine/lessons'
import { allVocabEntries, lookupVocab } from '@/engine/vocabulary'
import { hashString, mulberry32, sample, shuffle } from '@/lib/random'
import { normalizeText } from '@/lib/strings'

/**
 * Exercise shapes the review quiz reuses from the lesson engine.
 */
export type ReviewExercise =
  ChoiceExercise | ListenExercise | TypeExercise | TapExercise | CardExercise

export type ReviewExerciseKind = ReviewExercise['kind']

/**
 * Context of a word inside the course — the material for the "go review this
 * section" advice when a word keeps failing.
 */
export interface WordContext {
  sentence?: string
  lessonId?: string
  lessonTitle?: string
  unitTitle?: string
  tier?: FrequencyTier
}

/**
 * A word pulled into a review session, with everything the algorithm needs to
 * quiz it and to advise the learner on failure.
 */
export interface ReviewWord {
  cardId: string
  word: string
  meaning: string
  weak: number
  lapses: number
  context: WordContext
}

/**
 * One question in the review queue. Re-attempts of a word carry a different
 * exercise kind and a fresh `attempt` counter.
 */
export interface ReviewQueueItem {
  id: string
  cardId: string
  word: string
  meaning: string
  attempt: number
  context: WordContext
  exercise: ReviewExercise
}

export const MAX_SESSION_CARDS = 24
export const MAX_EXTRA_WEAK_CARDS = 10

/**
 * First question type for a word: the more it has failed before, the stronger
 * the recall demanded.
 */
export function initialType(weak: number, lapses: number): ReviewExerciseKind {
  if (weak >= 2 || lapses >= 2) return 'type'
  if (weak >= 1 || lapses >= 1) return 'listen'
  return 'choice'
}

function escalate(kind: ReviewExerciseKind, word: ReviewWord): ReviewExerciseKind {
  switch (kind) {
    case 'choice': {
      return 'listen'
    }
    case 'listen': {
      return 'type'
    }
    case 'type': {
      return word.context.sentence === undefined ? 'card' : 'tap'
    }
    case 'tap': {
      return 'card'
    }
    case 'card': {
      return 'card'
    }
  }
}

function kindForAttempt(word: ReviewWord, attempt: number): ReviewExerciseKind {
  let kind = initialType(word.weak, word.lapses)
  for (let index = 0; index < attempt; index += 1) {
    kind = escalate(kind, word)
  }
  return kind
}

/**
 * Maps a quiz answer to an SM-2 grade: correct = good, wrong = again.
 */
export function reviewGradeFor(correct: boolean): ReviewGrade {
  return correct ? 4 : 1
}

/**
 * The words for a review session: everything due (weakest first) plus the
 * weakest non-due words, so your frequent mistakes always surface.
 */
export function buildReviewSession(
  cards: readonly SrsCard[],
  weakWords: Record<string, number>,
  now: Date = new Date(),
): ReviewWord[] {
  const dueKey = now.toISOString()
  const due = cards.filter((card) => card.state.due <= dueKey).toSorted(compareCards(weakWords))
  const extraWeak = cards
    .filter((card) => card.state.due > dueKey && (weakWords[card.word.toLowerCase()] ?? 0) > 0)
    .toSorted(compareCards(weakWords))
    .slice(0, MAX_EXTRA_WEAK_CARDS)
  return [...due, ...extraWeak].slice(0, MAX_SESSION_CARDS).map(toReviewWord(weakWords))
}

function compareCards(weakWords: Record<string, number>): (a: SrsCard, b: SrsCard) => number {
  return (a, b) => {
    const aWeak = weakWords[a.word.toLowerCase()] ?? 0
    const bWeak = weakWords[b.word.toLowerCase()] ?? 0
    return (
      bWeak - aWeak || b.state.lapses - a.state.lapses || a.state.due.localeCompare(b.state.due)
    )
  }
}

function toReviewWord(weakWords: Record<string, number>): (card: SrsCard) => ReviewWord {
  return (card) => ({
    cardId: card.id,
    word: card.word,
    meaning: card.meaning,
    weak: weakWords[card.word.toLowerCase()] ?? 0,
    lapses: card.state.lapses,
    context: wordContextFor(card.word),
  })
}

/**
 * The opening queue: one first-attempt question per word, weakest first.
 */
export function buildReviewQueue(words: readonly ReviewWord[]): ReviewQueueItem[] {
  return words.map((word) => buildItem(word, 0))
}

/**
 * Builds the question for a word at a given attempt (deterministic per word +
 * kind + attempt, so re-questions look fresh but replayable).
 */
export function buildItem(word: ReviewWord, attempt: number): ReviewQueueItem {
  const kind = kindForAttempt(word, attempt)
  const rng = mulberry32(hashString(`${word.word}:${kind}:${attempt}`))
  const id = `${word.cardId}-${attempt}-${kind}`
  return {
    id,
    cardId: word.cardId,
    word: word.word,
    meaning: word.meaning,
    attempt,
    context: word.context,
    exercise: buildExercise(word, kind, id, rng),
  }
}

/**
 * The next, harder question for a word after a failure — or `undefined` when
 * the word already hit the terminal flip-card step.
 */
export function retryItem(word: ReviewWord, current: ReviewQueueItem): ReviewQueueItem | undefined {
  if (current.exercise.kind === 'card') return undefined
  const next = buildItem(word, current.attempt + 1)
  return next.exercise.kind === current.exercise.kind ? undefined : next
}

function buildExercise(
  word: ReviewWord,
  kind: ReviewExerciseKind,
  id: string,
  rng: () => number,
): ReviewExercise {
  switch (kind) {
    case 'choice': {
      return {
        kind: 'choice',
        id,
        prompt: word.meaning,
        word: word.word,
        options: buildWordOptions(word.word, word.meaning, rng),
        answer: word.word,
        sentence: word.context.sentence ?? word.meaning,
        meaning: word.meaning,
      }
    }
    case 'listen': {
      return {
        kind: 'listen',
        id,
        word: word.word,
        options: buildMeaningOptions(word.meaning, rng),
        answer: word.meaning,
        sentence: word.context.sentence ?? word.meaning,
      }
    }
    case 'type': {
      return {
        kind: 'type',
        id,
        prompt: word.meaning,
        hint: word.word.charAt(0),
        word: word.word,
        answer: word.word,
      }
    }
    case 'tap': {
      const sentence = word.context.sentence
      if (sentence === undefined) {
        return { kind: 'card', id, word: word.word, meaning: word.meaning, sentence: word.meaning }
      }
      const sentenceWords = sentence.split(/\s+/)
      const extras = sample(optionPool(), rng, 2).map((entry) => entry.word)
      const words = shuffle([...new Set([...sentenceWords, ...extras])], rng)
      return {
        kind: 'tap',
        id,
        prompt: blankedSentence(sentence, word.word),
        words,
        answer: sentence,
      }
    }
    case 'card': {
      return {
        kind: 'card',
        id,
        word: word.word,
        meaning: word.meaning,
        sentence: word.context.sentence ?? word.meaning,
      }
    }
  }
}

interface PoolEntry {
  word: string
  meaning: string
}

let poolCache: PoolEntry[] | undefined

/**
 * Every word + meaning we can use as a distractor: the whole vocabulary bank
 * plus the course words.
 */
function optionPool(): PoolEntry[] {
  poolCache ??= buildOptionPool()
  return poolCache
}

function buildOptionPool(): PoolEntry[] {
  const entries = new Map<string, PoolEntry>()
  for (const entry of allVocabEntries()) {
    entries.set(entry.word.toLowerCase(), { word: entry.word, meaning: entry.meaning })
  }
  const courseWords = allLessons().flatMap((lesson) => lesson.words)
  for (const word of courseWords) {
    const key = word.word.toLowerCase()
    if (!entries.has(key)) {
      entries.set(key, { word: word.word, meaning: word.meaning })
    }
  }
  return [...entries.values()]
}

function buildWordOptions(word: string, meaning: string, rng: () => number, size = 4): string[] {
  const meaningKey = normalizeText(meaning)
  const candidates = optionPool().filter(
    (entry) =>
      entry.word.toLowerCase() !== word.toLowerCase() &&
      normalizeText(entry.meaning) !== meaningKey,
  )
  const options = new Set([word])
  const shuffled = shuffle(candidates, rng)
  for (const entry of shuffled) {
    if (options.size >= size) break
    options.add(entry.word)
  }
  return shuffle([...options], rng)
}

function buildMeaningOptions(meaning: string, rng: () => number, size = 4): string[] {
  const meaningKey = normalizeText(meaning)
  const candidates = optionPool().filter((entry) => normalizeText(entry.meaning) !== meaningKey)
  const options = new Set([meaning])
  const shuffled = shuffle(candidates, rng)
  for (const entry of shuffled) {
    if (options.size >= size) break
    options.add(entry.meaning)
  }
  return shuffle([...options], rng)
}

function blankedSentence(sentence: string, target: string): string {
  return sentence
    .split(/\s+/)
    .map((token) => (normalizeText(token) === normalizeText(target) ? '____' : token))
    .join(' ')
}

let contextCache: Map<string, WordContext> | undefined

function contextMap(): Map<string, WordContext> {
  contextCache ??= buildContextMap()
  return contextCache
}

function buildContextMap(): Map<string, WordContext> {
  const map = new Map<string, WordContext>()
  for (const lesson of allLessons()) {
    const unit = unitForLesson(lesson.id)
    for (const word of lesson.words) {
      const key = word.word.toLowerCase()
      if (!map.has(key)) {
        const tier = lookupVocab(word.word)?.tier
        map.set(key, {
          sentence: word.sentence,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          ...(unit !== undefined && { unitTitle: unit.title }),
          ...(tier !== undefined && { tier }),
        })
      }
    }
  }
  return map
}

/**
 * Course context of a word (sentence, lesson, unit, frequency tier). Words
 * added from the Analyzer or the Reader come back empty.
 */
export function wordContextFor(word: string): WordContext {
  return contextMap().get(word.toLowerCase()) ?? {}
}
