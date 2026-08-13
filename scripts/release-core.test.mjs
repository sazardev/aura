import { describe, expect, it } from 'vitest'

import {
  bumpFromCommits,
  classifyCommit,
  hasCuratedContent,
  nextVersion,
  parseVersion,
  releaseSection,
  renderNotesByType,
  rollOverUnreleased,
  unreleasedContent,
} from './release-core.mjs'

const SAMPLE = `# Changelog

Intro line.

## [Unreleased]

## [0.1.0] - 2026-08-12

### Added

- First release.
`

describe('parseVersion / nextVersion', () => {
  it('parses plain and v-prefixed semver', () => {
    expect(parseVersion('0.1.0')).toEqual({ major: 0, minor: 1, patch: 0 })
    expect(parseVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 })
    expect(parseVersion('nope')).toBeNull()
  })

  it('bumps patch, minor and major', () => {
    expect(nextVersion('0.1.0', 'patch')).toBe('0.1.1')
    expect(nextVersion('0.1.0', 'minor')).toBe('0.2.0')
    expect(nextVersion('0.1.0', 'major')).toBe('1.0.0')
    expect(nextVersion('1.2.3', 'major')).toBe('2.0.0')
  })
})

describe('classifyCommit / bumpFromCommits', () => {
  it('parses conventional commit shapes', () => {
    expect(classifyCommit('feat: add things')).toEqual({
      type: 'feat',
      scope: undefined,
      breaking: false,
      subject: 'add things',
    })
    expect(classifyCommit('feat(dev): port fallback')).toEqual({
      type: 'feat',
      scope: 'dev',
      breaking: false,
      subject: 'port fallback',
    })
    expect(classifyCommit('fix!: drop API')).toEqual({
      type: 'fix',
      scope: undefined,
      breaking: true,
      subject: 'drop API',
    })
  })

  it('returns null when there is nothing meaningful', () => {
    expect(bumpFromCommits([])).toBeNull()
    expect(bumpFromCommits(['chore: bump deps', 'ci: tweak workflow'])).toBeNull()
  })

  it('maps feat to minor, fix to patch, breaking to major', () => {
    expect(bumpFromCommits(['feat: ship library'])).toBe('minor')
    expect(bumpFromCommits(['fix: correct streak'])).toBe('patch')
    expect(bumpFromCommits(['feat: a', 'fix: b'])).toBe('minor')
    expect(bumpFromCommits(['feat!: rewrite storage'])).toBe('major')
  })
})

describe('renderNotesByType', () => {
  it('groups commits by type and flags breaking changes', () => {
    const notes = renderNotesByType([
      'feat: library',
      'fix: typo',
      'perf: faster',
      'feat!: new format',
    ])
    expect(notes).toContain('### Breaking changes\n\n- new format')
    expect(notes).toContain('### Added\n\n- library')
    expect(notes).toContain('### Fixed\n\n- typo')
    expect(notes).toContain('### Performance\n\n- faster')
  })

  it('skips chore/build/ci/test commits', () => {
    expect(renderNotesByType(['chore: bump', 'test: add tests'])).toBe('')
  })
})

describe('unreleased content', () => {
  it('detects curated bullets but ignores empty sections', () => {
    expect(hasCuratedContent(SAMPLE)).toBe(false)
    expect(
      hasCuratedContent(SAMPLE.replace('## [Unreleased]', '## [Unreleased]\n\n- curated item')),
    ).toBe(true)
    expect(unreleasedContent(SAMPLE)).toEqual([])
  })

  it('returns the curated body verbatim', () => {
    const withNotes = SAMPLE.replace('## [Unreleased]', '## [Unreleased]\n\n- one\n- two')
    expect(unreleasedContent(withNotes)).toEqual(['', '- one', '- two'])
  })
})

describe('rollOverUnreleased', () => {
  it('moves Unreleased to a dated release and keeps older entries', () => {
    const updated = rollOverUnreleased(SAMPLE, '0.2.0', '2026-08-13', '\n### Added\n- Library.')
    expect(updated.startsWith('# Changelog\n\nIntro line.\n\n## [Unreleased]')).toBe(true)
    expect(updated).toContain('## [0.2.0] - 2026-08-13\n\n### Added\n- Library.')
    expect(updated).toContain('## [0.1.0] - 2026-08-12')
  })

  it('throws without an Unreleased section', () => {
    expect(() =>
      rollOverUnreleased('# Changelog\n\n## [0.1.0] - 2026-08-12', '0.2.0', '2026-08-13', ''),
    ).toThrow(/Unreleased/)
  })
})

describe('releaseSection', () => {
  it('extracts the body of a version, with or without the v prefix', () => {
    const changelog = SAMPLE + '\n## [0.2.0] - 2026-08-13\n\n### Added\n\n- Library.\n'
    expect(releaseSection(changelog, '0.2.0')).toBe('### Added\n\n- Library.')
    expect(releaseSection(changelog, 'v0.1.0')).toContain('- First release.')
    expect(releaseSection(changelog, '9.9.9')).toBe('')
  })
})
