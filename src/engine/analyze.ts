import type { AnalyzerResult } from '@/engine/analyzer'

interface WorkerRequest {
  id: number
  text: string
}

interface WorkerResponse {
  id: number
  ok: boolean
  result?: AnalyzerResult
  error?: string
}

let worker: Worker | undefined
let nextId = 0
const pending = new Map<
  number,
  {
    resolve: (value: AnalyzerResult) => void
    reject: (error: Error) => void
    timer: number
  }
>()
const cache = new Map<string, AnalyzerResult>()
const CACHE_LIMIT = 12
const ANALYSIS_TIMEOUT_MS = 15_000

function getWorker(): Worker {
  if (worker === undefined) {
    worker = new Worker(new URL('analyzer-worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const entry = pending.get(event.data.id)
      if (entry === undefined) return
      pending.delete(event.data.id)
      clearTimeout(entry.timer)
      if (event.data.ok && event.data.result !== undefined) {
        entry.resolve(event.data.result)
      } else {
        entry.reject(new Error(event.data.error ?? 'Analysis failed'))
      }
    })
    worker.addEventListener('error', (event) => {
      for (const entry of pending.values()) {
        clearTimeout(entry.timer)
        entry.reject(new Error(event.message || 'Analysis worker failed'))
      }
      pending.clear()
    })
  }
  return worker
}

/**
 * Runs the full NLP analysis in a Web Worker so the UI never blocks, with an
 * LRU cache so re-analyzing the same text is instant. Never hangs: a worker
 * crash or a 15s timeout rejects so screens can show an error instead of a
 * forever-spinning button.
 */
export async function analyzeText(text: string): Promise<AnalyzerResult> {
  const cached = cache.get(text)
  if (cached !== undefined) return cached

  const result = await new Promise<AnalyzerResult>((resolve, reject) => {
    const id = ++nextId
    const timer = window.setTimeout(() => {
      pending.delete(id)
      reject(new Error('Analysis timed out. Try a shorter text.'))
    }, ANALYSIS_TIMEOUT_MS)
    pending.set(id, { resolve, reject, timer })
    getWorker().postMessage({ id, text } satisfies WorkerRequest)
  })

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(text, result)
  return result
}
