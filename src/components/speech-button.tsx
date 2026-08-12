import { AudioLines, Volume2 } from 'lucide-react'

import { useSpeech } from '@/hooks/use-speech'

interface SpeechButtonProps {
  text: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const ICON_SIZE: Record<'sm' | 'md' | 'lg', number> = { sm: 16, md: 20, lg: 26 }

export function SpeechButton({ text, label, size = 'md' }: SpeechButtonProps) {
  const { speak, speaking } = useSpeech()

  const classes = ['speech-button', `speech-button--${size}`].join(' ')

  return (
    <button
      type="button"
      className={classes}
      aria-label={label ?? `Listen to ${text}`}
      title="Listen"
      onClick={() => speak(text)}
    >
      {speaking ? (
        <AudioLines size={ICON_SIZE[size]} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Volume2 size={ICON_SIZE[size]} strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  )
}
