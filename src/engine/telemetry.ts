import { localDateKey } from '@/lib/date'

export interface TelemetryEvent {
  t: number
  n: string
  s: string
  m?: Record<string, unknown>
}

export interface DayCount {
  events: number
  lessons: number
  lookups: number
  words: number
  readSeconds: number
}

export interface TelemetryState {
  v: number
  sessionId: string
  sessionStartedAt: number
  sessions: number
  firstSeen: number
  lastSeen: number
  activeDays: string[]
  screenViews: Record<string, number>
  screenSeconds: Record<string, number>
  transitions: Record<string, number>
  hourCounts: number[]
  eventCounts: Record<string, number>
  dayCounts: Record<string, DayCount>
  sessionLengths: number[]
  wordLookups: Record<string, number>
  wordSaves: Record<string, number>
  bookViews: Record<string, number>
  bookSections: Record<string, number>
  bookSeconds: Record<string, number>
  bookWpm: Record<string, { total: number; count: number }>
  lessonStarts: Record<string, number>
  lessonCompletes: Record<string, number>
  lessonAnswers: Record<string, number>
  lessonCorrect: Record<string, number>
  lessonSeconds: Record<string, number>
  answerMsTotal: number
  answerMsCount: number
  readerQuizAnswers: number
  readerQuizCorrect: number
  grammarAnswers: number
  grammarCorrect: number
  reviews: number
  reviewGood: number
  speakAttempts: number
  writeAttempts: number
  writeChars: number
  analysisRuns: number
  imports: number
  currentScreen: string | undefined
  currentScreenAt: number
  events: TelemetryEvent[]
}

const STORAGE_KEY = 'aura-telemetry'
const VERSION = 2
const MAX_EVENTS = 2000
const MAX_SESSION_LENGTHS = 60
const SESSION_GAP_MS = 30 * 60 * 1000

function freshState(): TelemetryState {
  return {
    v: VERSION,
    sessionId: newSessionId(),
    sessionStartedAt: 0,
    sessions: 0,
    firstSeen: 0,
    lastSeen: 0,
    activeDays: [],
    screenViews: {},
    screenSeconds: {},
    transitions: {},
    hourCounts: Array.from({ length: 24 }, () => 0),
    eventCounts: {},
    dayCounts: {},
    sessionLengths: [],
    wordLookups: {},
    wordSaves: {},
    bookViews: {},
    bookSections: {},
    bookSeconds: {},
    bookWpm: {},
    lessonStarts: {},
    lessonCompletes: {},
    lessonAnswers: {},
    lessonCorrect: {},
    lessonSeconds: {},
    answerMsTotal: 0,
    answerMsCount: 0,
    readerQuizAnswers: 0,
    readerQuizCorrect: 0,
    grammarAnswers: 0,
    grammarCorrect: 0,
    reviews: 0,
    reviewGood: 0,
    speakAttempts: 0,
    writeAttempts: 0,
    writeChars: 0,
    analysisRuns: 0,
    imports: 0,
    currentScreen: undefined,
    currentScreenAt: 0,
    events: [],
  }
}

function newSessionId(): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}${rand}`
}

function load(): TelemetryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<TelemetryState> | undefined
      if (
        parsed !== undefined &&
        (parsed.v === 1 || parsed.v === VERSION) &&
        Array.isArray(parsed.events) &&
        Array.isArray(parsed.hourCounts) &&
        parsed.hourCounts.length === 24
      ) {
        return { ...freshState(), ...parsed, v: VERSION }
      }
    }
  } catch {
    // Ignore corrupted or unavailable storage and start fresh.
  }
  return freshState()
}

function bump(map: Record<string, number>, key: string, by = 1): Record<string, number> {
  return { ...map, [key]: (map[key] ?? 0) + by }
}

function bumpHour(hours: number[], hour: number): number[] {
  const next = [...hours]
  next[hour] = (next[hour] ?? 0) + 1
  return next
}

function addActiveDay(days: string[], now: number): string[] {
  const key = localDateKey(new Date(now))
  return days.includes(key) ? days : [...days, key]
}

let state: TelemetryState = load()

const listeners = new Set<() => void>()

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded or storage disabled — totals still work for the session.
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

function commit(patch: Partial<TelemetryState>): void {
  state = { ...state, ...patch }
  persist()
  notify()
}

function pushEvent(
  name: string,
  meta?: Record<string, unknown>,
  extra?: Partial<TelemetryState>,
): void {
  const now = Date.now()
  const event: TelemetryEvent = {
    t: now,
    n: name,
    s: state.currentScreen ?? 'unknown',
    ...(meta !== undefined && { m: meta }),
  }
  const events = [...state.events, event]
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
  const hour = new Date(now).getHours()
  const dayKey = localDateKey(new Date(now))
  const day = state.dayCounts[dayKey] ?? {
    events: 0,
    lessons: 0,
    lookups: 0,
    words: 0,
    readSeconds: 0,
  }
  const nextDay: DayCount = { ...day, events: day.events + 1 }
  switch (name) {
    case 'lesson_start': {
      nextDay.lessons += 1
      break
    }
    case 'word_lookup': {
      nextDay.lookups += 1
      break
    }
    case 'word_save': {
      nextDay.words += 1
      break
    }
    case 'section_complete': {
      if (typeof meta?.['seconds'] === 'number') {
        nextDay.readSeconds += Math.max(0, Math.round(meta['seconds']))
      }
      break
    }
    default: {
      break
    }
  }
  commit({
    events,
    lastSeen: now,
    hourCounts: bumpHour(state.hourCounts, hour),
    activeDays: addActiveDay(state.activeDays, now),
    eventCounts: bump(state.eventCounts, name),
    dayCounts: { ...state.dayCounts, [dayKey]: nextDay },
    ...extra,
  })
}

/**
 * Called once when the app boots. Starts a new session when more than 30
 * minutes have passed since the last event and wires up the unload flush.
 */
export function initTelemetry(): void {
  const now = Date.now()
  const newSession = state.lastSeen === 0 || now - state.lastSeen > SESSION_GAP_MS
  const previousLength =
    newSession && state.sessionStartedAt > 0 && state.lastSeen > state.sessionStartedAt
      ? Math.round((state.lastSeen - state.sessionStartedAt) / 1000)
      : 0
  const sessionLengths =
    previousLength > 0
      ? [...state.sessionLengths, previousLength].slice(-MAX_SESSION_LENGTHS)
      : state.sessionLengths
  commit({
    sessionId: newSession ? newSessionId() : state.sessionId,
    sessionStartedAt: newSession ? now : state.sessionStartedAt,
    sessions: state.sessions + (newSession ? 1 : 0),
    firstSeen: state.firstSeen === 0 ? now : state.firstSeen,
    lastSeen: now,
    activeDays: addActiveDay(state.activeDays, now),
    sessionLengths,
  })
  if (newSession) {
    pushEvent('session_start', { sessionId: state.sessionId })
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushTelemetry)
  }
}

/**
 * Records a raw telemetry event (name + optional meta) and rolls it into the
 * cumulative counters.
 */
export function track(name: string, meta?: Record<string, unknown>): void {
  pushEvent(name, meta)
}

/**
 * Marks a screen as visible: bumps its view counter, stops the previous
 * screen's timer and starts a new one.
 */
export function trackScreen(screen: string): void {
  const now = Date.now()
  const patch: Partial<TelemetryState> = {
    currentScreen: screen,
    currentScreenAt: now,
    screenViews: bump(state.screenViews, screen),
  }
  if (state.currentScreen !== undefined && state.currentScreen !== screen) {
    patch.transitions = bump(state.transitions, `${state.currentScreen}>${screen}`)
  }
  if (state.currentScreen !== undefined && state.currentScreenAt > 0) {
    const elapsed = Math.round((now - state.currentScreenAt) / 1000)
    if (elapsed > 0) {
      patch.screenSeconds = bump(state.screenSeconds, state.currentScreen, elapsed)
    }
  }
  const event: TelemetryEvent = {
    t: now,
    n: 'screen_view',
    s: screen,
  }
  const events = [...state.events, event]
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
  const hour = new Date(now).getHours()
  commit({
    ...patch,
    events,
    lastSeen: now,
    hourCounts: bumpHour(state.hourCounts, hour),
    activeDays: addActiveDay(state.activeDays, now),
    eventCounts: bump(state.eventCounts, 'screen_view'),
  })
}

/**
 * Closes the current screen's timer (used on page unload and before reading
 * aggregates) so no in-progress time is lost.
 */
export function flushTelemetry(): void {
  if (state.currentScreen === undefined || !(state.currentScreenAt > 0)) {
    return
  }

  const elapsed = Math.round((Date.now() - state.currentScreenAt) / 1000)
  if (elapsed > 0) {
    state.screenSeconds = bump(state.screenSeconds, state.currentScreen, elapsed)
    state.currentScreenAt = Date.now()
    persist()
    notify()
  }
}

export function trackWordLookup(word: string): void {
  const key = word.toLowerCase()
  pushEvent('word_lookup', { word: key }, { wordLookups: bump(state.wordLookups, key) })
}

export function trackWordSave(word: string): void {
  const key = word.toLowerCase()
  pushEvent('word_save', { word: key }, { wordSaves: bump(state.wordSaves, key) })
}

export function trackBookView(bookId: string): void {
  pushEvent('book_view', { bookId }, { bookViews: bump(state.bookViews, bookId) })
}

export function trackSectionComplete(bookId: string, seconds: number, wpm?: number): void {
  const rounded = Math.max(0, Math.round(seconds))
  const wpmRounded = wpm === undefined ? undefined : Math.max(0, Math.round(wpm))
  const patch: Partial<TelemetryState> = {
    bookSections: bump(state.bookSections, bookId),
    bookSeconds: bump(state.bookSeconds, bookId, rounded),
  }
  if (wpmRounded !== undefined) {
    const previous = state.bookWpm[bookId] ?? { total: 0, count: 0 }
    patch.bookWpm = {
      ...state.bookWpm,
      [bookId]: { total: previous.total + wpmRounded, count: previous.count + 1 },
    }
  }
  pushEvent(
    'section_complete',
    { bookId, seconds: rounded, ...(wpmRounded !== undefined && { wpm: wpmRounded }) },
    patch,
  )
}

export function trackLessonStart(lessonId: string): void {
  pushEvent('lesson_start', { lessonId }, { lessonStarts: bump(state.lessonStarts, lessonId) })
}

export function trackLessonAnswer(lessonId: string, correct: boolean, ms?: number): void {
  pushEvent(
    'lesson_answer',
    { lessonId, correct, ...(ms !== undefined && { ms }) },
    {
      lessonAnswers: bump(state.lessonAnswers, lessonId),
      lessonCorrect: correct ? bump(state.lessonCorrect, lessonId) : state.lessonCorrect,
      ...answerMsPatch(ms),
    },
  )
}

export function trackLessonComplete(lessonId: string, seconds?: number): void {
  const rounded = seconds === undefined ? undefined : Math.max(0, Math.round(seconds))
  pushEvent(
    'lesson_complete',
    { lessonId, ...(rounded !== undefined && { seconds: rounded }) },
    {
      lessonCompletes: bump(state.lessonCompletes, lessonId),
      ...(rounded !== undefined && {
        lessonSeconds: bump(state.lessonSeconds, lessonId, rounded),
      }),
    },
  )
}

export function trackReaderQuizAnswer(correct: boolean, ms?: number): void {
  pushEvent(
    'reader_quiz_answer',
    { correct, ...(ms !== undefined && { ms }) },
    {
      readerQuizAnswers: state.readerQuizAnswers + 1,
      readerQuizCorrect: state.readerQuizCorrect + (correct ? 1 : 0),
      ...answerMsPatch(ms),
    },
  )
}

export function trackGrammarAnswer(correct: boolean, ms?: number): void {
  pushEvent(
    'grammar_answer',
    { correct, ...(ms !== undefined && { ms }) },
    {
      grammarAnswers: state.grammarAnswers + 1,
      grammarCorrect: state.grammarCorrect + (correct ? 1 : 0),
      ...answerMsPatch(ms),
    },
  )
}

export function trackReview(good: boolean, ms?: number): void {
  pushEvent(
    'review_grade',
    { good, ...(ms !== undefined && { ms }) },
    {
      reviews: state.reviews + 1,
      reviewGood: state.reviewGood + (good ? 1 : 0),
      ...answerMsPatch(ms),
    },
  )
}

function answerMsPatch(ms?: number): Partial<TelemetryState> {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return {}
  return {
    answerMsTotal: state.answerMsTotal + Math.round(ms),
    answerMsCount: state.answerMsCount + 1,
  }
}

export function averageAnswerMs(): number | undefined {
  if (state.answerMsCount === 0) return undefined
  return Math.round(state.answerMsTotal / state.answerMsCount)
}

export function trackSpeakAttempt(good: boolean): void {
  pushEvent('speak_attempt', { good }, { speakAttempts: state.speakAttempts + 1 })
}

export function trackWriteAttempt(chars: number): void {
  pushEvent(
    'write_attempt',
    { chars },
    {
      writeAttempts: state.writeAttempts + 1,
      writeChars: state.writeChars + Math.max(0, chars),
    },
  )
}

export function trackAnalysisRun(): void {
  pushEvent('analysis_run', undefined, { analysisRuns: state.analysisRuns + 1 })
}

export function trackImport(): void {
  pushEvent('import_document', undefined, { imports: state.imports + 1 })
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getTelemetry(): TelemetryState {
  return state
}

/**
 * The full telemetry payload (aggregates + the raw event log) as pretty JSON —
 * ready to export for offline analysis or future data science.
 */
export function serializeTelemetry(): string {
  return JSON.stringify(state, null, 2)
}

/**
 * Approximate on-disk size of the telemetry payload in bytes.
 */
export function telemetryStorageBytes(): number {
  try {
    return new Blob([JSON.stringify(state)]).size
  } catch {
    return JSON.stringify(state).length
  }
}

export function totalScreenSeconds(state: TelemetryState): number {
  let total = 0
  for (const seconds of Object.values(state.screenSeconds)) total += seconds
  return total
}

export function resetTelemetry(): void {
  state = freshState()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors in tests.
  }
  notify()
}
