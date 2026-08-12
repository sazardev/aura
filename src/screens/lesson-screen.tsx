import { useEffect, useMemo, useRef, useState } from 'react'

import type { Exercise } from '@/engine/exercises'
import type { Lesson } from '@/engine/lessons'

import { Button } from '@/components/button'
import {
  CardView,
  ChoiceView,
  type FeedbackState,
  ListenView,
  MatchView,
  SpeakView,
  TapView,
  TypeView,
} from '@/components/exercises'
import { LessonResult } from '@/components/lesson-result'
import { ProgressBar } from '@/components/progress-bar'
import { generateExercises } from '@/engine/exercises'
import { XP_PER_CORRECT, XP_PER_LESSON } from '@/engine/xp'
import { useSpeech } from '@/hooks/use-speech'
import { useAuraStore } from '@/state/store'

interface LessonScreenProps {
  lesson: Lesson
  onHome: () => void
}

type Phase = 'playing' | 'complete' | 'failed'

export function LessonScreen({ lesson, onHome }: LessonScreenProps) {
  const exercises = useMemo(() => generateExercises(lesson), [lesson])
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [phase, setPhase] = useState<Phase>('playing')
  const [correctCount, setCorrectCount] = useState(0)
  const timerRef = useRef<number | undefined>(undefined)

  const recordAnswer = useAuraStore((state) => state.recordAnswer)
  const awardXp = useAuraStore((state) => state.awardXp)
  const completeLesson = useAuraStore((state) => state.completeLesson)
  const addWord = useAuraStore((state) => state.addWord)
  const resetHearts = useAuraStore((state) => state.resetHearts)
  const hearts = useAuraStore((state) => state.hearts)
  const { speak } = useSpeech()

  useEffect(() => {
    const exercise = exercises[index]
    if (exercise?.kind === 'listen') {
      speak(exercise.word)
    }
  }, [exercises, index, speak])

  useEffect(
    () => () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current)
    },
    [],
  )

  const finish = () => {
    completeLesson(lesson.id)
    for (const wordInfo of lesson.words) {
      addWord(wordInfo.word, wordInfo.meaning)
    }
    setPhase('complete')
  }

  const goTo = (nextIndex: number) => {
    setIndex(nextIndex)
    setFeedback('idle')
  }

  const handleCorrect = () => {
    if (feedback !== 'idle') return
    recordAnswer(true)
    awardXp(XP_PER_CORRECT)
    setCorrectCount((count) => count + 1)
    setFeedback('correct')
    timerRef.current = setTimeout(() => {
      if (index + 1 >= exercises.length) finish()
      else goTo(index + 1)
    }, 900)
  }

  const handleWrong = () => {
    if (feedback !== 'idle') return
    recordAnswer(false)
    setFeedback('wrong')
    if (useAuraStore.getState().hearts <= 0) {
      timerRef.current = setTimeout(() => setPhase('failed'), 1400)
    }
  }

  const continueAfterWrong = () => {
    if (index + 1 >= exercises.length) finish()
    else goTo(index + 1)
  }

  const handleMatchComplete = () => {
    recordAnswer(true)
    awardXp(XP_PER_CORRECT)
    setCorrectCount((count) => count + 1)
    if (index + 1 >= exercises.length) finish()
    else goTo(index + 1)
  }

  const handleMatchMistake = () => {
    recordAnswer(false)
    if (useAuraStore.getState().hearts <= 0) setPhase('failed')
  }

  const retry = () => {
    resetHearts()
    setIndex(0)
    setFeedback('idle')
    setCorrectCount(0)
    setPhase('playing')
  }

  if (phase === 'complete') {
    const xpEarned = correctCount * XP_PER_CORRECT + XP_PER_LESSON
    return (
      <LessonResult
        title={lesson.title}
        xp={xpEarned}
        correct={correctCount}
        total={exercises.length}
        perfect={correctCount === exercises.length}
        onRetry={retry}
        onHome={onHome}
      />
    )
  }

  if (phase === 'failed') {
    return (
      <div className="lesson-failed">
        <div className="lesson-result__emoji">💔</div>
        <h2>You ran out of hearts</h2>
        <p>No worries — you learn English by repeating. Try again!</p>
        <div className="lesson-result__actions">
          <Button variant="primary" block onClick={retry}>
            Retry lesson
          </Button>
          <Button variant="secondary" block onClick={onHome}>
            Exit
          </Button>
        </div>
      </div>
    )
  }

  const current = exercises[index]

  return (
    <div className="lesson-screen">
      <div className="lesson-screen__header">
        <button
          type="button"
          className="lesson-screen__close"
          aria-label="Close lesson"
          onClick={onHome}
        >
          ✕
        </button>
        <ProgressBar
          value={(index / exercises.length) * 100}
          color="var(--aura-yellow)"
          height={14}
        />
        <span className="lesson-screen__hearts">❤️ {hearts}</span>
      </div>

      {renderExercise(
        current,
        feedback,
        handleCorrect,
        handleWrong,
        handleMatchMistake,
        handleMatchComplete,
      )}

      <div className="lesson-screen__footer">
        {feedback === 'wrong' && (
          <button type="button" className="lesson-screen__continue" onClick={continueAfterWrong}>
            Continue →
          </button>
        )}
        <span className="lesson-screen__progress-text">
          Exercise {index + 1} of {exercises.length}
        </span>
      </div>
    </div>
  )
}

function renderExercise(
  exercise: Exercise | undefined,
  feedback: FeedbackState,
  onCorrect: () => void,
  onWrong: () => void,
  onMatchMistake: () => void,
  onMatchComplete: () => void,
) {
  if (exercise === undefined) return null
  switch (exercise.kind) {
    case 'choice': {
      return (
        <ChoiceView
          exercise={exercise}
          feedback={feedback}
          onSubmit={(ok) => (ok ? onCorrect() : onWrong())}
        />
      )
    }
    case 'listen': {
      return (
        <ListenView
          exercise={exercise}
          feedback={feedback}
          onSubmit={(ok) => (ok ? onCorrect() : onWrong())}
        />
      )
    }
    case 'type': {
      return (
        <TypeView
          exercise={exercise}
          feedback={feedback}
          onSubmit={(ok) => (ok ? onCorrect() : onWrong())}
        />
      )
    }
    case 'tap': {
      return (
        <TapView
          exercise={exercise}
          feedback={feedback}
          onSubmit={(ok) => (ok ? onCorrect() : onWrong())}
        />
      )
    }
    case 'speak': {
      return (
        <SpeakView
          exercise={exercise}
          feedback={feedback}
          onSubmit={(ok) => (ok ? onCorrect() : onWrong())}
        />
      )
    }
    case 'match': {
      return (
        <MatchView exercise={exercise} onMistake={onMatchMistake} onComplete={onMatchComplete} />
      )
    }
    case 'card': {
      return (
        <CardView
          exercise={exercise}
          feedback={feedback}
          onSubmit={(ok) => (ok ? onCorrect() : onWrong())}
        />
      )
    }
    default: {
      return null
    }
  }
}
