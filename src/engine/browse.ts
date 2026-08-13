import type { LibraryIndexBook } from '@/engine/types'

export type BookSort = 'title' | 'author' | 'words' | 'difficulty' | 'popular'
export type BookGroup = 'none' | 'genre' | 'level' | 'status'
export type BookStatus = 'all' | 'unread' | 'progress' | 'finished'

export interface BookRow {
  book: LibraryIndexBook
  status: 'unread' | 'progress' | 'finished'
  percent: number
  views: number
}

export interface BrowseSection {
  key: string
  label: string
  books: BookRow[]
}

export interface BrowseOptions {
  query: string
  genre: string | undefined
  difficulty: number | undefined
  status: BookStatus
  sort: BookSort
  group: BookGroup
  progress: Record<string, { completed: string[] }>
  views: Record<string, number>
}

export function bookStatus(
  book: LibraryIndexBook,
  completed: string[] | undefined,
): { status: BookRow['status']; percent: number } {
  const done = completed?.length ?? 0
  if (done === 0) return { status: 'unread', percent: 0 }
  if (done >= book.sections) return { status: 'finished', percent: 100 }
  return { status: 'progress', percent: Math.round((done / book.sections) * 100) }
}

/**
 * Filters, sorts and groups the library index into labelled sections.
 */
export function buildBrowse(
  books: readonly LibraryIndexBook[],
  options: BrowseOptions,
): BrowseSection[] {
  const query = options.query.trim().toLowerCase()

  const rows: BookRow[] = []
  for (const book of books) {
    const { status, percent } = bookStatus(book, options.progress[book.id]?.completed)
    if (options.status !== 'all' && status !== options.status) continue
    if (options.genre !== undefined && book.genre !== options.genre) continue
    if (options.difficulty !== undefined && book.difficulty !== options.difficulty) continue
    if (query.length > 0) {
      const haystack = `${book.title} ${book.author}`.toLowerCase()
      if (!haystack.includes(query)) continue
    }
    rows.push({ book, status, percent, views: options.views[book.id] ?? 0 })
  }

  const sorted = [...rows].toSorted(sortRows(options.sort))

  const groups = new Map<string, BookRow[]>()
  for (const row of sorted) {
    const key = groupKey(row, options.group)
    const list = groups.get(key)
    if (list === undefined) groups.set(key, [row])
    else list.push(row)
  }

  return [...groups].map(([key, groupBooks]) => ({
    key,
    label: groupLabel(key, options.group),
    books: groupBooks,
  }))
}

export function genresOf(books: readonly LibraryIndexBook[]): string[] {
  return [...new Set(books.map((book) => book.genre))].toSorted((a, b) => a.localeCompare(b))
}

function sortRows(sort: BookSort): (a: BookRow, b: BookRow) => number {
  switch (sort) {
    case 'author': {
      return (a, b) => a.book.author.localeCompare(b.book.author)
    }
    case 'words': {
      return (a, b) => b.book.words - a.book.words
    }
    case 'difficulty': {
      return (a, b) => a.book.difficulty - b.book.difficulty
    }
    case 'popular': {
      return (a, b) => b.views - a.views
    }
    default: {
      return (a, b) => a.book.title.localeCompare(b.book.title)
    }
  }
}

function groupKey(row: BookRow, group: BookGroup): string {
  switch (group) {
    case 'genre': {
      return row.book.genre
    }
    case 'level': {
      return `Level ${row.book.difficulty}`
    }
    case 'status': {
      return row.status
    }
    default: {
      return 'all'
    }
  }
}

function groupLabel(key: string, group: BookGroup): string {
  switch (group) {
    case 'genre': {
      return key
    }
    case 'level': {
      return key
    }
    case 'status': {
      switch (key) {
        case 'progress': {
          return 'In progress'
        }
        case 'finished': {
          return 'Finished'
        }
        default: {
          return 'Not started'
        }
      }
    }
    default: {
      return 'All books'
    }
  }
}
