import { describe, expect, it } from 'vitest'

import { achievementById, ACHIEVEMENTS, newlyUnlocked, RULES } from '@/engine/achievements'

const fullProgress = {
  xp: 5000,
  totalLessons: 25,
  streak: 30,
  learnedWords: 500,
  totalCorrect: 1000,
}

describe('Achievements (data/achievements.json)', () => {
  it('loads all complete definitions', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0)
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.id.length).toBeGreaterThan(0)
      expect(achievement.name.length).toBeGreaterThan(0)
      expect(achievement.description.length).toBeGreaterThan(0)
      expect(achievement.emoji.length).toBeGreaterThan(0)
    }
  })

  it('every rule has its definition in the JSON', () => {
    for (const rule of RULES) {
      expect(achievementById(rule.id)).toBeDefined()
    }
  })

  it('unlocks achievements based on progress', () => {
    const unlocked = newlyUnlocked({}, fullProgress)
    expect(unlocked).toContain('xp-5000')
    expect(unlocked).toContain('lessons-25')
    expect(unlocked).toContain('streak-30')
    expect(unlocked).toContain('words-500')
    expect(unlocked).toContain('correct-1000')
  })

  it('no vuelve a desbloquear logros ya conseguidos', () => {
    const current = { 'xp-500': new Date().toISOString(), 'streak-3': new Date().toISOString() }
    const unlocked = newlyUnlocked(current, fullProgress)
    expect(unlocked).not.toContain('xp-500')
    expect(unlocked).not.toContain('streak-3')
  })

  it('achievementById resolves correctly', () => {
    expect(achievementById('streak-7')?.name).toBe('One week')
    expect(achievementById('no-existe')).toBeUndefined()
  })
})
