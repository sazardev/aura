import { beforeEach, describe, expect, it } from 'vitest'

import { type BriefingInput, dailyBriefing } from '@/engine/briefing'
import { getTelemetry, resetTelemetry, type TelemetryState } from '@/engine/telemetry'
import { localDateKey, previousDayKey } from '@/lib/date'

beforeEach(() => {
  resetTelemetry()
})

function makeState(overrides: Partial<TelemetryState>): TelemetryState {
  return { ...structuredClone(getTelemetry()), ...overrides }
}

function input(telemetry: TelemetryState, overrides: Partial<BriefingInput> = {}): BriefingInput {
  return {
    telemetry,
    totalCorrect: 100,
    totalWrong: 20,
    learnedWords: 50,
    readingWpmTotal: 1800,
    readingWpmCount: 10,
    joinedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    libraryProgress: {},
    xpToday: 30,
    dailyGoal: 50,
    lastActiveDay: undefined,
    streak: 3,
    dueCount: 0,
    completedLessons: [],
    profile: { age: 26, goal: 'travel', nativeLanguage: 'Spanish' },
    ...overrides,
  }
}

describe('dailyBriefing', () => {
  it('describes the learner and predicts the next screen', () => {
    const telemetry = makeState({
      transitions: { 'lesson>review': 5 },
      currentScreen: 'lesson',
    })
    const briefing = dailyBriefing(input(telemetry, { completedLessons: ['greetings'] }))

    expect(briefing.identity).toContain('travel learner')
    expect(briefing.identity).toContain('Spanish speaker')
    expect(briefing.predictedNext[0]?.screen).toBe('review')
  })

  it('reports the daily goal as reached or pending', () => {
    const telemetry = makeState({})
    expect(dailyBriefing(input(telemetry)).goalMessage).toContain('20 XP')
    expect(dailyBriefing(input(telemetry, { xpToday: 60 })).goalMessage).toContain('reached')
  })

  it('flags a medium risk when yesterday was the last active day', () => {
    const yesterday = previousDayKey(localDateKey())
    const briefing = dailyBriefing(input(makeState({}), { lastActiveDay: yesterday }))
    expect(briefing.streakRisk).toBe('medium')
  })

  it('flags a high risk after several inactive days', () => {
    const twoDaysAgo = previousDayKey(previousDayKey(localDateKey()))
    const briefing = dailyBriefing(input(makeState({}), { lastActiveDay: twoDaysAgo }))
    expect(briefing.streakRisk).toBe('high')
  })

  it('projects vocabulary at the current pace', () => {
    const briefing = dailyBriefing(input(makeState({}), { learnedWords: 50 }))
    expect(briefing.vocabProjection30).toBeGreaterThan(50)
    expect(briefing.vocabMessage).toContain('30 days')
  })

  it('estimates how long the current book will take', () => {
    const telemetry = makeState({
      bookSections: { 'alice-in-wonderland': 2 },
      bookSeconds: { 'alice-in-wonderland': 600 },
    })
    const briefing = dailyBriefing(
      input(telemetry, {
        libraryProgress: { 'alice-in-wonderland': { completed: ['s1-1', 's1-2'] } },
      }),
    )
    expect(briefing.book?.bookId).toBe('alice-in-wonderland')
    expect(briefing.book?.remainingSections).toBeGreaterThan(0)
    expect(briefing.book?.estimatedMinutes).toBeGreaterThan(0)
  })

  it('builds a concrete daily plan', () => {
    const briefing = dailyBriefing(
      input(makeState({}), { dueCount: 5, xpToday: 10, dailyGoal: 50 }),
    )
    expect(briefing.plan.length).toBeGreaterThan(0)
    expect(briefing.plan.join(' ').toLowerCase()).toContain('review')
  })
})
