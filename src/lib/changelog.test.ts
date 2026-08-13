import { describe, expect, it } from 'vitest'

import { parseChangelog } from '@/lib/changelog'

const SAMPLE = `# Changelog

Intro.

## [Unreleased]

- Work in progress.

## [0.2.0] - 2026-08-13

### Added

- Offline classics library.
- Telemetry and insights.

### Fixed

- Streak calculation.

## [0.1.0] - 2026-08-12

- First release.

## [9.9.9]
`

describe('parseChangelog', () => {
  it('parses versions with dates, sections and bullets', () => {
    const entries = parseChangelog(SAMPLE)
    expect(entries).toHaveLength(2)

    expect(entries[0]).toEqual({
      version: '0.2.0',
      date: '2026-08-13',
      sections: [
        { heading: 'Added', items: ['Offline classics library.', 'Telemetry and insights.'] },
        { heading: 'Fixed', items: ['Streak calculation.'] },
      ],
    })

    expect(entries[1]).toEqual({
      version: '0.1.0',
      date: '2026-08-12',
      sections: [{ heading: 'Notes', items: ['First release.'] }],
    })
  })

  it('accepts v-prefixed versions', () => {
    const [entry] = parseChangelog('## [v0.1.0] - 2026-08-12\n\n- Hello.')
    expect(entry?.version).toBe('0.1.0')
  })

  it('drops versions with no bullets and the Unreleased section', () => {
    const entries = parseChangelog(SAMPLE)
    expect(entries.find((entry) => entry.version === 'Unreleased')).toBeUndefined()
    expect(entries.find((entry) => entry.version === '9.9.9')).toBeUndefined()
  })
})
