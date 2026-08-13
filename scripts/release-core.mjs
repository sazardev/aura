export const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)$/

export function parseVersion(version) {
  const match = SEMVER_RE.exec(version.trim())
  if (match === null) return null
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
}

export function formatVersion(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`
}

export function nextVersion(current, bump) {
  const parts = parseVersion(current)
  if (parts === null) throw new Error(`invalid current version: ${current}`)
  if (bump === 'major') {
    parts.major += 1
    parts.minor = 0
    parts.patch = 0
  } else if (bump === 'minor') {
    parts.minor += 1
    parts.patch = 0
  } else if (bump === 'patch') {
    parts.patch += 1
  } else {
    throw new Error(`invalid bump type: ${bump}`)
  }
  return formatVersion(parts)
}

const CONVENTIONAL_RE = /^(\w+)(?:\(([^)]*)\))?(!)?:\s+(.+)$/i

export function classifyCommit(subject) {
  const match = CONVENTIONAL_RE.exec(subject.trim())
  if (match === null) {
    return { type: 'other', scope: undefined, breaking: false, subject: subject.trim() }
  }
  return {
    type: match[1].toLowerCase(),
    scope: match[2],
    breaking: match[3] === '!',
    subject: match[4],
  }
}

const MEANINGFUL_TYPES = new Set(['feat', 'fix', 'perf', 'refactor', 'style', 'docs'])

/**
 * Computes the bump from conventional-commit messages. Returns null when there
 * is nothing worth releasing (no breaking change, no feat/fix/perf/refactor/
 * style/docs commit), which keeps the release idempotent.
 */
export function bumpFromCommits(commits) {
  const relevant = commits
    .map((commit) => (typeof commit === 'string' ? classifyCommit(commit) : commit))
    .filter((commit) => commit.breaking || MEANINGFUL_TYPES.has(commit.type))
  if (relevant.length === 0) return null

  let bump = 'patch'
  for (const commit of relevant) {
    if (commit.breaking) return 'major'
    if (commit.type === 'feat') bump = 'minor'
  }
  return bump
}

const NOTES_GROUPS = {
  feat: 'Added',
  fix: 'Fixed',
  perf: 'Performance',
  refactor: 'Changed',
  style: 'Changed',
  docs: 'Documentation',
}

export function renderNotesByType(commits) {
  const groups = new Map()
  const breaking = []

  for (const commit of commits) {
    const info = typeof commit === 'string' ? classifyCommit(commit) : commit
    if (info.breaking) {
      breaking.push(info.subject)
      continue
    }
    const heading = NOTES_GROUPS[info.type]
    if (heading === undefined) continue
    const items = groups.get(heading) ?? []
    items.push(info.subject)
    groups.set(heading, items)
  }

  const sections = []
  if (breaking.length > 0) sections.push({ heading: 'Breaking changes', items: breaking })
  for (const heading of Object.values(NOTES_GROUPS)) {
    const items = groups.get(heading)
    if (items !== undefined && items.length > 0) sections.push({ heading, items })
  }
  return renderSections(sections)
}

export function renderSections(sections) {
  return sections
    .map(
      (section) =>
        `\n### ${section.heading}\n\n${section.items.map((item) => `- ${item}`).join('\n')}`,
    )
    .join('\n')
}

function changelogLines(markdown) {
  return markdown.split('\n')
}

function findUnreleasedIndex(lines) {
  return lines.findIndex((line) => /^## \[Unreleased\]/.test(line.trim()))
}

/**
 * Returns the raw body lines of the `## [Unreleased]` section (empty array
 * when the section is absent or blank). This is the curated, hand-edited
 * content; leading/trailing blank lines are stripped.
 */
export function unreleasedContent(markdown) {
  const lines = changelogLines(markdown)
  const index = findUnreleasedIndex(lines)
  if (index === -1) return []
  const body = []
  for (let i = index + 1; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) break
    body.push(lines[i])
  }
  while (body.length > 0 && body[body.length - 1].trim().length === 0) body.pop()
  return body
}

export function hasCuratedContent(markdown) {
  return unreleasedContent(markdown).some((line) => {
    const trimmed = line.trim()
    return trimmed.length > 0 && !trimmed.startsWith('<!--')
  })
}

/**
 * Replaces the `## [Unreleased]` block with a fresh empty Unreleased section
 * followed by the new released section, preserving everything else (the title,
 * the intro and every older release) untouched.
 */
export function rollOverUnreleased(markdown, version, date, notes) {
  const lines = changelogLines(markdown)
  const index = findUnreleasedIndex(lines)
  if (index === -1) throw new Error('CHANGELOG.md has no "## [Unreleased]" section')

  let end = index + 1
  while (end < lines.length && !/^## /.test(lines[end])) end += 1

  const head = lines.slice(0, index).join('\n').replace(/\n+$/, '')
  const tail = lines.slice(end).join('\n').replace(/^\n+/, '').replace(/\n+$/, '')
  const released = `## [${version}] - ${date}\n${notes.trimEnd()}`

  return `${head}\n\n## [Unreleased]\n\n${released}${tail.length === 0 ? '' : `\n\n${tail}`}\n`
}

/**
 * Extracts the markdown body of a released version section (e.g. for a GitHub
 * Release body). `version` may be with or without a leading `v`.
 */
export function releaseSection(markdown, version) {
  const normalized = version.replace(/^v/, '')
  const lines = changelogLines(markdown)
  let start = -1
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^## \[([^\]]+)\]/.exec(lines[i].trim())
    if (match !== null && match[1].replace(/^v/, '') === normalized) {
      start = i + 1
      break
    }
  }
  if (start === -1) return ''

  const body = []
  for (let i = start; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) break
    body.push(lines[i])
  }
  return body.join('\n').trim()
}
