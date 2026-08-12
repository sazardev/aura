import type { Course, Lesson, LessonWord, Unit } from '@/engine/types'

import courseExpansionData from '@/data/course-expansion.json'
import courseData from '@/data/course.json'
import { courseSchema } from '@/engine/schemas'

const mergedUnits: unknown[] = [...(courseData as Unit[]), ...(courseExpansionData as Unit[])]

export const COURSE: Course = courseSchema.parse(mergedUnits)

export function allLessons(): Lesson[] {
  return COURSE.flatMap((unit) => unit.lessons)
}

export function allWords(): LessonWord[] {
  return allLessons().flatMap((lesson) => lesson.words)
}

export function lessonById(id: string): Lesson | undefined {
  return allLessons().find((lesson) => lesson.id === id)
}

export function unitForLesson(id: string): Unit | undefined {
  return COURSE.find((unit) => unit.lessons.some((lesson) => lesson.id === id))
}

export function previousLessonId(id: string): string | undefined {
  const lessons = allLessons()
  const index = lessons.findIndex((lesson) => lesson.id === id)
  if (index <= 0) return undefined
  return lessons[index - 1]?.id
}

export {
  type Course,
  type Lesson,
  type LessonType,
  type LessonWord,
  type Unit,
} from '@/engine/types'
