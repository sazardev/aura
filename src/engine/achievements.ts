import type { AchievementDef } from '@/engine/types'

import achievementsData from '@/data/achievements.json'
import { achievementsSchema } from '@/engine/schemas'

export interface ProgressSnapshot {
  xp: number
  totalLessons: number
  streak: number
  learnedWords: number
  totalCorrect: number
}

export const ACHIEVEMENTS: readonly AchievementDef[] = achievementsSchema.parse(achievementsData)

export const RULES: readonly { id: string; check: (snapshot: ProgressSnapshot) => boolean }[] = [
  { id: 'first-steps', check: (s) => s.xp >= 100 },
  { id: 'xp-500', check: (s) => s.xp >= 500 },
  { id: 'xp-1000', check: (s) => s.xp >= 1000 },
  { id: 'xp-5000', check: (s) => s.xp >= 5000 },
  { id: 'first-lesson', check: (s) => s.totalLessons >= 1 },
  { id: 'lessons-5', check: (s) => s.totalLessons >= 5 },
  { id: 'lessons-25', check: (s) => s.totalLessons >= 25 },
  { id: 'streak-3', check: (s) => s.streak >= 3 },
  { id: 'streak-7', check: (s) => s.streak >= 7 },
  { id: 'streak-30', check: (s) => s.streak >= 30 },
  { id: 'words-50', check: (s) => s.learnedWords >= 50 },
  { id: 'words-200', check: (s) => s.learnedWords >= 200 },
  { id: 'words-500', check: (s) => s.learnedWords >= 500 },
  { id: 'correct-100', check: (s) => s.totalCorrect >= 100 },
  { id: 'correct-1000', check: (s) => s.totalCorrect >= 1000 },
]

/**
Achievements that should unlock now but are not yet in `current`.
 */
export function newlyUnlocked(
  current: Readonly<Record<string, string>>,
  snapshot: ProgressSnapshot,
): string[] {
  return RULES.filter((rule) => current[rule.id] === undefined && rule.check(snapshot)).map(
    (rule) => rule.id,
  )
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id)
}
