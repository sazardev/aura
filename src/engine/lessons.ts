import type { Course, Lesson, LessonWord, ProfessionLessons, Unit } from '@/engine/types'

import courseExpansionData from '@/data/course-expansion.json'
import courseData from '@/data/course.json'
import professionLessonsData from '@/data/profession-lessons.json'
import { courseSchema, professionLessonsSchema } from '@/engine/schemas'

const mergedUnits: unknown[] = [...(courseData as Unit[]), ...(courseExpansionData as Unit[])]

export const COURSE: Course = courseSchema.parse(mergedUnits)

export const PROFESSION_LESSONS: ProfessionLessons =
  professionLessonsSchema.parse(professionLessonsData)

let lessonsCache: Lesson[] | undefined
let wordsCache: LessonWord[] | undefined

export function allLessons(): Lesson[] {
  lessonsCache ??= COURSE.flatMap((unit) => unit.lessons)
  return lessonsCache
}

/**
 * The extra career lessons for a profession (empty when none is set).
 */
export function professionLessons(profession: string | undefined): Lesson[] {
  if (profession === undefined) return []
  return PROFESSION_LESSONS[profession] ?? []
}

export function allWords(): LessonWord[] {
  wordsCache ??= allLessons().flatMap((lesson) => lesson.words)
  return wordsCache
}

export function lessonById(id: string): Lesson | undefined {
  return (
    allLessons().find((lesson) => lesson.id === id) ??
    Object.values(PROFESSION_LESSONS)
      .flat()
      .find((lesson) => lesson.id === id)
  )
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
