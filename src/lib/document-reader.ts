export type SupportedFileKind = 'pdf' | 'text'

/**
 * Detects whether a file is a PDF by its name. Everything else (TXT, MD…)
 * is read as plain text.
 */
export function fileKind(name: string): SupportedFileKind {
  return /\.pdf$/i.test(name) ? 'pdf' : 'text'
}

/**
 * Reads the text of an imported file. Works on every platform — plain
 * browsers, Tauri webviews on desktop and mobile. PDFs are extracted with a
 * lazy-loaded offline PDF.js reader; TXT/MD files are read as text.
 */
export async function readDocumentFile(file: File): Promise<string> {
  if (fileKind(file.name) === 'pdf') {
    const { extractPdfText } = await import('@/lib/pdf-extract')
    return extractPdfText(new Uint8Array(await file.arrayBuffer()))
  }
  return file.text()
}
