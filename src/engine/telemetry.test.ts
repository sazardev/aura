import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  averageAnswerMs,
  flushTelemetry,
  getTelemetry,
  initTelemetry,
  resetTelemetry,
  subscribe,
  track,
  trackAnalysisRun,
  trackBookView,
  trackGrammarAnswer,
  trackImport,
  trackLessonAnswer,
  trackLessonComplete,
  trackLessonStart,
  trackReaderQuizAnswer,
  trackReview,
  trackScreen,
  trackSectionComplete,
  trackSpeakAttempt,
  trackWordLookup,
  trackWordSave,
  trackWriteAttempt,
} from '@/engine/telemetry'

beforeEach(() => {
  resetTelemetry()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('telemetry', () => {
  it('tracks raw events with counters', () => {
    track('lesson_answer', { lessonId: 'greetings', correct: true })
    track('lesson_answer', { lessonId: 'greetings', correct: false })

    const state = getTelemetry()
    expect(state.events.length).toBe(2)
    expect(state.eventCounts['lesson_answer']).toBe(2)
    expect(state.lastSeen).toBeGreaterThan(0)
    expect(state.activeDays.length).toBe(1)
  })

  it('counts screen views and measures time per screen', () => {
    vi.spyOn(Date, 'now').mockReturnValue(10_000)
    trackScreen('home')
    vi.spyOn(Date, 'now').mockReturnValue(10_000 + 5000)
    trackScreen('library')

    const state = getTelemetry()
    expect(state.screenViews['home']).toBe(1)
    expect(state.screenViews['library']).toBe(1)
    expect(state.screenSeconds['home']).toBe(5)
    expect(state.currentScreen).toBe('library')
  })

  it('flushes the current screen time on flushTelemetry', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100)
    trackScreen('home')
    vi.spyOn(Date, 'now').mockReturnValue(100 + 2000)
    flushTelemetry()

    expect(getTelemetry().screenSeconds['home']).toBe(2)
    expect(getTelemetry().currentScreenAt).toBe(100 + 2000)
  })

  it('starts a new session only after a long gap', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    initTelemetry()
    const firstSession = getTelemetry().sessionId
    expect(getTelemetry().sessions).toBe(1)

    // Same session shortly after.
    vi.spyOn(Date, 'now').mockReturnValue(1000 + 60_000)
    initTelemetry()
    expect(getTelemetry().sessionId).toBe(firstSession)
    expect(getTelemetry().sessions).toBe(1)

    // New session after 30+ minutes of inactivity.
    vi.spyOn(Date, 'now').mockReturnValue(1000 + 32 * 60 * 1000)
    initTelemetry()
    expect(getTelemetry().sessions).toBe(2)
    expect(getTelemetry().sessionId).not.toBe(firstSession)
  })

  it('accumulates per-entity totals', () => {
    trackWordLookup('Garden')
    trackWordLookup('garden')
    trackWordSave('garden')
    trackBookView('secret-garden')
    trackSectionComplete('secret-garden', 42)
    trackLessonStart('greetings')
    trackLessonAnswer('greetings', true)
    trackLessonAnswer('greetings', false)
    trackLessonComplete('greetings')
    trackReview(true)
    trackSpeakAttempt(true)
    trackWriteAttempt(120)
    trackAnalysisRun()
    trackImport()

    const state = getTelemetry()
    expect(state.wordLookups['garden']).toBe(2)
    expect(state.wordSaves['garden']).toBe(1)
    expect(state.bookViews['secret-garden']).toBe(1)
    expect(state.bookSections['secret-garden']).toBe(1)
    expect(state.bookSeconds['secret-garden']).toBe(42)
    expect(state.lessonStarts['greetings']).toBe(1)
    expect(state.lessonAnswers['greetings']).toBe(2)
    expect(state.lessonCorrect['greetings']).toBe(1)
    expect(state.lessonCompletes['greetings']).toBe(1)
    expect(state.reviews).toBe(1)
    expect(state.reviewGood).toBe(1)
    expect(state.speakAttempts).toBe(1)
    expect(state.writeAttempts).toBe(1)
    expect(state.writeChars).toBe(120)
    expect(state.analysisRuns).toBe(1)
    expect(state.imports).toBe(1)
  })

  it('tracks answer time, lesson duration and quiz accuracy', () => {
    trackLessonAnswer('greetings', true, 2500)
    trackLessonAnswer('greetings', false, 1500)
    trackLessonComplete('greetings', 90)
    trackReaderQuizAnswer(true, 4000)
    trackReaderQuizAnswer(false, 2000)
    trackGrammarAnswer(true, 800)
    trackReview(true, 1200)

    const state = getTelemetry()
    expect(state.answerMsTotal).toBe(12_000)
    expect(state.answerMsCount).toBe(6)
    expect(averageAnswerMs()).toBe(2000)
    expect(state.lessonSeconds['greetings']).toBe(90)
    expect(state.readerQuizAnswers).toBe(2)
    expect(state.readerQuizCorrect).toBe(1)
    expect(state.grammarAnswers).toBe(1)
    expect(state.grammarCorrect).toBe(1)
  })

  it('ignores invalid answer times', () => {
    trackLessonAnswer('greetings', true, -5)
    expect(getTelemetry().answerMsCount).toBe(0)
    expect(averageAnswerMs()).toBeUndefined()
  })

  it('caps the raw event ring buffer', () => {
    for (let index = 0; index < 2100; index += 1) {
      track('sample', { index })
    }
    expect(getTelemetry().events.length).toBeLessThanOrEqual(2000)
  })

  it('notifies subscribers on every event', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)
    track('hello')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    track('bye')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps event totals across a reset of the raw buffer', () => {
    track('one')
    expect(getTelemetry().eventCounts['one']).toBe(1)
  })
})
