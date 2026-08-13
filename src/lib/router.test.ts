import { describe, expect, it } from 'vitest'

import { parseHash, type Route, routeToHash } from '@/lib/router'

function roundTrip(route: Route): Route {
  return parseHash(routeToHash(route))
}

describe('Hash router', () => {
  it('round-trips every screen', () => {
    expect(roundTrip({ name: 'home' })).toEqual({ name: 'home' })
    expect(roundTrip({ name: 'analyzer' })).toEqual({ name: 'analyzer' })
    expect(roundTrip({ name: 'library' })).toEqual({ name: 'library' })
    expect(roundTrip({ name: 'review' })).toEqual({ name: 'review' })
    expect(roundTrip({ name: 'speak' })).toEqual({ name: 'speak' })
    expect(roundTrip({ name: 'write' })).toEqual({ name: 'write' })
    expect(roundTrip({ name: 'dictation' })).toEqual({ name: 'dictation' })
    expect(roundTrip({ name: 'backup' })).toEqual({ name: 'backup' })
    expect(roundTrip({ name: 'data' })).toEqual({ name: 'data' })
    expect(roundTrip({ name: 'settings' })).toEqual({ name: 'settings' })
    expect(roundTrip({ name: 'tour' })).toEqual({ name: 'tour' })
    expect(roundTrip({ name: 'roadmap' })).toEqual({ name: 'roadmap' })
  })

  it('serializes the roadmap route', () => {
    expect(routeToHash({ name: 'roadmap' })).toBe('#/roadmap')
    expect(parseHash('#/roadmap')).toEqual({ name: 'roadmap' })
  })

  it('serializes the settings route', () => {
    expect(routeToHash({ name: 'settings' })).toBe('#/settings')
    expect(parseHash('#/settings')).toEqual({ name: 'settings' })
    expect(parseHash('#/data')).toEqual({ name: 'data' })
  })

  it('serializes sub-routes with context', () => {
    expect(routeToHash({ name: 'lesson', lessonId: 'greetings-1' })).toBe('#/lesson/greetings-1')
    expect(routeToHash({ name: 'book', bookId: 'alice-in-wonderland' })).toBe(
      '#/book/alice-in-wonderland',
    )
    expect(
      routeToHash({
        name: 'read',
        bookId: 'alice-in-wonderland',
        chapterId: 'c1',
        sectionIndex: 2,
      }),
    ).toBe('#/read/alice-in-wonderland/c1/2')
    expect(routeToHash({ name: 'grammar-lesson', lessonId: 'articles-rule' })).toBe(
      '#/grammar/articles-rule',
    )
    expect(routeToHash({ name: 'dialogue', dialogueId: 'at-the-cafe' })).toBe(
      '#/dialogue/at-the-cafe',
    )
    expect(routeToHash({ name: 'profile', tab: 'history' })).toBe('#/profile/history')
    expect(routeToHash({ name: 'dictionary', word: 'hello' })).toBe('#/dictionary?word=hello')
  })

  it('parses deep links back into routes', () => {
    expect(parseHash('#/read/alice-in-wonderland/c1/2')).toEqual({
      name: 'read',
      bookId: 'alice-in-wonderland',
      chapterId: 'c1',
      sectionIndex: 2,
    })
    expect(parseHash('#/grammar/articles-rule')).toEqual({
      name: 'grammar-lesson',
      lessonId: 'articles-rule',
    })
    expect(parseHash('#/profile/history')).toEqual({ name: 'profile', tab: 'history' })
    expect(parseHash('#/dictionary?word=hello')).toEqual({ name: 'dictionary', word: 'hello' })
  })

  it('falls back to home for empty or unknown hashes', () => {
    expect(parseHash('')).toEqual({ name: 'home' })
    expect(parseHash('#/')).toEqual({ name: 'home' })
    expect(parseHash('#/nonsense')).toEqual({ name: 'home' })
  })
})
