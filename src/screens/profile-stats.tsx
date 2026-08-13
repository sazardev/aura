import { Activity, BarChart3, BookOpen, Clock3, Languages, PenLine, Sprout } from 'lucide-react'
import { type ReactNode, useEffect, useSyncExternalStore } from 'react'

import { ProgressBar } from '@/components/progress-bar'
import { dailyBriefing } from '@/engine/briefing'
import {
  bestHourLabel,
  describeLearner,
  favoriteBookLabel,
  learnerIdentity,
  predictNextScreen,
  topTransitions,
  usageProfile,
} from '@/engine/insights'
import { lessonById } from '@/engine/lessons'
import { LIBRARY } from '@/engine/library'
import { accuracyPercent, formatDuration } from '@/engine/stats'
import {
  averageAnswerMs,
  flushTelemetry,
  getTelemetry,
  subscribe,
  totalScreenSeconds,
} from '@/engine/telemetry'
import { useAuraStore, useDueCardCount } from '@/state/store'

const SCREEN_LABELS: Record<string, string> = {
  home: 'Home',
  lesson: 'Lessons',
  'grammar-lesson': 'Grammar lessons',
  book: 'Book details',
  read: 'Reading',
  library: 'Library',
  dictionary: 'Dictionary',
  analyzer: 'Analyzer',
  profile: 'Profile',
  review: 'Review',
  speak: 'Speaking',
  write: 'Writing',
  dictation: 'Dictation',
  dialogue: 'Dialogues',
  grammar: 'Grammar',
  backup: 'Backup',
}

function topEntries(map: Record<string, number>, limit: number): { key: string; value: number }[] {
  return Object.entries(map)
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }))
}

function bookTitle(bookId: string): string {
  return LIBRARY.find((book) => book.id === bookId)?.title ?? bookId
}

function lessonTitle(lessonId: string): string {
  return lessonById(lessonId)?.title ?? lessonId
}

function StatRow({
  icon,
  label,
  value,
  detail,
  percent,
}: {
  icon?: ReactNode
  label: string
  value: string
  detail?: string
  percent?: number
}) {
  return (
    <div className="skill-bar">
      <div className="skill-bar__head">
        <span className="skill-bar__label">
          {icon}
          {label}
        </span>
        <strong>{value}</strong>
      </div>
      {percent !== undefined && <ProgressBar value={percent} height={8} />}
      {detail !== undefined && <p className="skill-bar__detail">{detail}</p>}
    </div>
  )
}

export function ProfileStats() {
  const telemetry = useSyncExternalStore(subscribe, getTelemetry)

  const totalCorrect = useAuraStore((state) => state.totalCorrect)
  const totalWrong = useAuraStore((state) => state.totalWrong)
  const learnedWords = useAuraStore((state) => state.learnedWords)
  const readingWpmTotal = useAuraStore((state) => state.readingWpmTotal)
  const readingWpmCount = useAuraStore((state) => state.readingWpmCount)
  const libraryProgress = useAuraStore((state) => state.libraryProgress)
  const profile = useAuraStore((state) => state.profile)
  const xpToday = useAuraStore((state) => state.daily.xp)
  const dailyGoal = useAuraStore((state) => state.dailyGoal)
  const lastActiveDay = useAuraStore((state) => state.lastActiveDay)
  const streak = useAuraStore((state) => state.streak)
  const completedLessons = useAuraStore((state) => state.completedLessons)
  const dueCount = useDueCardCount()

  useEffect(() => {
    flushTelemetry()
  }, [])

  const learnerProfile = usageProfile(telemetry, {
    totalCorrect,
    totalWrong,
    learnedWords: learnedWords.length,
    readingWpmTotal,
    readingWpmCount,
    libraryProgress,
    joinedAt: profile.joinedAt,
  })
  const identity = learnerIdentity(
    {
      ...(profile.age !== undefined && { age: profile.age }),
      ...(profile.goal !== undefined && { goal: profile.goal }),
      ...(profile.nativeLanguage !== undefined && { nativeLanguage: profile.nativeLanguage }),
    },
    learnerProfile,
  )
  const prediction = predictNextScreen(telemetry, telemetry.currentScreen ?? 'home')
  const habits = topTransitions(telemetry)

  const briefing = dailyBriefing({
    telemetry,
    totalCorrect,
    totalWrong,
    learnedWords: learnedWords.length,
    readingWpmTotal,
    readingWpmCount,
    joinedAt: profile.joinedAt,
    libraryProgress,
    xpToday,
    dailyGoal,
    lastActiveDay,
    streak,
    dueCount,
    completedLessons,
    profile: {
      ...(profile.age !== undefined && { age: profile.age }),
      ...(profile.goal !== undefined && { goal: profile.goal }),
      ...(profile.nativeLanguage !== undefined && { nativeLanguage: profile.nativeLanguage }),
    },
  })

  const totalSeconds = totalScreenSeconds(telemetry)
  const timeByScreen = topEntries(telemetry.screenSeconds, 8)
  const views = topEntries(telemetry.screenViews, 6)
  const lookups = topEntries(telemetry.wordLookups, 8)
  const saves = topEntries(telemetry.wordSaves, 5)
  const booksBySections = topEntries(telemetry.bookSections, 6)
  const booksByTime = topEntries(telemetry.bookSeconds, 6)
  const lessons = topEntries(telemetry.lessonAnswers, 8)
  const maxHour = Math.max(1, ...telemetry.hourCounts)

  return (
    <div className="profile-panel">
      <section className="result-section">
        <h2 className="section-title">
          <Activity size={18} aria-hidden="true" /> Insights & predictions
        </h2>
        <div className="stats-box-grid">
          <StatBox label="Age" value={identity.ageLabel || '—'} />
          <StatBox label="Goal" value={identity.goalLabel || '—'} />
          <StatBox label="Native language" value={identity.nativeLanguage ?? '—'} />
          <StatBox label="Main activity" value={learnerProfile.dominantActivity ?? '—'} />
        </div>
        <div className="stats-box-grid">
          <StatBox label="Most active at" value={bestHourLabel(learnerProfile.bestHour)} />
          <StatBox label="Days per week" value={String(learnerProfile.daysPerWeek)} />
          <StatBox label="Avg session" value={formatAvgSession(learnerProfile.avgSessionMinutes)} />
          <StatBox label="New words/day" value={String(learnerProfile.wordPacePerDay)} />
        </div>
        <p className="skill-bar__detail">{describeLearner(identity)}</p>
        {learnerProfile.favoriteGenre !== undefined && (
          <StatRow
            label="Reading taste"
            value={learnerProfile.favoriteGenre}
            {...(learnerProfile.favoriteBookId !== undefined && {
              detail: `Favourite: ${favoriteBookLabel(learnerProfile)}`,
            })}
          />
        )}
        {learnerProfile.favoriteDifficulty !== undefined && (
          <StatRow label="Difficulty sweet spot" value={`${learnerProfile.favoriteDifficulty}/5`} />
        )}
        {learnerProfile.readingWpm !== undefined && (
          <StatRow label="Reading speed" value={`${learnerProfile.readingWpm} wpm`} />
        )}
        <StatRow label="New words per day" value={String(learnerProfile.wordPacePerDay)} />

        {prediction.length > 0 && (
          <>
            <h3 className="stats-subtitle">Predicted next step</h3>
            {prediction.map((entry) => (
              <StatRow
                key={entry.screen}
                label={entry.label}
                value={`${entry.probability}% likely`}
                percent={entry.probability}
              />
            ))}
          </>
        )}
        {habits.length > 0 && (
          <>
            <h3 className="stats-subtitle">Your habits</h3>
            {habits.map((habit) => (
              <StatRow
                key={`${habit.from}>${habit.to}`}
                label={habit.label}
                value={`${habit.count}×`}
              />
            ))}
          </>
        )}
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <Clock3 size={18} aria-hidden="true" /> Forecast & plan
        </h2>
        <div className="stats-box-grid">
          <StatBox label="Streak risk" value={streakLabel(briefing.streakRisk)} />
          <StatBox label="Best time to study" value={briefing.bestTime ?? '—'} />
          <StatBox
            label="Expected session"
            value={formatAvgSession(briefing.expectedSessionMinutes)}
          />
          <StatBox
            label="Vocabulary in 30 days"
            value={briefing.vocabProjection30.toLocaleString('en-US')}
          />
        </div>
        <p className="skill-bar__detail">{briefing.streakMessage}</p>
        <p className="skill-bar__detail">{briefing.goalMessage}</p>
        {briefing.readingWpm !== undefined && (
          <p className="skill-bar__detail">Reading speed: {briefing.readingWpm} wpm</p>
        )}
        {briefing.book !== undefined && (
          <StatRow
            label="Book in progress"
            value={briefing.book.title}
            detail={briefing.book.message}
          />
        )}
        <h3 className="stats-subtitle">Today's plan</h3>
        <ul className="plan-list">
          {briefing.plan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <Activity size={18} aria-hidden="true" /> Totals
        </h2>
        <div className="stats-box-grid">
          <StatBox label="Sessions" value={String(telemetry.sessions)} />
          <StatBox label="Active days" value={String(telemetry.activeDays.length)} />
          <StatBox label="Time in app" value={formatDuration(totalSeconds)} />
          <StatBox label="Events tracked" value={telemetry.events.length.toLocaleString('en-US')} />
        </div>
        <p className="skill-bar__detail">
          First seen {new Date(telemetry.firstSeen).toLocaleDateString('en-US')} · last active{' '}
          {new Date(telemetry.lastSeen).toLocaleDateString('en-US')}
        </p>
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <Clock3 size={18} aria-hidden="true" /> Time by screen
        </h2>
        {timeByScreen.length === 0 ? (
          <p className="skill-bar__detail">No time recorded yet.</p>
        ) : (
          timeByScreen.map((entry) => (
            <StatRow
              key={entry.key}
              label={SCREEN_LABELS[entry.key] ?? entry.key}
              value={formatDuration(entry.value)}
              percent={totalSeconds > 0 ? Math.round((entry.value / totalSeconds) * 100) : 0}
              detail={`${Math.round((entry.value / Math.max(1, totalSeconds)) * 100)}% of total time`}
            />
          ))
        )}
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <BarChart3 size={18} aria-hidden="true" /> Most visited
        </h2>
        {views.map((entry) => (
          <StatRow
            key={entry.key}
            label={SCREEN_LABELS[entry.key] ?? entry.key}
            value={`${entry.value} visits`}
          />
        ))}
        <div className="stats-hours" aria-label="Usage by hour of day">
          {telemetry.hourCounts.map((count, hour) => (
            <div key={hour} className="stats-hours__col" title={`${hour}:00 – ${count} events`}>
              <span
                className="stats-hours__bar"
                style={{ height: `${Math.round((count / maxHour) * 100)}%` }}
              />
              <span className="stats-hours__label">{hour}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <BookOpen size={18} aria-hidden="true" /> Reading
        </h2>
        {booksBySections.length === 0 ? (
          <p className="skill-bar__detail">No reading recorded yet.</p>
        ) : (
          booksBySections.map((entry) => (
            <StatRow
              key={entry.key}
              label={bookTitle(entry.key)}
              value={`${entry.value} sections`}
              detail={`${formatDuration(telemetry.bookSeconds[entry.key] ?? 0)} reading`}
            />
          ))
        )}
        {booksByTime.length > 0 && (
          <>
            <h3 className="stats-subtitle">Most time in</h3>
            {booksByTime.map((entry) => (
              <StatRow
                key={entry.key}
                label={bookTitle(entry.key)}
                value={formatDuration(entry.value)}
              />
            ))}
          </>
        )}
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <Languages size={18} aria-hidden="true" /> Lookups & saved words
        </h2>
        <h3 className="stats-subtitle">Most looked-up words</h3>
        {lookups.length === 0 ? (
          <p className="skill-bar__detail">No lookups yet.</p>
        ) : (
          lookups.map((entry) => (
            <StatRow key={entry.key} label={entry.key} value={`${entry.value}×`} />
          ))
        )}
        <h3 className="stats-subtitle">Most saved to vocabulary</h3>
        {saves.length === 0 ? (
          <p className="skill-bar__detail">Nothing saved yet.</p>
        ) : (
          saves.map((entry) => (
            <StatRow key={entry.key} label={entry.key} value={`${entry.value}×`} />
          ))
        )}
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <Sprout size={18} aria-hidden="true" /> Lessons
        </h2>
        {lessons.length === 0 ? (
          <p className="skill-bar__detail">No lessons attempted yet.</p>
        ) : (
          lessons.map((entry) => {
            const answers = telemetry.lessonAnswers[entry.key] ?? 0
            const correct = telemetry.lessonCorrect[entry.key] ?? 0
            const completes = telemetry.lessonCompletes[entry.key] ?? 0
            return (
              <StatRow
                key={entry.key}
                label={lessonTitle(entry.key)}
                value={`${accuracyPercent(correct, answers - correct)}%`}
                percent={accuracyPercent(correct, answers - correct)}
                detail={`${answers} answers · ${completes} completed`}
              />
            )
          })
        )}
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <PenLine size={18} aria-hidden="true" /> Activities
        </h2>
        <StatRow
          label="Avg answer time"
          value={formatAnswerTime(averageAnswerMs())}
          detail="Lessons, reviews, reader quiz & grammar"
        />
        <StatRow
          label="Reader quiz"
          value={quizAccuracy(telemetry.readerQuizAnswers, telemetry.readerQuizCorrect)}
          detail={`${telemetry.readerQuizAnswers} answers`}
        />
        <StatRow
          label="Grammar"
          value={quizAccuracy(telemetry.grammarAnswers, telemetry.grammarCorrect)}
          detail={`${telemetry.grammarAnswers} answers`}
        />
        <StatRow label="Reviews" value={String(telemetry.reviews)} />
        <StatRow label="Speaking attempts" value={String(telemetry.speakAttempts)} />
        <StatRow
          label="Writing attempts"
          value={String(telemetry.writeAttempts)}
          detail={`${telemetry.writeChars.toLocaleString('en-US')} characters written`}
        />
        <StatRow label="Analyzer runs" value={String(telemetry.analysisRuns)} />
        <StatRow label="Document imports" value={String(telemetry.imports)} />
      </section>
    </div>
  )
}

function formatAnswerTime(ms: number | undefined): string {
  if (ms === undefined) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function quizAccuracy(answers: number, correct: number): string {
  if (answers === 0) return '—'
  return `${Math.round((correct / answers) * 100)}%`
}

function formatAvgSession(minutes: number | undefined): string {
  return minutes === undefined ? '—' : `${minutes} min`
}

function streakLabel(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low': {
      return 'Safe'
    }
    case 'medium': {
      return 'At risk'
    }
    default: {
      return 'Danger'
    }
  }
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="stats-box">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
