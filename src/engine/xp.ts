import { previousDayKey } from '@/lib/date'

export const XP_PER_CORRECT = 1
export const XP_PER_LESSON = 10
export const XP_PER_PERFECT_LESSON = 5
export const XP_PER_REVIEW_CARD = 2

export interface LevelInfo {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  progress: number
}

/**
XP acumulado necesario para alcanzar `level` (niveles 1..infinito).
 */
export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0
  // Curva: cada nivel cuesta level*50 XP, ligeramente creciente.
  let total = 0
  for (let current = 1; current < level; current += 1) {
    total += 50 + current * 5
  }
  return total
}

/**
Descompone el XP total en nivel + progreso hacia el siguiente.
 */
export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1
  while (totalXp >= cumulativeXpForLevel(level + 1)) {
    level += 1
  }
  const levelFloor = cumulativeXpForLevel(level)
  const nextFloor = cumulativeXpForLevel(level + 1)
  return {
    level,
    xpIntoLevel: totalXp - levelFloor,
    xpForNextLevel: nextFloor - levelFloor,
    progress: nextFloor === levelFloor ? 0 : (totalXp - levelFloor) / (nextFloor - levelFloor),
  }
}

export type StreakStatus = 'nuevo' | 'vivo' | 'perdido'

/**
 * Calcula el nuevo contador de racha dado el último día activo y la fecha de
 * hoy. Devuelve el nuevo streak y si hubo actividad nueva.
 */
export function updateStreak(
  streak: number,
  lastActiveDay: string | undefined,
  todayKey: string,
): { streak: number; newDay: boolean } {
  if (lastActiveDay === todayKey) {
    return { streak, newDay: false }
  }
  if (lastActiveDay !== undefined && previousDayKey(todayKey) === lastActiveDay) {
    return { streak: streak + 1, newDay: true }
  }
  return { streak: 1, newDay: true }
}

export function streakStatus(
  streak: number,
  lastActiveDay: string | undefined,
  todayKey: string,
): StreakStatus {
  if (streak === 0) return 'nuevo'
  if (lastActiveDay === todayKey) return 'vivo'
  if (previousDayKey(todayKey) === lastActiveDay) return 'vivo'
  return 'perdido'
}

/**
Meta diaria por defecto.
 */
export const DEFAULT_DAILY_GOAL = 20

export const DAILY_GOAL_OPTIONS = [10, 20, 30, 50] as const
