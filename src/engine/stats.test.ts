import { describe, expect, it } from 'vitest'

import type { DailyProgress } from '@/state/store'

import { createCard, reviewCard } from '@/engine/srs'
import {
  accuracyPercent,
  activityDays,
  averageWpm,
  bookCompletion,
  formatDuration,
  lastDayKeys,
  skillSummary,
  srsMastery,
  weakWordsSorted,
  weekActivity,
  wordsByDay,
} from '@/engine/stats'
import { previousDayKey } from '@/lib/date'

describe('Stats helpers', () => {
  it('builds the last N day keys oldest first', () => {
    const keys = lastDayKeys('2026-08-12', 7)
    expect(keys.length).toBe(7)
    expect(keys.at(-1)).toBe('2026-08-12')
    expect(keys[0]).toBe(
      previousDayKey(
        previousDayKey(
          previousDayKey(previousDayKey(previousDayKey(previousDayKey('2026-08-12')))),
        ),
      ),
    )
    for (let index = 1; index < keys.length; index += 1) {
      expect(previousDayKey(keys[index] ?? '')).toBe(keys[index - 1] ?? '')
    }
  })

  it('fills zero days and reads activity from history', () => {
    const today = '2026-08-12'
    const yesterday = previousDayKey(today)
    const history: Record<string, DailyProgress> = {
      [today]: { date: today, xp: 40, correct: 8, wrong: 2, lessons: 1, cards: 4, readSeconds: 0 },
      [yesterday]: {
        date: yesterday,
        xp: 20,
        correct: 4,
        wrong: 0,
        lessons: 0,
        cards: 2,
        readSeconds: 0,
      },
    }
    const week = weekActivity(history, today)
    expect(week.length).toBe(7)
    expect(week.at(-1)?.xp).toBe(40)
    expect(week.at(-2)?.xp).toBe(20)
    expect(week[0]?.xp).toBe(0)
  })

  it('computes accuracy and average wpm', () => {
    expect(accuracyPercent(8, 2)).toBe(80)
    expect(accuracyPercent(0, 0)).toBe(0)
    expect(averageWpm(550, 3)).toBe(183)
    expect(averageWpm(0, 0)).toBeUndefined()
  })

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(125)).toBe('2m 5s')
    expect(formatDuration(3600)).toBe('1h 0m')
  })

  it('sorts weak words by fragility', () => {
    const weak = { good: 1, 'very-bad': 5, medium: 2 }
    const sorted = weakWordsSorted(weak, 8)
    expect(sorted[0]?.word).toBe('very-bad')
    expect(sorted[1]?.word).toBe('medium')
    expect(sorted[2]?.word).toBe('good')
  })

  it('lists days with activity, newest first', () => {
    const history: Record<string, DailyProgress> = {
      '2026-08-10': {
        date: '2026-08-10',
        xp: 10,
        correct: 2,
        wrong: 0,
        lessons: 1,
        cards: 0,
        readSeconds: 0,
      },
      '2026-08-12': {
        date: '2026-08-12',
        xp: 30,
        correct: 6,
        wrong: 1,
        lessons: 2,
        cards: 3,
        readSeconds: 120,
      },
    }
    const days = activityDays(history)
    expect(days[0]?.date).toBe('2026-08-12')
    expect(days[0]?.readSeconds).toBe(120)
    expect(days[1]?.date).toBe('2026-08-10')
  })

  it('counts words added per day, oldest first', () => {
    const cards = [
      createCard('alpha', 'first', { now: new Date('2026-08-10T10:00:00') }),
      createCard('beta', 'second', { now: new Date('2026-08-12T09:00:00') }),
      createCard('gamma', 'third', { now: new Date('2026-08-12T15:00:00') }),
    ]
    const byDay = wordsByDay(cards)
    expect(byDay).toEqual([
      { date: '2026-08-10', count: 1 },
      { date: '2026-08-12', count: 2 },
    ])
  })

  it('classifies cards by SM-2 maturity', () => {
    const base = createCard('alpha', 'first', { now: new Date('2026-08-01') })
    const fresh = createCard('beta', 'second', { now: new Date('2026-08-01') })
    const learning = reviewCard(
      reviewCard(createCard('gamma', 'third', { now: new Date('2026-08-01') }), 4),
      4,
    )
    const established = reviewCard(
      reviewCard(reviewCard(createCard('delta', 'fourth', { now: new Date('2026-08-01') }), 4), 4),
      4,
    )
    const lapsed = reviewCard(base, 1)
    const mastery = srsMastery([fresh, learning, established, lapsed])
    expect(mastery.fresh).toBe(2)
    expect(mastery.learning).toBe(1)
    expect(mastery.established).toBe(1)
    expect(mastery.lapsed).toBeGreaterThanOrEqual(1)
  })

  it('summarizes the practice skills', () => {
    const summary = skillSummary({
      speakingSessions: 3,
      speakingPrompts: 18,
      speakingGood: 14,
      writingAttempts: 4,
      writingBest: 9,
      writingTotalScore: 26,
      readingSeconds: 600,
      readingWpmTotal: 400,
      readingWpmCount: 2,
    })
    expect(summary.speaking.goodPercent).toBe(78)
    expect(summary.writing.average).toBe(6.5)
    expect(summary.writing.best).toBe(9)
    expect(summary.reading.minutes).toBe(10)
    expect(summary.reading.wpm).toBe(200)
  })

  it('computes per-book reading completion', () => {
    const book = {
      id: 'b1',
      title: 'Book One',
      sections: 3,
    }
    const result = bookCompletion({ b1: { completed: ['s1'] } }, [book])
    expect(result[0]?.done).toBe(1)
    expect(result[0]?.total).toBe(3)
    expect(result[0]?.percent).toBe(33)
  })
})
