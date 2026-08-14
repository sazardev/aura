import { Check, Mic, Square, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  CardExercise,
  ChoiceExercise,
  ListenExercise,
  MatchExercise,
  SpeakExercise,
  TapExercise,
  TypeExercise,
} from '@/engine/exercises'

import { Button } from '@/components/button'
import { SpeechButton } from '@/components/speech-button'
import { createRecognizer } from '@/engine/speech'
import { useSpeech } from '@/hooks/use-speech'
import { hashString, mulberry32, shuffle } from '@/lib/random'
import { isCloseEnough, normalizeText } from '@/lib/strings'

export type FeedbackState = 'idle' | 'correct' | 'wrong'

interface SubmitProps {
  feedback: FeedbackState
  onSubmit: (correct: boolean) => void
}

interface MatchProps {
  onMistake: () => void
  onComplete: () => void
}

export function ChoiceView({
  exercise,
  feedback,
  onSubmit,
}: SubmitProps & { exercise: ChoiceExercise }) {
  const [selected, setSelected] = useState<string | undefined>(undefined)

  const optionClass = (option: string): string => {
    const base = 'exercise-option'
    if (feedback === 'idle') return base
    if (option === exercise.answer) return `${base} exercise-option--correct`
    if (option === selected) return `${base} exercise-option--wrong`
    return base
  }

  return (
    <div className="exercise-body">
      <div className="exercise-prompt">
        <div className="exercise-prompt__label">Which word means…</div>
        <div className="exercise-prompt__word">{exercise.prompt}</div>
      </div>
      <div className="exercise-options">
        {exercise.options.map((option) => (
          <button
            key={option}
            type="button"
            className={optionClass(option)}
            disabled={feedback !== 'idle'}
            onClick={() => {
              setSelected(option)
              onSubmit(option === exercise.answer)
            }}
          >
            {option}
          </button>
        ))}
      </div>
      <HintCard
        sentence={exercise.sentence}
        meaning={exercise.meaning}
        show={feedback !== 'idle'}
      />
    </div>
  )
}

export function ListenView({
  exercise,
  feedback,
  onSubmit,
}: SubmitProps & { exercise: ListenExercise }) {
  const [selected, setSelected] = useState<string | undefined>(undefined)

  const optionClass = (option: string): string => {
    const base = 'exercise-option'
    if (feedback === 'idle') return base
    if (option === exercise.answer) return `${base} exercise-option--correct`
    if (option === selected) return `${base} exercise-option--wrong`
    return base
  }

  return (
    <div className="exercise-body">
      <div className="exercise-prompt">
        <div className="exercise-prompt__label">Listen and choose the correct meaning</div>
        <SpeechButton text={exercise.word} size="lg" label={`Listen to ${exercise.word}`} />
      </div>
      <div className="exercise-options">
        {exercise.options.map((option) => (
          <button
            key={option}
            type="button"
            className={optionClass(option)}
            disabled={feedback !== 'idle'}
            onClick={() => {
              setSelected(option)
              onSubmit(option === exercise.answer)
            }}
          >
            {option}
          </button>
        ))}
      </div>
      <HintCard sentence={exercise.sentence} meaning={exercise.word} show={feedback !== 'idle'} />
    </div>
  )
}

export function TypeView({
  exercise,
  feedback,
  onSubmit,
}: SubmitProps & { exercise: TypeExercise }) {
  const [value, setValue] = useState('')

  return (
    <div className="exercise-body">
      <div className="exercise-prompt">
        <div className="exercise-prompt__label">Type the word in English</div>
        <div className="exercise-prompt__word">{exercise.prompt}</div>
        <div className="exercise-prompt__hint">Hint: starts with “{exercise.hint}”</div>
      </div>
      <input
        className="exercise-input"
        type="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Type the word in English"
        value={value}
        placeholder="Type the word…"
        disabled={feedback !== 'idle'}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (feedback === 'idle' && event.key === 'Enter' && value.trim().length > 0) {
            onSubmit(normalizeText(value) === normalizeText(exercise.answer))
          }
        }}
      />
      <Button
        variant="primary"
        block
        disabled={value.trim().length === 0 || feedback !== 'idle'}
        onClick={() => onSubmit(normalizeText(value) === normalizeText(exercise.answer))}
      >
        Check
      </Button>
    </div>
  )
}

export function TapView({ exercise, feedback, onSubmit }: SubmitProps & { exercise: TapExercise }) {
  const [remaining, setRemaining] = useState<string[]>(exercise.words)
  const [built, setBuilt] = useState<string[]>([])

  const addWord = (word: string) => {
    setRemaining((current) => current.filter((candidate) => candidate !== word))
    setBuilt((current) => [...current, word])
  }

  const removeWord = (word: string) => {
    setBuilt((current) => {
      const index = current.lastIndexOf(word)
      if (index === -1) return current
      const copy = [...current]
      copy.splice(index, 1)
      return copy
    })
    setRemaining((current) => [...current, word])
  }

  return (
    <div className="exercise-body">
      <div className="exercise-prompt">
        <div className="exercise-prompt__label">Tap the words to build the sentence</div>
        <div className="exercise-prompt__word">{exercise.prompt}</div>
      </div>

      <div className="tap-answer" aria-label="Sentence being built">
        {built.map((word, index) => (
          <button
            key={`${word}-${index}`}
            type="button"
            className="tap-pill tap-pill--built"
            disabled={feedback !== 'idle'}
            onClick={() => removeWord(word)}
          >
            {word}
          </button>
        ))}
      </div>

      <div className="tap-bank">
        {remaining.map((word) => (
          <button
            key={word}
            type="button"
            className="tap-pill"
            disabled={feedback !== 'idle'}
            onClick={() => addWord(word)}
          >
            {word}
          </button>
        ))}
      </div>

      <Button
        variant="primary"
        block
        disabled={built.length === 0 || feedback !== 'idle'}
        onClick={() => onSubmit(normalizeText(built.join(' ')) === normalizeText(exercise.answer))}
      >
        Check
      </Button>
    </div>
  )
}

export function SpeakView({
  exercise,
  feedback,
  onSubmit,
}: SubmitProps & { exercise: SpeakExercise }) {
  const { recognitionSupported, speak } = useSpeech()
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [checked, setChecked] = useState(false)

  const handleFinalTranscript = (current: string) => {
    setTranscript(current)
    if (checked || current.trim().length === 0) return
    setChecked(true)
    onSubmit(isCloseEnough(current, exercise.sentence))
  }

  const toggleListening = () => {
    if (listening) {
      setListening(false)
      return
    }
    const recognizer = createRecognizer({
      lang: 'en-US',
      interimResults: true,
      onResult: (current, isFinal) => {
        if (isFinal) handleFinalTranscript(current)
        else setTranscript(current)
      },
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    })
    if (recognizer === undefined) return
    speak(exercise.sentence)
    recognizer.start()
    setListening(true)
  }

  return (
    <div className="exercise-body">
      <div className="exercise-prompt">
        <div className="exercise-prompt__label">Read the sentence aloud</div>
        <div className="exercise-prompt__sentence">
          <SpeechButton text={exercise.sentence} size="lg" label="Listen to the sentence" />
          <p>“{exercise.sentence}”</p>
        </div>
      </div>

      {recognitionSupported ? (
        <>
          <Button variant="secondary" block onClick={toggleListening}>
            {listening ? (
              <>
                <Square size={16} aria-hidden="true" /> Stop
              </>
            ) : (
              <>
                <Mic size={16} aria-hidden="true" /> Listen to my voice
              </>
            )}
          </Button>
          {transcript.length > 0 && (
            <p className="speak-transcript" aria-live="polite">
              You said: <em>“{transcript}”</em>
            </p>
          )}
        </>
      ) : (
        <p className="speak-transcript">
          Speech recognition is not available on this system. Say the sentence aloud and grade
          yourself.
        </p>
      )}

      <div className="exercise-options">
        <Button
          variant="success"
          block
          disabled={feedback !== 'idle' || listening}
          onClick={() => onSubmit(true)}
        >
          <Check size={16} aria-hidden="true" /> I said it well
        </Button>
        <Button
          variant="danger"
          block
          disabled={feedback !== 'idle' || listening}
          onClick={() => onSubmit(false)}
        >
          <X size={16} aria-hidden="true" /> I need to review
        </Button>
      </div>
      <HintCard
        sentence={exercise.sentence}
        meaning={exercise.meaning}
        show={feedback !== 'idle'}
      />
    </div>
  )
}

export function MatchView({
  exercise,
  onMistake,
  onComplete,
}: MatchProps & { exercise: MatchExercise }) {
  const [leftSelected, setLeftSelected] = useState<string | undefined>(undefined)
  const [matchedLeft, setMatchedLeft] = useState<ReadonlySet<string>>(new Set())
  const [errorPair, setErrorPair] = useState<string | undefined>(undefined)

  const pairFor = (word: string): string | undefined =>
    exercise.pairs.find((pair) => pair.word === word)?.meaning

  const clickLeft = (word: string) => {
    if (matchedLeft.has(word)) return
    setLeftSelected((current) => (current === word ? undefined : word))
  }

  const clickRight = (meaning: string) => {
    if (leftSelected === undefined) return
    if (meaning === pairFor(leftSelected)) {
      const nextMatched = new Set(matchedLeft).add(leftSelected)
      setMatchedLeft(nextMatched)
      setLeftSelected(undefined)
      if (nextMatched.size === exercise.pairs.length) onComplete()
    } else {
      setErrorPair(meaning)
      onMistake()
      setTimeout(() => setErrorPair(undefined), 600)
    }
  }

  const shuffledRight = useMemo(
    () =>
      shuffle(
        exercise.pairs.map((pair) => pair.meaning),
        mulberry32(hashString(exercise.id)),
      ),
    [exercise.id, exercise.pairs],
  )

  return (
    <div className="exercise-body">
      <div className="exercise-prompt">
        <div className="exercise-prompt__label">Match each word with its meaning</div>
      </div>
      <div className="match-grid">
        <div className="match-column">
          {exercise.pairs.map((pair) => (
            <button
              key={pair.word}
              type="button"
              className={[
                'match-card',
                matchedLeft.has(pair.word) ? 'match-card--matched' : '',
                leftSelected === pair.word ? 'match-card--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={matchedLeft.has(pair.word)}
              onClick={() => clickLeft(pair.word)}
            >
              {pair.word}
            </button>
          ))}
        </div>
        <div className="match-column">
          {shuffledRight.map((meaning) => {
            const isMatched = exercise.pairs.some(
              (pair) => pair.meaning === meaning && matchedLeft.has(pair.word),
            )
            return (
              <button
                key={meaning}
                type="button"
                className={[
                  'match-card',
                  isMatched ? 'match-card--matched' : '',
                  errorPair === meaning ? 'match-card--error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={isMatched}
                onClick={() => clickRight(meaning)}
              >
                {meaning}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CardView({
  exercise,
  feedback,
  onSubmit,
}: SubmitProps & { exercise: CardExercise }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="exercise-body">
      <div className="exercise-prompt">
        <div className="exercise-prompt__label">Memorize the word and its meaning</div>
      </div>
      <button
        type="button"
        className={['flip-card', flipped ? 'flip-card--flipped' : ''].filter(Boolean).join(' ')}
        onClick={() => setFlipped((current) => !current)}
      >
        {flipped ? (
          <div className="flip-card__back">
            <h3>{exercise.word}</h3>
            <p className="flip-card__meaning">{exercise.meaning}</p>
            <p className="flip-card__sentence">{exercise.sentence}</p>
          </div>
        ) : (
          <div className="flip-card__front">
            <SpeechButton text={exercise.word} size="lg" label={`Listen to ${exercise.word}`} />
            <h3>{exercise.word}</h3>
            <small>Tap to see the answer</small>
          </div>
        )}
      </button>
      <div className="exercise-options">
        <Button variant="danger" disabled={feedback !== 'idle'} onClick={() => onSubmit(false)}>
          I don&apos;t know it yet
        </Button>
        <Button variant="success" disabled={feedback !== 'idle'} onClick={() => onSubmit(true)}>
          I knew it
        </Button>
      </div>
    </div>
  )
}

function HintCard({
  sentence,
  meaning,
  show,
}: {
  sentence: string
  meaning: string
  show: boolean
}) {
  if (!show) return null
  return (
    <div className="hint-card">
      <SpeechButton text={sentence} size="sm" label={`Listen to ${sentence}`} />
      <div>
        <p>{sentence}</p>
        <small>{meaning}</small>
      </div>
    </div>
  )
}
