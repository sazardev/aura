import { allLessons } from '@/engine/lessons'
import { shuffle } from '@/lib/random'

export interface PracticePrompt {
  word: string
  sentence: string
}

/**
 * Unique example sentences from the whole course, each tied to its target
 * word — the material for speaking and writing practice.
 */
export function coursePrompts(): PracticePrompt[] {
  const seen = new Set<string>()
  const prompts: PracticePrompt[] = []
  for (const lesson of allLessons()) {
    for (const word of lesson.words) {
      const key = word.sentence.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        prompts.push({ word: word.word, sentence: word.sentence })
      }
    }
  }
  return prompts
}

/**
 * A random selection of course sentences for a speaking session.
 */
export function speakingPrompts(count = 6): PracticePrompt[] {
  const all = coursePrompts().filter((prompt) => prompt.sentence.split(' ').length >= 4)
  return shuffle(all, Math.random).slice(0, count)
}

/**
 * Target words for a writing session: prefers words you are already learning,
 * filling the rest with common course words you can definitely write about.
 */
export function writingTargets(learnedWords: readonly string[], count = 6): string[] {
  const seen = new Set<string>()
  const targets: string[] = []
  const push = (word: string) => {
    const key = word.toLowerCase()
    if (key.length === 0 || seen.has(key)) return
    seen.add(key)
    targets.push(word)
  }

  const learned = shuffle([...learnedWords], Math.random)
  for (const word of learned) {
    push(word)
    if (targets.length >= count) break
  }

  if (targets.length < count) {
    for (const prompt of shuffle(coursePrompts(), Math.random)) {
      push(prompt.word)
      if (targets.length >= count) break
    }
  }
  return targets
}
