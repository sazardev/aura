import { Check, Dices, Lightbulb, PenLine } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { AnalyzerResult } from '@/engine/analyzer'

import { Button } from '@/components/button'
import { SpeechButton } from '@/components/speech-button'
import { analyzeText } from '@/engine/analyze'
import { writingTargets } from '@/engine/practice'
import { playSound } from '@/engine/sounds'
import { trackWriteAttempt } from '@/engine/telemetry'
import { lookupVocab } from '@/engine/vocabulary'
import { useAuraStore } from '@/state/store'

function writingScore(result: AnalyzerResult | undefined, usedTarget: boolean): number | undefined {
  if (result === undefined) return undefined
  const grammarPenalty = Math.min(4, result.notes.length)
  const lengthScore = Math.min(2, Math.floor(result.totalWords / 4))
  return Math.max(1, Math.min(10, (usedTarget ? 6 : 0) + lengthScore - grammarPenalty))
}

function scoreTone(score: number): 'good' | 'ok' | 'low' {
  if (score >= 7) return 'good'
  if (score >= 4) return 'ok'
  return 'low'
}

export function WriteScreen() {
  const learnedWords = useAuraStore((state) => state.learnedWords)
  const recordWriting = useAuraStore((state) => state.recordWriting)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const [targets] = useState(() => writingTargets(learnedWords, 6))
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<AnalyzerResult | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  const target = targets[index]
  const meaning = target === undefined ? undefined : lookupVocab(target)?.meaning

  const usedTarget = useMemo(() => {
    if (target === undefined || result === undefined) return false
    const normalized = text.toLowerCase().replaceAll(/[^a-z']/g, ' ')
    return normalized.includes(target.toLowerCase())
  }, [result, target, text])

  const score = useMemo(() => writingScore(result, usedTarget), [result, usedTarget])

  const check = async () => {
    if (text.trim().length < 3) return
    markGuidedAction('writing')
    setChecking(true)
    setResult(undefined)
    setError(undefined)
    try {
      const analysis = await analyzeText(text)
      const used =
        target !== undefined &&
        text
          .toLowerCase()
          .replaceAll(/[^a-z']/g, ' ')
          .includes(target.toLowerCase())
      const nextScore = writingScore(analysis, used)
      setResult(analysis)
      if (nextScore !== undefined) recordWriting(nextScore)
      trackWriteAttempt(text.length)
      playSound(analysis.notes.length === 0 ? 'correct' : 'wrong')
    } catch {
      setError('The analyzer could not process that text. Try again with a shorter sentence.')
      playSound('wrong')
    } finally {
      setChecking(false)
    }
  }

  const next = () => {
    setIndex((current) => (current + 1) % targets.length)
    setText('')
    setResult(undefined)
    setError(undefined)
    playSound('page')
  }

  return (
    <div className="practice-screen">
      <h1 className="screen-title">
        <PenLine size={22} aria-hidden="true" /> Writing practice
      </h1>
      <p className="screen-subtitle">
        Write a real sentence. Aura checks your grammar and style instantly — all locally.
      </p>

      {target !== undefined && (
        <section className="practice-card">
          <div className="practice-target">
            <span className="tier-badge">
              {index + 1} of {targets.length}
            </span>
            <strong>{target}</strong>
            <SpeechButton text={target} size="sm" label={`Listen to ${target}`} />
          </div>
          {meaning !== undefined && <p className="practice-target__meaning">{meaning}</p>}
          <p className="practice-target__hint">Write a sentence using this word:</p>
          <textarea
            className="analyzer-textarea"
            rows={4}
            aria-label="Write a sentence using the target word"
            placeholder={`${target} …`}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="practice-actions">
            <Button
              variant="primary"
              block
              disabled={text.trim().length < 3 || checking}
              onClick={() => void check()}
            >
              {checking ? 'Checking…' : 'Check my sentence'}
            </Button>
          </div>
          {error !== undefined && (
            <p className="dictation-verdict" role="alert">
              <Lightbulb size={14} aria-hidden="true" /> {error}
            </p>
          )}
        </section>
      )}

      {result !== undefined && score !== undefined && (
        <section className={`result-section write-result write-result--${scoreTone(score)}`}>
          <div className="write-result__score">
            <strong>{score}</strong>
            <span>/ 10</span>
          </div>
          <div className="write-result__body">
            <p>
              {usedTarget ? (
                <span>
                  <Check size={14} aria-hidden="true" /> You used the target word.
                </span>
              ) : (
                <span>
                  <Lightbulb size={14} aria-hidden="true" /> Try to use “{target}” in the sentence.
                </span>
              )}
            </p>
            {result.notes.length === 0 ? (
              <p>Clean sentence — no grammar or style suggestions.</p>
            ) : (
              <ul className="reader-analysis__notes">
                {result.notes.slice(0, 3).map((note, noteIndex) => (
                  <li key={`${note.ruleId}-${noteIndex}`}>{note.message}</li>
                ))}
              </ul>
            )}
            <Button variant="secondary" onClick={next}>
              <Dices size={16} aria-hidden="true" /> Next word
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
