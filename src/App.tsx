import { lazy, Suspense, useEffect } from 'react'

import type { ProfileTab, Route } from '@/lib/router'

import { AchievementToast } from '@/components/achievement-toast'
import { BottomNav, type NavTarget } from '@/components/bottom-nav'
import { GuidedBar } from '@/components/guided-bar'
import { TopBar } from '@/components/top-bar'
import { lessonById } from '@/engine/lessons'
import { primeAudio, setSoundEnabled } from '@/engine/sounds'
import { flushTelemetry, initTelemetry, trackScreen } from '@/engine/telemetry'
import { useHashRoute } from '@/hooks/use-hash-route'
import { HomeScreen } from '@/screens/home-screen'
import { OnboardingScreen } from '@/screens/onboarding-screen'
import { useAuraStore } from '@/state/store'

const AnalyzerScreen = lazy(async () => {
  const module = await import('@/screens/analyzer-screen')
  return { default: module.AnalyzerScreen }
})
const AboutScreen = lazy(async () => {
  const module = await import('@/screens/about-screen')
  return { default: module.AboutScreen }
})
const BackupScreen = lazy(async () => {
  const module = await import('@/screens/backup-screen')
  return { default: module.BackupScreen }
})
const BookScreen = lazy(async () => {
  const module = await import('@/screens/book-screen')
  return { default: module.BookScreen }
})
const DialogueScreen = lazy(async () => {
  const module = await import('@/screens/dialogue-screen')
  return { default: module.DialogueScreen }
})
const DictationScreen = lazy(async () => {
  const module = await import('@/screens/dictation-screen')
  return { default: module.DictationScreen }
})
const DictionaryScreen = lazy(async () => {
  const module = await import('@/screens/dictionary-screen')
  return { default: module.DictionaryScreen }
})
const DataScreen = lazy(async () => {
  const module = await import('@/screens/data-screen')
  return { default: module.DataScreen }
})
const GrammarLessonScreen = lazy(async () => {
  const module = await import('@/screens/grammar-lesson-screen')
  return { default: module.GrammarLessonScreen }
})
const GrammarScreen = lazy(async () => {
  const module = await import('@/screens/grammar-screen')
  return { default: module.GrammarScreen }
})
const LessonScreen = lazy(async () => {
  const module = await import('@/screens/lesson-screen')
  return { default: module.LessonScreen }
})
const LibraryScreen = lazy(async () => {
  const module = await import('@/screens/library-screen')
  return { default: module.LibraryScreen }
})
const ProfileScreen = lazy(async () => {
  const module = await import('@/screens/profile-screen')
  return { default: module.ProfileScreen }
})
const ReviewScreen = lazy(async () => {
  const module = await import('@/screens/review-screen')
  return { default: module.ReviewScreen }
})
const ReaderScreen = lazy(async () => {
  const module = await import('@/screens/reader-screen')
  return { default: module.ReaderScreen }
})
const RoadmapScreen = lazy(async () => {
  const module = await import('@/screens/roadmap-screen')
  return { default: module.RoadmapScreen }
})
const SettingsScreen = lazy(async () => {
  const module = await import('@/screens/settings-screen')
  return { default: module.SettingsScreen }
})
const TourScreen = lazy(async () => {
  const module = await import('@/screens/tour-screen')
  return { default: module.TourScreen }
})
const SpeakScreen = lazy(async () => {
  const module = await import('@/screens/speak-screen')
  return { default: module.SpeakScreen }
})
const WriteScreen = lazy(async () => {
  const module = await import('@/screens/write-screen')
  return { default: module.WriteScreen }
})

export function App() {
  const { route, navigate } = useHashRoute()
  const onboardingDone = useAuraStore((state) => state.onboardingDone)
  const soundEnabled = useAuraStore((state) => state.soundEnabled)
  const darkMode = useAuraStore((state) => state.darkMode)
  const accent = useAuraStore((state) => state.accent)

  const goHome = () => navigate({ name: 'home' })

  // Keep the procedural-sound module in sync with the persisted setting.
  useEffect(() => {
    setSoundEnabled(soundEnabled)
  }, [soundEnabled])

  // Dark mode is the design tokens' single switch point.
  useEffect(() => {
    document.documentElement.dataset['theme'] = darkMode ? 'dark' : 'light'
  }, [darkMode])

  // The chosen accent theme recolors the whole app via CSS variables.
  useEffect(() => {
    document.documentElement.dataset['accent'] = accent
  }, [accent])

  // Browsers only allow audio after a user gesture — warm the AudioContext
  // on the very first interaction of the session.
  useEffect(() => {
    const prime = () => primeAudio()
    window.addEventListener('pointerdown', prime, { once: true })
    return () => window.removeEventListener('pointerdown', prime)
  }, [])

  // Total telemetry: open a session once and track every screen (and the time
  // spent on it) as the user moves through the app.
  useEffect(() => {
    initTelemetry()
    return () => {
      flushTelemetry()
    }
  }, [])

  useEffect(() => {
    trackScreen(route.name)
  }, [route.name])

  // Warm the shared lazy chunks (frequency + vocabulary + screens) in the
  // background so opening the Dictionary/Analyzer feels instant.
  useEffect(() => {
    const timer = setTimeout(() => {
      void import('@/engine/frequency')
      void import('@/engine/vocabulary')
      void import('@/engine/library')
      void import('@/engine/grammar')
      void import('@/engine/dialogue')
      void import('@/screens/dictionary-screen')
      void import('@/screens/analyzer-screen')
      void import('@/screens/library-screen')
      void import('@/screens/profile-screen')
      void import('@/screens/grammar-screen')
      void import('@/screens/review-screen')
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!onboardingDone) {
    return <OnboardingScreen />
  }

  if (route.name === 'lesson') {
    const lesson = lessonById(route.lessonId)
    if (lesson === undefined) {
      return (
        <div className="app">
          <p>Lesson not found.</p>
          <button type="button" onClick={goHome}>
            Back to home
          </button>
        </div>
      )
    }
    return (
      <Suspense fallback={<ScreenLoading />}>
        <LessonScreen lesson={lesson} onHome={goHome} />
      </Suspense>
    )
  }

  if (route.name === 'grammar-lesson') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        <GrammarLessonScreen
          lessonId={route.lessonId}
          onHome={() => navigate({ name: 'grammar' })}
        />
      </Suspense>
    )
  }

  if (route.name === 'book' || route.name === 'read') {
    return (
      <Suspense fallback={<ScreenLoading />}>
        {route.name === 'book' ? (
          <BookScreen
            bookId={route.bookId}
            onBack={() => navigate({ name: 'library' })}
            onRead={(chapterId) => navigate({ name: 'read', bookId: route.bookId, chapterId })}
          />
        ) : (
          <ReaderScreen
            bookId={route.bookId}
            {...(route.chapterId !== undefined && { chapterId: route.chapterId })}
            {...(route.sectionIndex !== undefined && { sectionIndex: route.sectionIndex })}
            onBack={() => navigate({ name: 'book', bookId: route.bookId })}
            onPosition={(bookId, chapterId, sectionIndex) =>
              navigate({ name: 'read', bookId, chapterId, sectionIndex })
            }
          />
        )}
      </Suspense>
    )
  }

  return (
    <div className="app">
      <TopBar />
      <main className="app__content">
        {route.name === 'home' && (
          <HomeScreen
            onStartLesson={(lessonId) => navigate({ name: 'lesson', lessonId })}
            onProfile={() => navigate({ name: 'profile' })}
          />
        )}
        {route.name === 'settings' && (
          <Suspense fallback={<ScreenLoading />}>
            <SettingsScreen />
          </Suspense>
        )}
        {route.name === 'about' && (
          <Suspense fallback={<ScreenLoading />}>
            <AboutScreen onBack={() => navigate({ name: 'settings' })} />
          </Suspense>
        )}
        {route.name === 'tour' && (
          <Suspense fallback={<ScreenLoading />}>
            <TourScreen />
          </Suspense>
        )}
        {route.name === 'roadmap' && (
          <Suspense fallback={<ScreenLoading />}>
            <RoadmapScreen onStartLesson={(lessonId) => navigate({ name: 'lesson', lessonId })} />
          </Suspense>
        )}
        {route.name === 'speak' && (
          <Suspense fallback={<ScreenLoading />}>
            <SpeakScreen />
          </Suspense>
        )}
        {route.name === 'write' && (
          <Suspense fallback={<ScreenLoading />}>
            <WriteScreen />
          </Suspense>
        )}
        {route.name === 'dictation' && (
          <Suspense fallback={<ScreenLoading />}>
            <DictationScreen />
          </Suspense>
        )}
        {route.name === 'dialogue' && (
          <Suspense fallback={<ScreenLoading />}>
            <DialogueScreen
              {...(route.dialogueId !== undefined && { dialogueId: route.dialogueId })}
              onSelect={(dialogueId) =>
                navigate(
                  dialogueId === undefined
                    ? { name: 'dialogue' }
                    : { name: 'dialogue', dialogueId },
                )
              }
            />
          </Suspense>
        )}
        {route.name === 'grammar' && (
          <Suspense fallback={<ScreenLoading />}>
            <GrammarScreen
              onOpenLesson={(lessonId) => navigate({ name: 'grammar-lesson', lessonId })}
            />
          </Suspense>
        )}
        {route.name === 'backup' && (
          <Suspense fallback={<ScreenLoading />}>
            <BackupScreen />
          </Suspense>
        )}
        {route.name === 'data' && (
          <Suspense fallback={<ScreenLoading />}>
            <DataScreen
              onBack={() => navigate({ name: 'home' })}
              onOpenBackup={() => navigate({ name: 'backup' })}
            />
          </Suspense>
        )}
        {route.name === 'profile' && (
          <Suspense fallback={<ScreenLoading />}>
            <ProfileScreen
              {...(route.tab !== undefined && { tab: route.tab })}
              onSelectTab={(tab: ProfileTab) =>
                navigate(tab === 'overview' ? { name: 'profile' } : { name: 'profile', tab })
              }
            />
          </Suspense>
        )}
        {route.name === 'dictionary' && (
          <Suspense fallback={<ScreenLoading />}>
            <DictionaryScreen
              {...(route.word !== undefined && { initialWord: route.word })}
              onWordChange={(word) =>
                navigate(word.length === 0 ? { name: 'dictionary' } : { name: 'dictionary', word })
              }
            />
          </Suspense>
        )}
        {route.name === 'analyzer' && (
          <Suspense fallback={<ScreenLoading />}>
            <AnalyzerScreen />
          </Suspense>
        )}
        {route.name === 'library' && (
          <Suspense fallback={<ScreenLoading />}>
            <LibraryScreen
              onOpenBook={(bookId) => navigate({ name: 'book', bookId })}
              onContinue={(bookId) => navigate({ name: 'read', bookId })}
            />
          </Suspense>
        )}
        {route.name === 'review' && (
          <Suspense fallback={<ScreenLoading />}>
            <ReviewScreen />
          </Suspense>
        )}
      </main>
      <BottomNav active={navActive(route)} onNavigate={(target) => navigate({ name: target })} />
      <GuidedBar />
      <AchievementToast />
    </div>
  )
}

const NAV_TARGETS: ReadonlySet<string> = new Set([
  'home',
  'dictionary',
  'analyzer',
  'library',
  'review',
])

function navActive(route: Route): NavTarget {
  return NAV_TARGETS.has(route.name) ? (route.name as NavTarget) : 'home'
}

function ScreenLoading() {
  return <p className="screen-subtitle">Loading…</p>
}
