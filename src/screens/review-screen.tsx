import { useMemo, useState } from 'react'

import type { ReviewGrade } from '@/engine/srs'

import { Button } from '@/components/button'
import { ProgressBar } from '@/components/progress-bar'
import { SpeechButton } from '@/components/speech-button'
import { XP_PER_REVIEW_CARD } from '@/engine/xp'
import { useAuraStore } from '@/state/store'

export function ReviewScreen() {
  const cards = useAuraStore((state) => state.cards)
  const review = useAuraStore((state) => state.review)
  const awardXp = useAuraStore((state) => state.awardXp)

  const due = useMemo(() => {
    const now = new Date().toISOString()
    return Object.values(cards)
      .filter((card) => card.state.due <= now)
      .toSorted((a, b) => a.state.due.localeCompare(b.state.due))
  }, [cards])

  const [queue, setQueue] = useState<typeof due>([])
  const [total, setTotal] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)

  const start = () => {
    setQueue(due)
    setTotal(due.length)
    setRevealed(false)
    setDone(false)
  }

  const grade = (value: ReviewGrade) => {
    if (queue.length === 0) return
    const top = queue[0]!
    review(top.id, value)
    awardXp(XP_PER_REVIEW_CARD)
    const remaining = queue.slice(1)
    if (remaining.length === 0) {
      setDone(true)
    } else {
      setQueue(remaining)
      setRevealed(false)
    }
  }

  if (done) {
    return (
      <div className="review-screen review-screen--done">
        <div className="lesson-result__emoji">🎉</div>
        <h1>¡Repaso completado!</h1>
        <p>
          Repasaste {total} {total === 1 ? 'tarjeta' : 'tarjetas'} y ganaste{' '}
          {total * XP_PER_REVIEW_CARD} XP. Tu memoria está más fuerte.
        </p>
        <div className="lesson-result__actions">
          <Button variant="primary" block onClick={start}>
            Repasar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  const current = queue[0]

  if (current === undefined) {
    return (
      <div className="review-screen">
        <h1>Repaso 🔁</h1>
        {due.length === 0 ? (
          <>
            <p className="screen-subtitle">
              No tienes tarjetas pendientes. 🎊 ¡Termina lecciones o añade palabras para llenar tu
              cola de repaso espaciado!
            </p>
            <div className="review-empty">
              <span>📚</span>
            </div>
          </>
        ) : (
          <>
            <p className="screen-subtitle">
              Tienes {due.length} {due.length === 1 ? 'tarjeta lista' : 'tarjetas listas'} para
              repasar hoy.
            </p>
            <Button variant="primary" block onClick={start}>
              Empezar repaso ({due.length})
            </Button>
          </>
        )}
      </div>
    )
  }

  const reviewed = total - queue.length

  return (
    <div className="review-screen">
      <h1>Repaso 🔁</h1>
      <div className="review-progress">
        <ProgressBar value={total > 0 ? (reviewed / total) * 100 : 0} height={12} />
        <span>
          {reviewed}/{total}
        </span>
      </div>

      <div className="review-card">
        <div className="review-card__header">
          <SpeechButton text={current.word} size="lg" label={`Escuchar ${current.word}`} />
          <span className="tier-badge">Top repaso</span>
        </div>
        <h2>{current.word}</h2>
        <button
          type="button"
          className="review-card__reveal"
          onClick={() => setRevealed(true)}
          disabled={revealed}
        >
          {revealed ? '👀' : 'Toca para ver la respuesta'}
        </button>
        {revealed && (
          <div className="review-card__answer">
            {current.translation !== undefined && (
              <p className="review-card__translation">{current.translation}</p>
            )}
            <p>{current.meaning}</p>
            {current.note !== undefined && <small>{current.note}</small>}
          </div>
        )}
      </div>

      <div className="review-grades">
        <Button variant="danger" disabled={!revealed} onClick={() => grade(1)}>
          Otra vez
        </Button>
        <Button variant="secondary" disabled={!revealed} onClick={() => grade(3)}>
          Difícil
        </Button>
        <Button variant="success" disabled={!revealed} onClick={() => grade(4)}>
          Bien
        </Button>
        <Button variant="primary" disabled={!revealed} onClick={() => grade(5)}>
          Fácil
        </Button>
      </div>
    </div>
  )
}
