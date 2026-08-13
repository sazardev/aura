import { useCallback, useEffect, useState } from 'react'

import { parseHash, type Route, routeToHash } from '@/lib/router'

export interface HashRouter {
  route: Route
  navigate: (route: Route) => void
}

/**
 * Hash-based router: the URL always reflects the current screen and its
 * context (book, chapter, section, lesson, tab, word…), so refresh and deep
 * links restore the exact place. Works offline in browsers and Tauri webviews.
 */
export function useHashRoute(): HashRouter {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    if (window.location.hash === '') {
      window.location.replace('#/home')
    }
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next)
    if (window.location.hash !== hash) {
      window.location.hash = hash
    }
    setRoute(next)
  }, [])

  return { route, navigate }
}
