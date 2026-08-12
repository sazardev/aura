import { lazy, Suspense, useEffect, useState } from 'react'

import { AchievementToast } from '@/components/achievement-toast'
import { BottomNav, type NavTarget } from '@/components/bottom-nav'
import { TopBar } from '@/components/top-bar'
import { lessonById } from '@/engine/lessons'
import { HomeScreen } from '@/screens/home-screen'
import { ReviewScreen } from '@/screens/review-screen'

const AnalyzerScreen = lazy(async () => {
  const module = await import('@/screens/analyzer-screen')
  return { default: module.AnalyzerScreen }
})
const DictionaryScreen = lazy(async () => {
  const module = await import('@/screens/dictionary-screen')
  return { default: module.DictionaryScreen }
})
const LessonScreen = lazy(async () => {
  const module = await import('@/screens/lesson-screen')
  return { default: module.LessonScreen }
})

type Route = { name: NavTarget } | { name: 'lesson'; lessonId: string }

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' })

  const goHome = () => setRoute({ name: 'home' })

  // Warm the shared lazy chunks (frequency + vocabulary + screens) in the
  // background so opening the Dictionary/Analyzer feels instant.
  useEffect(() => {
    const timer = setTimeout(() => {
      void import('@/engine/frequency')
      void import('@/engine/vocabulary')
      void import('@/screens/dictionary-screen')
      void import('@/screens/analyzer-screen')
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

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

  return (
    <div className="app">
      <TopBar />
      <main className="app__content">
        {route.name === 'home' && (
          <HomeScreen onStartLesson={(lessonId) => setRoute({ name: 'lesson', lessonId })} />
        )}
        {route.name === 'dictionary' && (
          <Suspense fallback={<ScreenLoading />}>
            <DictionaryScreen />
          </Suspense>
        )}
        {route.name === 'analyzer' && (
          <Suspense fallback={<ScreenLoading />}>
            <AnalyzerScreen />
          </Suspense>
        )}
        {route.name === 'review' && <ReviewScreen />}
      </main>
      <BottomNav active={route.name} onNavigate={(target) => setRoute({ name: target })} />
      <AchievementToast />
    </div>
  )
}

function ScreenLoading() {
  return <p className="screen-subtitle">Loading…</p>
}
