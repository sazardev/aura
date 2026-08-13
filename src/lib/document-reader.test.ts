import { describe, expect, it } from 'vitest'

import { fileKind } from '@/lib/document-reader'

describe('Document reader', () => {
  it('detects PDFs by extension', () => {
    expect(fileKind('chapter.PDF')).toBe('pdf')
    expect(fileKind('book.pdf')).toBe('pdf')
  })

  it('reads everything else as text', () => {
    expect(fileKind('notes.txt')).toBe('text')
    expect(fileKind('README.md')).toBe('text')
    expect(fileKind('file')).toBe('text')
  })
})
