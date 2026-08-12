import { describe, expect, it } from 'vitest'

import { checkSpeechAnswer, checkTextExercise, generateExercises } from '@/engine/exercises'
import { allLessons } from '@/engine/lessons'

describe('Generador de ejercicios', () => {
  const lesson = allLessons()[0]
  if (lesson === undefined) throw new Error('El curso no tiene lecciones')

  it('genera un set determinista por lección', () => {
    const first = generateExercises(lesson)
    const second = generateExercises(lesson)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(10)
  })

  it('cubre varios tipos de ejercicio', () => {
    const kinds = new Set(generateExercises(lesson).map((exercise) => exercise.kind))
    expect(kinds.has('choice')).toBe(true)
    expect(kinds.has('listen')).toBe(true)
    expect(kinds.has('type')).toBe(true)
    expect(kinds.has('match')).toBe(true)
    expect(kinds.has('speak')).toBe(true)
    expect(kinds.has('card')).toBe(true)
  })

  it('las opciones de choice incluyen la correcta', () => {
    const exercise = generateExercises(lesson).find((item) => item.kind === 'choice')
    if (exercise?.kind !== 'choice') throw new Error('no hay ejercicio choice')
    expect(exercise.options).toContain(exercise.answer)
    expect(new Set(exercise.options).size).toBe(exercise.options.length)
  })

  it('checkTextExercise valida respuestas normalizadas', () => {
    const exercises = generateExercises(lesson)
    const type = exercises.find((item) => item.kind === 'type')
    if (type?.kind !== 'type') throw new Error('no hay ejercicio type')
    expect(checkTextExercise(type, type.answer)).toBe(true)
    expect(checkTextExercise(type, 'respuesta incorrecta')).toBe(false)
  })

  it('checkSpeechAnswer tolera puntuación y mayúsculas', () => {
    expect(checkSpeechAnswer('hello my friend', 'Hello, my friend!')).toBe(true)
    expect(checkSpeechAnswer('hello my friend', 'completely different words')).toBe(false)
  })
})
