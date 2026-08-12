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
  { resolve: (value: AnalyzerResult) => void; reject: (error: Error) => void }
>()
const cache = new Map<string, AnalyzerResult>()
const CACHE_LIMIT = 12

function getWorker(): Worker {
  if (worker === undefined) {
    worker = new Worker(new URL('analyzer-worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const entry = pending.get(event.data.id)
      if (entry === undefined) return
      pending.delete(event.data.id)
      if (event.data.ok && event.data.result !== undefined) {
        entry.resolve(event.data.result)
      } else {
        entry.reject(new Error(event.data.error ?? 'Analysis failed'))
      }
    })
  }
  return worker
}

/**
 * Runs the full NLP analysis in a Web Worker so the UI never blocks, with an
 * LRU cache so re-analyzing the same text is instant.
 */
export async function analyzeText(text: string): Promise<AnalyzerResult> {
  const cached = cache.get(text)
  if (cached !== undefined) return cached

  const result = await new Promise<AnalyzerResult>((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, text } satisfies WorkerRequest)
  })

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(text, result)
  return result
}
