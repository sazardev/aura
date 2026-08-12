interface ProgressBarProps {
  value: number
  color?: string
  height?: number
}

export function ProgressBar({ value, color, height = 12 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      style={{ height }}
    >
      <div
        className="progress-bar__fill"
        style={{
          width: `${clamped}%`,
          ...(color !== undefined && { background: color }),
        }}
      />
    </div>
  )
}
