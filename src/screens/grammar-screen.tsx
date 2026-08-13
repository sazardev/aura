import { BookOpen } from 'lucide-react'

import type { GrammarLesson } from '@/engine/types'

import { UiIcon } from '@/components/ui-icon'
import { GRAMMAR } from '@/engine/grammar'

interface GrammarScreenProps {
  onOpenLesson: (lessonId: string) => void
}

export function GrammarScreen({ onOpenLesson }: GrammarScreenProps) {
  return (
    <div className="grammar-screen">
      <h1 className="screen-title">
        <BookOpen size={22} aria-hidden="true" /> Grammar
      </h1>
      <p className="screen-subtitle">
        Clear rules with real practice. Each topic has a short explanation and exercises that
        correct you as you go.
      </p>

      {GRAMMAR.map((unit) => (
        <section key={unit.id} className="grammar-unit">
          <header className="grammar-unit__header">
            <span className="grammar-unit__icon" style={{ color: unit.color }}>
              <UiIcon name={unit.icon} size={26} />
            </span>
            <div>
              <h2>{unit.title}</h2>
              <p>{unit.summary}</p>
            </div>
          </header>
          <div className="grammar-unit__lessons">
            {unit.lessons.map((lesson: GrammarLesson) => (
              <button
                key={lesson.id}
                type="button"
                className="grammar-lesson-row"
                onClick={() => onOpenLesson(lesson.id)}
              >
                <span
                  className={`grammar-lesson-row__type grammar-lesson-row__type--${lesson.type}`}
                >
                  {lesson.type === 'rule' ? 'Rule' : 'Practice'}
                </span>
                <strong>{lesson.title}</strong>
                <span>{lesson.exercises.length} exercises</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
