import supermemo from 'supermemo'

import { CONFIG } from '@/engine/config'
import { addDays } from '@/lib/date'

const DAY_MS = 86_400_000

/**
Estado de repaso de un card (algoritmo SM-2).
 */
export interface SrsState {
  interval: number
  repetition: number
  efactor: number
  due: string
  lapses: number
}

/**
Card de vocabulario con planificación de repaso espaciado.
 */
export interface SrsCard {
  id: string
  word: string
  meaning: string
  translation?: string
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
Crea un card nuevo, listo para su primer repaso.
 */
export function createCard(
  word: string,
  meaning: string,
  options?: { translation?: string; note?: string; now?: Date },
): SrsCard {
  const now = options?.now ?? new Date()
  return {
    id: `${word}-${now.getTime()}`,
    word,
    meaning,
    ...(options?.translation !== undefined && { translation: options.translation }),
    ...(options?.note !== undefined && { note: options.note }),
    createdAt: now.toISOString(),
    state: initialState(now),
  }
}

/**
 * Aplica SM-2 con un `grade` (0-5) y devuelve un card actualizado.
 * Grados < 3 se consideran fallos (incrementa lapses).
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
True si el card debe repasarse en `now`.
 */
export function isDue(card: SrsCard, now: Date = new Date()): boolean {
  return card.state.due <= now.toISOString()
}

/**
Tarjetas pendientes de repaso, ordenadas por fecha.
 */
export function dueCards(cards: readonly SrsCard[], now: Date = new Date()): SrsCard[] {
  return cards
    .filter((card) => isDue(card, now))
    .toSorted((a, b) => a.state.due.localeCompare(b.state.due))
}

/**
Fecha legible de próximo repaso (p. ej. "12 ago").
 */
export function dueLabel(card: SrsCard, now: Date = new Date()): string {
  const due = new Date(card.state.due)
  if (due.getTime() - now.getTime() <= DAY_MS) return 'hoy'
  return `${addDays(now, 0).toLocaleDateString('es', { day: 'numeric', month: 'short' })} → ${due.toLocaleDateString('es', { day: 'numeric', month: 'short' })}`
}
