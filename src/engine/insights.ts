import type { TelemetryState } from '@/engine/telemetry'
import type { LibraryIndexBook } from '@/engine/types'
import type { LearningGoal } from '@/state/store'

import { COURSE } from '@/engine/lessons'
import { LIBRARY } from '@/engine/library'
import { ageBucketLabel, goalLabel } from '@/engine/profile'
import { averageWpm } from '@/engine/stats'

const ACTIVITY_SCREENS: Record<string, string> = {
  lesson: 'Lessons',
  'grammar-lesson': 'Grammar',
  read: 'Reading',
  dictionary: 'Dictionary',
  review: 'Review',
  speak: 'Speaking',
  write: 'Writing',
  dictation: 'Dictation',
  dialogue: 'Dialogues',
  analyzer: 'Analyzer',
}

export const SCREEN_LABELS: Record<string, string> = {
  home: 'Home',
  lesson: 'Lessons',
  'grammar-lesson': 'Grammar lessons',
  book: 'Book details',
  read: 'Reading',
  library: 'Library',
  dictionary: 'Dictionary',
  analyzer: 'Analyzer',
  profile: 'Profile',
  review: 'Review',
  speak: 'Speaking',
  write: 'Writing',
  dictation: 'Dictation',
  dialogue: 'Dialogues',
  grammar: 'Grammar',
  backup: 'Backup',
}

export interface ActivityShare {
  key: string
  label: string
  seconds: number
  share: number
}

export interface UsageProfile {
  activityShares: ActivityShare[]
  dominantActivity: string | undefined
  bestHour: number | undefined
  activeDays: number
  daysPerWeek: number
  avgSessionMinutes: number | undefined
  readingWpm: number | undefined
  avgResponseMs: number | undefined
  wordPacePerDay: number
  accuracy: number
  favoriteGenre: string | undefined
  favoriteDifficulty: number | undefined
  favoriteBookId: string | undefined
  topLookupWord: string | undefined
}

export interface BookRecommendation {
  book: LibraryIndexBook
  score: number
  progressPercent: number
  reasons: string[]
}

export interface LessonRecommendation {
  lessonId: string
  title: string
  unit: string
}

export interface PracticeRecommendation {
  kind: 'speak' | 'write' | 'dictation' | 'review'
  title: string
  reason: string
}

export interface NextScreenPrediction {
  screen: string
  label: string
  probability: number
}

export interface HabitMove {
  from: string
  to: string
  count: number
  label: string
}

/**
 * The most frequent screen-to-screen habits, e.g. "Lessons → Review".
 */
export function topTransitions(telemetry: TelemetryState, limit = 4): HabitMove[] {
  return Object.entries(telemetry.transitions)
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => {
      const [from, to] = key.split('>', 2)
      return {
        from: from ?? '',
        to: to ?? '',
        count,
        label: `${SCREEN_LABELS[from ?? ''] ?? from ?? ''} → ${SCREEN_LABELS[to ?? ''] ?? to ?? ''}`,
      }
    })
}

function topEntries(map: Record<string, number>, limit: number): { key: string; value: number }[] {
  return Object.entries(map)
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }))
}

/**
 * Infers a learner profile from telemetry + progress: what they do most, when
 * they are most active, their reading preferences and their pace.
 */
export function usageProfile(
  telemetry: TelemetryState,
  input: {
    totalCorrect: number
    totalWrong: number
    learnedWords: number
    readingWpmTotal: number
    readingWpmCount: number
    libraryProgress: Record<string, { completed: string[] }>
    joinedAt: string
  },
): UsageProfile {
  const activitySeconds: Record<string, number> = {}
  for (const [screen, label] of Object.entries(ACTIVITY_SCREENS)) {
    const seconds = telemetry.screenSeconds[screen] ?? 0
    if (seconds > 0) activitySeconds[label] = (activitySeconds[label] ?? 0) + seconds
  }
  const totalActivity = Object.values(activitySeconds).reduce((sum, value) => sum + value, 0)
  const activityShares: ActivityShare[] = Object.entries(activitySeconds)
    .toSorted((a, b) => b[1] - a[1])
    .map(([label, seconds]) => ({
      key: label,
      label,
      seconds,
      share: totalActivity > 0 ? seconds / totalActivity : 0,
    }))

  let bestHour: number | undefined
  let bestHourCount = 0
  for (let hour = 0; hour < telemetry.hourCounts.length; hour += 1) {
    const count = telemetry.hourCounts[hour] ?? 0
    if (count <= bestHourCount) continue
    bestHourCount = count
    bestHour = hour
  }
  if (bestHourCount === 0) bestHour = undefined

  const weeksSinceFirst =
    telemetry.firstSeen > 0
      ? Math.max(1, (Date.now() - telemetry.firstSeen) / (7 * 24 * 60 * 60 * 1000))
      : 1

  const daysSinceJoined = Math.max(
    1,
    Math.round((Date.now() - new Date(input.joinedAt).getTime()) / (24 * 60 * 60 * 1000)),
  )

  // Reading preferences from the books with the most completed sections.
  const bookSections = topEntries(telemetry.bookSections, 10)
  const genreCounts: Record<string, number> = {}
  let difficultyWeighted = 0
  let difficultyTotal = 0
  for (const entry of bookSections) {
    const book = LIBRARY.find((candidate) => candidate.id === entry.key)
    if (book === undefined) continue
    genreCounts[book.genre] = (genreCounts[book.genre] ?? 0) + entry.value
    difficultyWeighted += book.difficulty * entry.value
    difficultyTotal += entry.value
  }
  const favoriteGenre = Object.entries(genreCounts).toSorted((a, b) => b[1] - a[1])[0]?.[0]

  const total = input.totalCorrect + input.totalWrong
  const sessionSeconds = telemetry.sessionLengths.reduce((sum, value) => sum + value, 0)

  return {
    activityShares,
    dominantActivity: activityShares[0]?.label,
    bestHour,
    activeDays: telemetry.activeDays.length,
    daysPerWeek: Math.round((telemetry.activeDays.length / weeksSinceFirst) * 10) / 10,
    avgSessionMinutes:
      telemetry.sessionLengths.length > 0
        ? Math.round((sessionSeconds / telemetry.sessionLengths.length / 60) * 10) / 10
        : undefined,
    readingWpm: averageWpm(input.readingWpmTotal, input.readingWpmCount),
    avgResponseMs:
      telemetry.answerMsCount > 0
        ? Math.round(telemetry.answerMsTotal / telemetry.answerMsCount)
        : undefined,
    wordPacePerDay: Math.round((input.learnedWords / daysSinceJoined) * 10) / 10,
    accuracy: total > 0 ? Math.round((input.totalCorrect / total) * 100) : 0,
    favoriteGenre,
    favoriteDifficulty:
      difficultyTotal > 0
        ? Math.round((difficultyWeighted / difficultyTotal) * 10) / 10
        : undefined,
    favoriteBookId: bookSections[0]?.key,
    topLookupWord: topEntries(telemetry.wordLookups, 1)[0]?.key,
  }
}

/**
 * Predicts the most likely next screen from the observed screen-to-screen
 * transition history (Markov-style first-order model).
 */
export function predictNextScreen(
  telemetry: TelemetryState,
  current: string,
): NextScreenPrediction[] {
  const prefix = `${current}>`
  const candidates: { screen: string; count: number }[] = []
  for (const [key, count] of Object.entries(telemetry.transitions)) {
    if (!key.startsWith(prefix)) continue
    candidates.push({ screen: key.slice(prefix.length), count })
  }
  const total = candidates.reduce((sum, candidate) => sum + candidate.count, 0)
  return candidates
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((candidate) => ({
      screen: candidate.screen,
      label: SCREEN_LABELS[candidate.screen] ?? candidate.screen,
      probability: total > 0 ? Math.round((candidate.count / total) * 100) : 0,
    }))
}

/**
 * Ranks books the learner is likely to enjoy: continue what they started,
 * surface their favourite genre, match their declared goal and stay close to
 * their difficulty sweet spot.
 */
export function recommendBooks(
  profile: UsageProfile,
  telemetry: TelemetryState,
  progress: Record<string, { completed: string[] }>,
  options: { limit?: number; age?: number; goal?: LearningGoal } = {},
): BookRecommendation[] {
  const limit = options.limit ?? 3
  const sweetSpot =
    options.age !== undefined && options.age < 18
      ? Math.min(3, profile.favoriteDifficulty ?? 3)
      : (profile.favoriteDifficulty ?? 3)
  const goalGenres = goalPreferredGenres(options.goal)
  const goalLabelText = options.goal === undefined ? undefined : goalLabel(options.goal)
  const candidates: BookRecommendation[] = []
  for (const book of LIBRARY) {
    const completed = progress[book.id]?.completed.length ?? 0
    if (completed >= book.sections) continue

    let score = 0
    const reasons: string[] = []
    const percent = book.sections > 0 ? Math.round((completed / book.sections) * 100) : 0

    if (goalLabelText !== undefined && goalGenres.includes(book.genre)) {
      score += 3
      reasons.push(`A great match for your ${goalLabelText} goal`)
    }
    if (completed > 0) {
      score += 5
      reasons.push(`You've read ${percent}% — keep going`)
    }
    if (profile.favoriteGenre !== undefined && book.genre === profile.favoriteGenre) {
      score += 4
      reasons.push(`Same genre as your favourite (${book.genre})`)
    }
    if (Math.abs(book.difficulty - sweetSpot) <= 1) {
      score += 2
    }
    const views = telemetry.bookViews[book.id] ?? 0
    score += Math.min(2, views)
    if (views === 0) {
      score += 1
      reasons.push('You have not opened it yet')
    }

    candidates.push({ book, score, progressPercent: percent, reasons })
  }

  if (candidates.length === 0) return []

  return candidates
    .toSorted((a, b) => b.score - a.score || a.book.difficulty - b.book.difficulty)
    .slice(0, limit)
}

/**
 * The book genres that best serve each learning goal.
 */
function goalPreferredGenres(goal: LearningGoal | undefined): string[] {
  switch (goal) {
    case 'travel': {
      return ['Adventure', 'Fantasy']
    }
    case 'work': {
      return ['Classic', 'Romance']
    }
    case 'study': {
      return ['Classic', 'Historical']
    }
    case 'exams': {
      return ['Classic', 'Adventure']
    }
    case 'move': {
      return ['Adventure', 'Fantasy']
    }
    default: {
      return []
    }
  }
}

/**
 * Who the learner says they are (age, goal, language) merged with what their
 * behaviour reveals — the identity that drives every recommendation.
 */
export interface LearnerIdentity {
  ageLabel: string
  goal: LearningGoal | undefined
  goalLabel: string
  nativeLanguage: string | undefined
  inferred: UsageProfile
}

export function learnerIdentity(
  profile: {
    age?: number | undefined
    goal?: LearningGoal | undefined
    nativeLanguage?: string | undefined
  },
  inferred: UsageProfile,
): LearnerIdentity {
  return {
    ageLabel: ageBucketLabel(profile.age),
    goal: profile.goal,
    goalLabel: goalLabel(profile.goal),
    nativeLanguage: profile.nativeLanguage,
    inferred,
  }
}

/**
 * A short human sentence describing the learner ("A 26–35 travel learner who
 * reads mostly Fantasy and is sharpest around 21:00").
 */
export function describeLearner(identity: LearnerIdentity): string {
  const parts = [
    ...(identity.ageLabel === '' ? [] : [identity.ageLabel]),
    ...(identity.goalLabel === '' ? [] : [`${identity.goalLabel.toLowerCase()} learner`]),
    ...(identity.nativeLanguage === undefined ? [] : [`${identity.nativeLanguage} speaker`]),
  ]
  const who = parts.length > 0 ? parts.join(', ') : 'A learner'
  const taste =
    identity.inferred.favoriteGenre === undefined
      ? 'is still finding their taste'
      : `reads mostly ${identity.inferred.favoriteGenre}`
  const best =
    identity.inferred.bestHour === undefined
      ? ''
      : ` and is sharpest around ${bestHourLabel(identity.inferred.bestHour)}`
  return `${who} who ${taste}${best}.`
}

/**
 * The next lesson the course map has unlocked for the learner.
 */
export function nextLessonRecommendation(
  completedLessons: readonly string[],
): LessonRecommendation | undefined {
  const completed = new Set(completedLessons)
  for (const unit of COURSE) {
    const next = firstUnlockedLesson(unit.lessons, completed, unit.title)
    if (next !== undefined) return next
  }
  return undefined
}

function firstUnlockedLesson(
  lessons: readonly { id: string; title: string }[],
  completed: ReadonlySet<string>,
  unit: string,
): LessonRecommendation | undefined {
  for (let index = 0; index < lessons.length; index += 1) {
    const lesson = lessons[index]
    if (lesson === undefined || completed.has(lesson.id)) continue
    if (index > 0 && !completed.has(lessons[index - 1]?.id ?? '')) continue
    return { lessonId: lesson.id, title: lesson.title, unit }
  }
  return undefined
}

/**
 * Suggests the practice mode that the learner has neglected or is weakest at.
 */
export function recommendPractice(input: {
  speakingPrompts: number
  speakingGood: number
  writingAttempts: number
  writingTotalScore: number
  dueReviewCount: number
  goal?: LearningGoal
}): PracticeRecommendation | undefined {
  if (input.speakingPrompts === 0) {
    return { kind: 'speak', title: 'Speaking', reason: 'You have not practiced speaking yet' }
  }
  if (input.writingAttempts === 0) {
    return { kind: 'write', title: 'Writing', reason: 'You have not tried free writing yet' }
  }
  if (input.dueReviewCount >= 5) {
    return {
      kind: 'review',
      title: 'Review',
      reason: `${input.dueReviewCount} words are due for review`,
    }
  }
  const speakGood = Math.round((input.speakingGood / input.speakingPrompts) * 100)
  const writeAvg =
    input.writingAttempts > 0 ? Math.round(input.writingTotalScore / input.writingAttempts) : 0
  const wantsSpeaking = input.goal === 'travel' || input.goal === 'move'
  const wantsWriting = input.goal === 'work'
  if (speakGood < 70 || (wantsSpeaking && speakGood < 85)) {
    return {
      kind: 'speak',
      title: 'Speaking',
      reason: `Only ${speakGood}% of your speech was good`,
    }
  }
  if (writeAvg < 6 || (wantsWriting && writeAvg < 8)) {
    return { kind: 'write', title: 'Writing', reason: `Your writing averages ${writeAvg}/10` }
  }
  return undefined
}

export function favoriteBookLabel(profile: UsageProfile): string {
  if (profile.favoriteBookId === undefined) return ''
  return LIBRARY.find((book) => book.id === profile.favoriteBookId)?.title ?? ''
}

export function bestHourLabel(hour: number | undefined): string {
  if (hour === undefined) return 'any time'
  return `${hour.toString().padStart(2, '0')}:00`
}
