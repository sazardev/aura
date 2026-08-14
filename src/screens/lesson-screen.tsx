import { ArrowRight, Heart, HeartCrack, X } from 'lucide-react'
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
import { playSound } from '@/engine/sounds'
import { trackLessonAnswer, trackLessonComplete, trackLessonStart } from '@/engine/telemetry'
import { XP_PER_CORRECT, XP_PER_LESSON } from '@/engine/xp'
import { useSpeech } from '@/hooks/use-speech'
import { useAuraStore } from '@/state/store'

// Current time (avoids `Date.now()` inside the component body for the lint rule).
function nowMs(): number {
  return Date.now()
}

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
  const exerciseShownAtRef = useRef(0)
  const lessonStartRef = useRef(0)

  useEffect(() => {
    exerciseShownAtRef.current = nowMs()
  }, [index])

  useEffect(() => {
    lessonStartRef.current = nowMs()
    exerciseShownAtRef.current = nowMs()
    trackLessonStart(lesson.id)
  }, [lesson.id])

  const answerMs = () => Math.max(0, nowMs() - exerciseShownAtRef.current)

  const recordAnswer = useAuraStore((state) => state.recordAnswer)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const awardXp = useAuraStore((state) => state.awardXp)
  const completeLesson = useAuraStore((state) => state.completeLesson)
  const addWord = useAuraStore((state) => state.addWord)
  const recordWeakWord = useAuraStore((state) => state.recordWeakWord)
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
    playSound('success')
    const seconds = Math.max(1, Math.round((nowMs() - lessonStartRef.current) / 1000))
    trackLessonComplete(lesson.id, seconds)
    setPhase('complete')
  }

  const goTo = (nextIndex: number) => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
    setIndex(nextIndex)
    setFeedback('idle')
  }

  const handleCorrect = () => {
    if (feedback !== 'idle') return
    markGuidedAction('lesson')
    playSound('correct')
    recordAnswer(true)
    awardXp(XP_PER_CORRECT)
    trackLessonAnswer(lesson.id, true, answerMs())
    setCorrectCount((count) => count + 1)
    setFeedback('correct')
    timerRef.current = setTimeout(() => {
      if (index + 1 >= exercises.length) finish()
      else goTo(index + 1)
    }, 900)
  }

  const handleWrong = () => {
    if (feedback !== 'idle') return
    playSound('wrong')
    recordAnswer(false)
    trackLessonAnswer(lesson.id, false, answerMs())
    const exercise = exercises[index]
    if (exercise !== undefined && 'word' in exercise) recordWeakWord(exercise.word)
    setFeedback('wrong')
    if (useAuraStore.getState().hearts <= 0) {
      playSound('heart')
      timerRef.current = setTimeout(() => setPhase('failed'), 1400)
    }
  }

  const continueAfterWrong = () => {
    if (index + 1 >= exercises.length) finish()
    else goTo(index + 1)
  }

  const handleMatchComplete = () => {
    playSound('correct')
    recordAnswer(true)
    awardXp(XP_PER_CORRECT)
    trackLessonAnswer(lesson.id, true, answerMs())
    setCorrectCount((count) => count + 1)
    if (index + 1 >= exercises.length) finish()
    else goTo(index + 1)
  }

  const handleMatchMistake = () => {
    playSound('wrong')
    recordAnswer(false)
    trackLessonAnswer(lesson.id, false, answerMs())
    if (useAuraStore.getState().hearts <= 0) {
      playSound('heart')
      setPhase('failed')
    }
  }

  const retry = () => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
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
        <div className="lesson-result__emoji">
          <HeartCrack size={64} aria-hidden="true" />
        </div>
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
          <X size={18} aria-hidden="true" />
        </button>
        <ProgressBar
          value={(index / exercises.length) * 100}
          color="var(--aura-yellow)"
          height={14}
        />
        <span className="lesson-screen__hearts">
          <Heart size={16} fill="currentColor" aria-hidden="true" /> {hearts}
        </span>
      </div>

      {renderExercise(
        current,
        feedback,
        handleCorrect,
        handleWrong,
        handleMatchMistake,
        handleMatchComplete,
      )}

      <span className="visually-hidden" aria-live="polite">
        {feedbackText(feedback)}
      </span>

      <div className="lesson-screen__footer">
        {feedback === 'wrong' && (
          <button type="button" className="lesson-screen__continue" onClick={continueAfterWrong}>
            <ArrowRight size={16} aria-hidden="true" /> Continue
          </button>
        )}
        <span className="lesson-screen__progress-text">
          Exercise {index + 1} of {exercises.length}
        </span>
      </div>
    </div>
  )
}

function feedbackText(feedback: FeedbackState): string {
  switch (feedback) {
    case 'correct': {
      return 'Correct!'
    }
    case 'wrong': {
      return 'Not quite. Check the hint and continue.'
    }
    default: {
      return ''
    }
  }
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
