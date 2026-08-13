import { describe, expect, it } from 'vitest'

import { allLessons, COURSE } from '@/engine/lessons'
import {
  courseStages,
  nextAvailableLesson,
  roadmapOverview,
  stageProgress,
  unitNextLesson,
} from '@/engine/roadmap'

describe('Roadmap engine', () => {
  it('splits the course into three stages covering every unit', () => {
    const stages = courseStages()
    expect(stages.length).toBe(3)
    const units = stages.flatMap((stage) => stage.units)
    expect(units.length).toBe(COURSE.length)
    expect(new Set(stages.map((stage) => stage.label))).toEqual(new Set(['A1', 'A2', 'B1']))
    for (const stage of stages) {
      expect(stage.units.length).toBeGreaterThan(0)
      expect(stage.title.length).toBeGreaterThan(0)
    }
  })

  it('tracks overall and per-stage progress', () => {
    const stages = courseStages()
    const first = stages[0]?.units[0]?.lessons[0]?.id
    if (first === undefined) throw new Error('No first lesson')
    const completed = new Set([first])
    expect(roadmapOverview(completed).done).toBe(1)
    expect(roadmapOverview(completed).total).toBe(allLessons().length)
    expect(stageProgress(stages[0]!, completed).done).toBe(1)
  })

  it('finds the next available lesson in order', () => {
    const lessons = allLessons()
    expect(nextAvailableLesson(new Set())?.id).toBe(lessons[0]?.id)
    const done = new Set([lessons[0]!.id])
    expect(nextAvailableLesson(done)?.id).toBe(lessons[1]?.id)
    const firstUnit = COURSE[0]!
    expect(unitNextLesson(firstUnit, done)?.id).toBe(firstUnit.lessons[1]?.id)
  })
})
