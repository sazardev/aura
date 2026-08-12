import { readText } from '@tauri-apps/plugin-clipboard-manager'
import { open } from '@tauri-apps/plugin-dialog'
import { useState } from 'react'

import type { AnalyzerResult, ReadabilityScore } from '@/engine/analyzer'

import { Button } from '@/components/button'
import { SpeechButton } from '@/components/speech-button'
import { analyzeText } from '@/engine/analyzer'
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
      filters: [{ name: 'Texto', extensions: ['txt', 'md'] }],
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
      addWord(word, 'Palabra de tus textos')
    }
  }

  return (
    <div className="analyzer-screen">
      <h1>Analizador de textos 🧪</h1>
      <p className="screen-subtitle">
        Pega cualquier texto en inglés y Aura lo descompone: legibilidad, gramática, sentimiento,
        frecuencias y palabras para aprender.
      </p>

      <textarea
        className="analyzer-textarea"
        placeholder="Pega aquí un texto en inglés…"
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
          {analyzing ? 'Analizando…' : 'Analizar texto'}
        </Button>
        <Button variant="secondary" onClick={() => void runAnalysis(SAMPLE_TEXT)}>
          Ejemplo
        </Button>
        {inTauri && (
          <Button variant="secondary" onClick={() => void importFile()}>
            📂 Abrir archivo
          </Button>
        )}
        <Button variant="secondary" onClick={() => void pasteClipboard()}>
          📋 Pegar
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
        <h2>📊 Estadísticas</h2>
        <div className="stat-grid">
          <Stat label="Palabras" value={result.totalWords} />
          <Stat label="Únicas" value={result.uniqueWords} />
          <Stat label="Oraciones" value={result.sentences} />
          <Stat label="Sílabas" value={result.syllables} />
          <Stat label="Longitud media" value={result.averageWordLength.toFixed(1)} />
          <Stat label="Sentimiento" value={sentimentLabel(result.sentiment)} />
        </div>
        {result.readingAge !== undefined && (
          <p className="reading-age">
            Edad de lectura estimada: ~{Math.round(result.readingAge)} años
          </p>
        )}
      </section>

      <section className="result-section">
        <h2>📚 Legibilidad</h2>
        <div className="readability-grid">
          {result.readability.map((score) => (
            <ReadabilityCard key={score.name} score={score} />
          ))}
        </div>
      </section>

      <section className="result-section">
        <h2>🗂 Categorías gramaticales</h2>
        <PosBars distribution={result.posDistribution} total={result.totalWords} />
      </section>

      <section className="result-section">
        <h2>🏆 Palabras más usadas</h2>
        <ul className="top-words">
          {result.topWords.map((stat) => (
            <li key={stat.word} className="top-word">
              <span className="top-word__rank">{stat.count}×</span>
              <strong>{stat.word}</strong>
              <span className="top-word__pos">{stat.pos}</span>
              {stat.tier !== undefined && <span className="top-word__tier">{stat.tier}</span>}
              <SpeechButton text={stat.word} size="sm" label={`Escuchar ${stat.word}`} />
            </li>
          ))}
        </ul>
      </section>

      {result.notes.length > 0 && (
        <section className="result-section">
          <h2>💬 Sugerencias de estilo y gramática</h2>
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
        <h2>🌱 Palabras para aprender ({result.unknownWords.length})</h2>
        {result.unknownWords.length > 0 ? (
          <>
            <div className="word-chips">
              {result.unknownWords.slice(0, 30).map((word) => (
                <span key={word} className="word-chip">
                  {word}
                </span>
              ))}
            </div>
            <Button variant="success" onClick={onLearnAll}>
              + Añadir a mi vocabulario
            </Button>
          </>
        ) : (
          <p className="screen-subtitle">¡Este texto no tiene palabras raras para ti!</p>
        )}
      </section>
    </div>
  )
}

function sentimentLabel(value: number | undefined): string {
  if (value === undefined) return '—'
  if (value > 0.02) return 'Positivo'
  if (value < -0.02) return 'Negativo'
  return 'Neutro'
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
  if (entries.length === 0) return <p className="screen-subtitle">Sin datos.</p>
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
