export type GuidedActionId =
  | 'lesson'
  | 'dictionary'
  | 'reading'
  | 'speaking'
  | 'dictation'
  | 'writing'
  | 'dialogue'
  | 'grammar'
  | 'review'

export interface GuidedAction {
  id: GuidedActionId
  label: string
  hint: string
  icon: string
}

/**
 * The "Try it yourself" tour: every step sends the learner to a real screen
 * and is marked done only when they actually perform the action.
 */
export const GUIDED_ACTIONS: readonly GuidedAction[] = [
  {
    id: 'lesson',
    label: 'Finish a lesson',
    hint: 'Answer an exercise on the course path',
    icon: 'GraduationCap',
  },
  {
    id: 'dictionary',
    label: 'Look up a word',
    hint: 'Search a word in the dictionary',
    icon: 'BookOpen',
  },
  {
    id: 'reading',
    label: 'Read a page',
    hint: 'Finish a section of a classic book',
    icon: 'BookMarked',
  },
  {
    id: 'speaking',
    label: 'Speak a sentence',
    hint: 'Listen and rate yourself once',
    icon: 'Mic',
  },
  {
    id: 'dictation',
    label: 'Type what you hear',
    hint: 'Check a dictation answer',
    icon: 'Headphones',
  },
  {
    id: 'writing',
    label: 'Write a sentence',
    hint: 'Check a sentence you wrote',
    icon: 'PenLine',
  },
  {
    id: 'dialogue',
    label: 'Play a dialogue',
    hint: 'Pick the best reply',
    icon: 'MessageCircle',
  },
  {
    id: 'grammar',
    label: 'Do a grammar exercise',
    hint: 'Answer one grammar question',
    icon: 'SpellCheck',
  },
  {
    id: 'review',
    label: 'Review a card',
    hint: 'Grade a spaced-repetition card',
    icon: 'RotateCcw',
  },
]

export function guidedActionById(id: string): GuidedAction | undefined {
  return GUIDED_ACTIONS.find((action) => action.id === id)
}

export function guidedProgress(actions: Record<string, boolean>): {
  done: number
  total: number
} {
  return {
    done: GUIDED_ACTIONS.filter((action) => Object.hasOwn(actions, action.id)).length,
    total: GUIDED_ACTIONS.length,
  }
}

export function allGuidedDone(actions: Record<string, boolean>): boolean {
  return guidedProgress(actions).done === GUIDED_ACTIONS.length
}
