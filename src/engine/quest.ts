import type { DailyProgress } from '@/state/store'

export interface Quest {
  id: string
  label: string
  icon: string
  target: number
  current: number
}

export const QUEST_BONUS_XP = 20

/**
 * Today's quests, derived from the current day's activity.
 */
export function dailyQuests(daily: DailyProgress): Quest[] {
  return [
    {
      id: 'lesson',
      label: 'Finish a lesson',
      icon: 'GraduationCap',
      target: 1,
      current: daily.lessons,
    },
    { id: 'review', label: 'Review 5 cards', icon: 'RotateCcw', target: 5, current: daily.cards },
    { id: 'xp', label: 'Earn 25 XP', icon: 'Zap', target: 25, current: daily.xp },
    {
      id: 'read',
      label: 'Read for 5 minutes',
      icon: 'BookOpen',
      target: 300,
      current: daily.readSeconds,
    },
  ]
}

export function questProgress(quests: readonly Quest[]): { done: number; total: number } {
  return {
    done: quests.filter((quest) => quest.current >= quest.target).length,
    total: quests.length,
  }
}

export function allQuestsDone(quests: readonly Quest[]): boolean {
  return quests.length > 0 && quests.every((quest) => quest.current >= quest.target)
}
