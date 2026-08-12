import supermemo from 'supermemo'

import { CONFIG } from '@/engine/config'

const DAY_MS = 86_400_000

/**
 * Review state of a card (SM-2 algorithm).
 */
export interface SrsState {
  interval: number
  repetition: number
  efactor: number
  due: string
  lapses: number
}

/**
 * Vocabulary card with spaced-repetition scheduling.
 */
export interface SrsCard {
  id: string
  word: string
  meaning: string
  note?: string
  createdAt: string
  state: SrsState
}

export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5

function initialState(now: Date): SrsState {
  return {
    interval: CONFIG.srs.initialInterval,
    repetition: CONFIG.srs.initialRepetition,
    efactor: CONFIG.srs.initialEfactor,
    due: now.toISOString(),
    lapses: 0,
  }
}

/**
 * Creates a new card, ready for its first review.
 */
export function createCard(
  word: string,
  meaning: string,
  options?: { note?: string; now?: Date },
): SrsCard {
  const now = options?.now ?? new Date()
  return {
    id: `${word}-${now.getTime()}`,
    word,
    meaning,
    ...(options?.note !== undefined && { note: options.note }),
    createdAt: now.toISOString(),
    state: initialState(now),
  }
}

/**
 * Applies SM-2 with a `grade` (0-5) and returns the updated card.
 * Grades < 3 count as failures (increments lapses).
 */
export function reviewCard(card: SrsCard, grade: ReviewGrade, now: Date = new Date()): SrsCard {
  const item = supermemo(
    {
      interval: card.state.interval,
      repetition: card.state.repetition,
      efactor: card.state.efactor,
    },
    grade,
  )
  const lapses = grade < 3 ? card.state.lapses + 1 : card.state.lapses
  const due = new Date(now.getTime() + item.interval * DAY_MS).toISOString()
  return {
    ...card,
    state: {
      interval: item.interval,
      repetition: item.repetition,
      efactor: item.efactor,
      due,
      lapses,
    },
  }
}

/**
 * Returns true if the card is due for review at `now`.
 */
export function isDue(card: SrsCard, now: Date = new Date()): boolean {
  return card.state.due <= now.toISOString()
}

/**
 * Cards pending review, sorted by due date.
 */
export function dueCards(cards: readonly SrsCard[], now: Date = new Date()): SrsCard[] {
  return cards
    .filter((card) => isDue(card, now))
    .toSorted((a, b) => a.state.due.localeCompare(b.state.due))
}

/**
 * Readable due-date label (e.g. "today" or "Jun 1 → Jul 3").
 */
export function dueLabel(card: SrsCard, now: Date = new Date()): string {
  const due = new Date(card.state.due)
  if (due.getTime() - now.getTime() <= DAY_MS) return 'today'
  return `${now.toLocaleDateString('en', { day: 'numeric', month: 'short' })} → ${due.toLocaleDateString('en', { day: 'numeric', month: 'short' })}`
}
