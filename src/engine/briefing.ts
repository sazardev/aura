import type { NextScreenPrediction } from '@/engine/insights'
import type { TelemetryState } from '@/engine/telemetry'
import type { LearningGoal } from '@/state/store'

import { learnerIdentity, predictNextScreen, usageProfile } from '@/engine/insights'
import { LIBRARY } from '@/engine/library'
import { formatDuration } from '@/engine/stats'
import { daysBetween, localDateKey } from '@/lib/date'

export type StreakRisk = 'low' | 'medium' | 'high'

export interface BookForecast {
  bookId: string
  title: string
  remainingSections: number
  estimatedMinutes: number
  message: string
}

export interface DailyBriefing {
  identity: string
  predictedNext: NextScreenPrediction[]
  streakRisk: StreakRisk
  streakMessage: string
  bestTime: string | undefined
  expectedSessionMinutes: number | undefined
  readingWpm: number | undefined
  goalOnTrack: boolean
  goalMessage: string
  vocabProjection30: number
  vocabMessage: string
  book: BookForecast | undefined
  plan: string[]
}

export interface BriefingInput {
  telemetry: TelemetryState
  totalCorrect: number
  totalWrong: number
  learnedWords: number
  readingWpmTotal: number
  readingWpmCount: number
  joinedAt: string
  libraryProgress: Record<string, { completed: string[] }>
  xpToday: number
  dailyGoal: number
  lastActiveDay: string | undefined
  streak: number
  dueCount: number
  completedLessons: readonly string[]
  profile: {
    age?: number | undefined
    goal?: LearningGoal | undefined
    nativeLanguage?: string | undefined
  }
}

/**
 * The full daily forecast: who the learner is, what they will probably do next,
 * what is at risk, how far along their goals are and a concrete plan.
 */
export function dailyBriefing(input: BriefingInput): DailyBriefing {
  const inferred = usageProfile(input.telemetry, {
    totalCorrect: input.totalCorrect,
    totalWrong: input.totalWrong,
    learnedWords: input.learnedWords,
    readingWpmTotal: input.readingWpmTotal,
    readingWpmCount: input.readingWpmCount,
    libraryProgress: input.libraryProgress,
    joinedAt: input.joinedAt,
  })
  const identity = learnerIdentity(input.profile, inferred)
  const todayKey = localDateKey()

  const streak = streakForecast(input.lastActiveDay, todayKey)
  const goal = goalForecast(input.xpToday, input.dailyGoal)
  const vocab = vocabForecast(input.learnedWords, inferred.wordPacePerDay)
  const book = bookForecast(input.telemetry, input.libraryProgress)

  const plan: string[] = []
  if (input.dueCount > 0) plan.push(`Review ${input.dueCount} words due today`)
  if (input.completedLessons.length === 0) plan.push('Take your first lesson')
  if (input.xpToday < input.dailyGoal) {
    plan.push(`${input.dailyGoal - input.xpToday} XP to hit your daily goal`)
  }
  if (book !== undefined) {
    plan.push(`Read ${book.title} — ${formatDuration(book.estimatedMinutes * 60)} left`)
  }
  if (plan.length === 0) plan.push('You are all caught up — explore something new')

  return {
    identity: describeIdentity(identity),
    predictedNext: predictNextScreen(input.telemetry, input.telemetry.currentScreen ?? 'home'),
    streakRisk: streak.risk,
    streakMessage: streak.message,
    bestTime: hourLabel(inferred.bestHour),
    expectedSessionMinutes: inferred.avgSessionMinutes,
    readingWpm: inferred.readingWpm,
    goalOnTrack: goal.onTrack,
    goalMessage: goal.message,
    vocabProjection30: vocab.projection30,
    vocabMessage: vocab.message,
    book,
    plan: plan.slice(0, 4),
  }
}

function describeIdentity(identity: ReturnType<typeof learnerIdentity>): string {
  const parts = [
    ...(identity.ageLabel === '' ? [] : [identity.ageLabel]),
    ...(identity.goalLabel === '' ? [] : [`${identity.goalLabel.toLowerCase()} learner`]),
    ...(identity.nativeLanguage === undefined ? [] : [`${identity.nativeLanguage} speaker`]),
  ]
  const who = parts.length > 0 ? parts.join(', ') : 'A learner'
  const taste =
    identity.inferred.favoriteGenre === undefined
      ? 'still finding their taste'
      : `reading ${identity.inferred.favoriteGenre}`
  return `${who}, ${taste}`
}

function streakForecast(
  lastActiveDay: string | undefined,
  todayKey: string,
): { risk: StreakRisk; message: string } {
  if (lastActiveDay === todayKey) {
    return { risk: 'low', message: 'You are active today — keep it going' }
  }
  if (lastActiveDay === undefined) {
    return { risk: 'low', message: 'No streak yet — a lesson today starts one' }
  }
  const daysGap = Math.max(1, daysBetween(lastActiveDay, todayKey))
  if (daysGap === 1) {
    return {
      risk: 'medium',
      message: 'Yesterday was your last active day — one lesson today keeps the streak alive',
    }
  }
  return {
    risk: 'high',
    message: `Your streak is at risk (${daysGap} inactive ${daysGap === 1 ? 'day' : 'days'}) — log in today`,
  }
}

function goalForecast(xpToday: number, goal: number): { onTrack: boolean; message: string } {
  if (xpToday >= goal) {
    return { onTrack: true, message: `Daily goal reached (${xpToday}/${goal} XP) — nice!` }
  }
  const remaining = goal - xpToday
  return {
    onTrack: xpToday > 0,
    message: `${remaining} XP to reach today's goal (${xpToday}/${goal})`,
  }
}

function vocabForecast(
  learnedWords: number,
  wordsPerDay: number,
): {
  projection30: number
  message: string
} {
  const projection30 = learnedWords + Math.round(wordsPerDay * 30)
  return {
    projection30,
    message:
      wordsPerDay > 0
        ? `At your pace you will know ~${projection30} words in 30 days (${learnedWords} today)`
        : `You know ${learnedWords} words — keep learning to grow it`,
  }
}

function bookForecast(
  telemetry: TelemetryState,
  progress: Record<string, { completed: string[] }>,
): BookForecast | undefined {
  const candidates = LIBRARY.map((book) => {
    const completed = progress[book.id]?.completed.length ?? 0
    const remaining = book.sections - completed
    const avgSeconds =
      (telemetry.bookSections[book.id] ?? 0) > 0
        ? (telemetry.bookSeconds[book.id] ?? 0) / (telemetry.bookSections[book.id] ?? 1)
        : 0
    const estimatedMinutes = avgSeconds > 0 ? Math.round((remaining * avgSeconds) / 60) : 0
    return { book, remaining, estimatedMinutes, completed }
  })
    .filter((candidate) => candidate.remaining > 0)
    .toSorted((a, b) => b.completed - a.completed || b.remaining - a.remaining)

  const top = candidates[0]
  if (top === undefined || top.completed === 0) return undefined
  return {
    bookId: top.book.id,
    title: top.book.title,
    remainingSections: top.remaining,
    estimatedMinutes: top.estimatedMinutes,
    message:
      top.estimatedMinutes > 0
        ? `~${formatDuration(top.estimatedMinutes * 60)} left in ${top.book.title}`
        : `Keep going with ${top.book.title}`,
  }
}

function hourLabel(hour: number | undefined): string | undefined {
  if (hour === undefined) return undefined
  return `${hour.toString().padStart(2, '0')}:00`
}
