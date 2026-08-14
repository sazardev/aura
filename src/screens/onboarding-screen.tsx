import type { LucideIcon } from 'lucide-react'

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Flame,
  FlaskConical,
  Languages,
  Map,
  RotateCcw,
  Sparkles,
  User,
} from 'lucide-react'
import { useState } from 'react'

import { AvatarIcon } from '@/components/avatar'
import { Button } from '@/components/button'
import { Logo } from '@/components/logo'
import { AGE_BUCKETS, LEARNING_GOALS, NATIVE_LANGUAGES, PROFESSIONS } from '@/engine/profile'
import { ACCENT_PALETTES, DEFAULT_ACCENT } from '@/engine/theme'
import { useHashRoute } from '@/hooks/use-hash-route'
import { type LearningGoal, useAuraStore } from '@/state/store'

type Accent = 'green' | 'blue' | 'yellow' | 'purple' | 'orange' | 'pink'

interface IntroStep {
  kind: 'intro'
  accent: Accent
  icon: LucideIcon
  title: string
  body: string
}

interface SetupStep {
  kind: 'setup'
  id: 'name-age' | 'goal' | 'profession' | 'language' | 'look' | 'theme'
  icon: LucideIcon
  title: string
  body: string
}

type OnboardingStep = IntroStep | SetupStep

const INTRO_STEPS: OnboardingStep[] = [
  {
    kind: 'intro',
    accent: 'green',
    icon: Sparkles,
    title: 'Welcome to Aura',
    body: 'Learn English at full power. A guided course, an offline dictionary, a text analyzer and spaced repetition — all in one place, all on your device.',
  },
  {
    kind: 'intro',
    accent: 'blue',
    icon: Map,
    title: 'Your course path',
    body: 'Progress through the course one lesson at a time. Each lesson teaches new words through seven exercise types — from choosing an answer to speaking out loud.',
  },
  {
    kind: 'intro',
    accent: 'yellow',
    icon: Flame,
    title: 'Earn XP, keep your streak',
    body: 'Every answer counts. Earn XP, keep your day streak alive, protect your hearts and unlock achievements as your skills grow.',
  },
  {
    kind: 'intro',
    accent: 'purple',
    icon: BookOpen,
    title: 'A full dictionary, offline',
    body: 'Look up any word in WordNet plus a bank of 3,885 common words, with real frequencies and pronunciation. Save words to build your vocabulary.',
  },
  {
    kind: 'intro',
    accent: 'orange',
    icon: FlaskConical,
    title: 'Understand any text',
    body: 'Paste text or open a TXT, Markdown or PDF file to get readability scores, word difficulty, parts of speech and practical notes.',
  },
  {
    kind: 'intro',
    accent: 'pink',
    icon: RotateCcw,
    title: 'Remember what you learn',
    body: 'Spaced repetition schedules the right reviews at the right time, so the words you meet stick with you for good.',
  },
]

const SETUP_STEPS: SetupStep[] = [
  {
    kind: 'setup',
    id: 'name-age',
    icon: User,
    title: 'Who are you?',
    body: 'Tell us your name and age so Aura can pick the right content for you.',
  },
  {
    kind: 'setup',
    id: 'goal',
    icon: Sparkles,
    title: 'Why are you learning English?',
    body: 'This shapes what Aura recommends — choose what fits you best.',
  },
  {
    kind: 'setup',
    id: 'profession',
    icon: User,
    title: 'What do you do?',
    body: 'Pick your field and Aura unlocks a career vocabulary track for you.',
  },
  {
    kind: 'setup',
    id: 'language',
    icon: Languages,
    title: 'Your native language',
    body: 'Explanations and examples will read more naturally for you.',
  },
  {
    kind: 'setup',
    id: 'look',
    icon: User,
    title: 'Pick your avatar',
    body: 'This is how you look across the app. You can change it later.',
  },
  {
    kind: 'setup',
    id: 'theme',
    icon: Sparkles,
    title: 'Pick your color theme',
    body: 'Recolor the whole app to match your style.',
  },
]

const ALL_STEPS: OnboardingStep[] = [...INTRO_STEPS, ...SETUP_STEPS]

const AVATAR_IDS = [
  'Bird',
  'Cat',
  'Dog',
  'Rabbit',
  'Turtle',
  'Star',
  'Sun',
  'Rocket',
  'Crown',
  'Flame',
  'Fish',
  'Bug',
  'Squirrel',
  'Ghost',
  'Moon',
  'Heart',
  'TreePine',
  'Flower',
  'Plane',
  'Sparkles',
]

const AVATAR_COLORS = [
  '#58cc02',
  '#1cb0f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#06b6d4',
  '#84cc16',
  '#e11d48',
  '#d946ef',
  '#64748b',
]

export function OnboardingScreen() {
  const profile = useAuraStore((state) => state.profile)
  const accent = useAuraStore((state) => state.accent)
  const setProfileName = useAuraStore((state) => state.setProfileName)
  const setProfileAge = useAuraStore((state) => state.setProfileAge)
  const setProfileGoal = useAuraStore((state) => state.setProfileGoal)
  const setProfileNativeLanguage = useAuraStore((state) => state.setProfileNativeLanguage)
  const setProfileProfession = useAuraStore((state) => state.setProfileProfession)
  const setProfileAvatar = useAuraStore((state) => state.setProfileAvatar)
  const setProfileAvatarColor = useAuraStore((state) => state.setProfileAvatarColor)
  const setAccent = useAuraStore((state) => state.setAccent)
  const completeOnboarding = useAuraStore((state) => state.completeOnboarding)
  const startGuidedTour = useAuraStore((state) => state.startGuidedTour)
  const { navigate } = useHashRoute()

  const [index, setIndex] = useState(0)
  const [name, setName] = useState(profile.name)
  const [age, setAge] = useState<number | undefined>(profile.age)
  const [goal, setGoal] = useState<LearningGoal | undefined>(profile.goal)
  const [profession, setProfession] = useState<string | undefined>(profile.profession)
  const [nativeLanguage, setNativeLanguage] = useState<string | undefined>(profile.nativeLanguage)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor)
  const [theme, setTheme] = useState(accent || DEFAULT_ACCENT)

  const step = ALL_STEPS[index]!
  const isFirst = index === 0
  const isLast = index === ALL_STEPS.length - 1

  const applySetup = () => {
    if (name.trim().length > 0) setProfileName(name.trim())
    if (age !== undefined) setProfileAge(age)
    if (goal !== undefined) setProfileGoal(goal)
    if (profession !== undefined) setProfileProfession(profession)
    if (nativeLanguage !== undefined && nativeLanguage.length > 0) {
      setProfileNativeLanguage(nativeLanguage)
    }
    setProfileAvatar(avatar)
    setProfileAvatarColor(avatarColor)
    setAccent(theme)
  }

  const finish = () => {
    applySetup()
    startGuidedTour()
    navigate({ name: 'tour' })
  }

  const goNext = () => {
    if (isLast) {
      finish()
    } else {
      setIndex((current) => current + 1)
    }
  }

  const goBack = () => {
    if (!isFirst) setIndex((current) => current - 1)
  }

  return (
    <div className="onboarding">
      <header className="onboarding__header">
        <Logo size={26} />
        <span className="onboarding__count">
          {index + 1} of {ALL_STEPS.length}
        </span>
        {!isLast && (
          <button type="button" className="onboarding__skip" onClick={completeOnboarding}>
            Skip
          </button>
        )}
      </header>

      <main className="onboarding__body" key={stepKey(step)} aria-label={step.title}>
        {step.kind === 'intro' ? (
          <IntroBody step={step} />
        ) : (
          <SetupBody
            step={step}
            name={name}
            age={age}
            goal={goal}
            profession={profession}
            nativeLanguage={nativeLanguage}
            avatar={avatar}
            avatarColor={avatarColor}
            theme={theme}
            onName={setName}
            onAge={setAge}
            onGoal={setGoal}
            onProfession={setProfession}
            onNativeLanguage={setNativeLanguage}
            onAvatar={setAvatar}
            onAvatarColor={setAvatarColor}
            onTheme={setTheme}
          />
        )}
      </main>

      <footer className="onboarding__footer">
        <div className="onboarding__dots" aria-hidden="true">
          {ALL_STEPS.map((item) => (
            <span
              key={item.kind === 'intro' ? item.title : item.id}
              className={['onboarding__dot', item === step ? 'onboarding__dot--active' : '']
                .filter(Boolean)
                .join(' ')}
            />
          ))}
        </div>
        <div className="onboarding__actions">
          {!isFirst && (
            <Button variant="ghost" onClick={goBack}>
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </Button>
          )}
          <Button
            variant="primary"
            onClick={goNext}
            disabled={
              step.kind === 'setup' && !setupValid(step, { name, age, goal, nativeLanguage })
            }
          >
            {isLast ? 'Start learning' : 'Continue'} <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </footer>
    </div>
  )
}

function stepKey(step: OnboardingStep): string {
  return step.kind === 'intro' ? `intro-${step.title}` : `setup-${step.id}`
}

function IntroBody({ step }: { step: IntroStep }) {
  const Icon = step.icon
  return (
    <>
      <span className={`onboarding__icon onboarding__icon--${step.accent}`}>
        <Icon size={36} aria-hidden="true" />
      </span>
      <h1 className="onboarding__title">{step.title}</h1>
      <p className="onboarding__text">{step.body}</p>
    </>
  )
}

interface SetupBodyProps {
  step: SetupStep
  name: string
  age: number | undefined
  goal: LearningGoal | undefined
  profession: string | undefined
  nativeLanguage: string | undefined
  avatar: string
  avatarColor: string
  theme: string
  onName: (value: string) => void
  onAge: (value: number | undefined) => void
  onGoal: (value: LearningGoal) => void
  onProfession: (value: string) => void
  onNativeLanguage: (value: string) => void
  onAvatar: (value: string) => void
  onAvatarColor: (value: string) => void
  onTheme: (value: string) => void
}

function SetupBody({
  step,
  name,
  age,
  goal,
  profession,
  nativeLanguage,
  avatar,
  avatarColor,
  theme,
  onName,
  onAge,
  onGoal,
  onProfession,
  onNativeLanguage,
  onAvatar,
  onAvatarColor,
  onTheme,
}: SetupBodyProps) {
  return (
    <>
      <h1 className="onboarding__title">{step.title}</h1>
      <p className="onboarding__text">{step.body}</p>

      {step.id === 'name-age' && (
        <div className="setup-form">
          <label className="setup-field">
            <span>Your name</span>
            <input
              type="text"
              className="exercise-input"
              value={name}
              maxLength={20}
              placeholder="Learner"
              onChange={(event) => onName(event.target.value)}
            />
          </label>
          <label className="setup-field">
            <span>Your age</span>
            <select
              className="settings-select"
              value={age?.toString() ?? ''}
              onChange={(event) =>
                onAge(event.target.value === '' ? undefined : Number(event.target.value))
              }
            >
              <option value="">Prefer not to say</option>
              {AGE_BUCKETS.map((bucket) => (
                <option key={bucket.value} value={bucket.value}>
                  {bucket.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {step.id === 'goal' && (
        <div className="setup-goals">
          {LEARNING_GOALS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={['setup-goal', goal === item.id ? 'setup-goal--selected' : '']
                .filter(Boolean)
                .join(' ')}
              aria-pressed={goal === item.id}
              onClick={() => onGoal(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </button>
          ))}
        </div>
      )}

      {step.id === 'profession' && (
        <div className="setup-goals">
          {PROFESSIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={['setup-goal', profession === item.id ? 'setup-goal--selected' : '']
                .filter(Boolean)
                .join(' ')}
              aria-pressed={profession === item.id}
              onClick={() => onProfession(item.id)}
            >
              <strong>{item.label}</strong>
              <span>Unlocks a career vocabulary track</span>
            </button>
          ))}
        </div>
      )}

      {step.id === 'language' && (
        <label className="setup-field">
          <span>Your native language</span>
          <select
            className="settings-select"
            value={nativeLanguage ?? ''}
            onChange={(event) => onNativeLanguage(event.target.value)}
          >
            <option value="">Select…</option>
            {NATIVE_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
      )}

      {step.id === 'look' && (
        <div className="setup-avatar">
          <div className="avatar-grid">
            {AVATAR_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={['avatar-option', id === avatar ? 'avatar-option--selected' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`${id} avatar`}
                aria-pressed={id === avatar}
                onClick={() => onAvatar(id)}
              >
                <AvatarIcon name={id} size={24} color={avatarColor} />
              </button>
            ))}
          </div>
          <div className="avatar-colors">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={['avatar-color', color === avatarColor ? 'avatar-color--selected' : '']
                  .filter(Boolean)
                  .join(' ')}
                style={{ background: color }}
                aria-label={`Avatar color ${color}`}
                aria-pressed={color === avatarColor}
                onClick={() => onAvatarColor(color)}
              />
            ))}
          </div>
        </div>
      )}

      {step.id === 'theme' && (
        <div className="setup-themes">
          {ACCENT_PALETTES.map((palette) => (
            <button
              key={palette.id}
              type="button"
              className={['setup-theme', theme === palette.id ? 'setup-theme--selected' : '']
                .filter(Boolean)
                .join(' ')}
              aria-pressed={theme === palette.id}
              onClick={() => onTheme(palette.id)}
            >
              <span className="setup-theme__swatch" style={{ background: palette.preview }} />
              <span>{palette.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function setupValid(
  step: SetupStep,
  values: {
    name: string
    age: number | undefined
    goal: LearningGoal | undefined
    nativeLanguage: string | undefined
  },
): boolean {
  switch (step.id) {
    case 'goal': {
      return values.goal !== undefined
    }
    case 'language': {
      return (values.nativeLanguage?.length ?? 0) > 0
    }
    default: {
      return true
    }
  }
}
