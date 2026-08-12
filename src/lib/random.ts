/**
Deterministic RNG (mulberry32). Ideal for reproducible exercises.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d_2b_79_f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/**
Simple FNV-1a hash for strings.
 */
export function hashString(input: string): number {
  let hash = 0x81_1c_9d_c5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.codePointAt(index) ?? 0
    hash = Math.imul(hash, 0x01_00_01_93)
  }
  return hash >>> 0
}

/**
Shuffles an array using the given RNG (Fisher-Yates).
 */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1))
    const current = result[index]
    if (current === undefined) continue
    result[index] = result[other] as T
    result[other] = current
  }
  return result
}

/**
Samples `count` unique items at random.
 */
export function sample<T>(items: readonly T[], rng: () => number, count: number): T[] {
  return shuffle(items, rng).slice(0, count)
}
