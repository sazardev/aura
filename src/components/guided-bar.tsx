import { PartyPopper } from 'lucide-react'

import { guidedProgress } from '@/engine/guide'
import { useHashRoute } from '@/hooks/use-hash-route'
import { useAuraStore } from '@/state/store'

/**
 * Persistent pill shown while the guided "Try it yourself" tour is active, so
 * the learner can always hop back to the checklist from any screen.
 */
export function GuidedBar() {
  const guidedActive = useAuraStore((state) => state.guidedActive)
  const guidedActions = useAuraStore((state) => state.guidedActions)
  const { route, navigate } = useHashRoute()

  if (!guidedActive || route.name === 'tour') return null

  const progress = guidedProgress(guidedActions)

  return (
    <button
      type="button"
      className="guided-bar"
      aria-label="Continue the guided tour"
      onClick={() => navigate({ name: 'tour' })}
    >
      <PartyPopper size={16} aria-hidden="true" />
      <span>
        Tour · {progress.done}/{progress.total}
      </span>
    </button>
  )
}
