import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ProgressSnapshot } from '@/engine/achievements'
import type { ReviewGrade, SrsCard } from '@/engine/srs'
import type { LibraryBook } from '@/engine/types'

import { newlyUnlocked } from '@/engine/achievements'
import { CONFIG } from '@/engine/config'
import { reviewCard as applyReview, createCard } from '@/engine/srs'
import { DEFAULT_DAILY_GOAL, updateStreak, XP_PER_LESSON } from '@/engine/xp'
import { localDateKey } from '@/lib/date'

export interface DailyProgress {
  date: string
  xp: number
  correct: number
  wrong: number
  lessons: number
  cards: number
  readSeconds: number
}

export type LearningGoal = 'travel' | 'work' | 'study' | 'exams' | 'move' | 'fun'

export interface ProfileInfo {
  name: string
  avatar: string
  avatarColor: string
  age?: number
  goal?: LearningGoal
  nativeLanguage?: string
  profession?: string
  joinedAt: string
}

export interface AddWordOptions {
  note?: string
}

export interface BookProgress {
  lastChapter?: string
  lastSection?: string
  completed: string[]
}

export const MAX_IMPORTED_BOOKS = 3

interface AuraState {
  onboardingDone: boolean
  profile: ProfileInfo
  xp: number
  totalCorrect: number
  totalWrong: number
  totalLessons: number
  streak: number
  lastActiveDay: string | undefined
  daily: DailyProgress
  dailyGoal: number
  hearts: number
  learnedWords: string[]
  cards: Record<string, SrsCard>
  completedLessons: string[]
  achievements: Record<string, string>
  ttsRate: number
  ttsPitch: number
  ttsVoiceURI: string | undefined
  ttsEnabled: boolean
  soundEnabled: boolean
  libraryProgress: Record<string, BookProgress>
  importedBooks: LibraryBook[]
  history: Record<string, DailyProgress>
  weakWords: Record<string, number>
  readingSeconds: number
  readingWpmTotal: number
  readingWpmCount: number
  speakingSessions: number
  speakingPrompts: number
  speakingGood: number
  writingAttempts: number
  writingBest: number
  writingTotalScore: number
  darkMode: boolean
  accent: string
  questBonusClaimed: Record<string, boolean>
  guidedActive: boolean
  guidedActions: Record<string, boolean>
  hiddenBooks: string[]

  completeLesson: (lessonId: string) => void
  recordAnswer: (correct: boolean) => void
  awardXp: (amount: number) => void
  addWord: (word: string, meaning: string, options?: AddWordOptions) => SrsCard | undefined
  removeCard: (id: string) => void
  review: (id: string, grade: ReviewGrade) => void
  setDailyGoal: (goal: number) => void
  setTtsRate: (rate: number) => void
  setTtsPitch: (pitch: number) => void
  setTtsVoice: (uri: string) => void
  setTtsEnabled: (enabled: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
  setDarkMode: (enabled: boolean) => void
  setAccent: (accent: string) => void
  resetHearts: () => void
  completeOnboarding: () => void
  startGuidedTour: () => void
  markGuidedAction: (id: string) => void
  setProfileName: (name: string) => void
  setProfileAvatar: (avatar: string) => void
  setProfileAvatarColor: (color: string) => void
  setProfileAge: (age: number) => void
  setProfileGoal: (goal: LearningGoal) => void
  setProfileNativeLanguage: (language: string) => void
  setProfileProfession: (profession: string) => void
  markSectionComplete: (bookId: string, sectionId: string) => void
  setReadingPosition: (bookId: string, chapterId: string, sectionId: string) => void
  addImportedBook: (book: LibraryBook) => void
  removeImportedBook: (bookId: string) => void
  hideBook: (bookId: string) => void
  unhideBook: (bookId: string) => void
  showAllBooks: () => void
  recordReading: (seconds: number, wpm?: number) => void
  recordWeakWord: (word: string) => void
  clearWeakWord: (word: string) => void
  recordSpeakingSession: (total: number, good: number) => void
  recordWriting: (score: number) => void
  claimDailyBonus: (xp: number) => void
}

function freshDaily(date: string): DailyProgress {
  return { date, xp: 0, correct: 0, wrong: 0, lessons: 0, cards: 0, readSeconds: 0 }
}

/**
Stores today's totals into the per-day history (used by the stats screen).
 */
function mergeDay(
  history: Record<string, DailyProgress>,
  daily: DailyProgress,
): Record<string, DailyProgress> {
  return { ...history, [daily.date]: daily }
}

function snapshotOf(state: AuraState): ProgressSnapshot {
  return {
    xp: state.xp,
    totalLessons: state.totalLessons,
    streak: state.streak,
    learnedWords: state.learnedWords.length,
    totalCorrect: state.totalCorrect,
  }
}

/**
Adds newly unlocked achievements (if any).
 */
function withAchievements(current: AuraState, next: AuraState): AuraState {
  const unlocked = newlyUnlocked(current.achievements, snapshotOf(next))
  if (unlocked.length === 0) return next
  const additions = Object.fromEntries(unlocked.map((id) => [id, new Date().toISOString()]))
  return { ...next, achievements: { ...current.achievements, ...additions } }
}

/**
Updates the streak and resets the daily progress if the day changed.
 */
function touch(
  state: AuraState,
  dateKey: string,
): Pick<AuraState, 'streak' | 'lastActiveDay' | 'daily'> {
  const { streak, newDay } = updateStreak(state.streak, state.lastActiveDay, dateKey)
  const daily = state.daily.date === dateKey ? state.daily : freshDaily(dateKey)
  return {
    streak,
    lastActiveDay: newDay ? dateKey : state.lastActiveDay,
    daily,
  }
}

export const useAuraStore = create<AuraState>()(
  persist(
    (set, get) => ({
      onboardingDone: false,
      profile: {
        name: 'Learner',
        avatar: 'Bird',
        avatarColor: '#58cc02',
        joinedAt: new Date().toISOString(),
      },
      xp: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalLessons: 0,
      streak: 0,
      lastActiveDay: undefined,
      daily: freshDaily(localDateKey()),
      dailyGoal: DEFAULT_DAILY_GOAL,
      hearts: CONFIG.gamification.maxHearts,
      learnedWords: [],
      cards: {},
      completedLessons: [],
      achievements: {},
      ttsRate: 0.9,
      ttsPitch: 1,
      ttsVoiceURI: undefined,
      ttsEnabled: true,
      soundEnabled: true,
      libraryProgress: {},
      importedBooks: [],
      history: {},
      weakWords: {},
      readingSeconds: 0,
      readingWpmTotal: 0,
      readingWpmCount: 0,
      speakingSessions: 0,
      speakingPrompts: 0,
      speakingGood: 0,
      writingAttempts: 0,
      writingBest: 0,
      writingTotalScore: 0,
      darkMode: false,
      accent: 'forest',
      questBonusClaimed: {},
      guidedActive: false,
      guidedActions: {},
      hiddenBooks: [],

      completeLesson: (lessonId) =>
        set((state) => {
          const touched = touch(state, localDateKey())
          const completedLessons = state.completedLessons.includes(lessonId)
            ? state.completedLessons
            : [...state.completedLessons, lessonId]
          const next: AuraState = {
            ...state,
            ...touched,
            xp: state.xp + XP_PER_LESSON,
            totalLessons: state.totalLessons + 1,
            completedLessons,
            daily: {
              ...touched.daily,
              xp: touched.daily.xp + XP_PER_LESSON,
              lessons: touched.daily.lessons + 1,
            },
            history: mergeDay(state.history, {
              ...touched.daily,
              xp: touched.daily.xp + XP_PER_LESSON,
              lessons: touched.daily.lessons + 1,
            }),
          }
          return withAchievements(state, next)
        }),

      recordAnswer: (correct) =>
        set((state) => {
          const touched = touch(state, localDateKey())
          const next: AuraState = {
            ...state,
            ...touched,
            hearts: correct ? state.hearts : Math.max(0, state.hearts - 1),
            totalCorrect: state.totalCorrect + (correct ? 1 : 0),
            totalWrong: state.totalWrong + (correct ? 0 : 1),
            daily: {
              ...touched.daily,
              correct: touched.daily.correct + (correct ? 1 : 0),
              wrong: touched.daily.wrong + (correct ? 0 : 1),
            },
            history: mergeDay(state.history, {
              ...touched.daily,
              correct: touched.daily.correct + (correct ? 1 : 0),
              wrong: touched.daily.wrong + (correct ? 0 : 1),
            }),
          }
          return withAchievements(state, next)
        }),

      awardXp: (amount) =>
        set((state) => {
          const touched = touch(state, localDateKey())
          const next: AuraState = {
            ...state,
            ...touched,
            xp: state.xp + amount,
            daily: { ...touched.daily, xp: touched.daily.xp + amount },
            history: mergeDay(state.history, {
              ...touched.daily,
              xp: touched.daily.xp + amount,
            }),
          }
          return withAchievements(state, next)
        }),

      addWord: (word, meaning, options) => {
        const existing = Object.values(get().cards).find(
          (card) => card.word.toLowerCase() === word.toLowerCase(),
        )
        if (existing !== undefined) return existing

        const card = createCard(word, meaning, {
          ...(options?.note !== undefined && { note: options.note }),
        })
        set((state) => {
          const learnedWords = state.learnedWords.includes(card.word)
            ? state.learnedWords
            : [...state.learnedWords, card.word]
          const next: AuraState = {
            ...state,
            cards: { ...state.cards, [card.id]: card },
            learnedWords,
          }
          return withAchievements(state, next)
        })
        return card
      },

      removeCard: (id) =>
        set((state) => {
          const wordToRemove = Object.values(state.cards).find((card) => card.id === id)?.word
          const rest = Object.fromEntries(Object.entries(state.cards).filter(([key]) => key !== id))
          return {
            ...state,
            cards: rest,
            learnedWords: state.learnedWords.filter((word) => word !== wordToRemove),
          }
        }),

      review: (id, grade) =>
        set((state) => {
          const card = state.cards[id]
          if (card === undefined) return {}
          const touched = touch(state, localDateKey())
          const daily = { ...touched.daily, cards: touched.daily.cards + 1 }
          return {
            cards: { ...state.cards, [id]: applyReview(card, grade) },
            streak: touched.streak,
            lastActiveDay: touched.lastActiveDay,
            daily,
            history: mergeDay(state.history, daily),
          }
        }),

      setDailyGoal: (goal) => set({ dailyGoal: goal }),
      setTtsRate: (rate) => set({ ttsRate: rate }),
      setTtsPitch: (pitch) => set({ ttsPitch: pitch }),
      setTtsVoice: (uri) => set({ ttsVoiceURI: uri }),
      setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      setAccent: (accent) => set({ accent: accent }),
      resetHearts: () => set({ hearts: CONFIG.gamification.maxHearts }),
      completeOnboarding: () => set({ onboardingDone: true, guidedActive: false }),

      startGuidedTour: () => set({ onboardingDone: true, guidedActive: true, guidedActions: {} }),

      markGuidedAction: (id) =>
        set((state) => {
          if (!state.guidedActive || Object.hasOwn(state.guidedActions, id)) return {}
          return { guidedActions: { ...state.guidedActions, [id]: true } }
        }),

      recordReading: (seconds, wpm) =>
        set((state) => {
          const touched = touch(state, localDateKey())
          const daily = { ...touched.daily, readSeconds: touched.daily.readSeconds + seconds }
          return {
            readingSeconds: state.readingSeconds + seconds,
            daily,
            streak: touched.streak,
            lastActiveDay: touched.lastActiveDay,
            history: mergeDay(state.history, daily),
            ...(wpm !== undefined && {
              readingWpmTotal: state.readingWpmTotal + wpm,
              readingWpmCount: state.readingWpmCount + 1,
            }),
          }
        }),

      recordWeakWord: (word) =>
        set((state) => {
          const key = word.toLowerCase()
          return { weakWords: { ...state.weakWords, [key]: (state.weakWords[key] ?? 0) + 1 } }
        }),

      clearWeakWord: (word) =>
        set((state) => {
          const key = word.toLowerCase()
          if ((state.weakWords[key] ?? 0) === 0) return {}
          return { weakWords: { ...state.weakWords, [key]: 0 } }
        }),

      recordSpeakingSession: (total, good) =>
        set((state) => ({
          speakingSessions: state.speakingSessions + 1,
          speakingPrompts: state.speakingPrompts + total,
          speakingGood: state.speakingGood + good,
        })),

      recordWriting: (score) =>
        set((state) => ({
          writingAttempts: state.writingAttempts + 1,
          writingTotalScore: state.writingTotalScore + score,
          writingBest: Math.max(state.writingBest, score),
        })),

      claimDailyBonus: (xp) =>
        set((state) => {
          const key = localDateKey()
          if (Object.hasOwn(state.questBonusClaimed, key)) return {}
          const touched = touch(state, key)
          return {
            questBonusClaimed: { ...state.questBonusClaimed, [key]: true },
            ...touched,
            xp: state.xp + xp,
            daily: { ...touched.daily, xp: touched.daily.xp + xp },
            history: mergeDay(state.history, {
              ...touched.daily,
              xp: touched.daily.xp + xp,
            }),
          }
        }),

      setProfileName: (name) => set((state) => ({ profile: { ...state.profile, name } })),

      setProfileAvatar: (avatar) => set((state) => ({ profile: { ...state.profile, avatar } })),

      setProfileAvatarColor: (color) =>
        set((state) => ({ profile: { ...state.profile, avatarColor: color } })),

      setProfileAge: (age) => set((state) => ({ profile: { ...state.profile, age } })),

      setProfileGoal: (goal) => set((state) => ({ profile: { ...state.profile, goal } })),

      setProfileNativeLanguage: (language) =>
        set((state) => ({ profile: { ...state.profile, nativeLanguage: language } })),

      setProfileProfession: (profession) =>
        set((state) => ({ profile: { ...state.profile, profession } })),

      markSectionComplete: (bookId, sectionId) =>
        set((state) => {
          const progress = state.libraryProgress[bookId] ?? { completed: [] }
          if (progress.completed.includes(sectionId)) return {}
          return {
            libraryProgress: {
              ...state.libraryProgress,
              [bookId]: { ...progress, completed: [...progress.completed, sectionId] },
            },
          }
        }),

      setReadingPosition: (bookId, chapterId, sectionId) =>
        set((state) => {
          const progress = state.libraryProgress[bookId] ?? { completed: [] }
          return {
            libraryProgress: {
              ...state.libraryProgress,
              [bookId]: { ...progress, lastChapter: chapterId, lastSection: sectionId },
            },
          }
        }),

      addImportedBook: (book) =>
        set((state) => ({
          importedBooks: [book, ...state.importedBooks]
            .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
            .slice(0, MAX_IMPORTED_BOOKS),
        })),

      removeImportedBook: (bookId) =>
        set((state) => ({
          importedBooks: state.importedBooks.filter((book) => book.id !== bookId),
        })),

      hideBook: (bookId) =>
        set((state) => {
          if (state.hiddenBooks.includes(bookId)) return {}
          return { hiddenBooks: [...state.hiddenBooks, bookId] }
        }),

      unhideBook: (bookId) =>
        set((state) => ({
          hiddenBooks: state.hiddenBooks.filter((id) => id !== bookId),
        })),

      showAllBooks: () => set({ hiddenBooks: [] }),
    }),
    {
      name: 'aura-state',
      version: 11,
      migrate: (persistedState, version) => {
        const base = { ...(persistedState as Record<string, unknown>) }
        if (version < 2) {
          base['onboardingDone'] = true
        }
        if (version < 3) {
          base['libraryProgress'] = {}
          base['importedBooks'] = []
        }
        if (version < 4) {
          base['ttsEnabled'] = true
          base['soundEnabled'] = true
        }
        if (version < 5) {
          base['ttsPitch'] = 1
          base['history'] = {}
          base['weakWords'] = {}
          base['readingSeconds'] = 0
          base['readingWpmTotal'] = 0
          base['readingWpmCount'] = 0
          const daily = base['daily'] as Record<string, unknown> | undefined
          if (daily !== undefined) daily['cards'] = 0
        }
        if (version < 6) {
          base['profile'] = {
            name: 'Learner',
            avatar: 'Bird',
            avatarColor: '#58cc02',
            joinedAt: new Date().toISOString(),
          }
          base['speakingSessions'] = 0
          base['speakingPrompts'] = 0
          base['speakingGood'] = 0
          base['writingAttempts'] = 0
          base['writingBest'] = 0
          base['writingTotalScore'] = 0
          const daily = base['daily'] as Record<string, unknown> | undefined
          if (daily !== undefined) daily['readSeconds'] = 0
        }
        if (version < 7) {
          base['darkMode'] = false
          base['questBonusClaimed'] = {}
        }
        if (version < 8) {
          base['accent'] = 'forest'
        }
        if (version < 9) {
          const profile = base['profile'] as Record<string, unknown> | undefined
          if (profile !== undefined && profile['avatarColor'] === undefined) {
            profile['avatarColor'] = '#58cc02'
          }
        }
        if (version < 10) {
          base['guidedActive'] = false
          base['guidedActions'] = {}
        }
        if (version < 11) {
          base['hiddenBooks'] = []
        }
        return base as unknown as AuraState
      },
    },
  ),
)

export function useStreak(): number {
  return useAuraStore((state) => state.streak)
}

export function useDueCardCount(): number {
  return useAuraStore((state) => {
    let count = 0
    const now = new Date().toISOString()
    for (const card of Object.values(state.cards)) {
      if (card.state.due <= now) count += 1
    }
    return count
  })
}

/**
 * Serializes the whole progress (everything but the actions) to JSON — the
 * "backup" payload. Local-only; no cloud involved.
 */
export function serializeProgress(): string {
  const state = useAuraStore.getState() as unknown as Record<string, unknown>
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    if (typeof value !== 'function') data[key] = value
  }
  return JSON.stringify({ version: 7, exportedAt: new Date().toISOString(), state: data })
}

/**
 * Restores progress from a `serializeProgress()` payload. Returns false on
 * invalid JSON or a missing state object.
 */
export function tryRestoreProgress(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as { state?: Record<string, unknown> } | undefined
    if (parsed === undefined) return false
    const data = parsed.state
    if (data === undefined) return false
    useAuraStore.setState(data as Partial<AuraState>)
    return true
  } catch {
    return false
  }
}
