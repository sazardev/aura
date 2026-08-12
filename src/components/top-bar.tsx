import { ProgressBar } from '@/components/progress-bar'
import { levelFromXp } from '@/engine/xp'
import { useAuraStore } from '@/state/store'

export function TopBar() {
  const streak = useAuraStore((state) => state.streak)
  const xp = useAuraStore((state) => state.xp)
  const hearts = useAuraStore((state) => state.hearts)
  const daily = useAuraStore((state) => state.daily)
  const dailyGoal = useAuraStore((state) => state.dailyGoal)

  const level = levelFromXp(xp)
  const goalPercent = Math.min(100, Math.round((daily.xp / dailyGoal) * 100))

  return (
    <header className="top-bar">
      <div className="top-bar__stat" title="Day streak">
        <span className="top-bar__icon">🔥</span>
        <strong>{streak}</strong>
      </div>
      <div className="top-bar__stat" title="Experience points">
        <span className="top-bar__icon">⚡</span>
        <strong>{xp}</strong>
        <span className="top-bar__level">Lv {level.level}</span>
      </div>
      <div className="top-bar__stat" title="Hearts">
        <span className="top-bar__icon">❤️</span>
        <strong>{hearts}</strong>
      </div>
      <div className="top-bar__goal" title={`Daily goal: ${daily.xp}/${dailyGoal} XP`}>
        <span className="top-bar__goal-label">
          {daily.xp}/{dailyGoal}
        </span>
        <ProgressBar value={goalPercent} color="var(--aura-yellow)" height={10} />
      </div>
    </header>
  )
}
