import { describe, expect, it } from 'vitest'

import { type BrowseOptions, buildBrowse, genresOf } from '@/engine/browse'
import { LIBRARY } from '@/engine/library'

function options(overrides: Partial<BrowseOptions> = {}): BrowseOptions {
  return {
    query: '',
    genre: undefined,
    difficulty: undefined,
    status: 'all',
    sort: 'title',
    group: 'none',
    progress: {},
    views: {},
    ...overrides,
  }
}

describe('buildBrowse', () => {
  it('finds books by title', () => {
    const sections = buildBrowse(LIBRARY, options({ query: 'alice' }))
    const titles = sections.flatMap((section) => section.books.map((row) => row.book.title))
    expect(titles.some((title) => title.includes("Alice's"))).toBe(true)
    expect(titles.length).toBeLessThan(LIBRARY.length)
  })

  it('filters by genre', () => {
    const sections = buildBrowse(LIBRARY, options({ genre: 'Mystery' }))
    const genres = sections.flatMap((section) => section.books.map((row) => row.book.genre))
    expect(genres.length).toBeGreaterThan(0)
    expect([...new Set(genres)]).toEqual(['Mystery'])
  })

  it('filters by difficulty', () => {
    const sections = buildBrowse(LIBRARY, options({ difficulty: 2 }))
    const levels = sections.flatMap((section) => section.books.map((row) => row.book.difficulty))
    expect(levels.length).toBeGreaterThan(0)
    expect([...new Set(levels)]).toEqual([2])
  })

  it('filters by reading status', () => {
    const progress = { 'alice-in-wonderland': { completed: ['s1-1'] } }
    const sections = buildBrowse(LIBRARY, options({ status: 'progress', progress }))
    const ids = sections.flatMap((section) => section.books.map((row) => row.book.id))
    expect(ids).toContain('alice-in-wonderland')
    expect(sections.flatMap((section) => section.books.map((row) => row.status))).toEqual([
      'progress',
    ])
  })

  it('sorts by word count descending', () => {
    const sections = buildBrowse(LIBRARY, options({ sort: 'words' }))
    const words = sections.flatMap((section) => section.books.map((row) => row.book.words))
    for (let index = 1; index < words.length; index += 1) {
      expect((words[index - 1] ?? 0) >= (words[index] ?? 0)).toBe(true)
    }
  })

  it('groups by genre', () => {
    const sections = buildBrowse(LIBRARY, options({ group: 'genre' }))
    expect(sections.length).toBeGreaterThan(1)
    for (const section of sections) {
      const genres = new Set(section.books.map((row) => row.book.genre))
      expect(genres.size).toBe(1)
      expect(section.label).toBe(section.books[0]?.book.genre)
    }
  })

  it('groups by status', () => {
    const progress = { 'alice-in-wonderland': { completed: ['s1-1'] } }
    const sections = buildBrowse(LIBRARY, options({ group: 'status', progress }))
    const labels = new Set(sections.map((section) => section.label))
    expect(labels.has('In progress')).toBe(true)
  })
})

describe('genresOf', () => {
  it('returns the distinct genres sorted', () => {
    const genres = genresOf(LIBRARY)
    expect(genres.length).toBeGreaterThan(3)
    expect([...genres]).toEqual([...genres].toSorted((a, b) => a.localeCompare(b)))
  })
})
