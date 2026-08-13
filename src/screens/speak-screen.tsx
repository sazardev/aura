import { Check, Mic, Play, Repeat, Square, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/button'
import { ProgressBar } from '@/components/progress-bar'
import { speakingPrompts } from '@/engine/practice'
import { playSound } from '@/engine/sounds'
import { trackSpeakAttempt } from '@/engine/telemetry'
import { XP_PER_REVIEW_CARD } from '@/engine/xp'
import { useSpeech } from '@/hooks/use-speech'
import { useAuraStore } from '@/state/store'

type Grade = 'again' | 'good' | 'great'

export function SpeakScreen() {
  const awardXp = useAuraStore((state) => state.awardXp)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const recordSpeakingSession = useAuraStore((state) => state.recordSpeakingSession)
  const { speakGuided, guiding, stop, recognitionSupported } = useSpeech()
  const [prompts, setPrompts] = useState(() => speakingPrompts(6))
  const [index, setIndex] = useState(0)
  const [guideIndex, setGuideIndex] = useState<number | undefined>(undefined)
  const [grades, setGrades] = useState<Grade[]>([])

  const prompt = prompts[index]

  const done = index >= prompts.length
  const xpEarned = useMemo(
    () => grades.filter((grade) => grade !== 'again').length * XP_PER_REVIEW_CARD,
    [grades],
  )

  const restart = () => {
    setPrompts(speakingPrompts(6))
    setIndex(0)
    setGrades([])
    setGuideIndex(undefined)
  }

  const play = () => {
    if (prompt === undefined) return
    playSound('page')
    setGuideIndex(0)
    speakGuided(prompt.sentence, {
      onWord: setGuideIndex,
      onEnd: () => setGuideIndex(undefined),
    })
  }

  const stopPlay = () => {
    stop()
    setGuideIndex(undefined)
  }

  const grade = (value: Grade) => {
    markGuidedAction('speaking')
    if (value === 'good' || value === 'great') {
      playSound('correct')
      awardXp(XP_PER_REVIEW_CARD)
    } else {
      playSound('wrong')
    }
    trackSpeakAttempt(value !== 'again')
    const nextGrades = [...grades, value]
    setGrades(nextGrades)
    stopPlay()
    setIndex((current) => current + 1)
    if (nextGrades.length === prompts.length) {
      recordSpeakingSession(prompts.length, nextGrades.filter((entry) => entry !== 'again').length)
    }
  }

  if (done) {
    return (
      <div className="practice-screen">
        <div className="practice-hero">
          <Mic size={56} aria-hidden="true" />
        </div>
        <h1 className="screen-title">Speaking session done</h1>
        <p className="screen-subtitle">
          You practiced {prompts.length} sentences and earned {xpEarned} XP. Say it again tomorrow!
        </p>
        <div className="practice-actions">
          <Button variant="primary" block onClick={restart}>
            <Repeat size={16} aria-hidden="true" /> Practice again
          </Button>
        </div>
      </div>
    )
  }

  if (prompt === undefined) return null

  return (
    <div className="practice-screen">
      <h1 className="screen-title">
        <Mic size={22} aria-hidden="true" /> Speaking practice
      </h1>
      <p className="screen-subtitle">
        Listen, repeat the sentence out loud, then rate yourself honestly.
      </p>

      <div className="practice-progress">
        <ProgressBar value={(index / prompts.length) * 100} height={10} />
        <span>
          {index + 1}/{prompts.length}
        </span>
      </div>

      <section className="practice-card">
        <span className="tier-badge">Target word: {prompt.word}</span>
        <p className="practice-sentence" aria-live="polite">
          {prompt.sentence.split(/(\s+)/).map((part, partIndex) => {
            const isWord = part.replaceAll(/[^A-Za-z0-9']+/g, '').length > 0
            if (!isWord) return part
            const parts = prompt.sentence.split(/(\s+)/)
            const wordsBefore = parts
              .slice(0, partIndex)
              .filter((token) => token.replaceAll(/[^A-Za-z0-9']+/g, '').length > 0).length
            return (
              <span
                key={`${part}-${partIndex}`}
                className={[
                  'practice-word',
                  wordsBefore === guideIndex ? 'practice-word--guide' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {part}
              </span>
            )
          })}
        </p>
      </section>

      {recognitionSupported ? (
        <p className="practice-note">
          <Mic size={14} aria-hidden="true" /> Speech recognition is available — say it clearly and
          check the sentence above.
        </p>
      ) : (
        <p className="practice-note">
          <Mic size={14} aria-hidden="true" /> Recognition is not available on this device — speak
          out loud anyway and grade yourself.
        </p>
      )}

      <div className="practice-actions">
        {guiding ? (
          <Button variant="secondary" block onClick={stopPlay}>
            <Square size={16} aria-hidden="true" /> Stop
          </Button>
        ) : (
          <Button variant="primary" block onClick={play}>
            <Play size={16} aria-hidden="true" /> Listen & repeat
          </Button>
        )}
        <div className="practice-grade">
          <Button variant="danger" onClick={() => grade('again')}>
            <ThumbsDown size={16} aria-hidden="true" /> Again
          </Button>
          <Button variant="secondary" onClick={() => grade('good')}>
            <Check size={16} aria-hidden="true" /> Good
          </Button>
          <Button variant="success" onClick={() => grade('great')}>
            <ThumbsUp size={16} aria-hidden="true" /> Great
          </Button>
        </div>
      </div>
    </div>
  )
}
