import { analyzeText } from '@/engine/analyzer'

interface WorkerRequest {
  id: number
  text: string
}

const ctx = self as unknown as {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<WorkerRequest>) => void,
  ) => void
  postMessage: (message: unknown) => void
}

ctx.addEventListener('message', (event) => {
  void analyzeText(event.data.text)
    .then((result) => ctx.postMessage({ id: event.data.id, ok: true, result }))
    .catch((error: unknown) =>
      ctx.postMessage({ id: event.data.id, ok: false, error: String(error) }),
    )
})
