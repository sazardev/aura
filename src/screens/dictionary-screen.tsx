import { BookOpen, Check, Dices, Lightbulb, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { DictionaryEntry, WordnetSense } from '@/engine/dictionary'
import type { VocabularyEntry } from '@/engine/types'

import { Button } from '@/components/button'
import { SpeechButton } from '@/components/speech-button'
import { cefrLevelOf } from '@/engine/cefr'
import { lookupWord } from '@/engine/dictionary'
import {
  FREQUENCY_TIER_LABELS,
  frequencyOf,
  frequencyTierOf,
  wordDifficulty,
} from '@/engine/frequency'
import { dueLabel } from '@/engine/srs'
import { trackWordLookup, trackWordSave } from '@/engine/telemetry'
import { lookupVocab, randomVocabEntry, vocabularySize } from '@/engine/vocabulary'
import { useDebouncedValue } from '@/hooks/use-debounced'
import { useSpeech } from '@/hooks/use-speech'
import { isTauriRuntime } from '@/lib/tauri'
import { useAuraStore } from '@/state/store'

export function DictionaryScreen({
  initialWord,
  onWordChange,
}: {
  initialWord?: string
  onWordChange: (word: string) => void
}) {
  const [query, setQuery] = useState(initialWord ?? '')
  const [entry, setEntry] = useState<DictionaryEntry | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const debounced = useDebouncedValue(query.trim(), 350)

  // Keep the search box in sync when the URL changes (deep links, back button).
  useEffect(() => {
    if (initialWord !== undefined && initialWord !== query) setQuery(initialWord)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWord])

  // Mirror the debounced query into the URL so refresh restores the search.
  const initialWordRef = useRef(initialWord)
  useEffect(() => {
    initialWordRef.current = initialWord
  }, [initialWord])
  const onWordChangeRef = useRef(onWordChange)
  useEffect(() => {
    onWordChangeRef.current = onWordChange
  }, [onWordChange])
  useEffect(() => {
    if (debounced !== (initialWordRef.current ?? '')) onWordChangeRef.current(debounced)
  }, [debounced])

  const inTauri = isTauriRuntime()
  const addWord = useAuraStore((state) => state.addWord)
  const removeCard = useAuraStore((state) => state.removeCard)
  const markGuidedAction = useAuraStore((state) => state.markGuidedAction)
  const cards = useAuraStore((state) => state.cards)
  const { speak } = useSpeech()

  useEffect(() => {
    if (debounced.length === 0) {
      setEntry(undefined)
      return
    }
    trackWordLookup(debounced)
    markGuidedAction('dictionary')
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
  }, [debounced, inTauri, markGuidedAction])

  const bankEntry = useMemo(
    () => (debounced.length > 0 ? lookupVocab(debounced) : undefined),
    [debounced],
  )
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

  const word = existingCard?.word ?? bankEntry?.word ?? debounced

  const surprise = () => {
    const random = randomVocabEntry()
    if (random !== undefined) setQuery(random.word)
  }

  const learnWord = () => {
    if (debounced.length === 0) return
    const meaning = bankEntry?.meaning ?? entry?.senses[0]?.gloss ?? 'Dictionary word'
    const example = bankEntry?.example
    addWord(debounced, meaning, {
      ...(example !== undefined && { note: `“${example}”` }),
    })
    trackWordSave(debounced)
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
      <h1 className="screen-title">
        <BookOpen size={22} aria-hidden="true" /> Dictionary
      </h1>
      <p className="screen-subtitle">
        {vocabularySize().toLocaleString('en-US')} words in the local bank + full WordNet, real
        frequencies and spaced repetition. Offline.
      </p>

      <div className="search-box">
        <input
          type="search"
          name="dictionary-search"
          className="exercise-input"
          aria-label="Search an English word"
          placeholder="Search an English word…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <Button variant="ghost" block onClick={surprise}>
        <Dices size={16} aria-hidden="true" /> Surprise me
      </Button>

      {debounced.length > 0 && (
        <section className="word-card" aria-label={`Analysis of ${debounced}`}>
          <header className="word-card__header">
            <h2>{word}</h2>
            <div className="word-card__tools">
              <SpeechButton text={word} label={`Listen to ${word}`} size="md" />
              {existingCard === undefined ? (
                <Button variant="success" onClick={learnWord}>
                  + Learn
                </Button>
              ) : (
                <span className="word-card__in-deck">
                  <Check size={14} aria-hidden="true" /> In your vocabulary
                </span>
              )}
            </div>
          </header>

          <div className="word-card__meta">
            {tier !== undefined && (
              <span className={`tier-badge tier-badge--${tier}`}>
                {FREQUENCY_TIER_LABELS[tier]}
              </span>
            )}
            {difficulty !== undefined && (
              <span className="tier-badge">Difficulty: {difficulty}/5</span>
            )}
            {frequency !== undefined && <span className="tier-badge">Top {frequency.rank}</span>}
            {cefrLevelOf(debounced) !== undefined && (
              <span className="tier-badge">CEFR {cefrLevelOf(debounced)}</span>
            )}
          </div>

          {bankEntry !== undefined && <BankCard entry={bankEntry} />}

          {loading && <p className="word-card__loading">Querying WordNet…</p>}

          {!loading && entry !== undefined && entry.senses.length > 0 && (
            <div className="word-card__senses">
              {entry.senses.map((sense, index) => (
                <SenseBlock key={`${sense.partOfSpeech}-${index}`} sense={sense} />
              ))}
            </div>
          )}

          {!loading && inTauri && entry?.senses.length === 0 && (
            <p className="word-card__hint">This word was not found in WordNet.</p>
          )}

          {!loading && !inTauri && bankEntry === undefined && (
            <p className="word-card__hint">
              <Lightbulb size={14} aria-hidden="true" /> The full WordNet dictionary is available
              inside the desktop app.
            </p>
          )}
        </section>
      )}

      <section className="vocabulary" aria-label="My vocabulary">
        <h2>My vocabulary ({vocabulary.length})</h2>
        {vocabulary.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} aria-hidden="true" />
            <p>
              You have no saved words yet. Finish lessons or use “+ Learn” to start your collection.
            </p>
          </div>
        ) : (
          <ul className="vocabulary__list">
            {vocabulary.map((card) => (
              <li key={card.id} className="vocabulary__item">
                <SpeechButton text={card.word} size="sm" label={`Listen to ${card.word}`} />
                <div className="vocabulary__info">
                  <strong>{card.word}</strong>
                  <span>{card.meaning}</span>
                  <small>{dueLabel(card)}</small>
                </div>
                <button
                  type="button"
                  className="vocabulary__remove"
                  aria-label={`Remove ${card.word}`}
                  onClick={() => removeCard(card.id)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function BankCard({ entry }: { entry: VocabularyEntry }) {
  return (
    <div className="bank-card">
      <div className="bank-card__row">
        <span className={`tier-badge tier-badge--${entry.tier}`}>
          {FREQUENCY_TIER_LABELS[entry.tier]}
        </span>
        <span className="tier-badge">{entry.pos}</span>
        <span className="tier-badge">#{entry.rank}</span>
      </div>
      <p className="bank-card__meaning">{entry.meaning}</p>
      {entry.example !== undefined && (
        <p className="bank-card__example">
          <SpeechButton text={entry.example} size="sm" label="Listen to the example" />
          <em>{entry.example}</em>
        </p>
      )}
      {entry.synonyms.length > 0 && (
        <p className="bank-card__synonyms">
          <strong>Synonyms:</strong> {entry.synonyms.join(', ')}
        </p>
      )}
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
        <SenseWords label="Synonyms" words={sense.synonyms} />
        <SenseWords label="Antonyms" words={sense.antonyms} />
        <SenseWords label="Hypernyms (broader)" words={sense.hypernyms} />
        <SenseWords label="Hyponyms (examples)" words={sense.hyponyms} />
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
