import type * as PdfJs from 'pdfjs-dist'

let pdfjs: typeof PdfJs | undefined
let worker: Worker | undefined

/**
 * Extracts the plain text of a PDF using PDF.js. This module is lazy-loaded
 * only when a PDF is actually imported, so the heavy PDF.js bundle never
 * touches the main chunk unless needed. Runs fully offline.
 */
export async function extractPdfText(data: Uint8Array): Promise<string> {
  if (pdfjs === undefined) {
    const [pdfModule, workerModule] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?worker'),
    ])
    pdfjs = pdfModule
    worker = new workerModule.default()
    pdfModule.GlobalWorkerOptions.workerPort = worker
  }

  const document = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []
  try {
    for (let index = 1; index <= document.numPages; index += 1) {
      const page = await document.getPage(index)
      const content = await page.getTextContent()
      const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
      pages.push(text.trim())
      page.cleanup()
    }
  } finally {
    await document.destroy()
  }
  return pages.join('\n\n')
}

export function disposePdfWorker(): void {
  worker?.terminate()
  worker = undefined
  pdfjs = undefined
}
