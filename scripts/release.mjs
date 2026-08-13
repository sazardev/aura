import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'

import * as core from './release-core.mjs'
import { syncVersions, verifyVersions } from './lib/version-sync.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHANGELOG = resolve(ROOT, 'CHANGELOG.md')

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

function lastTag() {
  try {
    return git(['describe', '--tags', '--abbrev=0', '--match', 'v*'])
  } catch {
    return null
  }
}

function commitsSince(tag) {
  const args = tag === null ? ['log', '--format=%s'] : ['log', `${tag}..HEAD`, '--format=%s']
  try {
    return git(args)
      .split('\n')
      .filter((line) => line.length > 0)
  } catch {
    return []
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function readChangelog() {
  return readFileSync(CHANGELOG, 'utf8')
}

/**
 * Machine-readable release entry point. Prints the new tag (`vX.Y.Z`) on
 * stdout when a release was created, and nothing when there is nothing to
 * release (exit code 0 in both cases, so CI can rely on stdout alone).
 */
function release({ commit }) {
  const current = verifyVersions()
  const tag = lastTag()
  const commits = commitsSince(tag)
  const changelog = readChangelog()
  const curated = core.hasCuratedContent(changelog)

  const bump = core.bumpFromCommits(commits) ?? (curated ? 'patch' : null)

  if (bump === null) {
    console.error('nothing to release: no meaningful commits since the last tag')
    return ''
  }

  const next = core.nextVersion(current, bump)
  const notes = curated
    ? core.unreleasedContent(changelog).join('\n')
    : core.renderNotesByType(commits)
  const updated = core.rollOverUnreleased(changelog, next, today(), notes)

  writeFileSync(CHANGELOG, updated)
  syncVersions(next)

  if (commit) {
    git([
      'add',
      'CHANGELOG.md',
      'package.json',
      'src-tauri/tauri.conf.json',
      'src-tauri/Cargo.toml',
      'src-tauri/Cargo.lock',
    ])
    git(['commit', '-m', `chore(release): v${next}`])
    git(['tag', '-a', `v${next}`, '-m', `Aura v${next}`])
    console.error(`released ${current} -> v${next} (tag v${next} created)`)
  } else {
    console.error(`would release ${current} -> v${next} (${bump}, ${commits.length} commits)`)
  }
  return `v${next}`
}

function check() {
  const current = verifyVersions()
  const tag = lastTag()
  const commits = commitsSince(tag)
  const curated = core.hasCuratedContent(readChangelog())
  const bump = core.bumpFromCommits(commits) ?? (curated ? 'patch' : null)

  if (bump === null) {
    console.log(
      `nothing to release: version ${current}, no commits since ${tag ?? 'the beginning'}`,
    )
    return
  }
  const next = core.nextVersion(current, bump)
  console.log(`current:   ${current}`)
  console.log(`next:      ${next} (${bump})`)
  console.log(`commits:   ${commits.length} since ${tag ?? 'the beginning'}`)
  console.log(
    `changelog: ${curated ? 'curated [Unreleased] content' : 'auto-generated from commits'}`,
  )
}

const args = parseArgs({
  options: {
    check: { type: 'boolean', default: false },
    commit: { type: 'boolean', default: false },
    notes: { type: 'string' },
  },
})

if (args.values.notes !== undefined) {
  const body = core.releaseSection(readChangelog(), args.values.notes)
  process.stdout.write(`${body}${body.length > 0 ? '\n' : ''}`)
  process.exit(0)
}

if (args.values.check) {
  check()
  process.exit(0)
}

const result = release({ commit: args.values.commit })
if (result.length > 0) process.stdout.write(`${result}\n`)
