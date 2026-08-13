import { useEffect, useRef, useState } from 'react'

import type { AchievementDef } from '@/engine/types'

import { UiIcon } from '@/components/ui-icon'
import { achievementById } from '@/engine/achievements'
import { playSound } from '@/engine/sounds'
import { useAuraStore } from '@/state/store'

/**
 * Shows a toast when a new achievement is unlocked.
 */
export function AchievementToast() {
  const achievements = useAuraStore((state) => state.achievements)
  const known = useRef(new Set<string>(Object.keys(achievements)))
  const [toast, setToast] = useState<AchievementDef | undefined>(undefined)

  useEffect(() => {
    let unlocked: AchievementDef | undefined
    for (const id of Object.keys(achievements)) {
      if (known.current.has(id)) {
        continue
      }

      const definition = achievementById(id)
      if (definition !== undefined) unlocked = definition
    }
    known.current = new Set(Object.keys(achievements))
    if (unlocked === undefined) return
    playSound('achievement')
    setToast(unlocked)
    const timer = setTimeout(() => setToast(undefined), 4000)
    return () => clearTimeout(timer)
  }, [achievements])

  if (toast === undefined) return null

  return (
    <div className="achievement-toast" role="status">
      <span className="achievement-toast__emoji">
        <UiIcon name={toast.icon} size={30} />
      </span>
      <div className="achievement-toast__body">
        <strong>Achievement unlocked!</strong>
        <span>{toast.name}</span>
        <small>{toast.description}</small>
      </div>
    </div>
  )
}
