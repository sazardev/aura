import { describe, expect, it } from 'vitest'

import { cumulativeXpForLevel, levelFromXp, streakStatus, updateStreak } from '@/engine/xp'

describe('XP y niveles', () => {
  it('nivel 1 sin XP', () => {
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(0).progress).toBe(0)
  })

  it('sube de nivel al cruzar el umbral acumulado', () => {
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

describe('Rachas', () => {
  it('arranca una racha nueva', () => {
    expect(updateStreak(0, undefined, '2026-06-01')).toEqual({ streak: 1, newDay: true })
  })

  it('incrementa si el último día fue ayer', () => {
    expect(updateStreak(3, '2026-05-31', '2026-06-01')).toEqual({ streak: 4, newDay: true })
  })

  it('no cambia si ya se registró actividad hoy', () => {
    expect(updateStreak(3, '2026-06-01', '2026-06-01')).toEqual({ streak: 3, newDay: false })
  })

  it('reinicia si hubo un hueco', () => {
    expect(updateStreak(10, '2026-05-01', '2026-06-01')).toEqual({ streak: 1, newDay: true })
  })

  it('distingue estado vivo y perdido', () => {
    expect(streakStatus(3, '2026-06-01', '2026-06-01')).toBe('vivo')
    expect(streakStatus(3, '2026-05-31', '2026-06-01')).toBe('vivo')
    expect(streakStatus(3, '2026-05-01', '2026-06-01')).toBe('perdido')
    expect(streakStatus(0, undefined, '2026-06-01')).toBe('nuevo')
  })
})
