import type { Lesson, Unit } from '@/engine/types'

import { allLessons, COURSE, previousLessonId } from '@/engine/lessons'

export interface RoadmapStage {
  id: string
  label: string
  title: string
  units: Unit[]
}

export interface StageProgress {
  done: number
  total: number
  percent: number
}

/**
 * The course split into three CEFR "roadmap stages". Units are ordered by
 * difficulty, so the first third maps to A1, the middle to A2 and the last to
 * early B1 — a visual, milestone-based learning path.
 */
export function courseStages(): RoadmapStage[] {
  const third = Math.max(1, Math.ceil(COURSE.length / 3))
  return [
    { id: 'a1', label: 'A1', title: 'Foundations', units: COURSE.slice(0, third) },
    { id: 'a2', label: 'A2', title: 'Everyday English', units: COURSE.slice(third, third * 2) },
    { id: 'b1', label: 'B1', title: 'Growing fluency', units: COURSE.slice(third * 2) },
  ]
}

export function stageProgress(stage: RoadmapStage, completed: ReadonlySet<string>): StageProgress {
  const lessons = stage.units.flatMap((unit) => unit.lessons)
  const done = lessons.filter((lesson) => completed.has(lesson.id)).length
  return {
    done,
    total: lessons.length,
    percent: lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0,
  }
}

export interface RoadmapOverview {
  done: number
  total: number
  percent: number
}

export function roadmapOverview(completed: ReadonlySet<string>): RoadmapOverview {
  const lessons = allLessons()
  const done = lessons.filter((lesson) => completed.has(lesson.id)).length
  return {
    done,
    total: lessons.length,
    percent: lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0,
  }
}

/**
 * The first lesson the learner can currently start (the previous one, if any,
 * is already completed).
 */
export function nextAvailableLesson(completed: ReadonlySet<string>): Lesson | undefined {
  for (const lesson of allLessons()) {
    if (completed.has(lesson.id)) continue
    const previous = previousLessonId(lesson.id)
    if (previous === undefined || completed.has(previous)) return lesson
  }
  return undefined
}

/**
 * The first available lesson inside a single unit.
 */
export function unitNextLesson(unit: Unit, completed: ReadonlySet<string>): Lesson | undefined {
  for (const lesson of unit.lessons) {
    if (completed.has(lesson.id)) continue
    const previous = previousLessonId(lesson.id)
    if (previous === undefined || completed.has(previous)) return lesson
  }
  return undefined
}
