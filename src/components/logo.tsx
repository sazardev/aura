interface LogoProps {
  size?: number
  withBackground?: boolean
}

const STROKE = '#58cc02'

/**
 * Minimalist Aura brand mark: a geometric "A" wrapped in a thin halo ring
 * (the "aura"). Optional green background for app-icon-style usage.
 */
export function Logo({ size = 40, withBackground = false }: LogoProps) {
  const color = withBackground ? '#ffffff' : STROKE
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" role="img" aria-label="Aura logo">
      {withBackground && <rect width="1024" height="1024" rx="232" fill={STROKE} />}
      <circle
        cx="512"
        cy="512"
        r="322"
        fill="none"
        stroke={color}
        strokeOpacity={withBackground ? 0.4 : 1}
        strokeWidth="26"
      />
      <path
        d="M318 736 L512 318 L706 736"
        fill="none"
        stroke={color}
        strokeWidth="94"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M394 604 L630 604"
        fill="none"
        stroke={color}
        strokeWidth="84"
        strokeLinecap="round"
      />
    </svg>
  )
}
