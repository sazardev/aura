import { describe, expect, it } from 'vitest'

import { CONFIG } from '@/engine/config'
import {
  DAILY_GOAL_OPTIONS,
  DEFAULT_DAILY_GOAL,
  levelFromXp,
  XP_PER_CORRECT,
  XP_PER_LESSON,
  XP_PER_REVIEW_CARD,
} from '@/engine/xp'

describe('Configuración (data/config.json)', () => {
  it('expone valores de gamificación válidos', () => {
    expect(CONFIG.gamification.maxHearts).toBeGreaterThan(0)
    expect(CONFIG.gamification.xpPerLesson).toBeGreaterThan(CONFIG.gamification.xpPerCorrect)
    expect(CONFIG.gamification.dailyGoal.options.length).toBeGreaterThan(0)
    expect(DAILY_GOAL_OPTIONS).toContain(DEFAULT_DAILY_GOAL)
  })

  it('expone valores SM-2 válidos', () => {
    expect(CONFIG.srs.initialEfactor).toBeGreaterThan(1.3)
    expect(CONFIG.srs.initialEfactor).toBeLessThanOrEqual(3)
    expect(CONFIG.srs.initialInterval).toBeGreaterThanOrEqual(0)
    expect(CONFIG.srs.initialRepetition).toBeGreaterThanOrEqual(0)
  })

  it('xp y niveles coherentes', () => {
    expect(XP_PER_CORRECT).toBeGreaterThan(0)
    expect(XP_PER_LESSON).toBeGreaterThan(0)
    expect(XP_PER_REVIEW_CARD).toBeGreaterThan(0)
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(100_000).level).toBeGreaterThan(1)
  })
})
