import { readText } from '@tauri-apps/plugin-clipboard-manager'
import {
  BarChart3,
  BookOpenCheck,
  Clipboard,
  FlaskConical,
  FolderOpen,
  SpellCheck,
  Sprout,
  Tag,
  TrendingUp,
} from 'lucide-react'
import { useRef, useState } from 'react'

import type { AnalyzerResult, ReadabilityScore } from '@/engine/analyzer'

import { Button } from '@/components/button'
import { SpeechButton } from '@/components/speech-button'
import { analyzeText } from '@/engine/analyze'
import { FREQUENCY_TIER_LABELS } from '@/engine/frequency'
import { trackAnalysisRun } from '@/engine/telemetry'
import { lookupVocab } from '@/engine/vocabulary'
import { readDocumentFile } from '@/lib/document-reader'
import { isTauriRuntime } from '@/lib/tauri'
import { useAuraStore } from '@/state/store'

const SAMPLE_TEXT = `The sun rose over the quiet village. People walked slowly to the market, carrying baskets of fresh fruit. Learning a new language opens many doors in your life. Practice every day, even for a short time, and you will see great progress. English is not difficult if you enjoy the journey.`

/**
Upper bound of characters sent to the full NLP pipeline (keeps it fast).
 */
const MAX_ANALYZE_CHARS = 150_000

/**
Average reading speed used to estimate reading time (words per minute).
 */
const WORDS_PER_MINUTE = 200

export function AnalyzerScreen() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<AnalyzerResult | undefined>(undefined)
  const [analyzing, setAnalyzing] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const addWord = useAuraStore((state) => state.addWord)
  const inTauri = isTauriRuntime()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const runAnalysis = async (source: string) => {
    const total = source.length
    const limited = total > MAX_ANALYZE_CHARS ? source.slice(0, MAX_ANALYZE_CHARS) : source
    setText(source)
    setTruncated(total > MAX_ANALYZE_CHARS)
    setError(undefined)
    setAnalyzing(true)
    trackAnalysisRun()
    try {
      const analysis = await analyzeText(limited)
      setResult(analysis)
    } catch (error_) {
      setResult(undefined)
      setError(error_ instanceof Error ? error_.message : 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const onFileChosen = async (file: File | undefined) => {
    if (file === undefined) return
    try {
      const content = await readDocumentFile(file)
      if (content.length > 0) await runAnalysis(content)
    } catch {
      setError('Could not read that file.')
    } finally {
      if (fileInputRef.current !== null) fileInputRef.current.value = ''
    }
  }

  const pasteClipboard = async () => {
    try {
      const content = inTauri ? await readText() : await navigator.clipboard.readText()
      if (content.length > 0) await runAnalysis(content)
    } catch {
      setError('Could not read the clipboard. Paste the text manually instead.')
    }
  }

  const learnAll = () => {
    if (result === undefined) return
    for (const word of result.unknownWords.slice(0, 20)) {
      const meaning = lookupVocab(word)?.meaning ?? 'A word from your texts'
      addWord(word, meaning)
    }
  }

  return (
    <div className="analyzer-screen">
      <h1 className="screen-title">
        <FlaskConical size={22} aria-hidden="true" /> Text analyzer
      </h1>
      <p className="screen-subtitle">
        Paste any English text, open a <strong>PDF</strong>, TXT or MD file, or paste from the
        clipboard. Aura runs a full NLP pass: readability, grammar, sentiment, frequencies and words
        to learn.
      </p>

      <textarea
        className="analyzer-textarea"
        placeholder="Paste an English text here…"
        value={text}
        rows={8}
        onChange={(event) => setText(event.target.value)}
      />

      {truncated && (
        <p className="analyzer-note">
          Very large text: the first {MAX_ANALYZE_CHARS.toLocaleString('en-US')} characters were
          analyzed ({text.length.toLocaleString('en-US')} total).
        </p>
      )}
      {error !== undefined && <p className="analyzer-note analyzer-note--error">{error}</p>}

      <div className="analyzer-actions">
        <Button
          variant="primary"
          disabled={text.trim().length < 10 || analyzing}
          onClick={() => void runAnalysis(text)}
        >
          {analyzing ? 'Analyzing…' : 'Analyze text'}
        </Button>
        <Button variant="secondary" onClick={() => void runAnalysis(SAMPLE_TEXT)}>
          Sample
        </Button>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <FolderOpen size={16} aria-hidden="true" /> Open file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          className="backup-file-input"
          onChange={(event) => void onFileChosen(event.target.files?.[0])}
        />
        <Button variant="secondary" onClick={() => void pasteClipboard()}>
          <Clipboard size={16} aria-hidden="true" /> Paste
        </Button>
      </div>

      {result !== undefined && <AnalyzerResults result={result} onLearnAll={learnAll} />}
    </div>
  )
}

function AnalyzerResults({
  result,
  onLearnAll,
}: {
  result: AnalyzerResult
  onLearnAll: () => void
}) {
  return (
    <div className="analyzer-results">
      <section className="result-section">
        <h2 className="section-title">
          <BarChart3 size={18} aria-hidden="true" /> Statistics
        </h2>
        <div className="stat-grid">
          <Stat label="Words" value={result.totalWords} />
          <Stat label="Unique" value={result.uniqueWords} />
          <Stat label="Sentences" value={result.sentences} />
          <Stat label="Syllables" value={result.syllables} />
          <Stat label="Avg. length" value={result.averageWordLength.toFixed(1)} />
          <Stat label="Sentiment" value={sentimentLabel(result.sentiment)} />
          <Stat label="Reading time" value={readingTime(result.totalWords)} />
        </div>
        {result.readingAge !== undefined && (
          <p className="reading-age">
            Estimated reading age: ~{Math.round(result.readingAge)} years
          </p>
        )}
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <BookOpenCheck size={18} aria-hidden="true" /> Readability
        </h2>
        <div className="readability-grid">
          {result.readability.map((score) => (
            <ReadabilityCard key={score.name} score={score} />
          ))}
        </div>
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <Tag size={18} aria-hidden="true" /> Parts of speech
        </h2>
        <PosBars distribution={result.posDistribution} total={result.totalWords} />
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <TrendingUp size={18} aria-hidden="true" /> Most used words
        </h2>
        <ul className="top-words">
          {result.topWords.map((stat) => (
            <li key={stat.word} className="top-word">
              <span className="top-word__rank">{stat.count}×</span>
              <strong>{stat.word}</strong>
              <span className="top-word__pos">{stat.pos}</span>
              {stat.tier !== undefined && (
                <span className="top-word__tier">{FREQUENCY_TIER_LABELS[stat.tier]}</span>
              )}
              <SpeechButton text={stat.word} size="sm" label={`Listen to ${stat.word}`} />
            </li>
          ))}
        </ul>
      </section>

      {result.notes.length > 0 && (
        <section className="result-section">
          <h2 className="section-title">
            <SpellCheck size={18} aria-hidden="true" /> Style and grammar suggestions
          </h2>
          <ul className="notes-list">
            {result.notes.slice(0, 30).map((note, index) => (
              <li key={`${note.source}-${index}`} className="note-item">
                <span className={`note-item__source note-item__source--${noteSeverityClass(note)}`}>
                  {note.ruleId || note.source}
                </span>
                <span>{note.message}</span>
                {note.actual !== undefined && note.actual.length > 0 && (
                  <span className="note-item__actual">«{note.actual}»</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="result-section">
        <h2 className="section-title">
          <Sprout size={18} aria-hidden="true" /> Words to learn ({result.unknownWords.length})
        </h2>
        {result.unknownWords.length > 0 ? (
          <>
            <ul className="top-words">
              {result.unknownWords.slice(0, 30).map((word) => {
                const bank = lookupVocab(word)
                return (
                  <li key={word} className="top-word">
                    <SpeechButton text={word} size="sm" label={`Listen to ${word}`} />
                    <strong>{word}</strong>
                    <span className="top-word__pos">{bank?.meaning ?? '—'}</span>
                  </li>
                )
              })}
            </ul>
            <Button variant="success" onClick={onLearnAll}>
              + Add to my vocabulary
            </Button>
          </>
        ) : (
          <p className="screen-subtitle">This text has no uncommon words for you!</p>
        )}
      </section>
    </div>
  )
}

function sentimentLabel(value: number | undefined): string {
  if (value === undefined) return '—'
  if (value > 0.02) return 'Positive'
  if (value < -0.02) return 'Negative'
  return 'Neutral'
}

function readingTime(words: number): string {
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  return `${minutes} min`
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  )
}

function ReadabilityCard({ score }: { score: ReadabilityScore }) {
  return (
    <div className="readability-card">
      <span className="readability-card__name">{score.name}</span>
      <strong className="readability-card__value">{score.value.toFixed(1)}</strong>
      <span className="readability-card__unit">{score.unit}</span>
    </div>
  )
}

function PosBars({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  const entries = Object.entries(distribution)
  if (entries.length === 0) return <p className="screen-subtitle">No data.</p>
  return (
    <div className="pos-bars">
      {entries.map(([pos, count]) => (
        <div key={pos} className="pos-bar">
          <span className="pos-bar__label">{pos}</span>
          <div className="pos-bar__track">
            <div
              className="pos-bar__fill"
              style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
            />
          </div>
          <span className="pos-bar__count">{count}</span>
        </div>
      ))}
    </div>
  )
}

function noteSeverityClass(note: { ruleId: string }): string {
  const rule = note.ruleId
  if (rule === 'readability') return 'readability'
  if (rule === 'simplify') return 'simplify'
  if (rule === 'equality') return 'equality'
  return 'style'
}
