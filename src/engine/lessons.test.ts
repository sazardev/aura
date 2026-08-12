import { describe, expect, it } from 'vitest'

import { allLessons, allWords, COURSE, lessonById, previousLessonId } from '@/engine/lessons'

describe('English course', () => {
  it('has a giant, valid course', () => {
    expect(COURSE.length).toBeGreaterThanOrEqual(12)
    expect(allLessons().length).toBe(36)
    expect(allWords().length).toBe(180)
  })

  it('every lesson has complete words', () => {
    for (const lesson of allLessons()) {
      expect(lesson.words).toHaveLength(5)
      for (const word of lesson.words) {
        expect(word.word.length).toBeGreaterThan(0)
        expect(word.meaning.length).toBeGreaterThan(0)
        expect(word.sentence.length).toBeGreaterThan(0)
      }
    }
  })

  it('ids are unique and content is not repeated', () => {
    const lessonIds = allLessons().map((lesson) => lesson.id)
    expect(new Set(lessonIds).size).toBe(lessonIds.length)

    const wordIds = new Set(allWords().map((word) => word.word.toLowerCase()))
    expect(wordIds.size).toBe(allWords().length)
  })

  it('resolves lessons and previous links', () => {
    expect(lessonById('greetings-1')?.title).toBe('Hello and Goodbye')
    expect(lessonById('does-not-exist')).toBeUndefined()
    expect(previousLessonId('greetings-1')).toBeUndefined()
    expect(previousLessonId('greetings-2')).toBe('greetings-1')
  })
})
