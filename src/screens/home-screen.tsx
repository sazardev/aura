import { useMemo } from 'react'

import type { Lesson } from '@/engine/lessons'

import { ProgressBar } from '@/components/progress-bar'
import { ACHIEVEMENTS } from '@/engine/achievements'
import { COURSE, previousLessonId } from '@/engine/lessons'
import { levelFromXp } from '@/engine/xp'
import { useAuraStore } from '@/state/store'

interface HomeScreenProps {
  onStartLesson: (lessonId: string) => void
}

type NodeStatus = 'done' | 'available' | 'locked'

function nodeStatus(lessonId: string, completed: ReadonlySet<string>): NodeStatus {
  if (completed.has(lessonId)) return 'done'
  const previous = previousLessonId(lessonId)
  if (previous === undefined || completed.has(previous)) return 'available'
  return 'locked'
}

function nodeIcon(status: NodeStatus, type: Lesson['type']): string {
  if (status === 'done') return '✓'
  if (status === 'locked') return '🔒'
  if (type === 'cuestionario') return '🏆'
  return '▶'
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function HomeScreen({ onStartLesson }: HomeScreenProps) {
  const xp = useAuraStore((state) => state.xp)
  const streak = useAuraStore((state) => state.streak)
  const hearts = useAuraStore((state) => state.hearts)
  const daily = useAuraStore((state) => state.daily)
  const dailyGoal = useAuraStore((state) => state.dailyGoal)
  const completedLessons = useAuraStore((state) => state.completedLessons)
  const achievements = useAuraStore((state) => state.achievements)
  const learnedWords = useAuraStore((state) => state.learnedWords)

  const completed = useMemo(() => new Set(completedLessons), [completedLessons])
  const level = levelFromXp(xp)
  const goalPercent = Math.min(100, Math.round((daily.xp / dailyGoal) * 100))
  const unlockedCount = ACHIEVEMENTS.filter(
    (achievement) => achievements[achievement.id] !== undefined,
  ).length

  return (
    <div className="home-screen">
      <div className="home-hero">
        <h1 className="home-hero__title">{greeting()}, aprendiz 🦉</h1>
        <div className="home-hero__stats">
          <div className="home-card home-card--streak">
            <span className="home-card__emoji">🔥</span>
            <strong>{streak}</strong>
            <span>días de racha</span>
          </div>
          <div className="home-card home-card--goal">
            <span className="home-card__emoji">🎯</span>
            <strong>
              {daily.xp}/{dailyGoal}
            </strong>
            <span>XP hoy</span>
            <ProgressBar value={goalPercent} height={8} />
          </div>
          <div className="home-card home-card--hearts">
            <span className="home-card__emoji">❤️</span>
            <strong>{hearts}</strong>
            <span>corazones</span>
          </div>
        </div>

        <div className="level-card">
          <div className="level-card__info">
            <span className="level-card__badge">{level.level}</span>
            <div className="level-card__text">
              <strong>Nivel {level.level}</strong>
              <span>
                {level.xpIntoLevel}/{level.xpForNextLevel} XP para el nivel {level.level + 1}
              </span>
            </div>
          </div>
          <ProgressBar value={level.progress * 100} height={12} />
        </div>
      </div>

      <section className="course-map" aria-label="Curso de inglés">
        {COURSE.map((unit) => {
          const doneCount = unit.lessons.filter((lesson) => completed.has(lesson.id)).length
          return (
            <article key={unit.id} className="unit">
              <header className="unit__header">
                <span className="unit__emoji">{unit.emoji}</span>
                <div className="unit__title">
                  <h2>{unit.title}</h2>
                  <span>
                    {doneCount}/{unit.lessons.length} lecciones
                  </span>
                </div>
              </header>
              <div className="unit__path">
                {unit.lessons.map((lesson) => {
                  const status = nodeStatus(lesson.id, completed)
                  const nodeClass = ['lesson-node', `lesson-node--${status}`].join(' ')
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className={nodeClass}
                      disabled={status === 'locked'}
                      style={{ background: status === 'locked' ? undefined : unit.color }}
                      aria-label={`${lesson.title} (${status})`}
                      onClick={() => onStartLesson(lesson.id)}
                    >
                      {nodeIcon(status, lesson.type)}
                      <span className="lesson-node__label">{lesson.title}</span>
                    </button>
                  )
                })}
              </div>
            </article>
          )
        })}
      </section>

      <section className="home-bottom">
        <div className="home-card home-card--words">
          <span className="home-card__emoji">📖</span>
          <div>
            <strong>{learnedWords.length} palabras</strong>
            <span>en tu vocabulario</span>
          </div>
        </div>
        <div className="home-card home-card--achievements">
          <span className="home-card__emoji">🏅</span>
          <div>
            <strong>
              {unlockedCount}/{ACHIEVEMENTS.length} logros
            </strong>
            <span>sigue aprendiendo para desbloquear más</span>
          </div>
        </div>
        <p className="home-screen__privacy">
          🔒 100% local: tus datos nunca salen de tu dispositivo. Gratis, libre y open source.
        </p>
      </section>
    </div>
  )
}
