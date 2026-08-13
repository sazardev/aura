export type ProfileTab = 'overview' | 'history' | 'achievements' | 'stats'

/**
 * Every screen in Aura is a route. Sub-routes carry context: the open book,
 * its chapter and section, the grammar lesson, the dialogue, the profile tab
 * or the dictionary word — so refresh and deep links restore the exact state.
 */
export type Route =
  | { name: 'home' }
  | { name: 'dictionary'; word?: string }
  | { name: 'analyzer' }
  | { name: 'library' }
  | { name: 'review' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'grammar' }
  | { name: 'grammar-lesson'; lessonId: string }
  | { name: 'book'; bookId: string }
  | { name: 'read'; bookId: string; chapterId?: string; sectionIndex?: number }
  | { name: 'speak' }
  | { name: 'write' }
  | { name: 'dictation' }
  | { name: 'dialogue'; dialogueId?: string }
  | { name: 'backup' }
  | { name: 'data' }
  | { name: 'settings' }
  | { name: 'about' }
  | { name: 'tour' }
  | { name: 'roadmap' }
  | { name: 'profile'; tab?: ProfileTab }

/**
 * Serializes a route to a hash URL (e.g. "#/read/alice-in-wonderland/c1/2").
 */
export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home': {
      return '#/home'
    }
    case 'dictionary': {
      const query = route.word ? `?word=${encodeURIComponent(route.word)}` : ''
      return `#/dictionary${query}`
    }
    case 'analyzer': {
      return '#/analyzer'
    }
    case 'library': {
      return '#/library'
    }
    case 'review': {
      return '#/review'
    }
    case 'lesson': {
      return `#/lesson/${encodeURIComponent(route.lessonId)}`
    }
    case 'grammar': {
      return '#/grammar'
    }
    case 'grammar-lesson': {
      return `#/grammar/${encodeURIComponent(route.lessonId)}`
    }
    case 'book': {
      return `#/book/${encodeURIComponent(route.bookId)}`
    }
    case 'read': {
      let path = `#/read/${encodeURIComponent(route.bookId)}`
      if (route.chapterId !== undefined) path += `/${encodeURIComponent(route.chapterId)}`
      if (route.sectionIndex !== undefined) path += `/${route.sectionIndex}`
      return path
    }
    case 'speak': {
      return '#/speak'
    }
    case 'write': {
      return '#/write'
    }
    case 'dictation': {
      return '#/dictation'
    }
    case 'dialogue': {
      return route.dialogueId === undefined
        ? '#/dialogue'
        : `#/dialogue/${encodeURIComponent(route.dialogueId)}`
    }
    case 'backup': {
      return '#/backup'
    }
    case 'data': {
      return '#/data'
    }
    case 'settings': {
      return '#/settings'
    }
    case 'about': {
      return '#/about'
    }
    case 'tour': {
      return '#/tour'
    }
    case 'roadmap': {
      return '#/roadmap'
    }
    case 'profile': {
      return route.tab === undefined ? '#/profile' : `#/profile/${route.tab}`
    }
  }
}

/**
 * Parses a hash (with or without the leading "#") back into a route.
 * Unknown or empty hashes fall back to the home screen.
 */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '')
  const [pathPart = '', query] = raw.split('?', 2)
  const segments = pathPart.split('/').filter((segment) => segment.length > 0)
  const first = segments[0]

  switch (first) {
    case undefined: {
      return { name: 'home' }
    }
    case 'home': {
      return { name: 'home' }
    }
    case 'dictionary': {
      const word = new URLSearchParams(query ?? '').get('word')
      return word === null ? { name: 'dictionary' } : { name: 'dictionary', word }
    }
    case 'analyzer': {
      return { name: 'analyzer' }
    }
    case 'library': {
      return { name: 'library' }
    }
    case 'review': {
      return { name: 'review' }
    }
    case 'lesson': {
      return { name: 'lesson', lessonId: decodeURIComponent(segments[1] ?? '') }
    }
    case 'grammar': {
      const lessonId = segments[1]
      return lessonId === undefined
        ? { name: 'grammar' }
        : { name: 'grammar-lesson', lessonId: decodeURIComponent(lessonId) }
    }
    case 'book': {
      return { name: 'book', bookId: decodeURIComponent(segments[1] ?? '') }
    }
    case 'read': {
      const bookId = decodeURIComponent(segments[1] ?? '')
      const route: Route = { name: 'read', bookId }
      const chapterId = segments[2]
      if (chapterId !== undefined) {
        route.chapterId = decodeURIComponent(chapterId)
      }
      const rawSection = Number(segments[3])
      if (Number.isSafeInteger(rawSection) && rawSection >= 0) {
        route.sectionIndex = rawSection
      }
      return route
    }
    case 'speak': {
      return { name: 'speak' }
    }
    case 'write': {
      return { name: 'write' }
    }
    case 'dictation': {
      return { name: 'dictation' }
    }
    case 'dialogue': {
      const dialogueId = segments[1]
      return dialogueId === undefined
        ? { name: 'dialogue' }
        : { name: 'dialogue', dialogueId: decodeURIComponent(dialogueId) }
    }
    case 'backup': {
      return { name: 'backup' }
    }
    case 'data': {
      return { name: 'data' }
    }
    case 'settings': {
      return { name: 'settings' }
    }
    case 'about': {
      return { name: 'about' }
    }
    case 'tour': {
      return { name: 'tour' }
    }
    case 'roadmap': {
      return { name: 'roadmap' }
    }
    case 'profile': {
      const tab = segments[1]
      if (['history', 'achievements', 'stats'].includes(tab ?? '')) {
        return { name: 'profile', tab: tab as ProfileTab }
      }
      return { name: 'profile' }
    }
    default: {
      return { name: 'home' }
    }
  }
}
