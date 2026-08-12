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
        <div className="exercise-prompt__label">¿Qué palabra es “{exercise.prompt}”?</div>
        <div className="exercise-prompt__word">
          <SpeechButton text={exercise.word} size="lg" label={`Escuchar ${exercise.word}`} />
        </div>
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
        text={exercise.sentence}
        translation={exercise.sentenceTranslation}
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
        <div className="exercise-prompt__label">Escucha y elige la traducción correcta</div>
        <SpeechButton text={exercise.word} size="lg" label={`Escuchar ${exercise.word}`} />
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
      <HintCard text={exercise.sentence} translation={exercise.word} show={feedback !== 'idle'} />
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
        <div className="exercise-prompt__label">Escribe en inglés</div>
        <div className="exercise-prompt__word">{exercise.prompt}</div>
        <div className="exercise-prompt__hint">Pista: {exercise.hint}</div>
      </div>
      <input
        className="exercise-input"
        type="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        placeholder="Escribe la palabra…"
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
        Comprobar
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
        <div className="exercise-prompt__label">Toca las palabras para formar la frase</div>
        <div className="exercise-prompt__word">{exercise.prompt}</div>
      </div>

      <div className="tap-answer" aria-label="Frase en construcción">
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
        Comprobar
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
        <div className="exercise-prompt__label">Lee la frase en voz alta</div>
        <div className="exercise-prompt__sentence">
          <SpeechButton text={exercise.sentence} size="lg" label="Escuchar la frase" />
          <p>“{exercise.sentence}”</p>
        </div>
      </div>

      {recognitionSupported ? (
        <>
          <Button variant="secondary" block onClick={toggleListening}>
            {listening ? '⏹ Detener' : '🎙 Escuchar mi voz'}
          </Button>
          {transcript.length > 0 && (
            <p className="speak-transcript">
              Dijiste: <em>“{transcript}”</em>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="speak-transcript">
            No hay reconocimiento de voz disponible en este sistema. Repite la frase en voz alta y
            evalúate.
          </p>
          <div className="exercise-options">
            <Button
              variant="success"
              block
              disabled={feedback !== 'idle'}
              onClick={() => onSubmit(true)}
            >
              ✓ Lo dije bien
            </Button>
            <Button
              variant="danger"
              block
              disabled={feedback !== 'idle'}
              onClick={() => onSubmit(false)}
            >
              ✗ Necesito repasar
            </Button>
          </div>
        </>
      )}
      <HintCard
        text={exercise.sentence}
        translation={exercise.translation}
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

  const pairFor = (left: string): string | undefined =>
    exercise.pairs.find((pair) => pair.left === left)?.right

  const clickLeft = (left: string) => {
    if (matchedLeft.has(left)) return
    setLeftSelected((current) => (current === left ? undefined : left))
  }

  const clickRight = (right: string) => {
    if (leftSelected === undefined) return
    if (right === pairFor(leftSelected)) {
      const nextMatched = new Set(matchedLeft).add(leftSelected)
      setMatchedLeft(nextMatched)
      setLeftSelected(undefined)
      if (nextMatched.size === exercise.pairs.length) onComplete()
    } else {
      setErrorPair(right)
      onMistake()
      setTimeout(() => setErrorPair(undefined), 600)
    }
  }

  const shuffledRight = useMemo(
    () =>
      shuffle(
        exercise.pairs.map((pair) => pair.right),
        mulberry32(hashString(exercise.id)),
      ),
    [exercise.id, exercise.pairs],
  )

  return (
    <div className="exercise-body">
      <div className="exercise-prompt">
        <div className="exercise-prompt__label">Une cada palabra con su traducción</div>
      </div>
      <div className="match-grid">
        <div className="match-column">
          {exercise.pairs.map((pair) => (
            <button
              key={pair.left}
              type="button"
              className={[
                'match-card',
                matchedLeft.has(pair.left) ? 'match-card--matched' : '',
                leftSelected === pair.left ? 'match-card--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={matchedLeft.has(pair.left)}
              onClick={() => clickLeft(pair.left)}
            >
              {pair.left}
            </button>
          ))}
        </div>
        <div className="match-column">
          {shuffledRight.map((right) => {
            const isMatched = exercise.pairs.some(
              (pair) => pair.right === right && matchedLeft.has(pair.left),
            )
            return (
              <button
                key={right}
                type="button"
                className={[
                  'match-card',
                  isMatched ? 'match-card--matched' : '',
                  errorPair === right ? 'match-card--error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={isMatched}
                onClick={() => clickRight(right)}
              >
                {right}
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
        <div className="exercise-prompt__label">Memoriza la palabra y su significado</div>
      </div>
      <button
        type="button"
        className={['flip-card', flipped ? 'flip-card--flipped' : ''].filter(Boolean).join(' ')}
        onClick={() => setFlipped((current) => !current)}
      >
        {flipped ? (
          <div className="flip-card__back">
            <h3>{exercise.word}</h3>
            <p>{exercise.translation}</p>
            <p className="flip-card__meaning">{exercise.meaning}</p>
            <p className="flip-card__sentence">{exercise.sentence}</p>
          </div>
        ) : (
          <div className="flip-card__front">
            <SpeechButton text={exercise.word} size="lg" label={`Escuchar ${exercise.word}`} />
            <h3>{exercise.word}</h3>
            <small>Toca para ver la respuesta</small>
          </div>
        )}
      </button>
      <div className="exercise-options">
        <Button variant="danger" disabled={feedback !== 'idle'} onClick={() => onSubmit(false)}>
          Aún no lo sé
        </Button>
        <Button variant="success" disabled={feedback !== 'idle'} onClick={() => onSubmit(true)}>
          Lo sabía
        </Button>
      </div>
    </div>
  )
}

function HintCard({
  text,
  translation,
  show,
}: {
  text: string
  translation: string
  show: boolean
}) {
  if (!show) return null
  return (
    <div className="hint-card">
      <SpeechButton text={text} size="sm" label={`Escuchar ${text}`} />
      <div>
        <p>{text}</p>
        <small>{translation}</small>
      </div>
    </div>
  )
}
