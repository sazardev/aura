export interface ChangelogSection {
  heading: string
  items: string[]
}

export interface ChangelogEntry {
  version: string
  date: string | undefined
  sections: ChangelogSection[]
}

const VERSION_LINE_RE = /^## \[(v?\d+\.\d+\.\d+)\](?:\s*-\s*(.+))?$/
const SECTION_LINE_RE = /^### (.+)$/
const BULLET_LINE_RE = /^[-*] (.+)$/

/**
 * Parses the `CHANGELOG.md` (Keep a Changelog format) into typed entries.
 * Bullets that appear directly under a version heading (before any `###`
 * subsection) are grouped under a synthetic "Notes" section, which keeps
 * curated changelog bodies readable. Empty entries are dropped.
 */
export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  let current: ChangelogEntry | undefined
  let section: ChangelogSection | undefined

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trimEnd()

    const versionMatch = VERSION_LINE_RE.exec(line)
    if (versionMatch !== null) {
      current = {
        version: (versionMatch[1] ?? '').replace(/^v/, ''),
        date: versionMatch[2],
        sections: [],
      }
      section = undefined
      entries.push(current)
      continue
    }

    if (current === undefined) continue

    const sectionMatch = SECTION_LINE_RE.exec(line)
    if (sectionMatch !== null) {
      section = { heading: sectionMatch[1] ?? '', items: [] }
      current.sections.push(section)
      continue
    }

    const bulletMatch = BULLET_LINE_RE.exec(line)
    const bullet = bulletMatch?.[1]
    if (bullet !== undefined) {
      let notes = section
      if (notes === undefined) {
        notes = { heading: 'Notes', items: [] }
        current.sections.push(notes)
        section = notes
      }
      notes.items.push(bullet.trim())
    }
  }

  return entries.filter((entry) => entry.sections.length > 0)
}
