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
  sentenceTranslation: string
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
  sentenceTranslation: string
}

export interface SpeakExercise {
  kind: 'speak'
  id: string
  word: string
  sentence: string
  translation: string
}

export interface MatchPair {
  left: string
  right: string
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
  translation: string
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
Pool de distracción: palabras de la misma unidad más otras aleatorias.
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
Opciones de opción múltiple: la correcta + 3 distractores únicos.
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
Genera un set determinista de ejercicios para una lección.
 */
export function generateExercises(lesson: Lesson): Exercise[] {
  const rng = mulberry32(hashString(lesson.id))
  const distractors = distractorPool(lesson, rng)
  const enWords = distractors.map((word) => word.word)
  const esTranslations = distractors.map((word) => word.translation)

  const core: Exercise[] = lesson.words.flatMap((wordInfo) => [
    {
      kind: 'choice',
      id: `${lesson.id}-choice-${wordInfo.word}`,
      prompt: wordInfo.translation,
      word: wordInfo.word,
      options: buildOptions(wordInfo.word, enWords, rng),
      answer: wordInfo.word,
      sentence: wordInfo.sentence,
      sentenceTranslation: wordInfo.sentenceTranslation,
    },
    {
      kind: 'listen',
      id: `${lesson.id}-listen-${wordInfo.word}`,
      word: wordInfo.word,
      options: buildOptions(wordInfo.translation, esTranslations, rng),
      answer: wordInfo.translation,
      sentence: wordInfo.sentence,
    },
  ])

  const typed: Exercise[] = sample(lesson.words, rng, 2).map((wordInfo) => ({
    kind: 'type',
    id: `${lesson.id}-type-${wordInfo.word}`,
    prompt: wordInfo.meaning,
    hint: wordInfo.translation,
    word: wordInfo.word,
    answer: wordInfo.word,
  }))

  const tapTarget = pickRandom(lesson.words, rng)
  const sentenceWords = tapTarget.sentence.split(/\s+/)
  const tapBank = shuffle([...new Set([...sentenceWords, ...sample(enWords, rng, 2)])], rng)
  const tap: Exercise = {
    kind: 'tap',
    id: `${lesson.id}-tap-${tapTarget.word}`,
    prompt: tapTarget.sentenceTranslation,
    words: tapBank,
    answer: tapTarget.sentence,
    sentenceTranslation: tapTarget.sentenceTranslation,
  }

  const speakTarget = pickRandom(lesson.words, rng)
  const speak: Exercise = {
    kind: 'speak',
    id: `${lesson.id}-speak-${speakTarget.word}`,
    word: speakTarget.word,
    sentence: speakTarget.sentence,
    translation: speakTarget.sentenceTranslation,
  }

  const matchWords = sample(lesson.words, rng, 4)
  const match: Exercise = {
    kind: 'match',
    id: `${lesson.id}-match`,
    pairs: matchWords.map((wordInfo) => ({
      left: wordInfo.word,
      right: wordInfo.translation,
    })),
  }

  const cardTarget = pickRandom(lesson.words, rng)
  const card: Exercise = {
    kind: 'card',
    id: `${lesson.id}-card-${cardTarget.word}`,
    word: cardTarget.word,
    meaning: cardTarget.meaning,
    sentence: cardTarget.sentence,
    translation: cardTarget.translation,
  }

  return shuffle([...core, ...typed, tap, speak, match, card], rng)
}

/**
Comprueba una respuesta textual contra el ejercicio (choice/type/listen/tap).
 */
export function checkTextExercise(
  exercise: ChoiceExercise | TypeExercise | ListenExercise | TapExercise,
  userAnswer: string,
): boolean {
  return normalizeText(userAnswer) === normalizeText(exercise.answer)
}

/**
Comprueba una respuesta hablada (similitud del transcript vs la frase esperada).
 */
export function checkSpeechAnswer(sentence: string, transcript: string): boolean {
  return isCloseEnough(transcript, sentence)
}
