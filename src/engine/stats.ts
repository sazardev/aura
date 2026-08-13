import type { SrsCard } from '@/engine/srs'
import type { DailyProgress } from '@/state/store'

import { previousDayKey } from '@/lib/date'

export interface DayActivity {
  key: string
  xp: number
  lessons: number
  cards: number
}

/**
 * The last `n` day keys (oldest first), ending today.
 */
export function lastDayKeys(todayKey: string, days: number): string[] {
  const keys: string[] = []
  let cursor = todayKey
  for (let index = 0; index < days; index += 1) {
    keys.unshift(cursor)
    cursor = previousDayKey(cursor)
  }
  return keys
}

/**
 * XP/lessons/cards per day for the last `n` days (oldest first), with zero
 * filled in for days with no activity.
 */
export function weekActivity(
  history: Record<string, DailyProgress>,
  todayKey: string,
  days = 7,
): DayActivity[] {
  return lastDayKeys(todayKey, days).map((key) => {
    const day = history[key]
    return {
      key,
      xp: day?.xp ?? 0,
      lessons: day?.lessons ?? 0,
      cards: day?.cards ?? 0,
    }
  })
}

export function accuracyPercent(correct: number, wrong: number): number {
  const total = correct + wrong
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

export function averageWpm(wpmTotal: number, wpmCount: number): number | undefined {
  if (wpmCount === 0) return undefined
  return Math.round(wpmTotal / wpmCount)
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

/**
 * Words with the most misses, most fragile first.
 */
export function weakWordsSorted(
  weakWords: Record<string, number>,
  limit = 8,
): { word: string; count: number }[] {
  return Object.entries(weakWords)
    .filter(([, count]) => count > 0)
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))
}

export interface DayHistoryRow extends DailyProgress {
  dateLabel: string
}

/**
 * Days with recorded activity, newest first, ready for a history log.
 */
export function activityDays(history: Record<string, DailyProgress>): DayHistoryRow[] {
  return Object.values(history)
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .map((day) => ({ ...day, dateLabel: humanDate(day.date) }))
}

export function humanDate(key: string): string {
  const date = new Date(`${key}T12:00:00`)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export interface WordDay {
  date: string
  count: number
}

/**
 * Words added to the deck per day (from the cards' creation date), oldest first.
 */
export function wordsByDay(cards: readonly SrsCard[]): WordDay[] {
  const counts = new Map<string, number>()
  for (const card of cards) {
    const key = card.createdAt.slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts]
    .toSorted((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))
}

export interface SrsMastery {
  fresh: number
  learning: number
  established: number
  lapsed: number
}

/**
 * Distribution of the deck by SM-2 maturity.
 */
export function srsMastery(cards: readonly SrsCard[]): SrsMastery {
  const mastery: SrsMastery = { fresh: 0, learning: 0, established: 0, lapsed: 0 }
  for (const card of cards) {
    mastery.lapsed += card.state.lapses
    if (card.state.repetition === 0) mastery.fresh += 1
    else if (card.state.repetition <= 2) mastery.learning += 1
    else mastery.established += 1
  }
  return mastery
}

export interface SkillSummary {
  speaking: { sessions: number; prompts: number; goodPercent: number }
  writing: { attempts: number; best: number; average: number }
  reading: { minutes: number; wpm: number | undefined }
}

export function skillSummary(input: {
  speakingSessions: number
  speakingPrompts: number
  speakingGood: number
  writingAttempts: number
  writingBest: number
  writingTotalScore: number
  readingSeconds: number
  readingWpmTotal: number
  readingWpmCount: number
}): SkillSummary {
  const goodPercent =
    input.speakingPrompts > 0 ? Math.round((input.speakingGood / input.speakingPrompts) * 100) : 0
  return {
    speaking: {
      sessions: input.speakingSessions,
      prompts: input.speakingPrompts,
      goodPercent,
    },
    writing: {
      attempts: input.writingAttempts,
      best: input.writingBest,
      average:
        input.writingAttempts > 0
          ? Math.round((input.writingTotalScore / input.writingAttempts) * 10) / 10
          : 0,
    },
    reading: {
      minutes: Math.floor(input.readingSeconds / 60),
      wpm: averageWpm(input.readingWpmTotal, input.readingWpmCount),
    },
  }
}

export interface BookCompletion {
  bookId: string
  title: string
  done: number
  total: number
  percent: number
}

/**
 * Reading progress per book (from the persisted per-book progress).
 */
export function bookCompletion(
  progress: Record<string, { completed: string[] }>,
  books: readonly { id: string; title: string; sections: number }[],
): BookCompletion[] {
  return books
    .map((book) => {
      const total = book.sections
      const done = progress[book.id]?.completed.length ?? 0
      return {
        bookId: book.id,
        title: book.title,
        done,
        total,
        percent: total > 0 ? Math.round((done / total) * 100) : 0,
      }
    })
    .filter((book) => book.done > 0)
    .toSorted((a, b) => b.percent - a.percent)
}
