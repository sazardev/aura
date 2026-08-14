import { describe, expect, it } from 'vitest'

import {
  buildReviewQueue,
  buildReviewSession,
  initialType,
  MAX_SESSION_CARDS,
  retryItem,
  reviewGradeFor,
  wordContextFor,
} from '@/engine/review'
import { createCard } from '@/engine/srs'

const NOW = new Date('2026-06-01T00:00:00.000Z')

function dueCard(word: string, meaning: string, dueAt: string) {
  const card = createCard(word, meaning, { now: NOW })
  const diff = new Date(dueAt).getTime() - NOW.getTime()
  const interval = Math.max(1, Math.round(diff / 86_400_000))
  const state = { ...card.state, interval, due: dueAt }
  return { ...card, state }
}

describe('review session', () => {
  it('sorts weakest words first', () => {
    const cards = [
      dueCard('apple', 'a fruit', '2026-06-01T00:00:00.000Z'),
      dueCard('banana', 'a long fruit', '2026-06-01T00:00:00.000Z'),
      dueCard('cherry', 'a small fruit', '2026-06-01T00:00:00.000Z'),
    ]
    const session = buildReviewSession(cards, { banana: 3, apple: 1 }, NOW)
    expect(session.map((word) => word.word)).toEqual(['banana', 'apple', 'cherry'])
  })

  it('drags weak non-due cards into the session', () => {
    const cards = [
      dueCard('apple', 'a fruit', '2026-06-01T00:00:00.000Z'),
      dueCard('banana', 'a long fruit', '2026-07-01T00:00:00.000Z'),
    ]
    const session = buildReviewSession(cards, { banana: 5 }, NOW)
    expect(session.map((word) => word.word)).toEqual(['apple', 'banana'])
  })

  it('caps the session size', () => {
    const cards = Array.from({ length: MAX_SESSION_CARDS + 5 }, (_, index) =>
      dueCard(`word-${index}`, `meaning ${index}`, '2026-06-01T00:00:00.000Z'),
    )
    const session = buildReviewSession(cards, {}, NOW)
    expect(session).toHaveLength(MAX_SESSION_CARDS)
  })

  it('attaches course context for known words', () => {
    const cards = [dueCard('hello', 'a greeting', '2026-06-01T00:00:00.000Z')]
    const session = buildReviewSession(cards, {}, NOW)
    const hello = session[0]
    expect(hello?.context.lessonId).toBe('greetings-1')
    expect(hello?.context.unitTitle).toBe('Greetings & Introductions')
    expect(hello?.context.sentence).toBe('Hello, my friend!')
  })

  it('returns empty context for unknown words', () => {
    expect(wordContextFor('zzz-nonexistent-zzz')).toEqual({})
  })
})

describe('question ladder', () => {
  it('escalates the first type with weakness', () => {
    expect(initialType(0, 0)).toBe('choice')
    expect(initialType(1, 0)).toBe('listen')
    expect(initialType(0, 1)).toBe('listen')
    expect(initialType(2, 0)).toBe('type')
    expect(initialType(0, 3)).toBe('type')
  })

  it('maps a fresh word to a choice question', () => {
    const cards = [dueCard('apple', 'a fruit', '2026-06-01T00:00:00.000Z')]
    const queue = buildReviewQueue(buildReviewSession(cards, {}, NOW))
    expect(queue).toHaveLength(1)
    const item = queue[0]
    expect(item?.exercise.kind).toBe('choice')
    if (item?.exercise.kind === 'choice') {
      expect(item.exercise.options).toContain('apple')
      expect(item.exercise.answer).toBe('apple')
      expect(item.exercise.options).toHaveLength(4)
      expect(new Set(item.exercise.options).size).toBe(4)
    }
  })

  it('builds a listen question with meaning options', () => {
    const cards = [dueCard('apple', 'a fruit', '2026-06-01T00:00:00.000Z')]
    const queue = buildReviewQueue(buildReviewSession(cards, { apple: 1 }, NOW))
    const item = queue[0]
    expect(item?.exercise.kind).toBe('listen')
    if (item?.exercise.kind === 'listen') {
      expect(item.exercise.options).toContain('a fruit')
      expect(item.exercise.options).toHaveLength(4)
    }
  })

  it('reiterates a failed word with a harder question type', () => {
    const cards = [dueCard('apple', 'a fruit', '2026-06-01T00:00:00.000Z')]
    const word = buildReviewSession(cards, {}, NOW)[0]!
    const first = buildReviewQueue([word])[0]!
    const second = retryItem(word, first)
    expect(second).toBeDefined()
    expect(second?.exercise.kind).toBe('listen')
    expect(second?.attempt).toBe(1)
  })

  it('stops reiterating at the flip-card step', () => {
    const cards = [dueCard('apple', 'a fruit', '2026-06-01T00:00:00.000Z')]
    const word = buildReviewSession(cards, {}, NOW)[0]!
    let current = buildReviewQueue([word])[0]!
    let next = retryItem(word, current)
    while (next !== undefined) {
      current = next
      next = retryItem(word, current)
    }
    expect(current.exercise.kind).toBe('card')
  })

  it('skips tap when the word has no course sentence', () => {
    const cards = [dueCard('customword', 'some meaning', '2026-06-01T00:00:00.000Z')]
    const word = buildReviewSession(cards, { customword: 5 }, NOW)[0]!
    const queue = buildReviewQueue([word])
    let current = queue[0]!
    const kinds = [current.exercise.kind]
    let next = retryItem(word, current)
    while (next !== undefined) {
      current = next
      kinds.push(current.exercise.kind)
      next = retryItem(word, current)
    }
    expect(kinds).not.toContain('tap')
  })

  it('grades correct as good and wrong as again', () => {
    expect(reviewGradeFor(true)).toBe(4)
    expect(reviewGradeFor(false)).toBe(1)
  })
})
