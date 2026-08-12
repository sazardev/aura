import { useEffect, useRef, useState } from 'react'

import type { AchievementDef } from '@/engine/achievements'

import { achievementById } from '@/engine/achievements'
import { useAuraStore } from '@/state/store'

/**
Muestra un aviso cuando se desbloquea un logro nuevo.
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
    setToast(unlocked)
    const timer = setTimeout(() => setToast(undefined), 4000)
    return () => clearTimeout(timer)
  }, [achievements])

  if (toast === undefined) return null

  return (
    <div className="achievement-toast" role="status">
      <span className="achievement-toast__emoji">{toast.emoji}</span>
      <div className="achievement-toast__body">
        <strong>¡Logro desbloqueado!</strong>
        <span>{toast.name}</span>
        <small>{toast.description}</small>
      </div>
    </div>
  )
}
