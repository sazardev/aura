import { describe, expect, it } from 'vitest'

import { checkSpeechAnswer, checkTextExercise, generateExercises } from '@/engine/exercises'
import { allLessons } from '@/engine/lessons'

describe('Exercise generator', () => {
  const lesson = allLessons()[0]
  if (lesson === undefined) throw new Error('The course has no lessons')

  it('generates a deterministic set per lesson', () => {
    const first = generateExercises(lesson)
    const second = generateExercises(lesson)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(10)
  })

  it('covers several exercise types', () => {
    const kinds = new Set(generateExercises(lesson).map((exercise) => exercise.kind))
    expect(kinds.has('choice')).toBe(true)
    expect(kinds.has('listen')).toBe(true)
    expect(kinds.has('type')).toBe(true)
    expect(kinds.has('match')).toBe(true)
    expect(kinds.has('speak')).toBe(true)
    expect(kinds.has('card')).toBe(true)
  })

  it('choice options include the correct answer', () => {
    const exercise = generateExercises(lesson).find((item) => item.kind === 'choice')
    if (exercise?.kind !== 'choice') throw new Error('no hay ejercicio choice')
    expect(exercise.options).toContain(exercise.answer)
    expect(new Set(exercise.options).size).toBe(exercise.options.length)
  })

  it('checkTextExercise validates normalized answers', () => {
    const exercises = generateExercises(lesson)
    const type = exercises.find((item) => item.kind === 'type')
    if (type?.kind !== 'type') throw new Error('no hay ejercicio type')
    expect(checkTextExercise(type, type.answer)).toBe(true)
    expect(checkTextExercise(type, 'respuesta incorrecta')).toBe(false)
  })

  it('checkSpeechAnswer tolerates punctuation and case', () => {
    expect(checkSpeechAnswer('hello my friend', 'Hello, my friend!')).toBe(true)
    expect(checkSpeechAnswer('hello my friend', 'completely different words')).toBe(false)
  })
})
