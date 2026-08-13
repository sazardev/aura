import { describe, expect, it } from 'vitest'

import { allGuidedDone, GUIDED_ACTIONS, guidedProgress } from '@/engine/guide'

describe('Guided tour actions', () => {
  it('covers every core feature', () => {
    expect(GUIDED_ACTIONS.length).toBe(9)
    const ids = new Set(GUIDED_ACTIONS.map((action) => action.id))
    expect(ids.size).toBe(GUIDED_ACTIONS.length)
    for (const action of GUIDED_ACTIONS) {
      expect(action.label.length).toBeGreaterThan(0)
      expect(action.hint.length).toBeGreaterThan(0)
    }
  })

  it('tracks progress', () => {
    expect(guidedProgress({})).toEqual({ done: 0, total: 9 })
    expect(guidedProgress({ lesson: true, dictionary: true })).toEqual({ done: 2, total: 9 })
    expect(allGuidedDone({})).toBe(false)
    const all = Object.fromEntries(GUIDED_ACTIONS.map((action) => [action.id, true]))
    expect(allGuidedDone(all)).toBe(true)
  })
})
