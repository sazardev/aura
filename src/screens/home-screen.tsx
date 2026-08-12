import type { LucideIcon } from 'lucide-react'

import { BookOpen, Check, Flame, Heart, Lock, Medal, Play, Target, Trophy } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'

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

const NODE_ICONS: Record<NodeStatus, LucideIcon> = {
  done: Check,
  locked: Lock,
  available: Play,
}

function nodeIcon(status: NodeStatus, type: Lesson['type']): ReactNode {
  if (status !== 'available') {
    const Icon = NODE_ICONS[status]
    return <Icon size={18} aria-hidden="true" />
  }
  const Icon = type === 'quiz' ? Trophy : Play
  return <Icon size={18} aria-hidden="true" />
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 20) return 'Good afternoon'
  return 'Good evening'
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
        <h1 className="home-hero__title">{greeting()}, learner 🦉</h1>
        <div className="home-hero__stats">
          <div className="home-card home-card--streak">
            <Flame size={22} aria-hidden="true" />
            <strong>{streak}</strong>
            <span>day streak</span>
          </div>
          <div className="home-card home-card--goal">
            <Target size={22} aria-hidden="true" />
            <strong>
              {daily.xp}/{dailyGoal}
            </strong>
            <span>XP today</span>
            <ProgressBar value={goalPercent} height={8} />
          </div>
          <div className="home-card home-card--hearts">
            <Heart size={22} fill="currentColor" aria-hidden="true" />
            <strong>{hearts}</strong>
            <span>hearts</span>
          </div>
        </div>

        <div className="level-card">
          <div className="level-card__info">
            <span className="level-card__badge">{level.level}</span>
            <div className="level-card__text">
              <strong>Level {level.level}</strong>
              <span>
                {level.xpIntoLevel}/{level.xpForNextLevel} XP to level {level.level + 1}
              </span>
            </div>
          </div>
          <ProgressBar value={level.progress * 100} height={12} />
        </div>
      </div>

      <section className="course-map" aria-label="English course">
        {COURSE.map((unit) => {
          const doneCount = unit.lessons.filter((lesson) => completed.has(lesson.id)).length
          return (
            <article key={unit.id} className="unit">
              <header className="unit__header">
                <span className="unit__emoji">{unit.emoji}</span>
                <div className="unit__title">
                  <h2>{unit.title}</h2>
                  <span>
                    {doneCount}/{unit.lessons.length} lessons
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
          <BookOpen size={22} aria-hidden="true" />
          <div>
            <strong>{learnedWords.length} words</strong>
            <span>in your vocabulary</span>
          </div>
        </div>
        <div className="home-card home-card--achievements">
          <Medal size={22} aria-hidden="true" />
          <div>
            <strong>
              {unlockedCount}/{ACHIEVEMENTS.length} achievements
            </strong>
            <span>keep learning to unlock more</span>
          </div>
        </div>
        <p className="home-screen__privacy">
          🔒 100% local: your data never leaves your device. Free, libre and open source.
        </p>
      </section>
    </div>
  )
}
