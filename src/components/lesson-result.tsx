import { Button } from '@/components/button'

interface LessonResultProps {
  title: string
  xp: number
  correct: number
  total: number
  perfect: boolean
  onRetry: () => void
  onHome: () => void
}

function resultEmoji(perfect: boolean, correct: number, total: number): string {
  if (perfect) return '🏆'
  if (correct >= total * 0.7) return '🎉'
  return '💪'
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
  return (
    <div className="lesson-result">
      <div className="lesson-result__emoji">{resultEmoji(perfect, correct, total)}</div>
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
