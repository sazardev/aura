import { describe, expect, it } from 'vitest'

import {
  allLessons,
  allWords,
  COURSE,
  lessonById,
  previousLessonId,
  PROFESSION_LESSONS,
  professionLessons,
} from '@/engine/lessons'
import { PROFESSIONS } from '@/engine/profile'
import { normalizeText } from '@/lib/strings'

// Words that must never appear in the course (mirrors the generator's filter).
const VULGAR_WORDS = new Set([
  'ass',
  'arse',
  'buns',
  'fanny',
  'butt',
  'shit',
  'crap',
  'damn',
  'hell',
  'bitch',
  'bastard',
  'dick',
  'cock',
  'pussy',
  'cunt',
  'fuck',
  'whore',
  'slut',
  'porn',
  'nude',
  'penis',
  'vagina',
  'anus',
  'boob',
  'tits',
  'stupid',
  'dumb',
  'idiot',
  'moron',
  'jerk',
  'douche',
  'boner',
  'fart',
  'wank',
  'orgasm',
])

const INFLECTIONS = ['s', 'es', 'd', 'ed', 'ing']

describe('English course', () => {
  it('has a giant, valid course', () => {
    expect(COURSE.length).toBeGreaterThanOrEqual(17)
    expect(allLessons().length).toBe(51)
    expect(allWords().length).toBe(255)
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

  it('every profession has a career lesson pack', () => {
    for (const profession of PROFESSIONS) {
      const lessons = professionLessons(profession.id)
      expect(lessons.length).toBeGreaterThanOrEqual(1)
      for (const lesson of lessons) {
        expect(lesson.id.startsWith('career-')).toBe(true)
        for (const word of lesson.words) {
          expect(word.word.length).toBeGreaterThan(0)
          expect(word.meaning.length).toBeGreaterThan(0)
          expect(word.sentence.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('career lesson ids are unique and resolvable', () => {
    const ids = Object.values(PROFESSION_LESSONS)
      .flat()
      .map((lesson) => lesson.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(lessonById(id)?.id).toBe(id)
    }
  })

  it('returns no career lessons for an unset profession', () => {
    expect(professionLessons(undefined)).toEqual([])
  })

  it('resolves lessons and previous links', () => {
    expect(lessonById('greetings-1')?.title).toBe('Hello and Goodbye')
    expect(lessonById('does-not-exist')).toBeUndefined()
    expect(previousLessonId('greetings-1')).toBeUndefined()
    expect(previousLessonId('greetings-2')).toBe('greetings-1')
  })
})

describe('Lesson content quality', () => {
  const lessons = [...allLessons(), ...Object.values(PROFESSION_LESSONS).flat()]

  it('every sentence actually contains its word', () => {
    for (const lesson of lessons) {
      for (const word of lesson.words) {
        const sentence = normalizeText(word.sentence)
        const base = normalizeText(word.word)
        const mentioned =
          sentence.includes(base) ||
          INFLECTIONS.some((suffix) => sentence.includes(`${base}${suffix}`))
        expect(mentioned, `${lesson.id}: "${word.word}" not in "${word.sentence}"`).toBe(true)
      }
    }
  })

  it('every sentence is capitalized and punctuated', () => {
    for (const lesson of lessons) {
      for (const word of lesson.words) {
        expect(word.sentence.charAt(0), `${lesson.id} "${word.sentence}"`).toMatch(/[A-Z]/)
        expect(word.sentence, `${lesson.id} "${word.sentence}"`).toMatch(/[.!?]$/)
      }
    }
  })

  it('has no vulgar or insulting words', () => {
    for (const lesson of lessons) {
      for (const word of lesson.words) {
        expect(VULGAR_WORDS.has(word.word.toLowerCase()), `${lesson.id}: "${word.word}"`).toBe(
          false,
        )
      }
    }
  })

  it('never offers two words with the same meaning inside a lesson', () => {
    for (const lesson of lessons) {
      const meanings = new Set(lesson.words.map((word) => normalizeText(word.meaning)))
      expect(meanings.size, `${lesson.id}: duplicate meanings`).toBe(lesson.words.length)
    }
  })

  it('keeps every lesson at a full word count', () => {
    for (const lesson of lessons) {
      expect(lesson.words.length, lesson.id).toBeGreaterThanOrEqual(5)
    }
  })
})
