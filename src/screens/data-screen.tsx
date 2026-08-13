import {
  Activity,
  ArrowLeft,
  Check,
  Copy,
  Database,
  Download,
  FileJson,
  Trash2,
} from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { Button } from '@/components/button'
import { bestHourLabel, usageProfile } from '@/engine/insights'
import { playSound } from '@/engine/sounds'
import { formatDuration } from '@/engine/stats'
import {
  getTelemetry,
  resetTelemetry,
  serializeTelemetry,
  subscribe,
  telemetryStorageBytes,
  totalScreenSeconds,
} from '@/engine/telemetry'
import { useAuraStore } from '@/state/store'

export function DataScreen({
  onBack,
  onOpenBackup,
}: {
  onBack: () => void
  onOpenBackup: () => void
}) {
  const telemetry = useSyncExternalStore(subscribe, getTelemetry)
  const totalCorrect = useAuraStore((state) => state.totalCorrect)
  const totalWrong = useAuraStore((state) => state.totalWrong)
  const learnedWords = useAuraStore((state) => state.learnedWords)
  const readingWpmTotal = useAuraStore((state) => state.readingWpmTotal)
  const readingWpmCount = useAuraStore((state) => state.readingWpmCount)
  const libraryProgress = useAuraStore((state) => state.libraryProgress)
  const profile = useAuraStore((state) => state.profile)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    playSound('page')
  }, [])

  const payload = serializeTelemetry()
  const bytes = telemetryStorageBytes()
  const totalSeconds = totalScreenSeconds(telemetry)

  const learnerProfile = usageProfile(telemetry, {
    totalCorrect,
    totalWrong,
    learnedWords: learnedWords.length,
    readingWpmTotal,
    readingWpmCount,
    libraryProgress,
    joinedAt: profile.joinedAt,
  })

  const recentEvents = telemetry.events.slice(-40).toReversed()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      playSound('correct')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      playSound('wrong')
    }
  }

  const download = () => {
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `aura-telemetry-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    playSound('correct')
  }

  return (
    <div className="data-screen">
      <header className="book-screen__header">
        <button type="button" className="lesson-screen__close" aria-label="Back" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div>
          <h1 className="book-screen__title">Analytics &amp; data</h1>
          <p className="book-screen__author">Everything Aura tracks about your learning</p>
        </div>
      </header>

      <div className="book-screen__facts">
        <span>~{formatBytes(bytes)} stored</span>
        <span>{telemetry.sessions} sessions</span>
        <span>{telemetry.activeDays.length} active days</span>
        <span>{formatDuration(totalSeconds)} in app</span>
      </div>

      <section className="result-section">
        <h2 className="section-title">
          <Activity size={18} aria-hidden="true" /> Your profile (inferred)
        </h2>
        <div className="stats-box-grid">
          <StatBox label="Main activity" value={learnerProfile.dominantActivity ?? '—'} />
          <StatBox label="Most active at" value={bestHourLabel(learnerProfile.bestHour)} />
          <StatBox label="Days per week" value={String(learnerProfile.daysPerWeek)} />
          <StatBox label="Avg session" value={avgLabel(learnerProfile.avgSessionMinutes)} />
        </div>
        {learnerProfile.readingWpm !== undefined && (
          <p className="skill-bar__detail">Reading speed: {learnerProfile.readingWpm} wpm</p>
        )}
        {learnerProfile.avgResponseMs !== undefined && (
          <p className="skill-bar__detail">
            Average answer time: {formatAnswerTime(learnerProfile.avgResponseMs)}
          </p>
        )}
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <Download size={18} aria-hidden="true" /> Export telemetry
        </h2>
        <p className="screen-subtitle">
          The complete raw log (every tracked event) plus the cumulative counters, as JSON — for
          your own analysis.
        </p>
        <div className="backup-actions">
          <Button variant="primary" block onClick={() => void copy()}>
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            {copied ? 'Copied to clipboard' : 'Copy JSON'}
          </Button>
          <Button variant="secondary" block onClick={download}>
            <Download size={16} aria-hidden="true" /> Download JSON
          </Button>
        </div>
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <FileJson size={18} aria-hidden="true" /> Recent events
        </h2>
        <details className="data-raw">
          <summary>
            Last {recentEvents.length} events · {telemetry.events.length.toLocaleString('en-US')} in
            the buffer
          </summary>
          <pre className="data-raw__pre">{JSON.stringify(recentEvents, null, 1)}</pre>
        </details>
        <p className="skill-bar__detail">
          Counters are cumulative forever; the raw event buffer keeps the most recent{' '}
          {telemetry.events.length} of a capped 2000.
        </p>
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <Database size={18} aria-hidden="true" /> Manage data
        </h2>
        <Button variant="secondary" block onClick={onOpenBackup}>
          <Database size={16} aria-hidden="true" /> Progress backup &amp; restore
        </Button>
        <div className="data-actions">
          <Button variant="danger" block onClick={clearTelemetryData}>
            <Trash2 size={16} aria-hidden="true" /> Reset telemetry
          </Button>
        </div>
        <p className="skill-bar__detail">
          Reset only deletes the tracked usage data — your lessons, words, reading progress and
          achievements stay untouched.
        </p>
      </section>
    </div>
  )
}

function clearTelemetryData(): void {
  if (!window.confirm('Delete all tracked usage data? Your progress is not affected.')) {
    return
  }

  resetTelemetry()
  playSound('success')
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="stats-box">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function avgLabel(minutes: number | undefined): string {
  return minutes === undefined ? '—' : `${minutes} min`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAnswerTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}
