import { lazy, Suspense, useState } from 'react'

import { AchievementToast } from '@/components/achievement-toast'
import { BottomNav, type NavTarget } from '@/components/bottom-nav'
import { TopBar } from '@/components/top-bar'
import { lessonById } from '@/engine/lessons'
import { HomeScreen } from '@/screens/home-screen'
import { LessonScreen } from '@/screens/lesson-screen'
import { ReviewScreen } from '@/screens/review-screen'

const AnalyzerScreen = lazy(async () => {
  const module = await import('@/screens/analyzer-screen')
  return { default: module.AnalyzerScreen }
})
const DictionaryScreen = lazy(async () => {
  const module = await import('@/screens/dictionary-screen')
  return { default: module.DictionaryScreen }
})

type Route = { name: NavTarget } | { name: 'leccion'; lessonId: string }

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'inicio' })

  const goHome = () => setRoute({ name: 'inicio' })

  if (route.name === 'leccion') {
    const lesson = lessonById(route.lessonId)
    if (lesson === undefined) {
      return (
        <div className="app">
          <p>Lección no encontrada.</p>
          <button type="button" onClick={goHome}>
            Volver al inicio
          </button>
        </div>
      )
    }
    return <LessonScreen lesson={lesson} onHome={goHome} />
  }

  return (
    <div className="app">
      <TopBar />
      <main className="app__content">
        {route.name === 'inicio' && (
          <HomeScreen onStartLesson={(lessonId) => setRoute({ name: 'leccion', lessonId })} />
        )}
        {route.name === 'diccionario' && (
          <Suspense fallback={<ScreenLoading />}>
            <DictionaryScreen />
          </Suspense>
        )}
        {route.name === 'analizador' && (
          <Suspense fallback={<ScreenLoading />}>
            <AnalyzerScreen />
          </Suspense>
        )}
        {route.name === 'repaso' && <ReviewScreen />}
      </main>
      <BottomNav active={route.name} onNavigate={(target) => setRoute({ name: target })} />
      <AchievementToast />
    </div>
  )
}

function ScreenLoading() {
  return <p className="screen-subtitle">Cargando…</p>
}
