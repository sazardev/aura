import type { Dialogue, Dialogues } from '@/engine/types'

import dialoguesData from '@/data/dialogues.json'
import { dialoguesSchema } from '@/engine/schemas'
import { normalizeText } from '@/lib/strings'

export const DIALOGUES: Dialogues = dialoguesSchema.parse(dialoguesData)

export function dialogueById(id: string): Dialogue | undefined {
  return DIALOGUES.find((dialogue) => dialogue.id === id)
}

/**
 * Total number of player ("You") turns across all dialogues — used by quests.
 */
export function totalPlayerLines(): number {
  return DIALOGUES.reduce(
    (sum, dialogue) => sum + dialogue.lines.filter((line) => line.options !== undefined).length,
    0,
  )
}

const TYPING_STOPWORDS = new Set(
  'i me my we you he she it they a an the to for of and or in on with would like want can could should please thanks thank yes no at'.split(
    ' ',
  ),
)

function keyWords(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((word) => word.length > 1 && !TYPING_STOPWORDS.has(word))
}

/**
 * Loose matching for typed replies: the reply counts as correct when it covers
 * at least half of the key (non-stop) words of the expected answer — so
 * "coffee please" matches "I would like a coffee, please.", while a single
 * vague word like "pizza" does not answer the turn.
 */
export function matchesAnswer(typed: string, expected: string): boolean {
  const keys = keyWords(expected)
  if (keys.length === 0) return true
  const typedWords = new Set(normalizeText(typed).split(' '))
  const hits = keys.filter((word) => typedWords.has(word)).length
  return hits / keys.length >= 0.5
}
