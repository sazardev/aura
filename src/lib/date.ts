const DAY_MS = 86_400_000

/**
Local YYYY-MM-DD key (local timezone).
 */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/**
Yesterday's key relative to `todayKey` (YYYY-MM-DD).
 */
export function previousDayKey(todayKey: string): string {
  const [year, month, day] = todayKey.split('-').map(Number) as [number, number, number]
  const date = new Date(year, month - 1, day)
  return localDateKey(addDays(date, -1))
}

/**
Returns the difference in days (b - a) between two date keys.
 */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number]
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number]
  const aDate = new Date(ay, am - 1, ad)
  const bDate = new Date(by, bm - 1, bd)
  return Math.round((bDate.getTime() - aDate.getTime()) / DAY_MS)
}

/**
Milliseconds until the next local midnight.
 */
export function msUntilNextDay(): number {
  const now = new Date()
  const tomorrow = addDays(now, 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.getTime() - now.getTime()
}
