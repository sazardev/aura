import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ProgressSnapshot } from '@/engine/achievements'
import type { ReviewGrade, SrsCard } from '@/engine/srs'

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
}

export interface AddWordOptions {
  note?: string
}

interface AuraState {
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
  ttsVoiceURI: string | undefined

  completeLesson: (lessonId: string) => void
  recordAnswer: (correct: boolean) => void
  awardXp: (amount: number) => void
  addWord: (word: string, meaning: string, options?: AddWordOptions) => SrsCard | undefined
  removeCard: (id: string) => void
  review: (id: string, grade: ReviewGrade) => void
  setDailyGoal: (goal: number) => void
  setTtsRate: (rate: number) => void
  setTtsVoice: (uri: string) => void
  resetHearts: () => void
}

function freshDaily(date: string): DailyProgress {
  return { date, xp: 0, correct: 0, wrong: 0, lessons: 0 }
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
      ttsVoiceURI: undefined,

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
          return { cards: { ...state.cards, [id]: applyReview(card, grade) } }
        }),

      setDailyGoal: (goal) => set({ dailyGoal: goal }),
      setTtsRate: (rate) => set({ ttsRate: rate }),
      setTtsVoice: (uri) => set({ ttsVoiceURI: uri }),
      resetHearts: () => set({ hearts: CONFIG.gamification.maxHearts }),
    }),
    {
      name: 'aura-state',
      version: 1,
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
