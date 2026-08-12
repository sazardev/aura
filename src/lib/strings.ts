export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s']/gu, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let previousRow = Array.from({ length: b.length + 1 }, (_, index) => index)
  let currentRow = Array.from({ length: b.length + 1 }, () => 0)

  for (let row = 1; row <= a.length; row += 1) {
    const aChar = a[row - 1] ?? ''
    currentRow[0] = row
    for (let column = 1; column <= b.length; column += 1) {
      const bChar = b[column - 1] ?? ''
      const cost = aChar === bChar ? 0 : 1
      currentRow[column] = Math.min(
        (currentRow[column - 1] ?? 0) + 1,
        (previousRow[column] ?? 0) + 1,
        (previousRow[column - 1] ?? 0) + cost,
      )
    }
    previousRow = currentRow
    currentRow = Array.from({ length: b.length + 1 }, () => 0)
  }

  return previousRow[b.length] ?? 0
}

export function similarity(a: string, b: string): number {
  const left = normalizeText(a)
  const right = normalizeText(b)
  if (left === right) return 1
  if (left.length === 0 || right.length === 0) return 0
  const distance = levenshtein(left, right)
  return 1 - distance / Math.max(left.length, right.length)
}

export function isCloseEnough(actual: string, expected: string, threshold = 0.85): boolean {
  return similarity(actual, expected) >= threshold
}
