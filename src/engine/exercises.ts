import type { Lesson, LessonWord } from '@/engine/lessons'

import { allWords, unitForLesson } from '@/engine/lessons'
import { hashString, mulberry32, sample, shuffle } from '@/lib/random'
import { isCloseEnough, normalizeText } from '@/lib/strings'

export interface ChoiceExercise {
  kind: 'choice'
  id: string
  prompt: string
  word: string
  options: string[]
  answer: string
  sentence: string
  meaning: string
}

export interface TypeExercise {
  kind: 'type'
  id: string
  prompt: string
  hint: string
  word: string
  answer: string
}

export interface ListenExercise {
  kind: 'listen'
  id: string
  word: string
  options: string[]
  answer: string
  sentence: string
}

export interface TapExercise {
  kind: 'tap'
  id: string
  prompt: string
  words: string[]
  answer: string
}

export interface SpeakExercise {
  kind: 'speak'
  id: string
  word: string
  sentence: string
  meaning: string
}

export interface MatchPair {
  word: string
  meaning: string
}

export interface MatchExercise {
  kind: 'match'
  id: string
  pairs: MatchPair[]
}

export interface CardExercise {
  kind: 'card'
  id: string
  word: string
  meaning: string
  sentence: string
}

export type Exercise =
  | ChoiceExercise
  | TypeExercise
  | ListenExercise
  | TapExercise
  | SpeakExercise
  | MatchExercise
  | CardExercise

const GLOBAL_POOL: readonly LessonWord[] = allWords()

function globalPool(): readonly LessonWord[] {
  return GLOBAL_POOL
}

/**
 * Distractor pool: words from the same unit plus random words from the course.
 */
function distractorPool(lesson: Lesson, rng: () => number): LessonWord[] {
  const unit = unitForLesson(lesson.id)
  const sameUnit = (unit?.lessons.flatMap((l) => l.words) ?? []).filter((w) =>
    lesson.words.every((lessonWord) => lessonWord.word !== w.word),
  )
  const others = sample(globalPool(), rng, 30).filter((w) =>
    lesson.words.every((lessonWord) => lessonWord.word !== w.word),
  )
  return [...new Map([...sameUnit, ...others].map((w) => [w.word, w])).values()]
}

/**
 * Multiple-choice options: the correct one plus up to `size - 1` unique distractors.
 */
function buildOptions(
  correct: string,
  candidates: readonly string[],
  rng: () => number,
  size = 4,
): string[] {
  const options = new Set([correct])
  const pool = shuffle(candidates, rng).filter((candidate) => candidate !== correct)
  for (const candidate of pool) {
    if (options.size >= size) break
    options.add(candidate)
  }
  return shuffle([...options], rng)
}

function pickRandom<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] as T
}

/**
Replaces the target word in a sentence with a blank for tap exercises.
 */
function blankedSentence(sentence: string, target: string): string {
  return sentence
    .split(/\s+/)
    .map((token) => (normalizeText(token) === normalizeText(target) ? '____' : token))
    .join(' ')
}

/**
 * Generates a deterministic set of exercises for a lesson (seeded by lesson id).
 */
export function generateExercises(lesson: Lesson): Exercise[] {
  const rng = mulberry32(hashString(lesson.id))
  const distractors = distractorPool(lesson, rng)
  const words = distractors.map((word) => word.word)
  const meanings = distractors.map((word) => word.meaning)

  const core: Exercise[] = lesson.words.flatMap((wordInfo) => [
    {
      kind: 'choice',
      id: `${lesson.id}-choice-${wordInfo.word}`,
      prompt: wordInfo.meaning,
      word: wordInfo.word,
      options: buildOptions(wordInfo.word, words, rng),
      answer: wordInfo.word,
      sentence: wordInfo.sentence,
      meaning: wordInfo.meaning,
    },
    {
      kind: 'listen',
      id: `${lesson.id}-listen-${wordInfo.word}`,
      word: wordInfo.word,
      options: buildOptions(wordInfo.meaning, meanings, rng),
      answer: wordInfo.meaning,
      sentence: wordInfo.sentence,
    },
  ])

  const typed: Exercise[] = sample(lesson.words, rng, 2).map((wordInfo) => ({
    kind: 'type',
    id: `${lesson.id}-type-${wordInfo.word}`,
    prompt: wordInfo.meaning,
    hint: wordInfo.word.charAt(0),
    word: wordInfo.word,
    answer: wordInfo.word,
  }))

  const tapTarget = pickRandom(lesson.words, rng)
  const sentenceWords = tapTarget.sentence.split(/\s+/)
  const tapBank = shuffle([...new Set([...sentenceWords, ...sample(words, rng, 2)])], rng)
  const tap: Exercise = {
    kind: 'tap',
    id: `${lesson.id}-tap-${tapTarget.word}`,
    prompt: blankedSentence(tapTarget.sentence, tapTarget.word),
    words: tapBank,
    answer: tapTarget.sentence,
  }

  const speakTarget = pickRandom(lesson.words, rng)
  const speak: Exercise = {
    kind: 'speak',
    id: `${lesson.id}-speak-${speakTarget.word}`,
    word: speakTarget.word,
    sentence: speakTarget.sentence,
    meaning: speakTarget.meaning,
  }

  const matchWords = sample(lesson.words, rng, 4)
  const match: Exercise = {
    kind: 'match',
    id: `${lesson.id}-match`,
    pairs: matchWords.map((wordInfo) => ({
      word: wordInfo.word,
      meaning: wordInfo.meaning,
    })),
  }

  const cardTarget = pickRandom(lesson.words, rng)
  const card: Exercise = {
    kind: 'card',
    id: `${lesson.id}-card-${cardTarget.word}`,
    word: cardTarget.word,
    meaning: cardTarget.meaning,
    sentence: cardTarget.sentence,
  }

  return shuffle([...core, ...typed, tap, speak, match, card], rng)
}

/**
 * Checks a text answer against an exercise (choice/type/listen/tap).
 */
export function checkTextExercise(
  exercise: ChoiceExercise | TypeExercise | ListenExercise | TapExercise,
  userAnswer: string,
): boolean {
  return normalizeText(userAnswer) === normalizeText(exercise.answer)
}

/**
 * Checks a spoken answer (transcript similarity against the expected sentence).
 */
export function checkSpeechAnswer(sentence: string, transcript: string): boolean {
  return isCloseEnough(transcript, sentence)
}
