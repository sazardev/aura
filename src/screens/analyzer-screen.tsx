import { readText } from '@tauri-apps/plugin-clipboard-manager'
import { open } from '@tauri-apps/plugin-dialog'
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
import { useState } from 'react'

import type { AnalyzerResult, ReadabilityScore } from '@/engine/analyzer'

import { Button } from '@/components/button'
import { SpeechButton } from '@/components/speech-button'
import { analyzeText } from '@/engine/analyzer'
import { FREQUENCY_TIER_LABELS } from '@/engine/frequency'
import { lookupVocab } from '@/engine/vocabulary'
import { invokeOptional } from '@/lib/tauri'
import { isTauriRuntime } from '@/lib/tauri'
import { useAuraStore } from '@/state/store'

const SAMPLE_TEXT = `The sun rose over the quiet village. People walked slowly to the market, carrying baskets of fresh fruit. Learning a new language opens many doors in your life. Practice every day, even for a short time, and you will see great progress. English is not difficult if you enjoy the journey.`

export function AnalyzerScreen() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<AnalyzerResult | undefined>(undefined)
  const [analyzing, setAnalyzing] = useState(false)
  const addWord = useAuraStore((state) => state.addWord)
  const inTauri = isTauriRuntime()

  const runAnalysis = async (source: string) => {
    setText(source)
    setAnalyzing(true)
    try {
      const analysis = await analyzeText(source)
      setResult(analysis)
    } finally {
      setAnalyzing(false)
    }
  }

  const importFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Text', extensions: ['txt', 'md'] }],
    })
    if (typeof selected === 'string') {
      const content = await invokeOptional<string>('read_text_file', { path: selected })
      if (content !== undefined) await runAnalysis(content)
    }
  }

  const pasteClipboard = async () => {
    const content = inTauri ? await readText() : await navigator.clipboard.readText()
    if (content.length > 0) await runAnalysis(content)
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
        Paste any English text and Aura breaks it down: readability, grammar, sentiment, frequencies
        and words to learn.
      </p>

      <textarea
        className="analyzer-textarea"
        placeholder="Paste an English text here…"
        value={text}
        rows={8}
        onChange={(event) => setText(event.target.value)}
      />

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
        {inTauri && (
          <Button variant="secondary" onClick={() => void importFile()}>
            <FolderOpen size={16} aria-hidden="true" /> Open file
          </Button>
        )}
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
