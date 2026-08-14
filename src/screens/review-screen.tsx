import {
  ArrowRight,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  PartyPopper,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { FeedbackState } from '@/components/exercises'
import type { FrequencyTier } from '@/engine/frequency'
import type { ReviewQueueItem, ReviewWord, WordContext } from '@/engine/review'

import { Button } from '@/components/button'
import { CardView, ChoiceView, ListenView, TapView, TypeView } from '@/components/exercises'
import { ProgressBar } from '@/components/progress-bar'
import { buildReviewQueue, buildReviewSession, retryItem, reviewGradeFor } from '@/engine/review'
import { playSound } from '@/engine/sounds'
import { weakWordsSorted } from '@/engine/stats'
import { trackReview } from '@/engine/telemetry'
import { XP_PER_REVIEW_CARD } from '@/engine/xp'
import { useHashRoute } from '@/hooks/use-hash-route'
import { useSpeech } from '@/hooks/use-speech'
import { useAuraStore } from '@/state/store'

const TIER_LABELS: Record<FrequencyTier, string> = {
  'very-common': 'Very common',
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  'very-rare': 'Very rare',
}

interface FailedWord {
  word: string
  meaning: string
  context: WordContext
}

type Phase = 'idle' | 'playing' | 'done'

function nowMs(): number {
  return Date.now()
}

export function ReviewScreen() {
  const cards = useAuraStore((state) => state.cards)
  const weakWords = useAuraStore((state) => state.weakWords)
  const review = useAuraStore((state) => state.review)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const awardXp = useAuraStore((state) => state.awardXp)
  const recordWeakWord = useAuraStore((state) => state.recordWeakWord)
  const clearWeakWord = useAuraStore((state) => state.clearWeakWord)
  const { navigate } = useHashRoute()
  const { speak } = useSpeech()

  const words = useMemo(
    () => buildReviewSession(Object.values(cards), weakWords),
    [cards, weakWords],
  )

  const [phase, setPhase] = useState<Phase>('idle')
  const [queue, setQueue] = useState<ReviewQueueItem[]>([])
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [correctCount, setCorrectCount] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [failedWords, setFailedWords] = useState<FailedWord[]>([])
  const [sessionCount, setSessionCount] = useState(0)
  const advanceRef = useRef<(() => void) | undefined>(undefined)
  const wordsRef = useRef<Map<string, ReviewWord>>(new Map())
  const shownAtRef = useRef(0)

  useEffect(() => {
    const item = queue[0]
    if (item?.exercise.kind === 'listen') {
      speak(item.word)
    }
  }, [queue, speak])

  const start = () => {
    wordsRef.current = new Map(words.map((word) => [word.word.toLowerCase(), word]))
    setSessionCount(words.length)
    setQueue(buildReviewQueue(words))
    setPhase('playing')
    setFeedback('idle')
    setCorrectCount(0)
    setAnswered(0)
    setFailedWords([])
    shownAtRef.current = nowMs()
  }

  const advance = () => {
    const run = advanceRef.current
    advanceRef.current = undefined
    run?.()
  }

  const handleAnswer = (correct: boolean) => {
    if (feedback !== 'idle') return
    const item = queue[0]
    if (item === undefined) return
    markGuidedAction('review')
    playSound(correct ? 'correct' : 'wrong')
    trackReview(correct, Math.max(0, nowMs() - shownAtRef.current))
    if (correct) {
      clearWeakWord(item.word)
      review(item.cardId, reviewGradeFor(true))
      awardXp(XP_PER_REVIEW_CARD)
      setCorrectCount((count) => count + 1)
    } else {
      recordWeakWord(item.word)
      review(item.cardId, reviewGradeFor(false))
      setFailedWords((current) =>
        current.some((entry) => entry.word.toLowerCase() === item.word.toLowerCase())
          ? current
          : [...current, { word: item.word, meaning: item.meaning, context: item.context }],
      )
    }
    setAnswered((count) => count + 1)
    setFeedback(correct ? 'correct' : 'wrong')

    const remaining = queue.slice(1)
    const word = wordsRef.current.get(item.word.toLowerCase())
    const retry = !correct && word !== undefined ? retryItem(word, item) : undefined
    const nextQueue = retry === undefined ? remaining : insertLater(remaining, retry)
    const finished = nextQueue.length === 0

    advanceRef.current = () => {
      setFeedback('idle')
      if (finished) {
        playSound('success')
        setPhase('done')
      } else {
        setQueue(nextQueue)
        shownAtRef.current = nowMs()
      }
    }
  }

  if (phase === 'done') {
    const xpEarned = correctCount * XP_PER_REVIEW_CARD
    return (
      <div className="review-screen review-screen--done">
        <div className="lesson-result__emoji">
          <PartyPopper size={64} aria-hidden="true" />
        </div>
        <h1>Review complete!</h1>
        <p>
          You reviewed {sessionCount} {sessionCount === 1 ? 'card' : 'cards'} and got {correctCount}{' '}
          {correctCount === 1 ? 'question' : 'questions'} right, earning {xpEarned} XP. Your memory
          is stronger.
        </p>

        {failedWords.length > 0 && (
          <section className="review-advice">
            <h2 className="section-title">
              <BookMarked size={16} aria-hidden="true" /> Words to revisit
            </h2>
            <p className="screen-subtitle">
              Go review these sections, then come back — the algorithm will test you on them again.
            </p>
            <ul className="review-advice__list">
              {failedWords.map((entry) => (
                <FailedWordRow key={entry.word} entry={entry} onNavigate={navigate} />
              ))}
            </ul>
          </section>
        )}

        <div className="lesson-result__actions">
          <Button variant="primary" block onClick={start}>
            Review again
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <div className="review-screen">
        <h1 className="screen-title">
          <RotateCcw size={20} aria-hidden="true" /> Review
        </h1>
        {words.length === 0 ? (
          <>
            <p className="screen-subtitle">
              No cards are due right now. Finish lessons or add words to fill your spaced-repetition
              queue!
            </p>
            <div className="review-empty">
              <BookOpen size={56} aria-hidden="true" />
            </div>
          </>
        ) : (
          <>
            <p className="screen-subtitle">
              {words.length} {words.length === 1 ? 'card is ready' : 'cards are ready'} today. Aura
              quizzes each word with different question types — meaning, listening, typing, sentence
              building — until you get it right. Miss a word and it comes back, then points you to
              the exact lesson to redo.
            </p>
            <Button variant="primary" block onClick={start}>
              Start review ({words.length})
            </Button>
            <FocusWords weakWords={weakWords} />
          </>
        )}
      </div>
    )
  }

  const current = queue[0]
  if (current === undefined) return null
  const currentWord = wordsRef.current.get(current.word.toLowerCase())
  const tier =
    currentWord?.context.tier === undefined ? undefined : TIER_LABELS[currentWord.context.tier]
  const total = answered + queue.length

  return (
    <div className="review-screen">
      <h1 className="screen-title">
        <RotateCcw size={20} aria-hidden="true" /> Review
      </h1>
      <div className="review-progress">
        <ProgressBar value={total > 0 ? (answered / total) * 100 : 0} height={12} />
        <span>
          {answered}/{total}
        </span>
      </div>

      <div className="review-quiz__header">
        {currentWord !== undefined && (currentWord.weak > 0 || currentWord.lapses > 0) ? (
          <span className="tier-badge">Focus word</span>
        ) : (
          tier !== undefined && <span className="tier-badge">{tier}</span>
        )}
        {currentWord !== undefined && currentWord.weak > 0 && (
          <span className="review-quiz__retries">missed {currentWord.weak}× before</span>
        )}
      </div>

      {renderExercise(current.exercise, feedback, handleAnswer)}

      {feedback !== 'idle' && (
        <div className="review-quiz__footer">
          <button type="button" className="lesson-screen__continue" onClick={advance}>
            <ArrowRight size={16} aria-hidden="true" />{' '}
            {feedback === 'wrong' ? 'I got it — keep going' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  )
}

function insertLater(queue: readonly ReviewQueueItem[], item: ReviewQueueItem): ReviewQueueItem[] {
  const at = Math.min(2, queue.length)
  return [...queue.slice(0, at), item, ...queue.slice(at)]
}

function renderExercise(
  exercise: ReviewQueueItem['exercise'],
  feedback: FeedbackState,
  onSubmit: (correct: boolean) => void,
) {
  switch (exercise.kind) {
    case 'choice': {
      return <ChoiceView exercise={exercise} feedback={feedback} onSubmit={onSubmit} />
    }
    case 'listen': {
      return <ListenView exercise={exercise} feedback={feedback} onSubmit={onSubmit} />
    }
    case 'type': {
      return <TypeView exercise={exercise} feedback={feedback} onSubmit={onSubmit} />
    }
    case 'tap': {
      return <TapView exercise={exercise} feedback={feedback} onSubmit={onSubmit} />
    }
    case 'card': {
      return <CardView exercise={exercise} feedback={feedback} onSubmit={onSubmit} />
    }
    default: {
      return null
    }
  }
}

function FocusWords({ weakWords }: { weakWords: Record<string, number> }) {
  const weak = weakWordsSorted(weakWords, 5)
  if (weak.length === 0) return null
  return (
    <section className="review-focus">
      <h2 className="section-title">
        <RotateCcw size={16} aria-hidden="true" /> Focus words go first
      </h2>
      <div className="review-focus__chips">
        {weak.map((item) => (
          <span key={item.word} className="word-chip">
            {item.word} · {item.count}
          </span>
        ))}
      </div>
    </section>
  )
}

function FailedWordRow({
  entry,
  onNavigate,
}: {
  entry: FailedWord
  onNavigate: (
    route: { name: 'lesson'; lessonId: string } | { name: 'dictionary'; word: string },
  ) => void
}) {
  const { context } = entry
  const lessonId = context.lessonId
  const lessonTitle = context.lessonTitle
  return (
    <li className="review-advice__row">
      <div className="review-advice__word">
        <strong>{entry.word}</strong>
        <span className="review-advice__meaning">{entry.meaning}</span>
      </div>
      <div className="review-advice__links">
        {lessonId !== undefined && lessonTitle !== undefined && (
          <Button variant="primary" onClick={() => onNavigate({ name: 'lesson', lessonId })}>
            <BookMarked size={16} aria-hidden="true" /> Lesson: {lessonTitle}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => onNavigate({ name: 'dictionary', word: entry.word })}
        >
          <BookOpenCheck size={16} aria-hidden="true" /> Dictionary
        </Button>
      </div>
      {context.unitTitle !== undefined && (
        <small className="review-advice__unit">Unit: {context.unitTitle}</small>
      )}
    </li>
  )
}
