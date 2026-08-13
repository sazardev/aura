import { describe, expect, it } from 'vitest'

import { coursePrompts, speakingPrompts, writingTargets } from '@/engine/practice'

describe('Practice prompts', () => {
  it('collects unique course sentences with their words', () => {
    const prompts = coursePrompts()
    expect(prompts.length).toBeGreaterThanOrEqual(200)
    const sentences = new Set(prompts.map((prompt) => prompt.sentence.toLowerCase()))
    expect(sentences.size).toBe(prompts.length)
    for (const prompt of prompts) {
      expect(prompt.word.length).toBeGreaterThan(0)
      expect(prompt.sentence.length).toBeGreaterThan(0)
    }
  })

  it('speaking prompts are a bounded random sample of full sentences', () => {
    const prompts = speakingPrompts(6)
    expect(prompts.length).toBe(6)
    expect(new Set(prompts.map((prompt) => prompt.sentence)).size).toBe(6)
    for (const prompt of prompts) {
      expect(prompt.sentence.split(' ').length).toBeGreaterThanOrEqual(4)
    }
  })

  it('writing targets prefer learned words and fill with course words', () => {
    const fromLearned = writingTargets(['hello', 'house', 'kitchen'], 6)
    expect(fromLearned).toContain('hello')
    expect(fromLearned.length).toBe(6)

    const fromCourse = writingTargets([], 5)
    expect(fromCourse.length).toBe(5)
    expect(new Set(fromCourse.map((word) => word.toLowerCase())).size).toBe(5)
  })
})
