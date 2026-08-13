import { ArrowLeft, BookMarked, BookOpen, Clock3, Quote } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { LibraryBook } from '@/engine/types'

import { ProgressBar } from '@/components/progress-bar'
import { bookReadingMinutes, LIBRARY, loadBook } from '@/engine/library'
import { trackBookView } from '@/engine/telemetry'
import { useAuraStore } from '@/state/store'

interface BookScreenProps {
  bookId: string
  onBack: () => void
  onRead: (chapterId: string) => void
}

function chapterStatus(done: number, total: number): string {
  if (done === 0) return 'Not started'
  if (done === total) return 'Completed'
  return `${done}/${total} sections`
}

export function BookScreen({ bookId, onBack, onRead }: BookScreenProps) {
  const importedBooks = useAuraStore((state) => state.importedBooks)
  const libraryProgress = useAuraStore((state) => state.libraryProgress)

  const imported = importedBooks.find((candidate) => candidate.id === bookId)
  const [book, setBook] = useState<LibraryBook | undefined>(imported)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(
    imported === undefined ? 'loading' : 'ready',
  )

  useEffect(() => {
    let alive = true
    const run = async () => {
      if (imported !== undefined) {
        setBook(imported)
        setStatus('ready')
        trackBookView(imported.id)
        return
      }
      setStatus('loading')
      try {
        const loaded = await loadBook(bookId)
        if (!alive) return
        setBook(loaded)
        setStatus('ready')
        trackBookView(loaded.id)
      } catch {
        if (alive) setStatus('missing')
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [bookId, imported])

  if (status === 'loading') {
    return (
      <div className="book-screen">
        <p className="screen-subtitle">Loading…</p>
      </div>
    )
  }

  if (status === 'missing' || book === undefined) {
    return (
      <div className="book-screen">
        <div className="empty-state">
          <BookMarked size={48} aria-hidden="true" />
          <p>This book is not in your library.</p>
          <button type="button" className="onboarding__skip" onClick={onBack}>
            Back to library
          </button>
        </div>
      </div>
    )
  }

  const progress = libraryProgress[book.id]

  return (
    <div className="book-screen">
      <header className="book-screen__header">
        <button
          type="button"
          className="lesson-screen__close"
          aria-label="Back to library"
          onClick={onBack}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div>
          <h1 className="book-screen__title">{book.title}</h1>
          <p className="book-screen__author">
            {book.author} · {book.year}
          </p>
        </div>
      </header>

      <div className="book-screen__facts">
        <span>
          <BookOpen size={14} aria-hidden="true" /> {book.chapters.length} chapters
        </span>
        <span>
          <Clock3 size={14} aria-hidden="true" /> ~{bookReadingMinutes(book)} min to read
        </span>
        <span>~{book.words.toLocaleString('en-US')} words</span>
      </div>

      {book.firstLine !== undefined && (
        <p className="book-screen__first-line">“{book.firstLine}”</p>
      )}
      <p className="book-screen__description">{book.description}</p>
      {book.tags.length > 0 && (
        <div className="library-book__tags">
          {book.tags.map((tag) => (
            <span key={tag} className="library-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="book-screen__source">
        Source: {book.source}
        {book.gutenbergId !== undefined && ` · eBook #${book.gutenbergId}`} · public domain
      </p>

      {book.quotes !== undefined && book.quotes.length > 0 && (
        <section className="book-screen__quotes" aria-label="Famous quotes">
          {book.quotes.map((quote) => (
            <p key={quote} className="book-quote">
              <Quote size={14} aria-hidden="true" /> {quote}
            </p>
          ))}
        </section>
      )}

      <section className="book-screen__chapters" aria-label="Chapters">
        {book.chapters.map((chapter) => {
          const total = chapter.sections.length
          const done = chapter.sections.filter((section) =>
            progress?.completed.includes(section.id),
          ).length
          const percent = total > 0 ? (done / total) * 100 : 0
          const isLast = progress?.lastChapter === chapter.id
          return (
            <button
              key={chapter.id}
              type="button"
              className="book-chapter"
              onClick={() => onRead(chapter.id)}
            >
              <span className="book-chapter__num">{chapter.id.replaceAll(/\D+/g, '')}</span>
              <span className="book-chapter__info">
                <strong>{chapter.title}</strong>
                <span className="book-chapter__meta">{chapterStatus(done, total)}</span>{' '}
                {done > 0 && <ProgressBar value={percent} height={6} />}
              </span>
              <span className="book-chapter__cta">{isLast ? 'Continue' : 'Read'}</span>
            </button>
          )
        })}
      </section>

      {LIBRARY.some((candidate) => candidate.id === book.id) && (
        <button type="button" className="onboarding__skip" onClick={onBack}>
          Back to library
        </button>
      )}
    </div>
  )
}
