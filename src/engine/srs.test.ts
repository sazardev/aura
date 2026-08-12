import { describe, expect, it } from 'vitest'

import { createCard, dueCards, dueLabel, isDue, reviewCard } from '@/engine/srs'

const NOW = new Date('2026-06-01T00:00:00.000Z')

describe('SRS (SM-2)', () => {
  it('creates a card ready for review', () => {
    const card = createCard('apple', 'a round fruit', { now: NOW })
    expect(card.word).toBe('apple')
    expect(card.meaning).toBe('a round fruit')
    expect(card.state.interval).toBe(0)
    expect(isDue(card, NOW)).toBe(true)
  })

  it('applies SM-2 on success and schedules the next review', () => {
    const card = createCard('apple', 'a fruit', { now: NOW })
    const reviewed = reviewCard(card, 4, NOW)
    expect(reviewed.state.repetition).toBe(1)
    expect(reviewed.state.interval).toBeGreaterThan(0)
    expect(isDue(reviewed, NOW)).toBe(false)
    expect(reviewed.state.lapses).toBe(0)
  })

  it('resets repetition and increments lapses on failure', () => {
    const card = createCard('apple', 'a fruit', { now: NOW })
    const ok = reviewCard(card, 4, NOW)
    const failed = reviewCard(ok, 1, NOW)
    expect(failed.state.repetition).toBe(0)
    expect(failed.state.lapses).toBe(1)
  })

  it('dueCards returns only pending, sorted', () => {
    const early = reviewCard(
      createCard('banana', 'a fruit', { now: NOW }),
      4,
      new Date('2025-01-01T00:00:00Z'),
    )
    const late = reviewCard(createCard('apple', 'a fruit', { now: NOW }), 4, NOW)
    const due = dueCards([late, early], NOW)
    expect(due).toHaveLength(1)
    expect(due[0]?.word).toBe('banana')
  })

  it('dueLabel says today when due', () => {
    const card = createCard('apple', 'a fruit', { now: NOW })
    expect(dueLabel(card, NOW)).toBe('today')
  })
})
