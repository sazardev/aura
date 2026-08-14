import { Flame, Heart, Settings, Zap } from 'lucide-react'

import { Logo } from '@/components/logo'
import { ProgressBar } from '@/components/progress-bar'
import { levelFromXp } from '@/engine/xp'
import { useHashRoute } from '@/hooks/use-hash-route'
import { useAuraStore } from '@/state/store'

export function TopBar() {
  const streak = useAuraStore((state) => state.streak)
  const xp = useAuraStore((state) => state.xp)
  const hearts = useAuraStore((state) => state.hearts)
  const daily = useAuraStore((state) => state.daily)
  const dailyGoal = useAuraStore((state) => state.dailyGoal)
  const { navigate } = useHashRoute()

  const level = levelFromXp(xp)
  const goalPercent = Math.min(100, Math.round((daily.xp / dailyGoal) * 100))

  return (
    <header className="top-bar">
      <span className="top-bar__brand">
        <Logo size={26} />
      </span>
      <div className="top-bar__stat" aria-label={`Day streak: ${streak}`}>
        <Flame size={18} aria-hidden="true" />
        <strong>{streak}</strong>
      </div>
      <div className="top-bar__stat" aria-label={`Experience points: ${xp}, level ${level.level}`}>
        <Zap size={18} aria-hidden="true" />
        <strong>{xp}</strong>
        <span className="top-bar__level">Lv {level.level}</span>
      </div>
      <div className="top-bar__stat" aria-label={`Hearts: ${hearts}`}>
        <Heart size={18} fill="currentColor" aria-hidden="true" />
        <strong>{hearts}</strong>
      </div>
      <div
        className="top-bar__goal"
        aria-label={`Daily goal: ${daily.xp} of ${dailyGoal} XP`}
        title={`Daily goal: ${daily.xp}/${dailyGoal} XP`}
      >
        <span className="top-bar__goal-label">
          {daily.xp}/{dailyGoal}
        </span>
        <ProgressBar value={goalPercent} color="var(--aura-yellow)" height={10} />
      </div>
      <button
        type="button"
        className="top-bar__settings"
        aria-label="Open settings"
        onClick={() => navigate({ name: 'settings' })}
      >
        <Settings size={18} aria-hidden="true" />
      </button>
    </header>
  )
}
