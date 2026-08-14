import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const VITE_BIN = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const LIGHTHOUSE_BIN = join(root, 'node_modules', 'lighthouse', 'cli', 'index.js')
const DIST_DIR = join(root, 'dist')
const REPORT_DIR = join(root, 'lighthouse-reports')
const START_URL = 'http://localhost'
const PREFERRED_PORT = 4173
const CDP_PORT_BASE = 9222

/**
 * Candidate Chrome/Chromium executables, in order of preference.
 */
const CHROME_CANDIDATES = [
  process.env['CHROME_PATH'],
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/sbin/chromium',
  '/opt/google/chrome/chrome',
  '/snap/bin/chromium',
]

function whichChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate !== undefined && existsSync(candidate)) return candidate
  }
  const found = spawnSync('which', ['google-chrome', 'chromium', 'chromium-browser'], {
    encoding: 'utf8',
  })
    .stdout?.trim()
    .split('\n')
    .find((line) => line.length > 0)
  return found ?? undefined
}

async function puppeteerChrome() {
  try {
    const puppeteer = await import('puppeteer')
    const path = await puppeteer.executablePath()
    if (path !== undefined && existsSync(path)) return path
  } catch {
    // Puppeteer not installed — fall back to a system Chrome.
  }
  return undefined
}

async function resolveChrome() {
  const fromPuppeteer = await puppeteerChrome()
  if (fromPuppeteer !== undefined) return fromPuppeteer
  return whichChrome()
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(false))
  })
}

async function findFreePort(preferred = PREFERRED_PORT) {
  for (let offset = 0; offset < 100; offset += 1) {
    const candidate = preferred + offset
    if (!(await isPortOpen(candidate))) return candidate
  }
  throw new Error(`No free ports available starting at ${preferred}`)
}

async function waitForServer(port, timeoutMs = 30_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(port)) return true
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return false
}

function devToolsReady(port) {
  return new Promise((resolve) => {
    const request = http.get({ host: '127.0.0.1', port, path: '/json/version' }, (response) => {
      response.resume()
      resolve(response.statusCode === 200)
    })
    request.setTimeout(1000, () => {
      request.destroy()
      resolve(false)
    })
    request.on('error', () => resolve(false))
  })
}

async function waitForDevTools(port, timeoutMs = 30_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await devToolsReady(port)) return true
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return false
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...options.env },
      stdio: options.stdio ?? 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)),
    )
  })
}

/**
 * Every route worth auditing, derived from the actual course data so the
 * deep pass always covers real pages. `--screen` audits one screen per type
 * (fast); the default audits every lesson, grammar lesson and dialogue.
 */
function buildRoutes(screenOnly) {
  const routes = []
  const push = (label, path) => routes.push({ label, path: `#${path}` })

  // Static screens (shared shell routes).
  push('onboarding', '/home')
  push('home', '/home')
  push('roadmap', '/roadmap')
  push('dictionary', '/dictionary')
  push('dictionary-word', '/dictionary?word=apple')
  push('analyzer', '/analyzer')
  push('library', '/library')
  push('review', '/review')
  push('speak', '/speak')
  push('write', '/write')
  push('dictation', '/dictation')
  push('dialogue', '/dialogue')
  push('grammar', '/grammar')
  push('profile', '/profile')
  push('profile-history', '/profile/history')
  push('profile-achievements', '/profile/achievements')
  push('profile-stats', '/profile/stats')
  push('settings', '/settings')
  push('data', '/data')
  push('backup', '/backup')
  push('about', '/about')
  push('tour', '/tour')

  // Every course lesson (course + generated expansion).
  for (const file of ['course.json', 'course-expansion.json']) {
    const course = JSON.parse(readFileSync(join(root, 'src', 'data', file), 'utf8'))
    for (const unit of course) {
      const lessons = screenOnly ? unit.lessons.slice(0, 1) : unit.lessons
      for (const lesson of lessons) push(`lesson-${lesson.id}`, `/lesson/${lesson.id}`)
    }
  }

  // Every grammar lesson.
  const grammar = JSON.parse(readFileSync(join(root, 'src', 'data', 'grammar.json'), 'utf8'))
  for (const unit of grammar) {
    const lessons = screenOnly ? unit.lessons.slice(0, 1) : unit.lessons
    for (const lesson of lessons) push(`grammar-${lesson.id}`, `/grammar/${lesson.id}`)
  }

  // Every dialogue.
  const dialogues = JSON.parse(readFileSync(join(root, 'src', 'data', 'dialogues.json'), 'utf8'))
  const pickedDialogues = screenOnly ? dialogues.slice(0, 1) : dialogues
  for (const dialogue of pickedDialogues) {
    push(`dialogue-${dialogue.id}`, `/dialogue/${dialogue.id}`)
  }

  // The library book screen + one reader route (content is code-split per book).
  const library = JSON.parse(readFileSync(join(root, 'src', 'data', 'library.json'), 'utf8'))
  const firstBook = library[0]
  if (firstBook !== undefined) push(`book-${firstBook.id}`, `/book/${firstBook.id}`)
  const readerBook = library.find((book) => book.id === 'alice-in-wonderland') ?? firstBook
  if (readerBook !== undefined) push(`read-${readerBook.id}`, `/read/${readerBook.id}/c1/s1-1`)

  return routes
}

/**
 * localStorage seeded once (after the onboarding audit) so every real screen
 * renders: past onboarding, some progress, a few cards and saved words.
 */
function seedPayload() {
  const state = {
    onboardingDone: true,
    guidedActive: false,
    xp: 250,
    totalLessons: 6,
    totalCorrect: 80,
    totalWrong: 12,
    streak: 3,
    completedLessons: ['greetings-1', 'greetings-2', 'food-1'],
    learnedWords: ['hello', 'goodbye', 'apple', 'banana'],
    cards: {
      'card-apple': {
        id: 'card-apple',
        word: 'apple',
        meaning: 'a round fruit',
        note: 'from the course',
        createdAt: '2026-06-01T00:00:00.000Z',
        state: {
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          due: '2026-08-13T00:00:00.000Z',
          lapses: 1,
        },
      },
      'card-hello': {
        id: 'card-hello',
        word: 'hello',
        meaning: 'a greeting you say when you meet someone',
        createdAt: '2026-06-01T00:00:00.000Z',
        state: {
          interval: 2,
          repetition: 2,
          efactor: 2.5,
          due: '2026-08-15T00:00:00.000Z',
          lapses: 0,
        },
      },
    },
  }
  return JSON.stringify({ state, version: 11 })
}

const args = new Set(process.argv.slice(2))
const chromePath = await resolveChrome()
if (chromePath === undefined) {
  console.error(
    'Lighthouse needs Chrome or Chromium installed.\n' +
      'Install it, or pass CHROME_PATH=/path/to/chrome so it can run.',
  )
  process.exit(1)
}

if (!args.has('--no-build')) {
  console.log('\nBuilding the app (vite build)…\n')
  await run(process.execPath, [VITE_BIN, 'build'])
} else if (!existsSync(join(DIST_DIR, 'index.html'))) {
  console.error('No build found in dist/. Run without --no-build first.')
  process.exit(1)
}

const routes = buildRoutes(args.has('--screen'))
const total = routes.length
console.log(
  `\nAuditing ${total} routes (~${Math.round((total * 25) / 60)} min at ~25s each)` +
    (args.has('--screen') ? ' — screens only' : ' — full deep pass') +
    '…',
)

const port = await findFreePort()
const origin = `${START_URL}:${port}`

const preview = spawn(
  process.execPath,
  [VITE_BIN, 'preview', '--port', String(port), '--strictPort'],
  { stdio: 'ignore' },
)

let closing = false
function close(code) {
  if (closing) return
  closing = true
  preview.kill()
  process.exit(code)
}
process.on('SIGINT', () => close(0))
process.on('SIGTERM', () => close(0))

// Chrome is launched directly over the DevTools protocol (not via
// chrome-launcher, whose WSL path handling breaks Linux Chromium under WSL).
// Headed mode emits the FCP lifecycle events Lighthouse needs (headless=new
// times out with NO_FCP on this setup); on a machine without a display it
// falls back to headless as a best effort. A fresh Chrome per route keeps
// every audit isolated and avoids crashes from accumulated tabs.
const headlessArgs = process.env['DISPLAY'] ? [] : ['--headless=new']

async function runChrome(task) {
  const cdpPort = await findFreePort(CDP_PORT_BASE)
  const profileDir = join(tmpdir(), `aura-lighthouse-${process.pid}-${cdpPort}`)
  const chrome = spawn(
    chromePath,
    [
      ...headlessArgs,
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  )

  const killChrome = () => {
    try {
      // SIGKILL the whole process group so no crashpad/gpu children survive.
      process.kill(-chrome.pid, 'SIGKILL')
    } catch {
      chrome.kill('SIGKILL')
    }
  }

  try {
    if (!(await waitForDevTools(cdpPort))) {
      throw new Error(`Chrome did not expose DevTools on port ${cdpPort}`)
    }
    return await task(cdpPort)
  } finally {
    killChrome()
    await new Promise((resolve) => setTimeout(resolve, 400))
    try {
      rmSync(profileDir, { recursive: true, force: true })
    } catch {
      // Chrome may still hold a file — the temp profile is harmless if it survives.
    }
  }
}

const results = []
try {
  if (!(await waitForServer(port))) {
    throw new Error(`The preview server did not start on port ${port}`)
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  const preset = args.has('--mobile') ? 'mobile' : 'desktop'

  for (const [index, route] of routes.entries()) {
    const url = `${origin}${route.path}`
    const label = `${String(index + 1).padStart(2, '0')}-${route.label}`
    console.log(`\n[${index + 1}/${total}] ${route.label} — ${route.path}`)

    const result = await runChrome(async (cdpPort) => {
      try {
        // The onboarding screen must be audited before the store is seeded.
        if (route.label !== 'onboarding') {
          await seedStore(cdpPort, origin)
        }
        return await audit(url, label, preset, cdpPort)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`  ⚠ ${message}`)
        return { label, error: message }
      }
    })

    results.push(result)
  }

  writeSummary(results)
  printSummary(results)

  if (args.has('--view')) {
    spawn('xdg-open', [join(REPORT_DIR, 'index.html')], { stdio: 'ignore' })
  }
} catch (error) {
  console.error(`\nLighthouse failed: ${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
} finally {
  preview.kill()
}

async function audit(url, label, preset, cdpPort) {
  const outputPath = join(REPORT_DIR, label)
  const lighthouseArgs = [
    LIGHTHOUSE_BIN,
    url,
    '--output',
    'html',
    '--output',
    'json',
    '--output-path',
    outputPath,
    ...(preset === 'desktop' ? ['--preset', 'desktop'] : []),
    `--port=${cdpPort}`,
    '--quiet',
  ]
  try {
    await run(process.execPath, lighthouseArgs)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!existsSync(`${outputPath}.report.json`)) {
      throw new Error(`${message} (no report written for ${label})`, { cause: error })
    }
    console.warn(`  ⚠ run reported an error but a report was saved: ${message}`)
  }
  return readResult(label)
}

async function seedStore(cdpPort, origin) {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${cdpPort}` })
  const page = await browser.newPage()
  try {
    await page.goto(`${origin}/#/home`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page.evaluate((payload) => {
      localStorage.setItem('aura-state', payload)
    }, seedPayload())
  } catch {
    // Seeding is best-effort; the screens still render with defaults.
  } finally {
    await page.close()
    await browser.disconnect()
  }
  console.log('\nSeeded profile — auditing real screens now.')
}

function readResult(label) {
  const file = join(REPORT_DIR, `${label}.report.json`)
  if (!existsSync(file)) return { label, error: 'no report' }
  try {
    const lhr = JSON.parse(readFileSync(file, 'utf8'))
    const categories = Object.fromEntries(
      Object.entries(lhr.categories).map(([id, category]) => [
        id,
        Math.round((category.score ?? 0) * 100),
      ]),
    )
    return { label, categories }
  } catch {
    return { label, error: 'unreadable report' }
  }
}

function printSummary(results) {
  const keys = ['performance', 'accessibility', 'best-practices', 'seo']
  const labelWidth = Math.max(...results.map((r) => r.label.length), 'route'.length)
  console.log('\n\n===== Lighthouse summary =====\n')
  console.log(`  ${'route'.padEnd(labelWidth)}  ${keys.map((k) => k.padEnd(14)).join('')}`)
  for (const result of results) {
    if (result.error !== undefined) {
      console.log(`  ${result.label.padEnd(labelWidth)}  ${result.error}`)
      continue
    }
    const row = keys
      .map((key) => {
        const score = result.categories[key]
        return score === undefined ? '—'.padEnd(14) : `${String(score).padEnd(14)}`
      })
      .join('')
    console.log(`  ${result.label.padEnd(labelWidth)}  ${row}`)
  }
  console.log(`\nFull HTML reports in ${REPORT_DIR}/ (summary: index.html)`)
}

function writeSummary(results) {
  const keys = ['performance', 'accessibility', 'best-practices', 'seo']
  const rows = results
    .map((result) => {
      if (result.error !== undefined) {
        return `<tr><td><a href="${result.label}.report.html">${result.label}</a></td><td colspan="4" class="err">${result.error}</td></tr>`
      }
      return `<tr><td><a href="${result.label}.report.html">${result.label}</a></td>${keys
        .map((key) => {
          const score = result.categories[key]
          const cls = score === undefined ? '' : score >= 90 ? 'good' : score >= 50 ? 'ok' : 'bad'
          return `<td class="${cls}">${score ?? '—'}</td>`
        })
        .join('')}</tr>`
    })
    .join('\n')

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Aura — Lighthouse audit summary</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 900px; padding: 0 1rem; color: #3c3c3c; }
  h1 { font-size: 1.5rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { text-align: left; padding: 0.45rem 0.6rem; border-bottom: 1px solid #e5e5e5; }
  th { text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.04em; color: #6e6e6e; }
  td.good { color: #188038; font-weight: 600; }
  td.ok { color: #9a6a00; font-weight: 600; }
  td.bad { color: #c5221f; font-weight: 700; }
  td.err { color: #c5221f; }
  a { color: #0a6ea8; }
</style>
</head>
<body>
<h1>Aura — Lighthouse audit summary</h1>
<p>${results.length} routes · desktop preset · generated by scripts/lighthouse.mjs</p>
<table>
<thead><tr><th>route</th><th>performance</th><th>accessibility</th><th>best-practices</th><th>seo</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>`
  writeFileSync(join(REPORT_DIR, 'index.html'), html)
}
