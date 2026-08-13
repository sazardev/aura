import type { LucideIcon } from 'lucide-react'

import {
  BookMarked,
  BookOpen,
  Check,
  GraduationCap,
  Headphones,
  MessageCircle,
  Mic,
  PartyPopper,
  PenLine,
  RotateCcw,
  SpellCheck,
} from 'lucide-react'

import type { GuidedActionId } from '@/engine/guide'
import type { Route } from '@/lib/router'

import { Button } from '@/components/button'
import { ProgressBar } from '@/components/progress-bar'
import { allGuidedDone, GUIDED_ACTIONS, guidedProgress } from '@/engine/guide'
import { allLessons } from '@/engine/lessons'
import { LIBRARY } from '@/engine/library'
import { useHashRoute } from '@/hooks/use-hash-route'
import { useAuraStore } from '@/state/store'

const ICONS: Record<GuidedActionId, LucideIcon> = {
  lesson: GraduationCap,
  dictionary: BookOpen,
  reading: BookMarked,
  speaking: Mic,
  dictation: Headphones,
  writing: PenLine,
  dialogue: MessageCircle,
  grammar: SpellCheck,
  review: RotateCcw,
}

function actionRoute(id: GuidedActionId): Route {
  switch (id) {
    case 'lesson': {
      return { name: 'lesson', lessonId: allLessons()[0]?.id ?? '' }
    }
    case 'reading': {
      return { name: 'read', bookId: LIBRARY[0]?.id ?? '' }
    }
    case 'dictionary': {
      return { name: 'dictionary' }
    }
    case 'speaking': {
      return { name: 'speak' }
    }
    case 'dictation': {
      return { name: 'dictation' }
    }
    case 'writing': {
      return { name: 'write' }
    }
    case 'dialogue': {
      return { name: 'dialogue' }
    }
    case 'grammar': {
      return { name: 'grammar' }
    }
    case 'review': {
      return { name: 'review' }
    }
  }
}

export function TourScreen() {
  const guidedActions = useAuraStore((state) => state.guidedActions)
  const completeOnboarding = useAuraStore((state) => state.completeOnboarding)
  const { navigate } = useHashRoute()

  const progress = guidedProgress(guidedActions)
  const done = allGuidedDone(guidedActions)

  const finish = () => {
    completeOnboarding()
    navigate({ name: 'home' })
  }

  return (
    <div className="tour-screen">
      <h1 className="screen-title">
        <PartyPopper size={22} aria-hidden="true" /> Try it yourself
      </h1>
      <p className="screen-subtitle">
        One quick action on each screen, in your own order. Aura marks each one as you really do it
        — that's the fastest way to learn your way around.
      </p>

      <div className="tour-progress">
        <ProgressBar value={(progress.done / progress.total) * 100} height={10} />
        <span className="tour-progress__count">
          {progress.done}/{progress.total} actions
        </span>
      </div>

      <div className="tour-list">
        {GUIDED_ACTIONS.map((action) => {
          const isDone = Object.hasOwn(guidedActions, action.id)
          const Icon = ICONS[action.id]
          return (
            <div
              key={action.id}
              className={['tour-row', isDone ? 'tour-row--done' : ''].filter(Boolean).join(' ')}
            >
              <span className="tour-row__icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="tour-row__info">
                <strong>{action.label}</strong>
                <small>{action.hint}</small>
              </span>
              {isDone ? (
                <span className="tour-row__done">
                  <Check size={16} aria-hidden="true" /> Done
                </span>
              ) : (
                <button
                  type="button"
                  className="tour-row__go"
                  onClick={() => navigate(actionRoute(action.id))}
                >
                  Go
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="tour-actions">
        {done && (
          <Button variant="primary" block onClick={finish}>
            <PartyPopper size={16} aria-hidden="true" /> You've got it — finish
          </Button>
        )}
        <Button variant="ghost" block onClick={finish}>
          Skip the tour
        </Button>
      </div>
    </div>
  )
}
