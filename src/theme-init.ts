/**
 * Applies the persisted theme to `<html>` before first paint so a dark
 * desktop never flashes white. It runs as its own module before the app
 * bundle; the store re-applies the theme on mount, so zustand stays the
 * source of truth.
 */

interface PersistedState {
  state?: {
    themeMode?: 'system' | 'light' | 'dark'
    darkMode?: boolean
    accent?: string
  }
}

function storedTheme(): 'dark' | 'light' {
  let mode: 'system' | 'light' | 'dark' = 'system'
  try {
    const raw = localStorage.getItem('aura-state')
    if (raw !== null) {
      const parsed = JSON.parse(raw) as PersistedState
      if (parsed.state?.themeMode !== undefined) {
        mode = parsed.state.themeMode
      } else if (parsed.state?.darkMode === true) {
        // Legacy boolean flag: true meant an explicit dark choice.
        mode = 'dark'
      }
    }
  } catch {
    // Corrupt or unavailable storage — fall through to the system default.
  }
  if (mode !== 'system') return mode
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

document.documentElement.dataset['theme'] = storedTheme()

try {
  const raw = localStorage.getItem('aura-state')
  if (raw !== null) {
    const parsed = JSON.parse(raw) as PersistedState
    if (parsed.state?.accent !== undefined) {
      document.documentElement.dataset['accent'] = parsed.state.accent
    }
  }
} catch {
  // Ignore — the app re-applies the accent on mount.
}
