import { ArrowLeft, MessageCircle, Play, Send } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'

import type { Dialogue } from '@/engine/types'

import { Button } from '@/components/button'
import { SpeechButton } from '@/components/speech-button'
import { UiIcon } from '@/components/ui-icon'
import { dialogueById, DIALOGUES, matchesAnswer } from '@/engine/dialogue'
import { playSound } from '@/engine/sounds'
import { XP_PER_CORRECT } from '@/engine/xp'
import { useAuraStore } from '@/state/store'

export function DialogueScreen({
  dialogueId,
  onSelect,
}: {
  dialogueId?: string
  onSelect: (dialogueId: string | undefined) => void
}) {
  if (dialogueId === undefined) {
    return (
      <div className="dialogue-screen">
        <h1 className="screen-title">
          <MessageCircle size={22} aria-hidden="true" /> Dialogues
        </h1>
        <p className="screen-subtitle">
          Role-play real conversations. When it's your turn, pick the best thing to say.
        </p>
        {DIALOGUES.map((dialogue) => (
          <button
            key={dialogue.id}
            type="button"
            className="dialogue-card"
            onClick={() => onSelect(dialogue.id)}
          >
            <span className="dialogue-card__icon">
              <UiIcon name={dialogue.icon} size={24} />
            </span>
            <span>
              <strong>{dialogue.title}</strong>
              <small>
                {dialogue.lines.filter((line) => line.options !== undefined).length} turns for you
              </small>
            </span>
          </button>
        ))}
      </div>
    )
  }

  const dialogue = dialogueById(dialogueId)
  if (dialogue === undefined) {
    return (
      <div className="dialogue-screen">
        <div className="empty-state">
          <MessageCircle size={48} aria-hidden="true" />
          <p>This dialogue was not found.</p>
          <button type="button" className="onboarding__skip" onClick={() => onSelect(undefined)}>
            Back to dialogues
          </button>
        </div>
      </div>
    )
  }

  return <DialoguePlayer dialogue={dialogue} onBack={() => onSelect(undefined)} />
}

function DialoguePlayer({ dialogue, onBack }: { dialogue: Dialogue; onBack: () => void }) {
  const awardXp = useAuraStore((state) => state.awardXp)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const [lineIndex, setLineIndex] = useState(0)
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const [typed, setTyped] = useState('')
  const [mistake, setMistake] = useState(false)
  const [good, setGood] = useState(0)

  const line = dialogue.lines[lineIndex]
  const isPlayer = line?.options !== undefined
  const done = lineIndex >= dialogue.lines.length
  const correctOption = line?.options?.find((option) => option.correct)

  if (done) {
    return (
      <div className="lesson-result">
        <div className="lesson-result__emoji">
          <MessageCircle size={64} aria-hidden="true" />
        </div>
        <h2>Dialogue complete!</h2>
        <p className="lesson-result__subtitle">
          You nailed {good} of{' '}
          {dialogue.lines.filter((candidate) => candidate.options !== undefined).length} turns.
        </p>
        <div className="lesson-result__actions">
          <Button variant="primary" block onClick={onBack}>
            Back to dialogues
          </Button>
        </div>
      </div>
    )
  }

  if (line === undefined) return null

  const advance = () => {
    setPicked(undefined)
    setTyped('')
    setMistake(false)
    setLineIndex((current) => current + 1)
  }

  const answer = (text: string, isMistake: boolean) => {
    markGuidedAction('dialogue')
    setPicked(text)
    setMistake(isMistake)
    if (isMistake) {
      playSound('wrong')
    } else {
      playSound('correct')
      awardXp(XP_PER_CORRECT)
      setGood((current) => current + 1)
    }
  }

  const choose = (text: string) => {
    if (picked !== undefined || line.options === undefined) return
    answer(text, false)
  }

  const submitTyped = () => {
    if (picked !== undefined || line.options === undefined) return
    const value = typed.trim()
    if (value.length === 0) return
    if (correctOption !== undefined && matchesAnswer(value, correctOption.text)) {
      answer(correctOption.text, false)
    } else {
      answer(correctOption?.text ?? value, true)
    }
  }

  const advanceOnKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    advance()
  }

  return (
    <div className="dialogue-player">
      <header className="dialogue-player__header">
        <button
          type="button"
          className="lesson-screen__close"
          aria-label="Back to dialogues"
          onClick={onBack}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <strong>{dialogue.title}</strong>
        <span className="dialogue-player__header-count">
          {lineIndex + 1}/{dialogue.lines.length}
        </span>
      </header>

      <div className="dialogue-stage" aria-live="polite">
        <div
          className={[
            'dialogue-bubble',
            isPlayer ? 'dialogue-bubble--player' : 'dialogue-bubble--npc',
            isPlayer ? '' : 'dialogue-bubble--clickable',
          ]
            .filter(Boolean)
            .join(' ')}
          role={isPlayer ? undefined : 'button'}
          tabIndex={isPlayer ? undefined : 0}
          aria-label={isPlayer ? undefined : 'Continue the dialogue'}
          onClick={isPlayer ? undefined : advance}
          onKeyDown={isPlayer ? undefined : advanceOnKey}
        >
          <span className="dialogue-bubble__speaker">{line.speaker}</span>
          <p>{line.text}</p>
        </div>

        {!isPlayer && (
          <div className="dialogue-npc-actions">
            <SpeechButton text={line.text} size="lg" label={`Listen to ${line.speaker}`} />
            <span className="dialogue-npc-hint">Tap the message or Continue</span>
          </div>
        )}

        {isPlayer && line.options !== undefined && picked === undefined && (
          <div className="dialogue-respond">
            <p className="screen-subtitle">What do you say? Type your reply or pick an option.</p>
            <div className="dialogue-type">
              <input
                type="text"
                name="dialogue-reply"
                className="exercise-input"
                aria-label="Type your reply"
                placeholder="Type your reply…"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitTyped()
                }}
              />
              <Button
                variant="primary"
                disabled={typed.trim().length === 0}
                onClick={submitTyped}
                aria-label="Send your reply"
              >
                <Send size={16} aria-hidden="true" />
              </Button>
            </div>
            <div className="dialogue-options">
              {line.options.map((option) => (
                <button
                  key={option.text}
                  type="button"
                  className="dialogue-option dialogue-option--hint"
                  onClick={() => choose(option.text)}
                >
                  {option.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {picked !== undefined && line.options !== undefined && (
          <div className="dialogue-reply">
            {mistake && (
              <p className="dialogue-reply__hint">
                Not quite — a natural way to say it: <strong>{correctOption?.text}</strong>
              </p>
            )}
            <div className="dialogue-reply__bubble">{correctOption?.reply}</div>
          </div>
        )}
      </div>

      {(!isPlayer || picked !== undefined) && (
        <footer className="dialogue-player__footer">
          <Button variant="primary" block onClick={advance}>
            <Play size={16} aria-hidden="true" /> Continue
          </Button>
        </footer>
      )}
    </div>
  )
}
