import { describe, expect, it } from 'vitest'

import { ACCENT_PALETTES, accentById, DEFAULT_ACCENT } from '@/engine/theme'

describe('Accent themes', () => {
  it('has unique ids and the default is present', () => {
    const ids = new Set(ACCENT_PALETTES.map((palette) => palette.id))
    expect(ids.size).toBe(ACCENT_PALETTES.length)
    expect(ids.has(DEFAULT_ACCENT)).toBe(true)
    expect(ACCENT_PALETTES.length).toBeGreaterThanOrEqual(12)
  })

  it('has valid hex previews', () => {
    for (const palette of ACCENT_PALETTES) {
      expect(palette.preview).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('resolves palettes by id', () => {
    expect(accentById('ocean')?.name).toBe('Ocean')
    expect(accentById('indigo')?.name).toBe('Indigo')
    expect(accentById('slate')?.name).toBe('Slate')
    expect(accentById('missing')).toBeUndefined()
  })
})
