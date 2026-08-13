import { describe, expect, it } from 'vitest'

import {
  bookById,
  bookExpressions,
  checkReadingAnswer,
  countWords,
  documentToBook,
  LIBRARY,
  loadBook,
  readingMinutes,
  sectionNewWords,
  sectionQuestions,
  sectionText,
  splitSentences,
} from '@/engine/library'
import { normalizeText } from '@/lib/strings'

describe('Library index', () => {
  it('contains public-domain classics with unique ids and consistent counts', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(20)
    const bookIds = new Set<string>()
    for (const book of LIBRARY) {
      expect(bookIds.has(book.id)).toBe(false)
      bookIds.add(book.id)
      expect(book.words).toBeGreaterThan(1000)
      expect(book.chapters).toBeGreaterThan(0)
      expect(book.sections).toBeGreaterThan(0)
      expect(book.tags.length).toBeGreaterThan(0)
    }
  })

  it('resolves books by id', () => {
    const alice = LIBRARY.find((book) => book.title.includes('Alice'))
    if (alice === undefined) throw new Error('Alice not found')
    expect(bookById(alice.id)).toBe(alice)
  })
})

describe('loadBook', () => {
  it('loads a full book matching the index counts', async () => {
    const summary = bookById('alice-in-wonderland')
    if (summary === undefined) throw new Error('Alice not found')
    const book = await loadBook(summary.id)
    expect(book.title).toBe(summary.title)
    expect(book.chapters.length).toBe(summary.chapters)
    const sections = book.chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0)
    expect(sections).toBe(summary.sections)
  })

  it('returns the same cached instance for repeated loads', async () => {
    const first = await loadBook('treasure-island')
    const second = await loadBook('treasure-island')
    expect(first).toBe(second)
  })
})

describe('Reading helpers', () => {
  it('counts words and estimates reading time', () => {
    expect(countWords('The quick brown fox jumps over the lazy dog.')).toBe(9)
    expect(readingMinutes(100)).toBe(1)
    expect(readingMinutes(400)).toBe(2)
  })

  it('splits sentences on punctuation', () => {
    const sentences = splitSentences('Hello, Alice. How are you? Fine!')
    expect(sentences).toEqual(['Hello, Alice.', 'How are you?', 'Fine!'])
  })
})

describe('Comprehension questions', () => {
  it('generates questions deterministically per section', async () => {
    const book = await loadBook('alice-in-wonderland')
    const chapter = book.chapters[0]
    const section = chapter?.sections[0]
    if (section === undefined) throw new Error('The library has no sections')
    expect(sectionQuestions(section)).toEqual(sectionQuestions(section))
  })

  it('produces cloze questions with the answer among the options', async () => {
    const book = await loadBook('alice-in-wonderland')
    const section = book.chapters[0]?.sections[0]
    if (section === undefined) throw new Error('The library has no sections')
    for (const question of sectionQuestions(section)) {
      if (question.type !== 'cloze') {
        continue
      }

      expect(question.options).toContain(question.answer)
      expect(question.sentence).toContain('______')
    }
  })

  it('checks cloze and order answers', async () => {
    const book = await loadBook('alice-in-wonderland')
    const section = book.chapters[0]?.sections[0]
    if (section === undefined) throw new Error('The library has no sections')
    for (const question of sectionQuestions(section)) {
      expect(checkReadingAnswer(question, question.answer)).toBe(true)
      if (question.type === 'cloze') {
        expect(checkReadingAnswer(question, 'wrong')).toBe(false)
      } else {
        expect(
          checkReadingAnswer(question, [
            question.answer[1] ?? 0,
            question.answer[0] ?? 1,
            question.answer[2] ?? 2,
          ]),
        ).toBe(false)
      }
    }
  })
})

describe('Book expressions', () => {
  it('finds repeated phrases with examples from the text', async () => {
    const book = await loadBook('alice-in-wonderland')
    const expressions = bookExpressions(book)
    expect(expressions.length).toBeGreaterThan(0)
    for (const expression of expressions) {
      expect(expression.phrase.split(' ').length).toBeGreaterThanOrEqual(2)
      expect(expression.count).toBeGreaterThanOrEqual(2)
      expect(expression.example.length).toBeGreaterThan(0)
    }
  })
})

describe('New words', () => {
  it('skips words already known and ranks rare ones first', async () => {
    const book = await loadBook('alice-in-wonderland')
    const section = book.chapters[0]?.sections[0]
    if (section === undefined) throw new Error('The library has no sections')
    const known = new Set(['alice', 'the', 'and'])
    const words = sectionNewWords(section, known)
    expect(words.some((entry) => entry.word === 'alice')).toBe(false)
    expect(words.length).toBeLessThanOrEqual(12)
  })

  it('returns fewer words when many are known', async () => {
    const book = await loadBook('alice-in-wonderland')
    const section = book.chapters[0]?.sections[0]
    if (section === undefined) throw new Error('The library has no sections')
    const all = new Set(
      normalizeText(sectionText(section))
        .split(' ')
        .filter((word) => word.length > 0),
    )
    expect(sectionNewWords(section, all).length).toBe(0)
  })
})

describe('documentToBook', () => {
  it('builds a readable book from raw text', () => {
    const text =
      'First paragraph here. With a second sentence.\n\nSecond paragraph here.\n\nThird one.'
    const { book, truncated } = documentToBook(text, 'My notes')
    expect(truncated).toBe(false)
    expect(book.title).toBe('My notes')
    expect(book.chapters[0]?.sections.length).toBeGreaterThan(0)
    expect(sectionText(book.chapters[0]?.sections[0] ?? { id: '', paragraphs: [] })).toContain(
      'First paragraph',
    )
  })

  it('truncates very long documents', () => {
    const { truncated } = documentToBook('word '.repeat(200_000), 'Long')
    expect(truncated).toBe(true)
  })
})
