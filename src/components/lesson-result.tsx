import { useEffect } from 'react'

import { Button } from '@/components/button'
import { UiIcon } from '@/components/ui-icon'
import { playSound } from '@/engine/sounds'

interface LessonResultProps {
  title: string
  xp: number
  correct: number
  total: number
  perfect: boolean
  onRetry: () => void
  onHome: () => void
}

function resultIcon(perfect: boolean, correct: number, total: number): string {
  if (perfect) return 'Trophy'
  if (correct >= total * 0.7) return 'PartyPopper'
  return 'Dumbbell'
}

export function LessonResult({
  title,
  xp,
  correct,
  total,
  perfect,
  onRetry,
  onHome,
}: LessonResultProps) {
  useEffect(() => {
    if (perfect) playSound('achievement')
  }, [perfect])

  return (
    <div className="lesson-result">
      <div className="lesson-result__emoji">
        <UiIcon name={resultIcon(perfect, correct, total)} size={64} />
      </div>
      <h2>{perfect ? 'Perfect lesson!' : 'Lesson complete'}</h2>
      <p className="lesson-result__subtitle">{title}</p>

      <div className="lesson-result__stats">
        <div className="stat-card">
          <span className="stat-card__value">{xp}</span>
          <span className="stat-card__label">XP earned</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">
            {correct}/{total}
          </span>
          <span className="stat-card__label">Correct</span>
        </div>
      </div>

      <div className="lesson-result__actions">
        <Button variant="primary" block onClick={onRetry}>
          Repeat lesson
        </Button>
        <Button variant="secondary" block onClick={onHome}>
          Back to home
        </Button>
      </div>
    </div>
  )
}
