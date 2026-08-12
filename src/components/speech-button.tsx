import { useSpeech } from '@/hooks/use-speech'

interface SpeechButtonProps {
  text: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export function SpeechButton({ text, label, size = 'md' }: SpeechButtonProps) {
  const { speak, speaking } = useSpeech()

  const classes = ['speech-button', `speech-button--${size}`].join(' ')

  return (
    <button
      type="button"
      className={classes}
      aria-label={label ?? `Escuchar ${text}`}
      title="Escuchar"
      onClick={() => speak(text)}
    >
      {speaking ? '🔊' : '🔈'}
    </button>
  )
}
