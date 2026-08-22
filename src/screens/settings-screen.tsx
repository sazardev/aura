import {
  BarChart3,
  Database,
  Info,
  Palette,
  PartyPopper,
  Play,
  Settings,
  Volume2,
} from 'lucide-react'

import { Button } from '@/components/button'
import { ACCENT_PALETTES } from '@/engine/theme'
import { DAILY_GOAL_OPTIONS } from '@/engine/xp'
import { useHashRoute } from '@/hooks/use-hash-route'
import { useSpeech } from '@/hooks/use-speech'
import { APP_VERSION } from '@/lib/app-info'
import { useAuraStore } from '@/state/store'

function rateLabel(rate: number): string {
  if (rate < 0.8) return '(slow)'
  if (rate > 1.2) return '(fast)'
  return '(natural)'
}

function pitchLabel(pitch: number): string {
  if (pitch < 0.8) return '(deeper)'
  if (pitch > 1.2) return '(higher)'
  return '(natural)'
}

const SAMPLE_LINE = 'Practice makes perfect. Aura helps you speak English with confidence.'

const THEME_MODES: { id: 'system' | 'light' | 'dark'; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export function SettingsScreen() {
  const soundEnabled = useAuraStore((state) => state.soundEnabled)
  const ttsEnabled = useAuraStore((state) => state.ttsEnabled)
  const ttsRate = useAuraStore((state) => state.ttsRate)
  const ttsPitch = useAuraStore((state) => state.ttsPitch)
  const ttsVoiceURI = useAuraStore((state) => state.ttsVoiceURI)
  const themeMode = useAuraStore((state) => state.themeMode)
  const accent = useAuraStore((state) => state.accent)
  const dailyGoal = useAuraStore((state) => state.dailyGoal)
  const setSoundEnabled = useAuraStore((state) => state.setSoundEnabled)
  const setTtsEnabled = useAuraStore((state) => state.setTtsEnabled)
  const setTtsRate = useAuraStore((state) => state.setTtsRate)
  const setTtsPitch = useAuraStore((state) => state.setTtsPitch)
  const setTtsVoice = useAuraStore((state) => state.setTtsVoice)
  const setThemeMode = useAuraStore((state) => state.setThemeMode)
  const setAccent = useAuraStore((state) => state.setAccent)
  const setDailyGoal = useAuraStore((state) => state.setDailyGoal)
  const startGuidedTour = useAuraStore((state) => state.startGuidedTour)
  const { voices, supported, speak } = useSpeech()
  const { navigate } = useHashRoute()

  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'))

  return (
    <div className="settings-screen">
      <h1 className="screen-title">
        <Settings size={22} aria-hidden="true" /> Settings
      </h1>
      <p className="screen-subtitle">
        Make Aura yours. Everything is saved on this device and works fully offline.
      </p>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Volume2 size={16} aria-hidden="true" /> Appearance
        </h2>
        <label className="settings-row settings-row--column">
          <span>
            <strong>Accent color</strong>
            <small>Pick the color that leads the whole app</small>
          </span>
          <div className="accent-picker">
            {ACCENT_PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                className={['accent-option', accent === palette.id ? 'accent-option--active' : '']
                  .filter(Boolean)
                  .join(' ')}
                style={{ background: palette.preview }}
                aria-label={`${palette.name} theme`}
                aria-pressed={accent === palette.id}
                title={palette.name}
                onClick={() => setAccent(palette.id)}
              >
                {accent === palette.id && <Palette size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </label>
        <label className="settings-row settings-row--column">
          <span>
            <strong>Theme</strong>
            <small>Follow your system, or force light or dark</small>
          </span>
          <div className="settings-theme">
            {THEME_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={[
                  'settings-theme__option',
                  themeMode === mode.id ? 'settings-theme__option--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`${mode.label} theme`}
                aria-pressed={themeMode === mode.id}
                onClick={() => setThemeMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </label>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Volume2 size={16} aria-hidden="true" /> Sound
        </h2>
        <label className="settings-row">
          <span>
            <strong>Sound effects</strong>
            <small>Feedback sounds for answers, achievements and navigation</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            className={['settings-toggle', soundEnabled ? 'settings-toggle--on' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            <span className="settings-toggle__knob" />
          </button>
        </label>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Volume2 size={16} aria-hidden="true" /> Voice & narration
        </h2>
        <label className="settings-row">
          <span>
            <strong>Voice narration</strong>
            <small>Spoken English for words, phrases and guided reading</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={ttsEnabled}
            className={['settings-toggle', ttsEnabled ? 'settings-toggle--on' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setTtsEnabled(!ttsEnabled)}
          >
            <span className="settings-toggle__knob" />
          </button>
        </label>

        <label className="settings-row settings-row--column">
          <span>
            <strong>Speech rate</strong>
            <small>
              {ttsRate.toFixed(1)}× {rateLabel(ttsRate)}
            </small>
          </span>
          <input
            type="range"
            name="tts-rate"
            min={0.5}
            max={1.5}
            step={0.1}
            value={ttsRate}
            disabled={!ttsEnabled}
            className="settings-slider"
            aria-label="Speech rate"
            onChange={(event) => setTtsRate(Number(event.target.value))}
          />
        </label>

        <label className="settings-row settings-row--column">
          <span>
            <strong>Voice pitch</strong>
            <small>
              {ttsPitch.toFixed(1)} {pitchLabel(ttsPitch)}
            </small>
          </span>
          <input
            type="range"
            name="tts-pitch"
            min={0.5}
            max={1.5}
            step={0.1}
            value={ttsPitch}
            disabled={!ttsEnabled}
            className="settings-slider"
            aria-label="Voice pitch"
            onChange={(event) => setTtsPitch(Number(event.target.value))}
          />
          <Button variant="secondary" disabled={!ttsEnabled} onClick={() => speak(SAMPLE_LINE)}>
            <Play size={16} aria-hidden="true" /> Test voice
          </Button>
        </label>

        {supported && englishVoices.length > 0 && (
          <label className="settings-row settings-row--column">
            <span>
              <strong>Voice</strong>
              <small>Prefer natural-sounding voices when available</small>
            </span>
            <select
              className="settings-select"
              value={ttsVoiceURI ?? ''}
              disabled={!ttsEnabled}
              onChange={(event) => setTtsVoice(event.target.value)}
            >
              <option value="">Auto (best available)</option>
              {englishVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} · {voice.lang}
                  {voice.localService ? ' · local' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {!supported && (
          <p className="settings-note">
            Voice narration is not available on this device. The guided reader works silently.
          </p>
        )}
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Volume2 size={16} aria-hidden="true" /> Learning
        </h2>
        <label className="settings-row settings-row--column">
          <span>
            <strong>Daily goal</strong>
            <small>How much XP to aim for each day</small>
          </span>
          <div className="settings-goal">
            {DAILY_GOAL_OPTIONS.map((goal) => (
              <button
                key={goal}
                type="button"
                className={[
                  'settings-goal__option',
                  goal === dailyGoal ? 'settings-goal__option--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={goal === dailyGoal}
                onClick={() => setDailyGoal(goal)}
              >
                {goal}
              </button>
            ))}
          </div>
        </label>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Volume2 size={16} aria-hidden="true" /> Guided tour
        </h2>
        <p className="settings-note">
          Repeat the "Try it yourself" tour whenever you like — it walks you through every feature,
          one real action at a time.
        </p>
        <Button
          variant="primary"
          block
          onClick={() => {
            startGuidedTour()
            navigate({ name: 'tour' })
          }}
        >
          <PartyPopper size={16} aria-hidden="true" /> Repeat the guided tour
        </Button>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Database size={16} aria-hidden="true" /> Data & privacy
        </h2>
        <p className="settings-note">
          100% local: your progress never leaves this device. Copy or download a backup to move it
          elsewhere.
        </p>
        <div className="settings-data">
          <Button variant="secondary" block onClick={() => navigate({ name: 'backup' })}>
            <Database size={16} aria-hidden="true" /> Back up or restore progress
          </Button>
          <Button variant="secondary" block onClick={() => navigate({ name: 'data' })}>
            <BarChart3 size={16} aria-hidden="true" /> Analytics &amp; telemetry
          </Button>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Info size={16} aria-hidden="true" /> About
        </h2>
        <p className="settings-note">
          Aura v{APP_VERSION} — free, open source (MIT) and 100% local. Your progress never leaves
          this device.
        </p>
        <div className="settings-data">
          <Button variant="secondary" block onClick={() => navigate({ name: 'about' })}>
            <Info size={16} aria-hidden="true" /> Version &amp; changelog
          </Button>
        </div>
      </section>
    </div>
  )
}
