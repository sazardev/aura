import type { LucideIcon } from 'lucide-react'

import {
  Bird,
  Bug,
  Cat,
  Crown,
  Dog,
  Fish,
  Flame,
  Ghost,
  Moon,
  Rabbit,
  Rocket,
  Squirrel,
  Star,
  Sun,
  Turtle,
} from 'lucide-react'

const AVATARS: Record<string, LucideIcon> = {
  Bird,
  Bug,
  Cat,
  Crown,
  Dog,
  Fish,
  Flame,
  Ghost,
  Moon,
  Rabbit,
  Rocket,
  Squirrel,
  Star,
  Sun,
  Turtle,
}

/**
 * Renders the user's avatar icon (falls back to the Aura bird).
 */
export function AvatarIcon({
  name,
  size,
  color,
}: {
  name: string
  size: number
  color?: string | undefined
}) {
  const Icon = AVATARS[name] ?? Bird
  return (
    <span style={color === undefined ? undefined : { color }}>
      <Icon size={Math.round(size * 0.55)} aria-hidden="true" />
    </span>
  )
}
