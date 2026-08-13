import { Check, Headphones, Play, Repeat, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/button'
import { ProgressBar } from '@/components/progress-bar'
import { speakingPrompts } from '@/engine/practice'
import { playSound } from '@/engine/sounds'
import { XP_PER_CORRECT } from '@/engine/xp'
import { useSpeech } from '@/hooks/use-speech'
import { useAuraStore } from '@/state/store'

export function DictationScreen() {
  const awardXp = useAuraStore((state) => state.awardXp)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const ttsEnabled = useAuraStore((state) => state.ttsEnabled)
  const { speak, supported } = useSpeech()
  const [prompts, setPrompts] = useState(() => speakingPrompts(6))
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [rate, setRate] = useState(0.9)
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const audioUnavailable = !supported || !ttsEnabled
  const prompt = prompts[index]
  const done = index >= prompts.length
  const score = index

  const play = () => {
    if (prompt === undefined) return
    playSound('page')
    speak(prompt.sentence, undefined, rate)
  }

  const check = () => {
    if (prompt === undefined || text.trim().length === 0) return
    markGuidedAction('dictation')
    const ok = normalize(text) === normalize(prompt.sentence)
    playSound(ok ? 'correct' : 'wrong')
    if (ok) awardXp(XP_PER_CORRECT)
    setChecked(true)
  }

  const next = () => {
    setText('')
    setChecked(false)
    setRevealed(false)
    setIndex((current) => current + 1)
  }

  const restart = () => {
    setPrompts(speakingPrompts(6))
    setIndex(0)
    setText('')
    setChecked(false)
    setRevealed(false)
  }

  if (done) {
    return (
      <div className="practice-screen">
        <div className="practice-hero">
          <Headphones size={56} aria-hidden="true" />
        </div>
        <h1 className="screen-title">Dictation done</h1>
        <p className="screen-subtitle">
          You wrote {score} of {prompts.length} sentences. Listening is the fastest way to sharpen
          your ear.
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
        <Headphones size={22} aria-hidden="true" /> Dictation
      </h1>
      <p className="screen-subtitle">
        Listen, then write exactly what you hear. Miss a word? Play it again.
      </p>

      <div className="practice-progress">
        <ProgressBar value={(index / prompts.length) * 100} height={10} />
        <span>
          {index + 1}/{prompts.length}
        </span>
      </div>

      <section className="practice-card">
        <div className="practice-actions">
          <Button variant="primary" block disabled={audioUnavailable} onClick={play}>
            <Play size={16} aria-hidden="true" /> Play the sentence
          </Button>
          {audioUnavailable && (
            <Button
              variant="secondary"
              block
              disabled={checked}
              onClick={() => setRevealed((current) => !current)}
            >
              {revealed ? 'Hide the sentence' : 'Reveal the sentence'}
            </Button>
          )}
          {revealed && !checked && (
            <p className="dictation-verdict">
              <strong>{prompt.sentence}</strong>
            </p>
          )}
          <label className="dictation-rate">
            <span>
              Speed: <strong>{rate.toFixed(1)}×</strong>
            </span>
            <input
              type="range"
              min={0.5}
              max={1.4}
              step={0.1}
              value={rate}
              className="settings-slider"
              onChange={(event) => setRate(Number(event.target.value))}
            />
          </label>
        </div>

        <textarea
          className="analyzer-textarea"
          rows={3}
          placeholder="Type what you hear…"
          value={text}
          disabled={checked}
          onChange={(event) => setText(event.target.value)}
        />

        {checked && (
          <div
            className={[
              'dictation-verdict',
              normalize(text) === normalize(prompt.sentence) ? 'dictation-verdict--correct' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {normalize(text) === normalize(prompt.sentence) ? (
              <p>
                <Check size={14} aria-hidden="true" /> Exactly right!
              </p>
            ) : (
              <p>
                <X size={14} aria-hidden="true" /> Listen again — the sentence was:
              </p>
            )}
            {normalize(text) !== normalize(prompt.sentence) && <em>{prompt.sentence}</em>}
          </div>
        )}

        <div className="practice-actions">
          {checked ? (
            <Button variant="primary" block onClick={next}>
              Next sentence
            </Button>
          ) : (
            <Button variant="primary" block disabled={text.trim().length === 0} onClick={check}>
              Check
            </Button>
          )}
        </div>
      </section>

      {!supported && (
        <p className="practice-note">
          Voice is not available on this device — read the sentence shown in your head, then write
          what you remember.
        </p>
      )}
      {supported && !ttsEnabled && (
        <p className="practice-note">
          Voice narration is turned off in Settings — use "Reveal the sentence" to read and write
          it.
        </p>
      )}
    </div>
  )
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9' ]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
}
