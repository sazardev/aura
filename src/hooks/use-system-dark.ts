import { useEffect, useState } from 'react'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Tracks the OS color scheme live via `prefers-color-scheme`. Returns true
 * when the system is in dark mode. Falls back to false where matchMedia is
 * unavailable (older test environments).
 */
export function useSystemDark(): boolean {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(DARK_QUERY).matches
  })

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return dark
}
