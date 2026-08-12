import { CONFIG } from '@/engine/config'
import { previousDayKey } from '@/lib/date'

export const XP_PER_CORRECT = CONFIG.gamification.xpPerCorrect
export const XP_PER_LESSON = CONFIG.gamification.xpPerLesson
export const XP_PER_PERFECT_LESSON = CONFIG.gamification.xpPerPerfectLesson
export const XP_PER_REVIEW_CARD = CONFIG.gamification.xpPerReviewCard

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
  const { baseXp, incrementPerLevel } = CONFIG.gamification.levelCurve
  let total = 0
  for (let current = 1; current < level; current += 1) {
    total += baseXp + current * incrementPerLevel
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

export type StreakStatus = 'new' | 'alive' | 'lost'

/**
 * Computes the new streak counter given the last active day and today's date.
 * Returns the new streak and whether there was new activity.
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
  if (streak === 0) return 'new'
  if (lastActiveDay === todayKey) return 'alive'
  if (previousDayKey(todayKey) === lastActiveDay) return 'alive'
  return 'lost'
}

export const DEFAULT_DAILY_GOAL = CONFIG.gamification.dailyGoal.default

export const DAILY_GOAL_OPTIONS: readonly number[] = CONFIG.gamification.dailyGoal.options
