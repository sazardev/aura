import { ArrowLeft, BookOpen, PartyPopper } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { GrammarExercise } from '@/engine/types'

import { Button } from '@/components/button'
import { ProgressBar } from '@/components/progress-bar'
import { SpeechButton } from '@/components/speech-button'
import { grammarLessonById, unitForGrammarLesson } from '@/engine/grammar'
import { playSound } from '@/engine/sounds'
import { trackGrammarAnswer } from '@/engine/telemetry'
import { XP_PER_CORRECT } from '@/engine/xp'
import { useAuraStore } from '@/state/store'

interface GrammarLessonScreenProps {
  lessonId: string
  onHome: () => void
}

type Phase = 'playing' | 'complete'

export function GrammarLessonScreen({ lessonId, onHome }: GrammarLessonScreenProps) {
  const awardXp = useAuraStore((state) => state.awardXp)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const lesson = grammarLessonById(lessonId)
  const unit = unitForGrammarLesson(lessonId)

  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [correctCount, setCorrectCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('playing')
  const shownAtRef = useRef(0)

  useEffect(() => {
    shownAtRef.current = Date.now()
  }, [index, lessonId])

  const exercise = lesson?.exercises[index]

  const total = useMemo(() => lesson?.exercises.length ?? 0, [lesson])

  if (lesson === undefined) {
    return (
      <div className="lesson-screen">
        <div className="empty-state">
          <BookOpen size={48} aria-hidden="true" />
          <p>This grammar lesson was not found.</p>
          <button type="button" className="onboarding__skip" onClick={onHome}>
            Back to grammar
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className="lesson-result">
        <div className="lesson-result__emoji">
          <PartyPopper size={64} aria-hidden="true" />
        </div>
        <h2>{correctCount === total ? 'Perfect!' : 'Lesson complete'}</h2>
        <p className="lesson-result__subtitle">
          {lesson.title} · {correctCount}/{total} correct
        </p>
        <div className="lesson-result__actions">
          <Button variant="primary" block onClick={onHome}>
            Back to grammar
          </Button>
        </div>
      </div>
    )
  }

  const advance = () => {
    if (index + 1 >= total) {
      setPhase('complete')
    } else {
      setIndex((current) => current + 1)
      setFeedback('idle')
    }
  }

  const handleCorrect = () => {
    if (feedback !== 'idle') return
    markGuidedAction('grammar')
    playSound('correct')
    awardXp(XP_PER_CORRECT)
    trackGrammarAnswer(true, Date.now() - shownAtRef.current)
    setCorrectCount((count) => count + 1)
    setFeedback('correct')
    window.setTimeout(() => {
      setFeedback('idle')
      advance()
    }, 900)
  }

  const handleWrong = () => {
    if (feedback !== 'idle') return
    playSound('wrong')
    trackGrammarAnswer(false, Date.now() - shownAtRef.current)
    setFeedback('wrong')
  }

  return (
    <div className="lesson-screen">
      <div className="lesson-screen__header">
        <button
          type="button"
          className="lesson-screen__close"
          aria-label="Back to grammar"
          onClick={onHome}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <ProgressBar
          value={(index / total) * 100}
          {...(unit !== undefined && { color: unit.color })}
          height={14}
        />
        <span className="lesson-screen__progress-text">
          {index + 1}/{total}
        </span>
      </div>

      <div className="exercise-body">
        <p className="exercise-prompt__label">
          {unit?.title} · {lesson.title}
        </p>

        {index === 0 && lesson.explanation.length > 0 && (
          <section className="grammar-rule">
            <p>{lesson.explanation}</p>
            {lesson.examples.length > 0 && (
              <ul className="grammar-rule__examples">
                {lesson.examples.map((example, exampleIndex) => (
                  <li key={`${example.text}-${exampleIndex}`}>
                    <SpeechButton
                      text={example.text}
                      size="sm"
                      label={`Listen to ${example.text}`}
                    />
                    <div>
                      <em>{example.text}</em>
                      <small>{example.note}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {exercise !== undefined && (
          <ExerciseView
            key={exercise.id}
            exercise={exercise}
            feedback={feedback}
            onSubmit={handleCorrect}
            onWrong={handleWrong}
          />
        )}
      </div>

      <div className="lesson-screen__footer">
        {feedback === 'wrong' && exercise !== undefined && (
          <div className="grammar-feedback">
            <p className="grammar-feedback__answer">
              Answer: <strong>{exercise.answer}</strong>
            </p>
            <p className="grammar-feedback__explanation">{exercise.explanation}</p>
            <Button variant="primary" block onClick={advance}>
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ExerciseView({
  exercise,
  feedback,
  onSubmit,
  onWrong,
}: {
  exercise: GrammarExercise
  feedback: 'idle' | 'correct' | 'wrong'
  onSubmit: () => void
  onWrong: () => void
}) {
  if (exercise.kind === 'choice') {
    return (
      <ChoiceExercise
        exercise={exercise}
        feedback={feedback}
        onSubmit={(correct) => (correct ? onSubmit() : onWrong())}
      />
    )
  }
  if (exercise.kind === 'fill') {
    return (
      <FillExercise
        exercise={exercise}
        feedback={feedback}
        onSubmit={(correct) => (correct ? onSubmit() : onWrong())}
      />
    )
  }
  return (
    <ReorderExercise
      exercise={exercise}
      feedback={feedback}
      onSubmit={(correct) => (correct ? onSubmit() : onWrong())}
    />
  )
}

function ChoiceExercise({
  exercise,
  feedback,
  onSubmit,
}: {
  exercise: Extract<GrammarExercise, { kind: 'choice' }>
  feedback: 'idle' | 'correct' | 'wrong'
  onSubmit: (correct: boolean) => void
}) {
  return (
    <div className="grammar-exercise">
      <p className="exercise-prompt__sentence">
        <strong>{exercise.prompt}</strong>
      </p>
      <div className="reader-question__options">
        {exercise.options.map((option) => {
          const isAnswer = option === exercise.answer
          const optionClass = [
            'reader-question__option',
            feedback === 'correct' && isAnswer ? 'reader-question__option--correct' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={option}
              type="button"
              className={optionClass}
              disabled={feedback !== 'idle'}
              onClick={() => onSubmit(option === exercise.answer)}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FillExercise({
  exercise,
  feedback,
  onSubmit,
}: {
  exercise: Extract<GrammarExercise, { kind: 'fill' }>
  feedback: 'idle' | 'correct' | 'wrong'
  onSubmit: (correct: boolean) => void
}) {
  const [value, setValue] = useState('')
  const check = () => {
    onSubmit(normalizeAnswer(value) === normalizeAnswer(exercise.answer))
  }
  return (
    <div className="grammar-exercise">
      <p className="exercise-prompt__sentence">
        <strong>{exercise.prompt}</strong>
      </p>
      <input
        className="exercise-input"
        aria-label="Type the missing word"
        value={value}
        placeholder="Type the missing word…"
        disabled={feedback !== 'idle'}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') check()
        }}
      />
      {feedback === 'idle' && (
        <Button variant="primary" block disabled={value.trim().length === 0} onClick={check}>
          Check
        </Button>
      )}
    </div>
  )
}

function ReorderExercise({
  exercise,
  feedback,
  onSubmit,
}: {
  exercise: Extract<GrammarExercise, { kind: 'reorder' }>
  feedback: 'idle' | 'correct' | 'wrong'
  onSubmit: (correct: boolean) => void
}) {
  const [built, setBuilt] = useState<string[]>([])
  const add = (word: string) => setBuilt((current) => [...current, word])
  const removeAt = (position: number) =>
    setBuilt((current) => current.filter((_, i) => i !== position))
  const check = () =>
    onSubmit(normalizeAnswer(built.join(' ')) === normalizeAnswer(exercise.answer))

  return (
    <div className="grammar-exercise">
      <p className="exercise-prompt__label">{exercise.prompt}</p>
      <div className="tap-answer" aria-label="Your sentence">
        {built.length === 0 ? (
          <span className="grammar-exercise__hint">Tap the words below in order</span>
        ) : (
          built.map((word, position) => (
            <button
              key={`${word}-${position}`}
              type="button"
              className="tap-pill tap-pill--built"
              onClick={() => removeAt(position)}
            >
              {word}
            </button>
          ))
        )}
      </div>
      <div className="tap-bank">
        {exercise.words.map((word, position) => (
          <button
            key={`${word}-${position}`}
            type="button"
            className="tap-pill"
            disabled={feedback !== 'idle'}
            onClick={() => add(word)}
          >
            {word}
          </button>
        ))}
      </div>
      {feedback === 'idle' && (
        <Button variant="primary" block disabled={built.length === 0} onClick={check}>
          Check sentence
        </Button>
      )}
    </div>
  )
}

function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9' ]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
}
