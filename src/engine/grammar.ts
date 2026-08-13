import type { Grammar, GrammarLesson, GrammarUnit } from '@/engine/types'

import grammarData from '@/data/grammar.json'
import { grammarSchema } from '@/engine/schemas'

export const GRAMMAR: Grammar = grammarSchema.parse(grammarData)

export function grammarUnitById(id: string): GrammarUnit | undefined {
  return GRAMMAR.find((unit) => unit.id === id)
}

export function grammarLessonById(id: string): GrammarLesson | undefined {
  for (const unit of GRAMMAR) {
    const lesson = unit.lessons.find((candidate) => candidate.id === id)
    if (lesson !== undefined) return lesson
  }
  return undefined
}

export function unitForGrammarLesson(id: string): GrammarUnit | undefined {
  return GRAMMAR.find((unit) => unit.lessons.some((lesson) => lesson.id === id))
}
