import { Flag, Map, Play, Trophy } from 'lucide-react'
import { useMemo } from 'react'

import { ProgressBar } from '@/components/progress-bar'
import { UiIcon } from '@/components/ui-icon'
import {
  courseStages,
  nextAvailableLesson,
  roadmapOverview,
  stageProgress,
  unitNextLesson,
} from '@/engine/roadmap'
import { useAuraStore } from '@/state/store'

interface RoadmapScreenProps {
  onStartLesson: (lessonId: string) => void
}

export function RoadmapScreen({ onStartLesson }: RoadmapScreenProps) {
  const completedLessons = useAuraStore((state) => state.completedLessons)

  const completed = useMemo(() => new Set(completedLessons), [completedLessons])
  const stages = useMemo(() => courseStages(), [])
  const overview = roadmapOverview(completed)
  const next = nextAvailableLesson(completed)

  return (
    <div className="roadmap-screen">
      <h1 className="screen-title">
        <Map size={22} aria-hidden="true" /> Your roadmap
      </h1>
      <p className="screen-subtitle">
        The whole journey at a glance — from your first words to real fluency. Follow the stages and
        watch the path fill in.
      </p>

      <section className="result-section">
        <div className="roadmap-overview">
          <span className="roadmap-overview__badge">{overview.percent}%</span>
          <div className="roadmap-overview__info">
            <strong>
              {overview.done}/{overview.total} lessons
            </strong>
            <span className="roadmap-overview__meta">
              {overview.percent < 100 ? 'Keep the path moving' : 'Course complete — incredible!'}
            </span>
          </div>
        </div>
        <ProgressBar value={overview.percent} height={12} />
        {next !== undefined && (
          <button type="button" className="roadmap-continue" onClick={() => onStartLesson(next.id)}>
            <Play size={16} aria-hidden="true" /> Continue: {next.title}
          </button>
        )}
      </section>

      {stages.map((stage) => {
        const progress = stageProgress(stage, completed)
        const complete = progress.percent === 100
        return (
          <section key={stage.id} className="roadmap-stage">
            <header className="roadmap-stage__header">
              <span
                className={['roadmap-stage__badge', complete ? 'roadmap-stage__badge--done' : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                {complete ? (
                  <Trophy size={16} aria-hidden="true" />
                ) : (
                  <Flag size={16} aria-hidden="true" />
                )}
                {stage.label}
              </span>
              <div className="roadmap-stage__title">
                <h2>{stage.title}</h2>
                <span className="roadmap-stage__meta">
                  {progress.done}/{progress.total} lessons
                </span>
              </div>
            </header>
            <ProgressBar
              value={progress.percent}
              height={8}
              color={complete ? 'var(--aura-green)' : 'var(--aura-blue)'}
            />

            <div className="roadmap-units">
              {stage.units.map((unit) => {
                const done = unit.lessons.filter((lesson) => completed.has(lesson.id)).length
                const nextInUnit = unitNextLesson(unit, completed)
                const unitPercent = Math.round((done / unit.lessons.length) * 100)
                return (
                  <div key={unit.id} className="roadmap-unit">
                    <span className="roadmap-unit__icon" style={{ color: unit.color }}>
                      <UiIcon name={unit.icon} size={22} />
                    </span>
                    <div className="roadmap-unit__info">
                      <strong>{unit.title}</strong>
                      <span className="roadmap-unit__meta">
                        {done}/{unit.lessons.length} lessons
                      </span>
                    </div>
                    <div className="roadmap-unit__actions">
                      <ProgressBar value={unitPercent} height={6} />
                      {nextInUnit !== undefined && (
                        <button
                          type="button"
                          className="roadmap-unit__go"
                          aria-label={`Start ${nextInUnit.title}`}
                          onClick={() => onStartLesson(nextInUnit.id)}
                        >
                          {done === 0 ? 'Start' : 'Continue'}
                        </button>
                      )}
                      {nextInUnit === undefined && <span className="roadmap-unit__done">Done</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
