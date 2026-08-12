import { describe, expect, it } from 'vitest'

import { allLessons, allWords, COURSE, lessonById, previousLessonId } from '@/engine/lessons'

describe('Curso de inglés', () => {
  it('tiene unidades y lecciones suficientes', () => {
    expect(COURSE.length).toBeGreaterThanOrEqual(6)
    expect(allLessons().length).toBeGreaterThanOrEqual(18)
  })

  it('todas las lecciones tienen palabras completas', () => {
    for (const lesson of allLessons()) {
      expect(lesson.words).toHaveLength(5)
      for (const word of lesson.words) {
        expect(word.word.length).toBeGreaterThan(0)
        expect(word.translation.length).toBeGreaterThan(0)
        expect(word.meaning.length).toBeGreaterThan(0)
        expect(word.sentence.length).toBeGreaterThan(0)
      }
    }
  })

  it('los ids son únicos y el contenido no se repite', () => {
    const lessonIds = allLessons().map((lesson) => lesson.id)
    expect(new Set(lessonIds).size).toBe(lessonIds.length)

    const wordIds = new Set(allWords().map((word) => word.word.toLowerCase()))
    expect(wordIds.size).toBe(allWords().length)
  })

  it('resuelve lecciones y enlaces previos', () => {
    expect(lessonById('saludos-1')?.title).toBe('Hola y adiós')
    expect(lessonById('no-existe')).toBeUndefined()
    expect(previousLessonId('saludos-1')).toBeUndefined()
    expect(previousLessonId('saludos-2')).toBe('saludos-1')
  })
})
