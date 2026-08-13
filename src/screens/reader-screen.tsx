import {
  ArrowLeft,
  BarChart3,
  Check,
  Gauge,
  Languages,
  Lightbulb,
  ListOrdered,
  Play,
  Sprout,
  Square,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import type { AnalyzerResult } from '@/engine/analyzer'
import type { DictionaryEntry } from '@/engine/dictionary'
import type { FrequencyTier } from '@/engine/frequency'
import type { BookExpression, ReadingQuestion, SectionNewWord } from '@/engine/library'
import type { LibraryBook, LibraryChapter, VocabularyEntry } from '@/engine/types'

import { Button } from '@/components/button'
import { SpeechButton } from '@/components/speech-button'
import { analyzeText } from '@/engine/analyze'
import { cefrLevelOf } from '@/engine/cefr'
import { lookupWord } from '@/engine/dictionary'
import { FREQUENCY_TIER_LABELS, frequencyTierOf } from '@/engine/frequency'
import {
  bookExpressions,
  chapterById,
  checkReadingAnswer,
  countWords,
  loadBook,
  sectionNewWords,
  sectionQuestions,
  sectionText,
} from '@/engine/library'
import { playSound } from '@/engine/sounds'
import {
  trackBookView,
  trackReaderQuizAnswer,
  trackSectionComplete,
  trackWordLookup,
  trackWordSave,
} from '@/engine/telemetry'
import { lookupVocab } from '@/engine/vocabulary'
import { useSpeech } from '@/hooks/use-speech'
import { useAuraStore } from '@/state/store'

const XP_PER_SECTION = 10

type ReaderPanel = 'words' | 'phrases' | 'analysis'

interface ReaderScreenProps {
  bookId: string
  chapterId?: string
  sectionIndex?: number
  onBack: () => void
  onPosition: (bookId: string, chapterId: string, sectionIndex: number) => void
}

export function ReaderScreen({
  bookId,
  chapterId,
  sectionIndex,
  onBack,
  onPosition,
}: ReaderScreenProps) {
  const importedBooks = useAuraStore((state) => state.importedBooks)
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
        return
      }
      setStatus('loading')
      try {
        const loaded = await loadBook(bookId)
        if (!alive) return
        setBook(loaded)
        setStatus('ready')
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
      <div className="reader-screen">
        <p className="screen-subtitle">Loading…</p>
      </div>
    )
  }

  if (status === 'missing' || book === undefined) {
    return (
      <div className="reader-screen">
        <div className="empty-state">
          <Languages size={48} aria-hidden="true" />
          <p>This book is not in your library.</p>
          <button type="button" className="onboarding__skip" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <Reader
      key={book.id}
      book={book}
      {...(chapterId !== undefined && { chapterId })}
      {...(sectionIndex !== undefined && { sectionIndex })}
      onPosition={onPosition}
      onBack={onBack}
    />
  )
}

function Reader({
  book,
  chapterId,
  sectionIndex,
  onPosition,
  onBack,
}: {
  book: LibraryBook
  chapterId?: string
  sectionIndex?: number
  onPosition: (bookId: string, chapterId: string, sectionIndex: number) => void
  onBack: () => void
}) {
  const progress = useAuraStore((state) => state.libraryProgress[book.id])
  const learnedWords = useAuraStore((state) => state.learnedWords)
  const markSectionComplete = useAuraStore((state) => state.markSectionComplete)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const setReadingPosition = useAuraStore((state) => state.setReadingPosition)
  const recordReading = useAuraStore((state) => state.recordReading)
  const addWord = useAuraStore((state) => state.addWord)
  const awardXp = useAuraStore((state) => state.awardXp)
  const { speakGuided, guiding, stop } = useSpeech()

  const resolvedChapterId = useMemo(() => {
    if (chapterId !== undefined && chapterById(book, chapterId) !== undefined) return chapterId
    if (
      progress?.lastChapter !== undefined &&
      chapterById(book, progress.lastChapter) !== undefined
    ) {
      return progress.lastChapter
    }
    return book.chapters[0]?.id ?? ''
  }, [book, chapterId, progress])

  const chapter: LibraryChapter | undefined = chapterById(book, resolvedChapterId)

  const resolvedSectionIndex = useMemo(() => {
    if (chapter === undefined) return 0
    if (sectionIndex !== undefined && sectionIndex >= 0 && sectionIndex < chapter.sections.length) {
      return sectionIndex
    }
    if (progress?.lastSection !== undefined) {
      const index = chapter.sections.findIndex((candidate) => candidate.id === progress.lastSection)
      if (index !== -1) return index
    }
    return 0
  }, [chapter, progress, sectionIndex])

  const section = chapter?.sections[resolvedSectionIndex]

  const [finished, setFinished] = useState(false)
  const [lookup, setLookup] = useState<LookupState | undefined>(undefined)
  const [panel, setPanel] = useState<ReaderPanel | undefined>(undefined)
  const [analysis, setAnalysis] = useState<AnalyzerResult | undefined>(undefined)
  const [analyzing, setAnalyzing] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | number[]>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [guideIndex, setGuideIndex] = useState<number | undefined>(undefined)

  const startedAt = useRef<number | null>(null)
  const quizShownAtRef = useRef(0)
  const answeredQuizRef = useRef<Set<string>>(new Set())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(
    () => () => {
      stop()
    },
    [stop],
  )

  useEffect(() => {
    trackBookView(book.id)
  }, [book.id])

  useEffect(() => {
    if (chapter === undefined || section === undefined) return
    startedAt.current = Date.now()
    setFinished(false)
    setLookup(undefined)
    setAnswers({})
    setChecked({})
    setAnalysis(undefined)
    setPanel(undefined)
    setGuideIndex(undefined)
    stop()
    setReadingPosition(book.id, chapter.id, section.id)
  }, [book.id, chapter, section, setReadingPosition, startedAt, stop])

  const questions = useMemo(
    () => (section === undefined ? [] : sectionQuestions(section)),
    [section],
  )
  const newWords = useMemo(
    () => (section === undefined ? [] : sectionNewWords(section, new Set(learnedWords))),
    [section, learnedWords],
  )
  const expressions = useMemo(() => bookExpressions(book), [book])
  const passage = useMemo(() => {
    if (section === undefined) return []
    let offset = 0
    return section.paragraphs.map((paragraph) => {
      const tokens = tokenizeParagraph(paragraph)
      const wordStart = offset
      offset += tokens.filter((token) => token.isWord).length
      return { tokens, wordStart }
    })
  }, [section])

  const toggleGuide = () => {
    if (guiding) {
      stop()
      setGuideIndex(undefined)
      return
    }
    if (section === undefined) return
    playSound('page')
    setGuideIndex(0)
    speakGuided(sectionText(section), {
      onWord: (index) => setGuideIndex(index),
      onEnd: () => setGuideIndex(undefined),
    })
  }

  if (chapter === undefined || section === undefined) {
    return (
      <div className="reader-screen">
        <div className="empty-state">
          <p>Nothing to read here.</p>
          <button type="button" className="onboarding__skip" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    )
  }

  const words = countWords(sectionText(section))
  const elapsedSeconds = Math.round((now - (startedAt.current ?? now)) / 1000)
  const wpm = finished && elapsedSeconds > 0 ? Math.round(words / (elapsedSeconds / 60)) : undefined

  const chapterIndex = book.chapters.findIndex((candidate) => candidate.id === chapter.id)
  const isLastSection =
    resolvedSectionIndex === chapter.sections.length - 1 &&
    chapterIndex === book.chapters.length - 1

  const finish = () => {
    markSectionComplete(book.id, section.id)
    markGuidedAction('reading')
    awardXp(XP_PER_SECTION)
    const seconds = Math.max(1, Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000))
    const wpm = words / (seconds / 60)
    recordReading(seconds, wpm > 0 ? Math.round(wpm) : undefined)
    trackSectionComplete(book.id, seconds, wpm > 0 ? Math.round(wpm) : undefined)
    quizShownAtRef.current = Date.now()
    answeredQuizRef.current = new Set()
    playSound('success')
    setFinished(true)
  }

  const goNext = () => {
    if (resolvedSectionIndex < chapter.sections.length - 1) {
      playSound('page')
      onPosition(book.id, chapter.id, resolvedSectionIndex + 1)
      return
    }
    const next = book.chapters[chapterIndex + 1]
    if (next === undefined) {
      playSound('achievement')
      onBack()
      return
    }
    playSound('page')
    onPosition(book.id, next.id, 0)
  }

  const onWord = async (word: string) => {
    playSound('click')
    const key = word.toLowerCase()
    trackWordLookup(key)
    setLookup({
      word: key,
      bank: lookupVocab(key),
      entry: undefined,
      tier: frequencyTierOf(key),
      lookedUp: false,
    })
    try {
      const entry = await lookupWord(key)
      setLookup((current) =>
        current?.word === key ? { ...current, entry, lookedUp: true } : current,
      )
    } catch {
      setLookup((current) => (current?.word === key ? { ...current, lookedUp: true } : current))
    }
  }

  const saveLookup = () => {
    if (lookup === undefined) return
    const meaning =
      lookup.bank?.meaning ?? lookup.entry?.senses[0]?.gloss ?? 'A word from your reading'
    addWord(lookup.word, meaning)
    trackWordSave(lookup.word)
    setLookup(undefined)
  }

  const runAnalysis = () => {
    setAnalyzing(true)
    void (async () => {
      try {
        const result = await analyzeText(sectionText(section))
        setAnalysis(result)
      } catch {
        setAnalysis(undefined)
      } finally {
        setAnalyzing(false)
      }
    })()
  }

  return (
    <div className="reader-screen">
      <header className="reader-screen__header">
        <button
          type="button"
          className="lesson-screen__close"
          aria-label="Back to the book"
          onClick={onBack}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="reader-screen__heading">
          <strong>{chapter.title}</strong>
          <span>
            Section {resolvedSectionIndex + 1} of {chapter.sections.length} ·{' '}
            {formatTime(elapsedSeconds)}
          </span>
        </div>
        {finished && wpm !== undefined && (
          <span className="reader-screen__wpm" title="Your reading speed">
            <Gauge size={16} aria-hidden="true" /> {wpm} wpm
          </span>
        )}
      </header>

      <nav className="reader-toolbar" aria-label="Reading tools">
        <ToolbarButton
          active={guiding}
          label={guiding ? 'Stop' : 'Read'}
          onClick={toggleGuide}
          icon={
            guiding ? (
              <Square size={14} aria-hidden="true" />
            ) : (
              <Play size={16} aria-hidden="true" />
            )
          }
        />
        <div className="reader-tabs" role="tablist" aria-label="Reader panels">
          <ToolbarButton
            active={panel === 'words'}
            label={`Words (${newWords.length})`}
            onClick={() => setPanel((current) => (current === 'words' ? undefined : 'words'))}
            icon={<Sprout size={16} aria-hidden="true" />}
            tab
            selected={panel === 'words'}
            controls="reader-panel"
          />
          <ToolbarButton
            active={panel === 'phrases'}
            label="Phrases"
            onClick={() => setPanel((current) => (current === 'phrases' ? undefined : 'phrases'))}
            icon={<Languages size={16} aria-hidden="true" />}
            tab
            selected={panel === 'phrases'}
            controls="reader-panel"
          />
          <ToolbarButton
            active={panel === 'analysis'}
            label="Analysis"
            onClick={() => setPanel((current) => (current === 'analysis' ? undefined : 'analysis'))}
            icon={<BarChart3 size={16} aria-hidden="true" />}
            tab
            selected={panel === 'analysis'}
            controls="reader-panel"
          />
        </div>
      </nav>

      <main className="reader-content">
        <div className="reader-panel-slot" id="reader-panel" role="tabpanel">
          {panel === 'words' && (
            <section className="reader-panel">
              <h2 className="section-title">
                <Sprout size={18} aria-hidden="true" /> Words to notice
              </h2>
              {newWords.length > 0 ? (
                <>
                  <p className="reader-panel__hint">
                    The rarest words in this passage. Listen, save them, and watch for them while
                    you read.
                  </p>
                  <ul className="reader-word-list">
                    {newWords.map((item) => (
                      <NewWordRow
                        key={item.word}
                        item={item}
                        onSave={() => {
                          const meaning =
                            lookupVocab(item.word)?.meaning ?? 'A word from your reading'
                          addWord(item.word, meaning)
                          trackWordSave(item.word)
                        }}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                <p className="reader-panel__hint">
                  No rare words to point out in this passage — nice job.
                </p>
              )}
            </section>
          )}

          {panel === 'phrases' && (
            <section className="reader-panel">
              <h2 className="section-title">
                <Languages size={18} aria-hidden="true" /> Expressions in this book
              </h2>
              {expressions.length > 0 ? (
                <>
                  <p className="reader-panel__hint">
                    Repeated real-English phrases. They appear throughout the book — noticing them
                    makes your English sound natural.
                  </p>
                  <ul className="reader-expression-list">
                    {expressions.map((expression) => (
                      <ExpressionRow key={expression.phrase} expression={expression} />
                    ))}
                  </ul>
                </>
              ) : (
                <p className="reader-panel__hint">No repeated expressions found in this book.</p>
              )}
            </section>
          )}

          {panel === 'analysis' && (
            <section className="reader-panel">
              <h2 className="section-title">
                <BarChart3 size={18} aria-hidden="true" /> Passage analysis
              </h2>
              {analysis === undefined ? (
                <Button variant="secondary" onClick={() => runAnalysis()}>
                  {analyzing ? 'Analyzing…' : 'Run NLP analysis'}
                </Button>
              ) : (
                <AnalysisSummary result={analysis} />
              )}
            </section>
          )}
        </div>

        <div className="reader-passage">
          {passage.map((entry, index) => (
            <ReaderParagraph
              key={`${section.id}-${index}`}
              tokens={entry.tokens}
              wordStart={entry.wordStart}
              guideIndex={guideIndex}
              onWord={(word) => void onWord(word)}
            />
          ))}
        </div>
      </main>

      {lookup !== undefined && (
        <LookupPanel state={lookup} onSave={saveLookup} onClose={() => setLookup(undefined)} />
      )}

      <footer className="reader-footer">
        {finished ? (
          <>
            <div className="reader-stats">
              <span>
                <strong>{words.toLocaleString('en-US')}</strong> words
              </span>
              <span>
                <strong>{formatTime(elapsedSeconds)}</strong> time
              </span>
              {wpm !== undefined && (
                <span>
                  <strong>{wpm}</strong> wpm
                </span>
              )}
              <span>
                <strong>+{XP_PER_SECTION}</strong> XP
              </span>
            </div>
            {questions.length > 0 && (
              <div className="reader-quiz">
                <h2 className="section-title">
                  <ListOrdered size={18} aria-hidden="true" /> Did you understand it?
                </h2>
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    answer={answers[question.id]}
                    isChecked={checked[question.id] ?? false}
                    onAnswer={(value) => {
                      setAnswers((current) => ({ ...current, [question.id]: value }))
                      if (question.type === 'cloze' && !answeredQuizRef.current.has(question.id)) {
                        answeredQuizRef.current.add(question.id)
                        trackReaderQuizAnswer(
                          checkReadingAnswer(question, value),
                          Date.now() - quizShownAtRef.current,
                        )
                      }
                    }}
                    onCheck={() => {
                      setChecked((current) => ({ ...current, [question.id]: true }))
                      if (question.type === 'order' && !answeredQuizRef.current.has(question.id)) {
                        answeredQuizRef.current.add(question.id)
                        trackReaderQuizAnswer(
                          checkReadingAnswer(question, answers[question.id] ?? []),
                          Date.now() - quizShownAtRef.current,
                        )
                      }
                    }}
                  />
                ))}
              </div>
            )}
            <Button variant="primary" block onClick={goNext}>
              {isLastSection ? 'Finish the book' : 'Next section'}
            </Button>
          </>
        ) : (
          <>
            {!isLastSection && (
              <Button variant="ghost" block onClick={goNext}>
                Skip ahead
              </Button>
            )}
            <Button variant="primary" block onClick={finish}>
              <Check size={16} aria-hidden="true" /> Finish section
            </Button>
          </>
        )}
      </footer>
    </div>
  )
}

interface LookupState {
  word: string
  bank: VocabularyEntry | undefined
  entry: DictionaryEntry | undefined
  tier: FrequencyTier | undefined
  lookedUp: boolean
}

function LookupPanel({
  state,
  onSave,
  onClose,
}: {
  state: LookupState
  onSave: () => void
  onClose: () => void
}) {
  const meaning = state.bank?.meaning ?? state.entry?.senses[0]?.gloss
  return (
    <div className="reader-lookup">
      <div className="reader-lookup__head">
        <h3>{state.word}</h3>
        <SpeechButton text={state.word} size="sm" label={`Listen to ${state.word}`} />
        {state.tier !== undefined && (
          <span className={`tier-badge tier-badge--${state.tier}`}>
            {FREQUENCY_TIER_LABELS[state.tier]}
          </span>
        )}
        {cefrLevelOf(state.word) !== undefined && (
          <span className="tier-badge">CEFR {cefrLevelOf(state.word)}</span>
        )}
        <button type="button" className="reader-lookup__close" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="reader-lookup__meaning">
        {meaning ??
          (state.lookedUp
            ? 'Not in the offline bank — WordNet is available in the desktop app.'
            : 'Looking up…')}
      </p>
      <div className="reader-lookup__actions">
        <Button variant="success" block onClick={onSave}>
          + Save to my vocabulary
        </Button>
      </div>
    </div>
  )
}

interface ParagraphToken {
  text: string
  isWord: boolean
}

function tokenizeParagraph(text: string): ParagraphToken[] {
  return text.split(/(\s+)/).map((part) => ({
    text: part,
    isWord: part.replaceAll(/[^A-Za-z0-9']+/g, '').length > 0,
  }))
}

function ReaderParagraph({
  tokens,
  wordStart,
  guideIndex,
  onWord,
}: {
  tokens: ParagraphToken[]
  wordStart: number
  guideIndex: number | undefined
  onWord: (word: string) => void
}) {
  return (
    <p className="reader-paragraph">
      {tokens.map((token, index) => {
        if (!token.isWord) return token.text
        const wordsBefore = tokens.slice(0, index).filter((candidate) => candidate.isWord).length
        const globalIndex = wordStart + wordsBefore
        const key = token.text.replaceAll(/[^A-Za-z0-9']+/g, '')
        const classes = ['reader-word', globalIndex === guideIndex ? 'reader-word--guide' : '']
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={`${key}-${index}`}
            type="button"
            className={classes}
            onClick={() => onWord(key)}
          >
            {token.text}
          </button>
        )
      })}
    </p>
  )
}

function NewWordRow({ item, onSave }: { item: SectionNewWord; onSave: () => void }) {
  const meaning = lookupVocab(item.word)?.meaning
  return (
    <li className="reader-word-row">
      <SpeechButton text={item.word} size="sm" label={`Listen to ${item.word}`} />
      <div className="reader-word-row__info">
        <strong>{item.word}</strong>
        <span>{meaning ?? 'Not in the local bank'}</span>
      </div>
      <span className={`tier-badge tier-badge--${item.tier}`}>
        {FREQUENCY_TIER_LABELS[item.tier]}
      </span>
      <Button variant="ghost" onClick={onSave}>
        + Save
      </Button>
    </li>
  )
}

function ExpressionRow({ expression }: { expression: BookExpression }) {
  return (
    <li className="reader-expression">
      <SpeechButton text={expression.phrase} size="sm" label={`Listen to ${expression.phrase}`} />
      <div>
        <strong>{expression.phrase}</strong>
        <span className="reader-expression__count">×{expression.count}</span>
        <p className="reader-expression__example">{expression.example}</p>
      </div>
    </li>
  )
}

function ClozeSentence({ sentence, answer }: { sentence: string; answer: string | undefined }) {
  if (answer === undefined) return <>{sentence}</>
  const [before, after] = sentence.split('______', 2)
  if (after === undefined) return <>{sentence}</>
  return (
    <>
      {before}
      <span className="reader-question__fill">{answer}</span>
      {after}
    </>
  )
}

function QuestionCard({
  question,
  answer,
  isChecked,
  onAnswer,
  onCheck,
}: {
  question: ReadingQuestion
  answer: string | number[] | undefined
  isChecked: boolean
  onAnswer: (value: string | number[]) => void
  onCheck: () => void
}) {
  if (question.type === 'cloze') {
    const correct = isChecked && answer === question.answer
    const wrong = isChecked && answer !== question.answer
    const selected = typeof answer === 'string' ? answer : undefined
    return (
      <div
        className={`reader-question ${correct ? 'reader-question--correct' : ''} ${wrong ? 'reader-question--wrong' : ''}`}
      >
        <p className="reader-question__prompt">
          <ClozeSentence sentence={question.sentence} answer={selected} />
        </p>
        <div className="reader-question__options">
          {question.options.map((option) => {
            const chosen = answer === option
            const isAnswer = option === question.answer
            const optionClass = [
              'reader-question__option',
              chosen && !isChecked ? 'reader-question__option--selected' : '',
              isChecked && isAnswer ? 'reader-question__option--correct' : '',
              isChecked && chosen && !isAnswer ? 'reader-question__option--wrong' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={option}
                type="button"
                className={optionClass}
                disabled={isChecked}
                onClick={() => {
                  onAnswer(option)
                  playSound(option === question.answer ? 'correct' : 'wrong')
                }}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const order = Array.isArray(answer) ? answer : []
  const isComplete = order.length === question.sentences.length
  const correct = isChecked && checkReadingAnswer(question, order)

  return (
    <div className={`reader-question ${correct ? 'reader-question--correct' : ''}`}>
      <p className="reader-question__prompt">
        Put the sentences in order as they appear in the text:
      </p>
      <ol className="reader-order">
        {question.sentences.map((sentence, index) => {
          const position = order.indexOf(index)
          return (
            <li key={`${sentence}-${index}`}>
              <button
                type="button"
                className={[
                  'reader-order__sentence',
                  position === -1 ? '' : 'reader-order__sentence--picked',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() =>
                  onAnswer(
                    orderIncludes(order, index)
                      ? order.filter((item) => item !== index)
                      : [...order, index],
                  )
                }
              >
                {position !== -1 && <span className="reader-order__num">{position + 1}</span>}
                {sentence}
              </button>
            </li>
          )
        })}
      </ol>
      <div className="reader-question__actions">
        <Button
          variant="secondary"
          disabled={!isComplete}
          onClick={() => {
            onCheck()
            playSound(correct ? 'correct' : 'wrong')
          }}
        >
          Check order
        </Button>
        {isChecked &&
          (correct ? (
            <span className="reader-question__verdict">Correct!</span>
          ) : (
            <span className="reader-question__verdict">Not quite — read the passage again.</span>
          ))}
      </div>
    </div>
  )
}

function orderIncludes(order: number[], index: number): boolean {
  return order.includes(index)
}

function AnalysisSummary({ result }: { result: AnalyzerResult }) {
  return (
    <div className="reader-analysis">
      {result.readingAge !== undefined && (
        <p className="reader-analysis__age">
          <Lightbulb size={16} aria-hidden="true" /> Estimated reading age: ~
          {Math.round(result.readingAge)} years · {result.sentences} sentences in this passage
        </p>
      )}
      <div className="reader-analysis__grid">
        {result.readability.slice(0, 3).map((score) => (
          <div key={score.name} className="reader-analysis__score">
            <span>{score.name}</span>
            <strong>{score.value.toFixed(1)}</strong>
          </div>
        ))}
      </div>
      {result.notes.length > 0 && (
        <ul className="reader-analysis__notes">
          {result.notes.slice(0, 4).map((note, index) => (
            <li key={`${note.ruleId}-${index}`}>{note.message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ToolbarButton({
  active,
  label,
  icon,
  onClick,
  tab = false,
  selected = false,
  controls,
}: {
  active: boolean
  label: string
  icon: ReactNode
  onClick: () => void
  tab?: boolean
  selected?: boolean
  controls?: string
}) {
  return (
    <button
      type="button"
      className={['reader-toolbar__button', active ? 'reader-toolbar__button--active' : '']
        .filter(Boolean)
        .join(' ')}
      aria-pressed={tab ? undefined : active}
      role={tab ? 'tab' : undefined}
      aria-selected={tab ? selected : undefined}
      aria-controls={controls}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
