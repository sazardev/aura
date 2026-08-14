import type { LucideIcon } from 'lucide-react'

import { Check, Flame, GraduationCap, Heart, Lock, Play, Target, Trophy } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'

import type { Lesson } from '@/engine/lessons'

import { AvatarIcon } from '@/components/avatar'
import { ProgressBar } from '@/components/progress-bar'
import { UiIcon } from '@/components/ui-icon'
import { COURSE, previousLessonId, professionLessons } from '@/engine/lessons'
import { goalLabel, professionLabel } from '@/engine/profile'
import { levelFromXp } from '@/engine/xp'
import { useAuraStore } from '@/state/store'

interface HomeScreenProps {
  onStartLesson: (lessonId: string) => void
  onProfile: () => void
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

export function HomeScreen({ onStartLesson, onProfile }: HomeScreenProps) {
  const xp = useAuraStore((state) => state.xp)
  const streak = useAuraStore((state) => state.streak)
  const hearts = useAuraStore((state) => state.hearts)
  const daily = useAuraStore((state) => state.daily)
  const dailyGoal = useAuraStore((state) => state.dailyGoal)
  const completedLessons = useAuraStore((state) => state.completedLessons)
  const learnedWords = useAuraStore((state) => state.learnedWords)
  const profile = useAuraStore((state) => state.profile)

  const completed = useMemo(() => new Set(completedLessons), [completedLessons])
  const career = useMemo(() => professionLessons(profile.profession), [profile.profession])
  const level = levelFromXp(xp)
  const goalPercent = Math.min(100, Math.round((daily.xp / dailyGoal) * 100))

  return (
    <div className="home-screen">
      <div className="home-hero">
        <div className="home-hero__brand">
          <span
            className="home-avatar"
            style={{ background: profile.avatarColor, color: '#ffffff' }}
          >
            <AvatarIcon name={profile.avatar} size={56} color="#ffffff" />
          </span>
          <div>
            <h1 className="home-hero__title">{profile.name}</h1>
            <p className="home-hero__greeting">
              {greeting()}, {profile.name} · {learnedWords.length} words
            </p>
            {profile.goal !== undefined && (
              <p className="home-hero__goal">
                <Target size={13} aria-hidden="true" /> Goal: {goalLabel(profile.goal)}
              </p>
            )}
          </div>
          <button
            type="button"
            className="home-hero__brand-hit"
            aria-label="Open your profile"
            onClick={onProfile}
          />
        </div>
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
                <span className="unit__icon" style={{ color: unit.color }}>
                  <UiIcon name={unit.icon} size={26} />
                </span>
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

      {career.length > 0 && (
        <section className="career-track" aria-label="Career lessons">
          <header className="unit__header">
            <span className="unit__icon" style={{ color: 'var(--aura-blue)' }}>
              <GraduationCap size={26} aria-hidden="true" />
            </span>
            <div className="unit__title">
              <h2>Career track · {professionLabel(profile.profession)}</h2>
              <span>
                {career.filter((lesson) => completed.has(lesson.id)).length}/{career.length} lessons
              </span>
            </div>
          </header>
          <div className="unit__path">
            {career.map((lesson) => {
              const status = completed.has(lesson.id) ? 'done' : 'available'
              return (
                <button
                  key={lesson.id}
                  type="button"
                  className={['lesson-node', `lesson-node--${status}`].join(' ')}
                  style={{ background: 'var(--aura-blue)' }}
                  aria-label={`${lesson.title} (${status})`}
                  onClick={() => onStartLesson(lesson.id)}
                >
                  {nodeIcon(status, lesson.type)}
                  <span className="lesson-node__label">{lesson.title}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
