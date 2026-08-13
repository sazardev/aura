import { Bird } from 'lucide-react'

interface LogoProps {
  size?: number
  withBackground?: boolean
}

/**
 * Minimalist Aura brand mark: a soaring bird (Lucide "Bird") — wings taking
 * flight, echoing the owl mascot. Optional solid-accent rounded background for
 * app-icon-style usage. Colors follow the active accent theme.
 */
export function Logo({ size = 40, withBackground = false }: LogoProps) {
  if (withBackground) {
    return (
      <span
        className="logo"
        role="img"
        aria-label="Aura logo"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.22),
          background: 'var(--aura-green)',
        }}
      >
        <Bird size={Math.round(size * 0.62)} color="#ffffff" strokeWidth={2.2} aria-hidden="true" />
      </span>
    )
  }
  return (
    <Bird
      size={size}
      color="var(--aura-green)"
      strokeWidth={2.2}
      role="img"
      aria-label="Aura logo"
    />
  )
}
