import { BookOpen, Eye, PartyPopper, RotateCcw } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import type { ReviewGrade } from '@/engine/srs'

import { Button } from '@/components/button'
import { ProgressBar } from '@/components/progress-bar'
import { SpeechButton } from '@/components/speech-button'
import { playSound } from '@/engine/sounds'
import { weakWordsSorted } from '@/engine/stats'
import { trackReview } from '@/engine/telemetry'
import { XP_PER_REVIEW_CARD } from '@/engine/xp'
import { useAuraStore } from '@/state/store'

export function ReviewScreen() {
  const cards = useAuraStore((state) => state.cards)
  const review = useAuraStore((state) => state.review)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const awardXp = useAuraStore((state) => state.awardXp)
  const recordWeakWord = useAuraStore((state) => state.recordWeakWord)
  const clearWeakWord = useAuraStore((state) => state.clearWeakWord)
  const weakWords = useAuraStore((state) => state.weakWords)

  const due = useMemo(() => {
    const now = new Date().toISOString()
    return Object.values(cards)
      .filter((card) => card.state.due <= now)
      .toSorted((a, b) => {
        const aWeak = weakWords[a.word.toLowerCase()] ?? 0
        const bWeak = weakWords[b.word.toLowerCase()] ?? 0
        return bWeak - aWeak || a.state.due.localeCompare(b.state.due)
      })
  }, [cards, weakWords])

  const [queue, setQueue] = useState<typeof due>([])
  const [total, setTotal] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const revealedAtRef = useRef(0)

  const start = () => {
    setQueue(due)
    setTotal(due.length)
    setRevealed(false)
    setDone(false)
  }

  const reveal = () => {
    revealedAtRef.current = Date.now()
    setRevealed(true)
  }

  const grade = (value: ReviewGrade) => {
    if (queue.length === 0) return
    markGuidedAction('review')
    const top = queue[0]!
    playSound(value >= 4 ? 'correct' : 'wrong')
    trackReview(value >= 4, Date.now() - revealedAtRef.current)
    if (value >= 4) clearWeakWord(top.word)
    else recordWeakWord(top.word)
    review(top.id, value)
    awardXp(XP_PER_REVIEW_CARD)
    const remaining = queue.slice(1)
    if (remaining.length === 0) {
      playSound('success')
      setDone(true)
    } else {
      setQueue(remaining)
      setRevealed(false)
    }
  }

  if (done) {
    return (
      <div className="review-screen review-screen--done">
        <div className="lesson-result__emoji">
          <PartyPopper size={64} aria-hidden="true" />
        </div>
        <h1>Review complete!</h1>
        <p>
          You reviewed {total} {total === 1 ? 'card' : 'cards'} and earned{' '}
          {total * XP_PER_REVIEW_CARD} XP. Your memory is stronger.
        </p>
        <div className="lesson-result__actions">
          <Button variant="primary" block onClick={start}>
            Review again
          </Button>
        </div>
      </div>
    )
  }

  const current = queue[0]

  if (current === undefined) {
    return (
      <div className="review-screen">
        <h1 className="screen-title">
          <RotateCcw size={20} aria-hidden="true" /> Review
        </h1>
        {due.length === 0 ? (
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
              You have {due.length} {due.length === 1 ? 'card ready' : 'cards ready'} to review
              today.
            </p>
            <Button variant="primary" block onClick={start}>
              Start review ({due.length})
            </Button>
            <FocusWords weakWords={weakWords} />
          </>
        )}
      </div>
    )
  }

  const reviewed = total - queue.length

  return (
    <div className="review-screen">
      <h1 className="screen-title">
        <RotateCcw size={20} aria-hidden="true" /> Review
      </h1>
      <div className="review-progress">
        <ProgressBar value={total > 0 ? (reviewed / total) * 100 : 0} height={12} />
        <span>
          {reviewed}/{total}
        </span>
      </div>

      <div className="review-card">
        <div className="review-card__header">
          <SpeechButton text={current.word} size="lg" label={`Listen to ${current.word}`} />
          <span className="tier-badge">Top review</span>
        </div>
        <h2>{current.word}</h2>
        <button type="button" className="review-card__reveal" onClick={reveal} disabled={revealed}>
          {revealed ? <Eye size={18} aria-hidden="true" /> : 'Tap to see the answer'}
        </button>
        {revealed && (
          <div className="review-card__answer">
            <p>{current.meaning}</p>
            {current.note !== undefined && <small>{current.note}</small>}
          </div>
        )}
      </div>

      <div className="review-grades">
        <Button variant="danger" disabled={!revealed} onClick={() => grade(1)}>
          Again
        </Button>
        <Button variant="secondary" disabled={!revealed} onClick={() => grade(3)}>
          Hard
        </Button>
        <Button variant="success" disabled={!revealed} onClick={() => grade(4)}>
          Good
        </Button>
        <Button variant="primary" disabled={!revealed} onClick={() => grade(5)}>
          Easy
        </Button>
      </div>
    </div>
  )
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
