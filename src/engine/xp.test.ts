import { describe, expect, it } from 'vitest'

import { cumulativeXpForLevel, levelFromXp, streakStatus, updateStreak } from '@/engine/xp'

describe('XP y niveles', () => {
  it('starts at level 1 with no XP', () => {
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(0).progress).toBe(0)
  })

  it('levels up when crossing the cumulative threshold', () => {
    const threshold = cumulativeXpForLevel(3)
    const info = levelFromXp(threshold)
    expect(info.level).toBe(3)
    expect(info.xpIntoLevel).toBe(0)
  })

  it('progreso parcial entre niveles', () => {
    const threshold = cumulativeXpForLevel(2)
    const half = threshold + (cumulativeXpForLevel(3) - threshold) / 2
    const info = levelFromXp(half)
    expect(info.level).toBe(2)
    expect(info.progress).toBeCloseTo(0.5, 1)
  })
})

describe('Streaks', () => {
  it('starts a new streak', () => {
    expect(updateStreak(0, undefined, '2026-06-01')).toEqual({ streak: 1, newDay: true })
  })

  it('increments when the last day was yesterday', () => {
    expect(updateStreak(3, '2026-05-31', '2026-06-01')).toEqual({ streak: 4, newDay: true })
  })

  it('does not change when already active today', () => {
    expect(updateStreak(3, '2026-06-01', '2026-06-01')).toEqual({ streak: 3, newDay: false })
  })

  it('resets after a gap', () => {
    expect(updateStreak(10, '2026-05-01', '2026-06-01')).toEqual({ streak: 1, newDay: true })
  })

  it('distinguishes alive and lost states', () => {
    expect(streakStatus(3, '2026-06-01', '2026-06-01')).toBe('alive')
    expect(streakStatus(3, '2026-05-31', '2026-06-01')).toBe('alive')
    expect(streakStatus(3, '2026-05-01', '2026-06-01')).toBe('lost')
    expect(streakStatus(0, undefined, '2026-06-01')).toBe('new')
  })
})
