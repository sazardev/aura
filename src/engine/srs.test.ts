import { describe, expect, it } from 'vitest'

import { createCard, dueCards, dueLabel, isDue, reviewCard } from '@/engine/srs'

const NOW = new Date('2026-06-01T00:00:00.000Z')

describe('SRS (SM-2)', () => {
  it('crea un card listo para repaso', () => {
    const card = createCard('apple', 'una fruta', { translation: 'manzana', now: NOW })
    expect(card.word).toBe('apple')
    expect(card.translation).toBe('manzana')
    expect(card.state.interval).toBe(0)
    expect(isDue(card, NOW)).toBe(true)
  })

  it('aplica SM-2 con acierto y programa la siguiente revisión', () => {
    const card = createCard('apple', 'fruta', { now: NOW })
    const reviewed = reviewCard(card, 4, NOW)
    expect(reviewed.state.repetition).toBe(1)
    expect(reviewed.state.interval).toBeGreaterThan(0)
    expect(isDue(reviewed, NOW)).toBe(false)
    expect(reviewed.state.lapses).toBe(0)
  })

  it('con fallo reinicia la repetición e incrementa lapses', () => {
    const card = createCard('apple', 'fruta', { now: NOW })
    const ok = reviewCard(card, 4, NOW)
    const failed = reviewCard(ok, 1, NOW)
    expect(failed.state.repetition).toBe(0)
    expect(failed.state.lapses).toBe(1)
  })

  it('dueCards devuelve solo lo pendiente, ordenado', () => {
    const early = reviewCard(
      createCard('banana', 'fruta', { now: NOW }),
      4,
      new Date('2025-01-01T00:00:00Z'),
    )
    const late = reviewCard(createCard('apple', 'fruta', { now: NOW }), 4, NOW)
    const due = dueCards([late, early], NOW)
    expect(due).toHaveLength(1)
    expect(due[0]?.word).toBe('banana')
  })

  it('dueLabel indica hoy para lo vencido', () => {
    const card = createCard('apple', 'fruta', { now: NOW })
    expect(dueLabel(card, NOW)).toBe('hoy')
  })
})
