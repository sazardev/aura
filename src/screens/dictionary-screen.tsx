import { useEffect, useMemo, useState } from 'react'

import type { DictionaryEntry, WordnetSense } from '@/engine/dictionary'
import type { FrequencyTier } from '@/engine/frequency'

import { Button } from '@/components/button'
import { SpeechButton } from '@/components/speech-button'
import { lookupWord } from '@/engine/dictionary'
import { frequencyOf, frequencyTierOf, wordDifficulty } from '@/engine/frequency'
import { dueLabel } from '@/engine/srs'
import { useDebouncedValue } from '@/hooks/use-debounced'
import { useSpeech } from '@/hooks/use-speech'
import { isTauriRuntime } from '@/lib/tauri'
import { useAuraStore } from '@/state/store'

const TIER_LABEL: Record<FrequencyTier, string> = {
  'muy-comun': 'Muy común',
  comun: 'Común',
  'poco-comun': 'Poco común',
  rara: 'Rara',
  'muy-rara': 'Muy rara',
}

export function DictionaryScreen() {
  const [query, setQuery] = useState('')
  const [entry, setEntry] = useState<DictionaryEntry | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const debounced = useDebouncedValue(query.trim(), 350)

  const inTauri = isTauriRuntime()
  const addWord = useAuraStore((state) => state.addWord)
  const removeCard = useAuraStore((state) => state.removeCard)
  const cards = useAuraStore((state) => state.cards)
  const { speak } = useSpeech()

  useEffect(() => {
    if (debounced.length === 0) {
      setEntry(undefined)
      return
    }
    if (!inTauri) return
    let cancelled = false
    setLoading(true)
    void lookupWord(debounced)
      .then((result) => {
        if (!cancelled) setEntry(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced, inTauri])

  const frequency = useMemo(
    () => (debounced.length > 0 ? frequencyOf(debounced) : undefined),
    [debounced],
  )
  const tier = useMemo(
    () => (debounced.length > 0 ? frequencyTierOf(debounced) : undefined),
    [debounced],
  )
  const difficulty = useMemo(
    () => (debounced.length > 0 ? wordDifficulty(debounced) : undefined),
    [debounced],
  )

  const existingCard = useMemo(
    () => Object.values(cards).find((card) => card.word.toLowerCase() === debounced.toLowerCase()),
    [cards, debounced],
  )

  const word = existingCard?.word ?? debounced

  const learnWord = () => {
    if (debounced.length === 0) return
    const sense = entry?.senses[0]
    const meaning = sense?.gloss ?? 'Palabra del diccionario'
    addWord(debounced, meaning, {
      ...(tier !== undefined && { note: `Frecuencia: ${TIER_LABEL[tier]}` }),
    })
    speak(debounced)
  }

  const vocabulary = useMemo(
    () =>
      Object.values(cards).toSorted((a, b) => {
        const aWord = a.word.toLocaleLowerCase()
        const bWord = b.word.toLocaleLowerCase()
        return aWord.localeCompare(bWord)
      }),
    [cards],
  )

  return (
    <div className="dictionary-screen">
      <h1>Diccionario 📖</h1>
      <p className="screen-subtitle">
        WordNet completo, frecuencias reales y repaso espaciado. Local, sin internet.
      </p>

      <div className="search-box">
        <input
          type="search"
          className="exercise-input"
          placeholder="Busca una palabra en inglés…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {debounced.length > 0 && (
        <section className="word-card" aria-label={`Análisis de ${debounced}`}>
          <header className="word-card__header">
            <h2>{word}</h2>
            <div className="word-card__tools">
              <SpeechButton text={word} label={`Escuchar ${word}`} size="md" />
              {existingCard === undefined ? (
                <Button variant="success" onClick={learnWord}>
                  + Aprender
                </Button>
              ) : (
                <span className="word-card__in-deck">✓ En tu vocabulario</span>
              )}
            </div>
          </header>

          <div className="word-card__meta">
            {tier !== undefined && (
              <span className={`tier-badge tier-badge--${tier}`}>{TIER_LABEL[tier]}</span>
            )}
            {difficulty !== undefined && (
              <span className="tier-badge">Dificultad: {difficulty}/5</span>
            )}
            {frequency !== undefined && <span className="tier-badge">Top {frequency.rank}</span>}
          </div>

          {loading && <p className="word-card__loading">Consultando WordNet…</p>}

          {!loading && entry !== undefined && entry.senses.length > 0 && (
            <div className="word-card__senses">
              {entry.senses.map((sense, index) => (
                <SenseBlock key={`${sense.partOfSpeech}-${index}`} sense={sense} />
              ))}
            </div>
          )}

          {!loading && !inTauri && (
            <p className="word-card__hint">
              💡 El diccionario completo (WordNet) está disponible dentro de la app de escritorio.
            </p>
          )}

          {!loading && inTauri && entry?.senses.length === 0 && (
            <p className="word-card__hint">No se encontró esta palabra en WordNet.</p>
          )}
        </section>
      )}

      <section className="vocabulary" aria-label="Mi vocabulario">
        <h2>Mi vocabulario ({vocabulary.length})</h2>
        {vocabulary.length === 0 ? (
          <p className="screen-subtitle">
            Aún no tienes palabras guardadas. Termina lecciones o usa “+ Aprender” para empezar tu
            colección.
          </p>
        ) : (
          <ul className="vocabulary__list">
            {vocabulary.map((card) => (
              <li key={card.id} className="vocabulary__item">
                <SpeechButton text={card.word} size="sm" label={`Escuchar ${card.word}`} />
                <div className="vocabulary__info">
                  <strong>{card.word}</strong>
                  {card.translation !== undefined && <span>{card.translation}</span>}
                  <small>{dueLabel(card)}</small>
                </div>
                <button
                  type="button"
                  className="vocabulary__remove"
                  aria-label={`Eliminar ${card.word}`}
                  onClick={() => removeCard(card.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function SenseBlock({ sense }: { sense: WordnetSense }) {
  return (
    <details className="sense-block" open={sense.synonyms.length > 0}>
      <summary>
        <span className="sense-block__pos">{sense.partOfSpeech}</span> {sense.gloss}
      </summary>
      <div className="sense-block__body">
        {sense.examples.length > 0 && (
          <p className="sense-block__examples">
            <em>
              {sense.examples
                .slice(0, 2)
                .map((example) => `“${example}”`)
                .join(' ')}
            </em>
          </p>
        )}
        <SenseWords label="Sinónimos" words={sense.synonyms} />
        <SenseWords label="Antónimos" words={sense.antonyms} />
        <SenseWords label="Hiperónimos (categoría)" words={sense.hypernyms} />
        <SenseWords label="Hipónimos (ejemplos)" words={sense.hyponyms} />
      </div>
    </details>
  )
}

function SenseWords({ label, words }: { label: string; words: string[] }) {
  if (words.length === 0) return null
  return (
    <p className="sense-block__words">
      <strong>{label}:</strong> {words.join(', ')}
    </p>
  )
}
