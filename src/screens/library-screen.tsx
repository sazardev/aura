import {
  ArrowRight,
  BookMarked,
  Database,
  EyeOff,
  FileUp,
  LibraryBig,
  Search,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'

import type { LibraryBook, LibraryIndexBook } from '@/engine/types'

import { Button } from '@/components/button'
import { ProgressBar } from '@/components/progress-bar'
import {
  type BookGroup,
  type BookSort,
  type BookStatus,
  buildBrowse,
  genresOf,
} from '@/engine/browse'
import { bookReadingMinutes, documentToBook, LIBRARY } from '@/engine/library'
import { getTelemetry, subscribe, trackBookView, trackImport } from '@/engine/telemetry'
import { useHashRoute } from '@/hooks/use-hash-route'
import { readDocumentFile } from '@/lib/document-reader'
import { type BookProgress, useAuraStore } from '@/state/store'

interface LibraryScreenProps {
  onOpenBook: (bookId: string) => void
  onContinue: (bookId: string) => void
}

const STATUS_CHIPS: { id: BookStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Not started' },
  { id: 'progress', label: 'In progress' },
  { id: 'finished', label: 'Finished' },
]

export function LibraryScreen({ onOpenBook, onContinue }: LibraryScreenProps) {
  const importedBooks = useAuraStore((state) => state.importedBooks)
  const addImportedBook = useAuraStore((state) => state.addImportedBook)
  const removeImportedBook = useAuraStore((state) => state.removeImportedBook)
  const hideBook = useAuraStore((state) => state.hideBook)
  const unhideBook = useAuraStore((state) => state.unhideBook)
  const showAllBooks = useAuraStore((state) => state.showAllBooks)
  const hiddenBooks = useAuraStore((state) => state.hiddenBooks)
  const libraryProgress = useAuraStore((state) => state.libraryProgress)
  const { navigate } = useHashRoute()
  const telemetry = useSyncExternalStore(subscribe, getTelemetry)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<BookStatus>('all')
  const [genre, setGenre] = useState<string | undefined>(undefined)
  const [difficulty, setDifficulty] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<BookSort>('title')
  const [group, setGroup] = useState<BookGroup>('none')
  const inputRef = useRef<HTMLInputElement>(null)

  const visibleBooks = LIBRARY.filter((book) => !hiddenBooks.includes(book.id))
  const hiddenDefaultBooks = LIBRARY.filter((book) => hiddenBooks.includes(book.id))
  const genres = useMemo(() => genresOf(LIBRARY), [])

  const sections = useMemo(
    () =>
      buildBrowse(visibleBooks, {
        query,
        genre,
        difficulty,
        status,
        sort,
        group,
        progress: libraryProgress,
        views: telemetry.bookViews,
      }),
    [visibleBooks, query, genre, difficulty, status, sort, group, libraryProgress, telemetry],
  )

  const onFileChosen = async (file: File | undefined) => {
    if (file === undefined) return
    setError(undefined)
    setImporting(true)
    try {
      const content = await readDocumentFile(file)
      if (content.trim().length === 0) {
        setError('The file returned no readable text.')
        return
      }
      const name = file.name.replace(/\.(pdf|txt|md)$/i, '') || 'Document'
      const { book } = documentToBook(content, name)
      addImportedBook(book)
      trackImport()
      onContinue(book.id)
    } catch {
      setError('Could not read that file.')
    } finally {
      setImporting(false)
      if (inputRef.current !== null) inputRef.current.value = ''
    }
  }

  return (
    <div className="library-screen">
      <h1 className="screen-title">
        <LibraryBig size={22} aria-hidden="true" /> Library
      </h1>
      <p className="screen-subtitle">
        Classic English literature, fully offline. Tap any word while reading to look it up, listen,
        analyze and check your comprehension.
      </p>

      <div className="library-import">
        <Button
          variant="secondary"
          block
          disabled={importing}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp size={16} aria-hidden="true" />
          {importing ? 'Importing…' : 'Import a document (PDF / TXT / MD)'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          name="library-document"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          className="backup-file-input"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void onFileChosen(event.target.files?.[0])}
        />
        {error !== undefined && (
          <p className="analyzer-note analyzer-note--error" role="alert">
            {error}
          </p>
        )}
      </div>

      {importedBooks.length > 0 && (
        <section className="library-section" aria-label="Imported documents">
          <h2>Imported documents</h2>
          <div className="library-books">
            {importedBooks.map((book) => (
              <ImportedCard
                key={book.id}
                book={book}
                progress={libraryProgress[book.id]}
                onOpen={() => {
                  trackBookView(book.id)
                  onContinue(book.id)
                }}
                onRemove={() => removeImportedBook(book.id)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="library-browse">
        <label className="library-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search title or author"
            placeholder="Search title or author…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="library-chips" role="tablist" aria-label="Reading status">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={status === chip.id}
              className={['library-chip', status === chip.id ? 'library-chip--active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setStatus(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="library-controls">
          <select
            className="settings-select"
            value={genre ?? ''}
            aria-label="Filter by genre"
            onChange={(event) =>
              setGenre(event.target.value === '' ? undefined : event.target.value)
            }
          >
            <option value="">All genres</option>
            {genres.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className="settings-select"
            value={difficulty?.toString() ?? ''}
            aria-label="Filter by difficulty"
            onChange={(event) =>
              setDifficulty(event.target.value === '' ? undefined : Number(event.target.value))
            }
          >
            <option value="">All levels</option>
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
          <select
            className="settings-select"
            value={sort}
            aria-label="Sort books"
            onChange={(event) => setSort(event.target.value as BookSort)}
          >
            <option value="title">Sort: title</option>
            <option value="author">Sort: author</option>
            <option value="words">Sort: longest</option>
            <option value="difficulty">Sort: easiest</option>
            <option value="popular">Sort: most read</option>
          </select>
          <select
            className="settings-select"
            value={group}
            aria-label="Group books"
            onChange={(event) => setGroup(event.target.value as BookGroup)}
          >
            <option value="none">Group: none</option>
            <option value="genre">Group: genre</option>
            <option value="level">Group: level</option>
            <option value="status">Group: status</option>
          </select>
        </div>
      </div>

      {sections.map((section) => (
        <section className="library-section" aria-label={section.label}>
          <h2>
            {section.label}
            <span className="library-section__count">{section.books.length}</span>
          </h2>
          <div className="library-books">
            {section.books.map(({ book }) => (
              <BookCard
                key={book.id}
                book={book}
                progress={libraryProgress[book.id]}
                onContinue={() => {
                  trackBookView(book.id)
                  onContinue(book.id)
                }}
                onOpen={() => {
                  trackBookView(book.id)
                  onOpenBook(book.id)
                }}
                onHide={() => hideBook(book.id)}
              />
            ))}
          </div>
        </section>
      ))}
      {sections.length === 0 && <p className="screen-subtitle">No books match those filters.</p>}

      {hiddenDefaultBooks.length > 0 && (
        <section className="library-section" aria-label="Hidden books">
          <h2>
            Hidden ({hiddenDefaultBooks.length})
            <button type="button" className="library-restore-all" onClick={showAllBooks}>
              <Undo2 size={14} aria-hidden="true" /> Restore all
            </button>
          </h2>
          <p className="library-import__hint">
            <EyeOff size={14} aria-hidden="true" /> Hidden books keep your progress and notes —
            restoring them brings everything back.
          </p>
          <div className="library-books">
            {hiddenDefaultBooks.map((book) => (
              <div key={book.id} className="hidden-book">
                <span className="hidden-book__icon">
                  <BookMarked size={20} aria-hidden="true" />
                </span>
                <span className="hidden-book__info">
                  <strong>{book.title}</strong>
                  <small>{book.author}</small>
                </span>
                <button
                  type="button"
                  className="hidden-book__restore"
                  aria-label={`Restore ${book.title}`}
                  onClick={() => unhideBook(book.id)}
                >
                  <Undo2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="library-import">
        <Button variant="ghost" block onClick={() => navigate({ name: 'backup' })}>
          <Database size={16} aria-hidden="true" /> Back up your data
        </Button>
      </div>
    </div>
  )
}

function BookCard({
  book,
  progress,
  onContinue,
  onOpen,
  onHide,
}: {
  book: LibraryIndexBook
  progress: BookProgress | undefined
  onContinue: () => void
  onOpen: () => void
  onHide: () => void
}) {
  const total = book.sections
  const done = progress?.completed.length ?? 0
  const percent = total > 0 ? (done / total) * 100 : 0

  return (
    <article className="library-book">
      <div className="library-book__header">
        <span className="library-book__icon">
          <BookMarked size={24} aria-hidden="true" />
        </span>
        <div className="library-book__info">
          <h3>{book.title}</h3>
          <span className="library-book__meta">
            {book.author} · {book.year} · {book.genre}
          </span>
        </div>
        <button
          type="button"
          className="library-book__remove"
          aria-label={`Hide ${book.title}`}
          title="Hide this book"
          onClick={onHide}
        >
          <EyeOff size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="library-book__description">{book.description}</p>
      <div className="library-book__tags">
        {book.tags.map((tag) => (
          <span key={tag} className="library-tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="library-book__facts">
        <span>~{book.words.toLocaleString('en-US')} words</span>
        <span>~{bookReadingMinutes(book)} min</span>
        <span>Difficulty {book.difficulty}/5</span>
      </div>
      <DifficultyDots difficulty={book.difficulty} />
      {percent > 0 && (
        <div className="library-book__progress">
          <ProgressBar value={percent} height={8} />
          <span>
            {done}/{total} sections
          </span>
        </div>
      )}
      <div className="library-book__actions">
        <Button variant="primary" block className="aura-button--compact" onClick={onContinue}>
          {done > 0 ? 'Continue reading' : 'Start reading'}{' '}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
        <Button variant="ghost" block className="aura-button--compact" onClick={onOpen}>
          Chapters
        </Button>
      </div>
    </article>
  )
}

function ImportedCard({
  book,
  progress,
  onOpen,
  onRemove,
}: {
  book: LibraryBook
  progress: BookProgress | undefined
  onOpen: () => void
  onRemove: () => void
}) {
  const total = book.chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0)
  const done = progress?.completed.length ?? 0

  return (
    <article className="library-book library-book--imported">
      <div className="library-book__header">
        <span className="library-book__icon">
          <FileUp size={24} aria-hidden="true" />
        </span>
        <div className="library-book__info">
          <h3>{book.title}</h3>
          <span className="library-book__meta">
            ~{book.words.toLocaleString('en-US')} words · {book.source}
          </span>
        </div>
        <button
          type="button"
          className="library-book__remove"
          aria-label={`Remove ${book.title}`}
          onClick={onRemove}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
      {total > 0 && (
        <div className="library-book__progress">
          <ProgressBar value={(done / total) * 100} height={8} />
          <span>
            {done}/{total} sections
          </span>
        </div>
      )}
      <Button variant="primary" block onClick={onOpen}>
        Continue reading <ArrowRight size={16} aria-hidden="true" />
      </Button>
    </article>
  )
}

function DifficultyDots({ difficulty }: { difficulty: number }) {
  return (
    <div className="library-book__difficulty" aria-label={`Difficulty ${difficulty} of 5`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <span
          key={level}
          className={['difficulty-dot', level <= difficulty ? 'difficulty-dot--on' : '']
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  )
}
