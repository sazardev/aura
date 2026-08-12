import { describe, expect, it } from 'vitest'

import { achievementById, ACHIEVEMENTS, newlyUnlocked, RULES } from '@/engine/achievements'

const fullProgress = {
  xp: 5000,
  totalLessons: 25,
  streak: 30,
  learnedWords: 500,
  totalCorrect: 1000,
}

describe('Logros (data/achievements.json)', () => {
  it('carga todas las definiciones completas', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0)
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.id.length).toBeGreaterThan(0)
      expect(achievement.name.length).toBeGreaterThan(0)
      expect(achievement.description.length).toBeGreaterThan(0)
      expect(achievement.emoji.length).toBeGreaterThan(0)
    }
  })

  it('toda regla tiene su definición en el JSON', () => {
    for (const rule of RULES) {
      expect(achievementById(rule.id)).toBeDefined()
    }
  })

  it('desbloquea los logros según el progreso', () => {
    const unlocked = newlyUnlocked({}, fullProgress)
    expect(unlocked).toContain('xp-5000')
    expect(unlocked).toContain('lecciones-25')
    expect(unlocked).toContain('racha-30')
    expect(unlocked).toContain('palabras-500')
    expect(unlocked).toContain('correcciones-1000')
  })

  it('no vuelve a desbloquear logros ya conseguidos', () => {
    const current = { 'xp-500': new Date().toISOString(), 'racha-3': new Date().toISOString() }
    const unlocked = newlyUnlocked(current, fullProgress)
    expect(unlocked).not.toContain('xp-500')
    expect(unlocked).not.toContain('racha-3')
  })

  it('achievementById resuelve correctamente', () => {
    expect(achievementById('racha-7')?.name).toBe('Una semana')
    expect(achievementById('no-existe')).toBeUndefined()
  })
})
