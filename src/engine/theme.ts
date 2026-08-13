export interface AccentPalette {
  id: string
  name: string
  /**
   * The primary color shown in the picker (must match the CSS `--aura-green`
   * of the palette).
   */
  preview: string
}

/**
 * The accent themes a user can pick in Settings → Appearance. Each palette
 * overrides the primary (green) and secondary (blue) tokens in
 * `src/styles/global.css` via `[data-accent='<id>']`, so the whole app —
 * buttons, progress, correct answers, navigation — adopts the chosen color.
 */
export const ACCENT_PALETTES: readonly AccentPalette[] = [
  { id: 'forest', name: 'Forest', preview: '#58cc02' },
  { id: 'ocean', name: 'Ocean', preview: '#0ea5e9' },
  { id: 'teal', name: 'Mint', preview: '#10b981' },
  { id: 'violet', name: 'Violet', preview: '#8b5cf6' },
  { id: 'rose', name: 'Rose', preview: '#ec4899' },
  { id: 'sunset', name: 'Sunset', preview: '#f97316' },
  { id: 'indigo', name: 'Indigo', preview: '#6366f1' },
  { id: 'cyan', name: 'Cyan', preview: '#06b6d4' },
  { id: 'lime', name: 'Lime', preview: '#84cc16' },
  { id: 'gold', name: 'Gold', preview: '#f59e0b' },
  { id: 'crimson', name: 'Crimson', preview: '#e11d48' },
  { id: 'fuchsia', name: 'Fuchsia', preview: '#d946ef' },
  { id: 'slate', name: 'Slate', preview: '#64748b' },
]

export const DEFAULT_ACCENT = 'forest'

export function accentById(id: string): AccentPalette | undefined {
  return ACCENT_PALETTES.find((palette) => palette.id === id)
}
