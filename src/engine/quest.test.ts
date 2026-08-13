import { describe, expect, it } from 'vitest'

import { allQuestsDone, dailyQuests, questProgress } from '@/engine/quest'

const day = {
  date: '2026-08-13',
  xp: 0,
  correct: 0,
  wrong: 0,
  lessons: 0,
  cards: 0,
  readSeconds: 0,
}

describe('Daily quests', () => {
  it('derives quests from the day activity', () => {
    const quests = dailyQuests({ ...day, xp: 30, lessons: 1, cards: 5, readSeconds: 360 })
    expect(quests.length).toBe(4)
    expect(quests.every((quest) => quest.current >= quest.target)).toBe(true)
    expect(allQuestsDone(quests)).toBe(true)
  })

  it('reports partial progress', () => {
    const quests = dailyQuests({ ...day, lessons: 1 })
    expect(questProgress(quests)).toEqual({ done: 1, total: 4 })
    expect(allQuestsDone(quests)).toBe(false)
  })
})
