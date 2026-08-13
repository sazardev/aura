import type { LucideIcon } from 'lucide-react'

import {
  Activity,
  BarChart3,
  BookOpen,
  Clock3,
  Flame,
  Gauge,
  GraduationCap,
  History,
  Medal,
  Mic,
  PenLine,
  Target,
  Trophy,
  User,
  Zap,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { AvatarIcon } from '@/components/avatar'
import { ProgressBar } from '@/components/progress-bar'
import { UiIcon } from '@/components/ui-icon'
import { ACHIEVEMENTS } from '@/engine/achievements'
import { estimateCefrFromWords } from '@/engine/cefr'
import { LIBRARY } from '@/engine/library'
import { AGE_BUCKETS, LEARNING_GOALS, NATIVE_LANGUAGES, PROFESSIONS } from '@/engine/profile'
import {
  activityDays,
  bookCompletion,
  formatDuration,
  skillSummary,
  srsMastery,
  weakWordsSorted,
  weekActivity,
  wordsByDay,
} from '@/engine/stats'
import { levelFromXp } from '@/engine/xp'
import { localDateKey } from '@/lib/date'
import { ProfileStats } from '@/screens/profile-stats'
import { useAuraStore } from '@/state/store'

type ProfileTab = 'overview' | 'history' | 'achievements' | 'stats'

const AVATAR_IDS = [
  'Bird',
  'Bug',
  'Cat',
  'Crown',
  'Dog',
  'Fish',
  'Flame',
  'Ghost',
  'Moon',
  'Rabbit',
  'Rocket',
  'Squirrel',
  'Star',
  'Sun',
  'Turtle',
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

const TABS: { id: ProfileTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'history', label: 'History', icon: History },
  { id: 'achievements', label: 'Achievements', icon: Medal },
  { id: 'stats', label: 'Statistics', icon: Activity },
]

export function ProfileScreen({
  tab,
  onSelectTab,
}: {
  tab?: ProfileTab
  onSelectTab: (tab: ProfileTab) => void
}) {
  const profile = useAuraStore((state) => state.profile)
  const setProfileName = useAuraStore((state) => state.setProfileName)
  const setProfileAvatar = useAuraStore((state) => state.setProfileAvatar)
  const setProfileAvatarColor = useAuraStore((state) => state.setProfileAvatarColor)
  const setProfileAge = useAuraStore((state) => state.setProfileAge)
  const setProfileGoal = useAuraStore((state) => state.setProfileGoal)
  const setProfileNativeLanguage = useAuraStore((state) => state.setProfileNativeLanguage)
  const setProfileProfession = useAuraStore((state) => state.setProfileProfession)
  const xp = useAuraStore((state) => state.xp)
  const streak = useAuraStore((state) => state.streak)
  const totalCorrect = useAuraStore((state) => state.totalCorrect)
  const totalWrong = useAuraStore((state) => state.totalWrong)
  const learnedWords = useAuraStore((state) => state.learnedWords)
  const cards = useAuraStore((state) => state.cards)
  const achievements = useAuraStore((state) => state.achievements)
  const history = useAuraStore((state) => state.history)
  const weakWords = useAuraStore((state) => state.weakWords)
  const libraryProgress = useAuraStore((state) => state.libraryProgress)
  const importedBooks = useAuraStore((state) => state.importedBooks)
  const daily = useAuraStore((state) => state.daily)
  const dailyGoal = useAuraStore((state) => state.dailyGoal)
  const readingSeconds = useAuraStore((state) => state.readingSeconds)
  const readingWpmTotal = useAuraStore((state) => state.readingWpmTotal)
  const readingWpmCount = useAuraStore((state) => state.readingWpmCount)
  const speakingSessions = useAuraStore((state) => state.speakingSessions)
  const speakingPrompts = useAuraStore((state) => state.speakingPrompts)
  const speakingGood = useAuraStore((state) => state.speakingGood)
  const writingAttempts = useAuraStore((state) => state.writingAttempts)
  const writingBest = useAuraStore((state) => state.writingBest)
  const writingTotalScore = useAuraStore((state) => state.writingTotalScore)

  const activeTab = tab ?? 'overview'
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(profile.name)

  const level = levelFromXp(xp)
  const accuracy =
    totalCorrect + totalWrong > 0
      ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100)
      : 0
  const cardValues = Object.values(cards)
  const mastery = srsMastery(cardValues)
  const summary = skillSummary({
    speakingSessions,
    speakingPrompts,
    speakingGood,
    writingAttempts,
    writingBest,
    writingTotalScore,
    readingSeconds,
    readingWpmTotal,
    readingWpmCount,
  })
  const week = weekActivity(history, localDateKey(), 7)
  const weak = weakWordsSorted(weakWords, 5)

  const commitName = () => {
    const trimmed = nameDraft.trim()
    if (trimmed.length > 0 && trimmed !== profile.name) setProfileName(trimmed)
  }

  return (
    <div className="profile-screen">
      <header className="profile-hero">
        <button
          type="button"
          className="profile-avatar"
          aria-label="Choose your avatar"
          onClick={() => setAvatarOpen(true)}
        >
          <ProfileAvatar name={profile.avatar} size={56} color={profile.avatarColor} />
          <span className="profile-avatar__edit">Edit</span>
        </button>
        <div className="profile-hero__identity">
          <input
            type="text"
            className="profile-name"
            value={nameDraft}
            maxLength={20}
            aria-label="Your name"
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              }
            }}
          />
          <p className="profile-hero__meta">
            Learning since {joinedDate(profile.joinedAt)} · {learnedWords.length} words
          </p>
        </div>
        <div className="profile-hero__chips">
          <Chip icon={<Medal size={14} aria-hidden="true" />} label={`Level ${level.level}`} />
          <Chip icon={<Flame size={14} aria-hidden="true" />} label={`${streak} day streak`} />
          <Chip icon={<Target size={14} aria-hidden="true" />} label={`${accuracy}% accuracy`} />
          <Chip
            icon={<GraduationCap size={14} aria-hidden="true" />}
            label={`CEFR ~${estimateCefrFromWords(learnedWords)}`}
          />
        </div>
      </header>

      <nav className="profile-tabs" aria-label="Profile sections">
        {TABS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={['profile-tab', isActive ? 'profile-tab--active' : '']
                .filter(Boolean)
                .join(' ')}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={16} aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {activeTab === 'overview' && (
        <div className="profile-panel">
          <section className="result-section">
            <h2 className="section-title">
              <BarChart3 size={18} aria-hidden="true" /> Last 7 days
            </h2>
            <WeekBars week={week} />
          </section>

          <section className="result-section">
            <h2 className="section-title">
              <User size={18} aria-hidden="true" /> About you
            </h2>
            <label className="about-row">
              <span>
                <strong>Age</strong>
                <small>We adjust reading difficulty and content for it</small>
              </span>
              <select
                className="settings-select"
                value={profile.age?.toString() ?? ''}
                onChange={(event) => setProfileAge(Number(event.target.value))}
              >
                <option value="">Prefer not to say</option>
                {AGE_BUCKETS.map((bucket) => (
                  <option key={bucket.value} value={bucket.value}>
                    {bucket.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="about-goals">
              <span className="about-goals__label">
                <strong>Why are you learning English?</strong>
              </span>
              <div className="about-goals__chips">
                {LEARNING_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    className={[
                      'about-goal',
                      goal.id === profile.goal ? 'about-goal--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={goal.id === profile.goal}
                    onClick={() => setProfileGoal(goal.id)}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
              <p className="about-goals__hint">
                {profile.goal === undefined
                  ? 'Pick a goal so Aura can recommend the right practice.'
                  : LEARNING_GOALS.find((goal) => goal.id === profile.goal)?.hint}
              </p>
            </div>

            <label className="about-row">
              <span>
                <strong>Profession</strong>
                <small>Unlocks a career vocabulary track on your Home</small>
              </span>
              <select
                className="settings-select"
                value={profile.profession ?? ''}
                onChange={(event) => setProfileProfession(event.target.value)}
              >
                <option value="">Not set</option>
                {PROFESSIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="about-row">
              <span>
                <strong>Native language</strong>
                <small>Explanations and examples read more naturally</small>
              </span>
              <select
                className="settings-select"
                value={profile.nativeLanguage ?? ''}
                onChange={(event) => setProfileNativeLanguage(event.target.value)}
              >
                <option value="">Select…</option>
                {NATIVE_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="result-section">
            <h2 className="section-title">
              <Zap size={18} aria-hidden="true" /> Skills
            </h2>
            <SkillBar
              icon={<Mic size={16} aria-hidden="true" />}
              label="Speaking"
              value={`${summary.speaking.goodPercent}% good`}
              percent={summary.speaking.goodPercent}
              detail={`${summary.speaking.sessions} sessions · ${summary.speaking.prompts} prompts`}
            />
            <SkillBar
              icon={<PenLine size={16} aria-hidden="true" />}
              label="Writing"
              value={`${summary.writing.average}/10 avg`}
              percent={Math.round((summary.writing.average / 10) * 100)}
              detail={`${summary.writing.attempts} attempts · best ${summary.writing.best}/10`}
            />
            <SkillBar
              icon={<BookOpen size={16} aria-hidden="true" />}
              label="Reading"
              value={
                summary.reading.wpm === undefined
                  ? `${summary.reading.minutes} min`
                  : `${summary.reading.wpm} wpm`
              }
              percent={Math.min(100, Math.round((summary.reading.minutes / 60) * 100))}
              detail={`${formatDuration(readingSeconds)} total`}
            />
          </section>

          <section className="result-section">
            <h2 className="section-title">
              <Trophy size={18} aria-hidden="true" /> Word mastery
            </h2>
            <MasteryRow label="New" count={mastery.fresh} color="var(--aura-blue)" />
            <MasteryRow label="Learning" count={mastery.learning} color="var(--aura-orange)" />
            <MasteryRow label="Established" count={mastery.established} color="var(--aura-green)" />
            <p className="profile-note">
              {mastery.lapsed} total lapses — words you've relearned after forgetting.
            </p>
          </section>

          <section className="result-section">
            <h2 className="section-title">
              <Target size={18} aria-hidden="true" /> Today's goal
            </h2>
            <div className="stats-goal">
              <ProgressBar
                value={Math.min(100, (daily.xp / dailyGoal) * 100)}
                height={12}
                color="var(--aura-yellow)"
              />
              <span>
                {daily.xp}/{dailyGoal} XP · {daily.lessons} lessons · {daily.cards} reviews
              </span>
            </div>
          </section>

          {weak.length > 0 && (
            <section className="result-section">
              <h2 className="section-title">
                <Target size={18} aria-hidden="true" /> Focus words
              </h2>
              <ul className="stats-weak">
                {weak.map((item) => (
                  <li key={item.word} className="stats-weak__row">
                    <strong>{item.word}</strong>
                    <span>{item.count} misses</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="profile-panel">
          <section className="result-section">
            <h2 className="section-title">
              <Clock3 size={18} aria-hidden="true" /> Activity
            </h2>
            {activityDays(history).length === 0 ? (
              <p className="screen-subtitle">
                No activity yet — finish a lesson, review a card or read a page to start your log.
              </p>
            ) : (
              <ul className="history-list">
                {activityDays(history).map((day) => (
                  <li key={day.date} className="history-row">
                    <span className="history-row__date">{day.dateLabel}</span>
                    <span className="history-row__stats">
                      <em>{day.xp} XP</em>
                      <span>{day.lessons} lessons</span>
                      <span>
                        {day.correct}✓ {day.wrong}✗
                      </span>
                      <span>{day.cards} reviews</span>
                      {day.readSeconds > 0 && <span>{formatDuration(day.readSeconds)} read</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="result-section">
            <h2 className="section-title">
              <BookOpen size={18} aria-hidden="true" /> Words learned
            </h2>
            {wordsByDay(cardValues).length === 0 ? (
              <p className="screen-subtitle">Save words from lessons, the dictionary or reading.</p>
            ) : (
              <ul className="words-timeline">
                {wordsByDay(cardValues)
                  .slice(-14)
                  .map((day) => (
                    <li key={day.date}>
                      <span>{humanDate(day.date)}</span>
                      <strong>+{day.count}</strong>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="result-section">
            <h2 className="section-title">
              <Gauge size={18} aria-hidden="true" /> Reading
            </h2>
            <div className="stats-goal">
              <span>
                {formatDuration(readingSeconds)} read ·{' '}
                {summary.reading.wpm === undefined
                  ? 'no speed data yet'
                  : `${summary.reading.wpm} wpm average`}
              </span>
            </div>
            {bookCompletion(
              libraryProgress,
              [...LIBRARY, ...importedBooks].map((book) => ({
                id: book.id,
                title: book.title,
                sections: 'sections' in book ? book.sections : totalSections(book),
              })),
            ).length > 0 && (
              <ul className="book-progress-list">
                {bookCompletion(
                  libraryProgress,
                  [...LIBRARY, ...importedBooks].map((book) => ({
                    id: book.id,
                    title: book.title,
                    sections: 'sections' in book ? book.sections : totalSections(book),
                  })),
                ).map((book) => (
                  <li key={book.bookId}>
                    <div className="book-progress-list__row">
                      <strong>{book.title}</strong>
                      <span>
                        {book.done}/{book.total} · {book.percent}%
                      </span>
                    </div>
                    <ProgressBar value={book.percent} height={6} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="profile-panel">
          <section className="result-section">
            <h2 className="section-title">
              <Medal size={18} aria-hidden="true" /> Achievements
            </h2>
            <p className="stats-progress-line">
              {Object.keys(achievements).length}/{ACHIEVEMENTS.length} unlocked
            </p>
            <div className="achievement-grid">
              {ACHIEVEMENTS.map((achievement) => {
                const unlockedAt = achievements[achievement.id]
                return (
                  <div
                    key={achievement.id}
                    className={[
                      'achievement-card',
                      unlockedAt === undefined ? 'achievement-card--locked' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={achievement.description}
                  >
                    <span className="achievement-card__icon">
                      <UiIcon name={achievement.icon} size={22} />
                    </span>
                    <strong>{achievement.name}</strong>
                    <small>
                      {unlockedAt === undefined
                        ? 'Locked'
                        : `Unlocked ${humanDate(unlockedAt.slice(0, 10))}`}
                    </small>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'stats' && <ProfileStats />}

      {avatarOpen && (
        <div className="settings-sheet__overlay" onClick={() => setAvatarOpen(false)}>
          <section
            className="avatar-picker"
            role="dialog"
            aria-label="Choose an avatar"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Choose your avatar</h2>
            <div className="avatar-grid">
              {AVATAR_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={[
                    'avatar-option',
                    id === profile.avatar ? 'avatar-option--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={id === profile.avatar}
                  onClick={() => {
                    setProfileAvatar(id)
                    setAvatarOpen(false)
                  }}
                >
                  <AvatarIcon name={id} size={24} color={profile.avatarColor} />
                </button>
              ))}
            </div>
            <h2 className="avatar-picker__subtitle">Avatar color</h2>
            <div className="avatar-colors">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={[
                    'avatar-color',
                    color === profile.avatarColor ? 'avatar-color--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ background: color }}
                  aria-label={`Avatar color ${color}`}
                  aria-pressed={color === profile.avatarColor}
                  onClick={() => setProfileAvatarColor(color)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function ProfileAvatar({
  name,
  size,
  color,
}: {
  name: string
  size: number
  color?: string | undefined
}) {
  return (
    <span
      className="profile-avatar__tile"
      style={{
        width: size,
        height: size,
        background: color ?? 'var(--aura-green-soft)',
        color: '#ffffff',
      }}
    >
      <AvatarIcon name={name} size={size} color="#ffffff" />
    </span>
  )
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="profile-chip">
      {icon}
      {label}
    </span>
  )
}

function WeekBars({ week }: { week: { key: string; xp: number }[] }) {
  const maxXp = Math.max(10, ...week.map((day) => day.xp))
  return (
    <>
      <div className="stats-week" aria-label="Experience per day">
        {week.map((day) => (
          <div key={day.key} className="stats-week__day">
            <div className="stats-week__bar">
              <span
                className="stats-week__fill"
                style={{ height: `${(day.xp / maxXp) * 100}%` }}
                title={`${day.xp} XP on ${day.key}`}
              />
            </div>
            <span className="stats-week__label">{weekdayNarrow(day.key)}</span>
          </div>
        ))}
      </div>
      <p className="stats-week__total">
        <strong>{week.reduce((sum, day) => sum + day.xp, 0)} XP</strong> this week
      </p>
    </>
  )
}

function SkillBar({
  icon,
  label,
  value,
  percent,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  percent: number
  detail: string
}) {
  return (
    <div className="skill-bar">
      <div className="skill-bar__head">
        <span className="skill-bar__label">
          {icon} {label}
        </span>
        <strong>{value}</strong>
      </div>
      <ProgressBar value={percent} height={8} />
      <p className="skill-bar__detail">{detail}</p>
    </div>
  )
}

function MasteryRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="mastery-row">
      <span>{label}</span>
      <span className="mastery-row__count" style={{ color }}>
        {count}
      </span>
    </div>
  )
}

function joinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function humanDate(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function weekdayNarrow(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' })
}

function totalSections(book: { chapters: { sections: unknown[] }[] }): number {
  return book.chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0)
}
