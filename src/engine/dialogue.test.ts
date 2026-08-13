import { describe, expect, it } from 'vitest'

import { dialogueById, DIALOGUES, matchesAnswer } from '@/engine/dialogue'

describe('Dialogues module', () => {
  it('contains role-play conversations with exactly one correct option per turn', () => {
    expect(DIALOGUES.length).toBeGreaterThanOrEqual(10)
    const ids = new Set<string>()
    for (const dialogue of DIALOGUES) {
      ids.add(dialogue.id)
      const playerLines = dialogue.lines.filter((line) => line.options !== undefined)
      expect(playerLines.length).toBeGreaterThanOrEqual(2)
      for (const line of playerLines) {
        ids.add(line.id)
        const correct = line.options?.filter((option) => option.correct).length ?? 0
        expect(correct).toBe(1)
      }
    }
    expect(ids.size).toBeGreaterThan(DIALOGUES.length)
  })

  it('resolves dialogues by id', () => {
    expect(dialogueById('at-the-cafe')?.title).toBe('At the Café')
    expect(dialogueById('missing')).toBeUndefined()
  })

  it('matches typed replies against the expected answer', () => {
    expect(matchesAnswer('coffee please', 'I would like a coffee, please.')).toBe(true)
    expect(
      matchesAnswer('I want to order a large pizza', "I'd like to order a large pizza, please."),
    ).toBe(true)
    expect(matchesAnswer('pizza', "I'd like to order a large pizza, please.")).toBe(false)
  })
})
