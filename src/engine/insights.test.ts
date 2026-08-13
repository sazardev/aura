import { beforeEach, describe, expect, it } from 'vitest'

import {
  bestHourLabel,
  describeLearner,
  learnerIdentity,
  nextLessonRecommendation,
  predictNextScreen,
  recommendBooks,
  recommendPractice,
  usageProfile,
} from '@/engine/insights'
import { allLessons } from '@/engine/lessons'
import { getTelemetry, resetTelemetry, type TelemetryState } from '@/engine/telemetry'

beforeEach(() => {
  resetTelemetry()
})

function makeState(overrides: Partial<TelemetryState>): TelemetryState {
  const fresh = getTelemetry()
  return { ...structuredClone(fresh), ...overrides }
}

const baseInput = {
  totalCorrect: 80,
  totalWrong: 20,
  learnedWords: 30,
  readingWpmTotal: 1800,
  readingWpmCount: 10,
  libraryProgress: {},
  joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
}

function allLessonIds(): string[] {
  return allLessons().map((lesson) => lesson.id)
}

describe('usageProfile', () => {
  it('infers dominant activity and best hour', () => {
    const state = makeState({
      screenSeconds: { read: 1200, lesson: 600, dictionary: 60 },
      hourCounts: Array.from({ length: 24 }, (_, hour) => (hour === 21 ? 40 : 0)),
      activeDays: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'],
      sessionLengths: [600, 900, 1200],
      bookSections: { 'alice-in-wonderland': 5, 'treasure-island': 3 },
      wordLookups: { garden: 4 },
    })
    const profile = usageProfile(state, baseInput)

    expect(profile.dominantActivity).toBe('Reading')
    expect(profile.bestHour).toBe(21)
    expect(profile.activeDays).toBe(4)
    expect(profile.avgSessionMinutes).toBe(15)
    expect(profile.accuracy).toBe(80)
    expect(profile.readingWpm).toBe(180)
    expect(profile.favoriteGenre).toBe('Fantasy')
    expect(profile.favoriteBookId).toBe('alice-in-wonderland')
    expect(profile.topLookupWord).toBe('garden')
  })

  it('returns undefined best hour when there is no activity', () => {
    const state = makeState({ hourCounts: Array.from({ length: 24 }, () => 0) })
    expect(usageProfile(state, baseInput).bestHour).toBeUndefined()
  })
})

describe('predictNextScreen', () => {
  it('predicts the most likely next screen from transitions', () => {
    const state = makeState({
      transitions: {
        'lesson>review': 6,
        'lesson>read': 3,
        'lesson>home': 1,
      },
    })
    const predictions = predictNextScreen(state, 'lesson')

    expect(predictions.length).toBe(3)
    expect(predictions[0]).toMatchObject({ screen: 'review', probability: 60 })
    expect(predictions[1]?.screen).toBe('read')
  })

  it('returns no predictions without history', () => {
    expect(predictNextScreen(makeState({}), 'lesson')).toEqual([])
  })
})

describe('recommendBooks', () => {
  it('prioritises continuations and the favourite genre', () => {
    const state = makeState({ bookViews: { 'alice-in-wonderland': 2 } })
    const profile = usageProfile(state, baseInput)
    const progress = {
      'wonderful-wizard-of-oz': { completed: ['s1-1'] },
    }
    const books = recommendBooks(profile, state, progress)

    expect(books.length).toBeGreaterThan(0)
    expect(books[0]?.book.id).toBe('wonderful-wizard-of-oz')
    expect(books[0]?.reasons.join(' ')).toContain("You've read")
  })

  it('prefers books that match the declared goal', () => {
    const state = makeState({})
    const books = recommendBooks(usageProfile(state, baseInput), state, {}, { goal: 'travel' })
    expect(books.length).toBeGreaterThan(0)
    expect(books[0]?.reasons.join(' ')).toContain('Travel goal')
  })

  it('skips fully finished books', () => {
    const state = makeState({})
    const progress = {
      'alice-in-wonderland': { completed: Array.from({ length: 999 }, () => 'x') },
    }
    const books = recommendBooks(usageProfile(state, baseInput), state, progress)
    expect(books.every((entry) => entry.book.id !== 'alice-in-wonderland')).toBe(true)
  })
})

describe('nextLessonRecommendation', () => {
  it('returns the first unlocked lesson', () => {
    const first = allLessonIds()[0]
    if (first === undefined) throw new Error('Course is empty')
    const recommendation = nextLessonRecommendation([])
    expect(recommendation).toBeDefined()
    expect(recommendation?.lessonId).toBe(first)
    expect(recommendation?.unit.length).toBeGreaterThan(0)
  })

  it('returns undefined when the course is complete', () => {
    expect(nextLessonRecommendation(allLessonIds())).toBeUndefined()
  })
})

describe('recommendPractice', () => {
  it('suggests speaking when it was never tried', () => {
    const rec = recommendPractice({
      speakingPrompts: 0,
      speakingGood: 0,
      writingAttempts: 3,
      writingTotalScore: 20,
      dueReviewCount: 0,
    })
    expect(rec?.kind).toBe('speak')
  })

  it('suggests review when many cards are due', () => {
    const rec = recommendPractice({
      speakingPrompts: 6,
      speakingGood: 5,
      writingAttempts: 3,
      writingTotalScore: 20,
      dueReviewCount: 8,
    })
    expect(rec?.kind).toBe('review')
  })

  it('suggests nothing when everything is healthy', () => {
    const rec = recommendPractice({
      speakingPrompts: 6,
      speakingGood: 6,
      writingAttempts: 3,
      writingTotalScore: 24,
      dueReviewCount: 0,
    })
    expect(rec).toBeUndefined()
  })
})

describe('learnerIdentity', () => {
  it('merges declared identity with inferred behaviour', () => {
    const state = makeState({
      screenSeconds: { read: 1000 },
      hourCounts: Array.from({ length: 24 }, (_, hour) => (hour === 8 ? 30 : 0)),
      bookSections: { 'treasure-island': 4 },
    })
    const inferred = usageProfile(state, baseInput)
    const identity = learnerIdentity(
      { age: 26, goal: 'travel', nativeLanguage: 'Spanish' },
      inferred,
    )

    expect(identity.ageLabel).toBe('26–35')
    expect(identity.goalLabel).toBe('Travel')
    expect(identity.nativeLanguage).toBe('Spanish')
    expect(identity.inferred.favoriteGenre).toBe('Adventure')
    expect(describeLearner(identity)).toContain('travel learner')
    expect(describeLearner(identity)).toContain('reads mostly Adventure')
    expect(describeLearner(identity)).toContain('08:00')
  })
})

describe('bestHourLabel', () => {
  it('formats an hour and a fallback', () => {
    expect(bestHourLabel(9)).toBe('09:00')
    expect(bestHourLabel(undefined)).toBe('any time')
  })
})
