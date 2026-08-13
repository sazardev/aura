import { describe, expect, it } from 'vitest'

import { GRAMMAR, grammarLessonById, grammarUnitById } from '@/engine/grammar'

describe('Grammar module', () => {
  it('contains topics with unique ids', () => {
    expect(GRAMMAR.length).toBeGreaterThanOrEqual(3)
    const ids = new Set<string>()
    for (const unit of GRAMMAR) {
      ids.add(unit.id)
      expect(unit.lessons.length).toBeGreaterThanOrEqual(1)
      for (const lesson of unit.lessons) {
        ids.add(lesson.id)
        expect(lesson.exercises.length).toBeGreaterThanOrEqual(1)
        for (const exercise of lesson.exercises) {
          ids.add(exercise.id)
          if (exercise.kind === 'choice') {
            expect(exercise.options).toContain(exercise.answer)
          }
        }
      }
    }
    expect(ids.size).toBeGreaterThan(GRAMMAR.length)
  })

  it('rule lessons explain the grammar', () => {
    const ruleLesson = grammarLessonById('present-simple-rule')
    if (ruleLesson === undefined) throw new Error('Rule lesson not found')
    expect(ruleLesson.explanation.length).toBeGreaterThan(20)
    expect(ruleLesson.examples.length).toBeGreaterThan(0)
  })

  it('resolves units and lessons by id', () => {
    expect(grammarUnitById('articles')?.title).toContain('Articles')
    expect(grammarLessonById('prepositions-practice')?.title).toBe('Practice')
    expect(grammarLessonById('does-not-exist')).toBeUndefined()
  })
})
