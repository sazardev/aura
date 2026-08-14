# Aura — Learn English at full power

**Aura is not a translator: it is a way to learn English.** A Duolingo-style
course that is **100% local, free, libre and open source**, with a full
dictionary, a text analyzer and spaced repetition. Your data never leaves
your device.

Built with **Tauri 2 + React 19 + TypeScript 7** (the native `tsgo` compiler)
and a maximum-quality toolchain: type-aware ESLint, Prettier, Stylelint,
Vitest, Clippy and rustfmt.

---

## Features

| Module                    | What it does                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Course**                | 51 lessons in 17 units (165 hand-authored + 90 generated from WordNet) with 7 exercise types: multiple choice, listening, typing, sentence building, speaking, matching and flashcards. Topics go from greetings to home, shopping, weather, daily life and people.                                                                                                                |
| **Roadmap**               | Your full journey at a glance, split into three CEFR stages (A1 Foundations, A2 Everyday English, B1 Growing fluency) with per-unit progress, milestones and a "Continue" button that always picks the next lesson.                                                                                                                                                                |
| **Spaced repetition**     | **SM-2** (SuperMemo) algorithm to memorize vocabulary scientifically.                                                                                                                                                                                                                                                                                                              |
| **WordNet dictionary**    | Full WordNet 3.0 database (~35 MB) embedded in the app: definitions, examples, synonyms, antonyms, hypernyms and hyponyms, plus an instant offline bank of **3,884 high-frequency words**.                                                                                                                                                                                         |
| **Real frequencies**      | **SUBTLEX-US** corpus (74,286 words) to know whether a word is common, rare or very rare.                                                                                                                                                                                                                                                                                          |
| **Text analyzer**         | Readability (Flesch, Gunning Fog, SMOG, ARI, Dale–Chall, Coleman-Liau…), grammar and style (retext ecosystem), sentiment (AFINN-165), parts of speech and words to learn.                                                                                                                                                                                                          |
| **Classics library**      | Full public-domain classics bundled offline (Alice in Wonderland, The Wizard of Oz…), read chapter by chapter with guided tools: tap any word to look it up and save it, TTS read-along with word highlighting, reading speed (WPM), passage analysis, expressions and comprehension questions. Hide books you don't want and restore them anytime — your progress is always kept. |
| **Document import**       | Import a PDF, TXT or MD file on **any platform** (web, desktop, mobile) and read it with the same guided reading tools. PDFs are extracted fully offline by a lazy-loaded PDF.js reader.                                                                                                                                                                                           |
| **Voice & pronunciation** | Natural-sounding speech synthesis with word-by-word read-along, plus speaking exercises with speech recognition when the platform supports it. Voices, rate and narration are configurable in the settings.                                                                                                                                                                        |
| **Sound effects**         | Procedural audio (Web Audio API, no files, fully offline): correct/wrong answers, XP, achievements, page turns, navigation and more. Toggleable in the settings.                                                                                                                                                                                                                   |
| **Speaking practice**     | Listen-and-repeat sessions with word highlighting and self-assessment, powered by the guided TTS engine.                                                                                                                                                                                                                                                                           |
| **Dictation**             | Listen to a sentence (adjustable speed) and type it — sharpens your ear and spelling, with instant feedback.                                                                                                                                                                                                                                                                       |
| **Writing practice**      | Write a free sentence, get instant local grammar/style feedback and a score.                                                                                                                                                                                                                                                                                                       |
| **Dialogues**             | Role-play real conversations (café, directions…): when it's your turn, pick the best thing to say.                                                                                                                                                                                                                                                                                 |
| **Grammar**               | Explicit grammar lessons (Present Simple, articles, prepositions) with explanations and corrective exercises.                                                                                                                                                                                                                                                                      |
| **CEFR levels**           | Every word tagged A1–C2 from its real frequency, plus an estimate of your overall level in your profile.                                                                                                                                                                                                                                                                           |
| **Daily quests**          | A small daily plan (lesson, reviews, XP, reading) with a claimable XP bonus.                                                                                                                                                                                                                                                                                                       |
| **Backup & dark mode**    | Copy/download your progress as JSON and restore it anywhere, plus a full dark theme and **13 user-chosen accent colors** (Forest, Ocean, Mint, Violet, Rose, Sunset, Indigo, Cyan, Lime, Gold, Crimson, Fuchsia, Slate) that recolor the whole app — with matching dark-mode tints.                                                                                                |
| **Learning stats**        | Profile hub with tabs: **Overview** (weekly XP chart, skill bars for speaking/writing/reading, SRS word mastery, focus words), **History** (daily activity log, words-learned timeline, reading progress per book) and **Achievements**.                                                                                                                                           |
| **Profile**               | Editable name and avatar (local), joined date, level/streak/XP/accuracy at a glance — tap your avatar on the Home screen.                                                                                                                                                                                                                                                          |
| **Onboarding**            | A guided intro + profile setup, then a **"Try it yourself" tour**: 10 real actions (finish a lesson, look up a word, read a page, speak, dictation, writing, a dialogue, grammar, review, quests) that are marked done only when you actually do them.                                                                                                                             |
| **Gamification**          | XP, levels, streaks, hearts, daily goals and 15 achievements.                                                                                                                                                                                                                                                                                                                      |
| **Total privacy**         | No account, no internet, no telemetry. Everything lives on your machine.                                                                                                                                                                                                                                                                                                           |

---

## Getting started

Requirements: [Node.js ≥ 22](https://nodejs.org), [Rust ≥ 1.77](https://rustup.rs)
and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm install          # install dependencies
npm run tauri:dev    # open the desktop app in development mode
npm run dev          # frontend only (no WordNet dictionary)
```

The WordNet dictionary is copied automatically from `node_modules/wordnet-db` to
`src-tauri/resources/wn/` before compiling (`npm run copy:wn`).

## Platforms

Aura runs fully offline on every major platform from the same codebase:

- **Web** — `npm run dev` (browser) or build the static `dist/` output.
- **Desktop** — Windows, macOS, Linux (Tauri 2): `npm run tauri:dev`, then
  `npm run tauri:build` to produce installers/bundles.
- **Mobile** — Android and iOS (Tauri 2 mobile):

  ```bash
  npm run tauri:android       # dev on an Android emulator/device
  npm run tauri:android:build # release APK/AAB
  npm run tauri:ios           # dev in the iOS simulator/device
  npm run tauri:ios:build     # release iOS app
  ```

  The first time, initialize the native projects once:
  `npx tauri android init` and `npx tauri ios init`. App icons for every
  platform live in `src-tauri/icons/` (generated with `tauri icon`).

- The layout adapts to the screen: single column on phones, wider grids on
  tablets, and a left navigation rail on desktop (see `DESIGN.md` §10).

---

## Scripts

| Command                         | Description                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                   | Vite dev server (port 1420).                                                      |
| `npm run tauri:dev`             | Tauri app in dev mode. If port 1420 is busy, it picks a free port automatically.  |
| `npm run tauri:build`           | Desktop release build (deb, AppImage, dmg, exe…).                                 |
| `npm run tauri:android`         | Android dev (picks a free port automatically).                                    |
| `npm run tauri:android:build`   | Android release build (APK/AAB).                                                  |
| `npm run tauri:ios`             | iOS dev (picks a free port automatically).                                        |
| `npm run tauri:ios:build`       | iOS release build.                                                                |
| `npm run typecheck`             | TypeScript 7 (`tsgo`, native) — typechecks the whole project.                     |
| `npm run lint`                  | ESLint 10 with maxed-out type-aware rule sets (strict + stylistic).               |
| `npm run format`                | Prettier (writes).                                                                |
| `npm run stylelint`             | Stylelint (CSS order and style).                                                  |
| `npm run lint:rust`             | Clippy with `-D warnings`.                                                        |
| `npm run format:rust`           | rustfmt in check mode.                                                            |
| `npm run test`                  | Vitest (engine tests).                                                            |
| `npm run test:coverage`         | Code coverage.                                                                    |
| `npm run copy:wn`               | Copies the WordNet data files into `src-tauri/resources/wn/`.                     |
| `npm run gen:vocab`             | Regenerates `vocabulary.json` + `course-expansion.json` from the engines.         |
| `npm run gen:library`           | Regenerates `src/data/library.json` from public-domain texts in `scripts/books/`. |
| `npm run docs`                  | TypeDoc for the internal API in `docs/`.                                          |
| `npm run version:check`         | Verifies all version sources agree with `package.json`.                           |
| `npm run release:check`         | Dry run: shows the next version and changelog source without changing anything.   |
| `npm run release`               | Bumps the version, rewrites the changelog, commits and tags (`vX.Y.Z`).           |
| `npm run analyze`               | `version:check` + `typecheck` + `lint` + `stylelint` + `format:check`.            |
| `npm run ci`                    | Everything: analysis, Rust, tests and build.                                      |
| `npm run audit:lighthouse`      | Runs a Lighthouse audit on the built app and writes HTML+JSON reports.            |
| `npm run audit:lighthouse:view` | Same, then opens the HTML report in your browser.                                 |

Lighthouse audits the app through its own bundled Chrome (installed on first
use). Reports land in `lighthouse-reports/` (gitignored), with an `index.html`
summary linking every per-route report. Options:

- `npm run audit:lighthouse` — deep pass: every screen **and** every lesson,
  grammar lesson and dialogue derived from the course data (91 routes).
- `npm run audit:lighthouse -- --screen` — one screen per type only (~45 routes).
- `npm run audit:lighthouse -- --no-build` — reuse the existing `dist/` build.
- `npm run audit:lighthouse -- --mobile` — mobile preset instead of desktop.
- `npm run audit:lighthouse -- --view` — open the summary report at the end.
- `CHROME_PATH=/path/to/chrome npm run audit:lighthouse` — force a Chrome.

The audit seeds the profile past onboarding (so real screens render) and audits
the first-run onboarding screen separately. Chrome is launched fresh per route
over the DevTools protocol, so every page is measured in an isolated browser.

---

## Architecture

```
src/
├── data/            # All content as readable JSON (no code)
│   ├── course.json           # Hand-authored course (6 units, 18 lessons)
│   ├── course-expansion.json # Generated course (6 units, 18 lessons)
│   ├── vocabulary.json       # Giant bank: 3,884 words with meanings/examples
│   ├── achievements.json     # 15 achievements
│   └── config.json           # Game balance + SM-2 parameters
├── engine/          # Pure, testable engine (no React)
│   ├── schemas.ts       # Zod schemas that validate the JSON and derive the types
│   ├── lessons.ts       # Course loading and queries
│   ├── vocabulary.ts    # Instant lookup over the 3,884-word bank
│   ├── exercises.ts     # Deterministic exercise generator (seeded RNG)
│   ├── srs.ts           # SM-2 spaced repetition
│   ├── xp.ts            # XP, levels and streaks
│   ├── achievements.ts  # Rules for the 15 achievements
│   ├── frequency.ts     # SUBTLEX-US: frequencies and difficulty
│   ├── dictionary.ts    # WordNet dictionary client (via Rust)
│   ├── analyzer.ts      # Readability + retext + sentiment + POS
│   └── speech.ts        # TTS and speech recognition
├── components/       # Reusable UI (buttons, bars, exercise views…)
├── screens/          # Home, lesson, dictionary, analyzer, review, library, profile…
├── state/store.ts    # Global state (zustand + local persistence)
├── hooks/            # useSpeech, useHashRoute, useDebouncedValue
└── lib/              # router (hash deep-linking), tauri, dates, RNG, strings, PDF
src-tauri/
├── src/lib.rs        # Rust commands: lookup_word (WordNet), read_text_file
├── resources/wn/     # WordNet 3.0 data (generated on build)
└── capabilities/     # Minimal permissions
```

**Routing:** a lightweight hash router (`src/lib/router.ts` + `useHashRoute`)
drives every screen as a `#/route` — `#/book/<id>`, `#/read/<book>/<chapter>/<section>`,
`#/lesson/<id>`, `#/grammar/<lesson>`, `#/dialogue/<id>`, `#/profile/<tab>`,
`#/dictionary?word=…`. Refresh and shared deep links restore the exact screen,
tab, chapter and section — fully offline, no server required.

**Data and content**: all content (course, achievements and game balance)
lives in `src/data/` as JSON. The engine loads it through **Zod schemas** that
validate the structure at runtime and fail fast if something is wrong; the
TypeScript types are derived automatically from those schemas. To add a
lesson, you only edit `course.json`.

**Key technical decisions**

- **TypeScript 7 + 6 side by side**: the native compiler (`tsc`, 10× faster)
  does the typecheck; `typescript-eslint` uses the TS 6.0 API via the
  `@typescript/typescript6` compatibility package (the approach recommended by
  the TS team).
- **WordNet in Rust**: the `wordnet` crate does a lazy binary search over the
  `index.*`/`data.*` files, loading them only the first time you look up a word.
- **Deterministic exercises**: each lesson always generates the same exercises
  (RNG seeded by lesson id), great for testing and redoing lessons.
- **No network access**: `connect-src` is restricted by CSP to Tauri's IPC.

---

## Quality

- **50 tests** with Vitest over the engine (SM-2, streaks, frequencies,
  vocabulary bank, exercises, text analyzer, strings) plus a UI smoke test.
- **ESLint 10** with `recommended` + `recommendedTypeChecked` +
  `strictTypeChecked` + `stylisticTypeChecked`, react-hooks, react-refresh,
  unicorn, jsdoc and perfectionist.
- **Stylelint** with standard property ordering.
- Strict **Clippy** and **rustfmt** on the backend.
- CI on GitHub Actions: analysis, tests, frontend build and `cargo check`.

---

## Release & versioning

Aura releases follow **Semantic Versioning** and keep a human-readable
changelog (`CHANGELOG.md`, Keep a Changelog format). The version has a single
**source of truth**: `package.json`. Everything else is derived from it.

### How it works

- **Version sources**: `package.json` is authoritative; `src-tauri/tauri.conf.json`,
  `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock` are synced to it.
  `npm run version:check` (part of `analyze` and CI) fails if they ever drift.
- **Automatic bump**: `npm run release:check` dry-runs the release. The bump
  type is computed from **conventional commits** since the last `v*` tag:
  `feat` → minor, `feat!`/`BREAKING CHANGE` → major, everything else → patch.
  If there is nothing to release it says so and does nothing.
- **Idempotent**: releases never repeat. A release empties the `[Unreleased]`
  changelog section and tags `HEAD`, so re-running on the same commit produces
  nothing. Builds and `version:check` never modify the version.
- **Changelog**: by default the release section is generated from commit
  messages, grouped by type. To write curated notes instead, edit the
  `## [Unreleased]` section in `CHANGELOG.md` — curated content always wins.
- **Tagging**: `npm run release` bumps the version, rewrites the changelog,
  syncs the version files, commits `chore(release): vX.Y.Z` and creates an
  annotated tag `vX.Y.Z`.

### Auto release on GitHub

`.github/workflows/release.yml` runs on every push to `main` (and on manual
`workflow_dispatch`):

1. **prepare** — runs `release.mjs --commit`; if a release is due it pushes the
   release commit and the `vX.Y.Z` tag.
2. **build** — on the tag, bundles the app for Linux, macOS and Windows
   (`tauri build`) and uploads the installers as artifacts.
3. **publish** — creates the GitHub Release with the changelog section for that
   version as the body and attaches the bundles.

The re-triggered run after the release commit finds no new commits, so the
whole pipeline is skipped — a release is created exactly once.

The version and changelog are visible inside the app: **Settings → About →
Version & changelog** (`#/about`).

---

## License

**MIT** — free and for everyone. Uses WordNet (Princeton), SUBTLEX-US
frequency data and AFINN-165, all under permissive licenses.

---

## Roadmap

The product evolves in phases. **Done** items are shipped; the rest is
prioritized by learning value.

### Phase 1 — Core learning loop (done)

- [x] Guided course with 7 exercise types (choice, listen, type, tap, speak, match, cards)
- [x] Spaced repetition (SM-2) + review queue
- [x] Offline dictionary (WordNet) + 3,884-word frequency bank
- [x] Text analyzer (readability, grammar, sentiment) in a Web Worker
- [x] Gamification: XP, levels, streaks, hearts, daily goals, achievements
- [x] Onboarding tour
- [x] Sound effects and natural-sounding voice narration with settings

### Phase 2 — Reading & immersion (done)

- [x] Classics library (full public-domain books, offline)
- [x] Guided reader: tap-to-lookup, TTS read-along, WPM, comprehension questions
- [x] Passage analysis, expressions and rare-word lists
- [x] Import PDF/TXT/MD with guided reading

### Phase 3 — Course depth (in progress)

- [x] Speaking practice (listen-and-repeat with word highlighting)
- [x] Dictation (listen and type with adjustable speed)
- [x] Writing practice (free sentences with instant local feedback)
- [x] Interactive role-play dialogues
- [x] Explicit grammar lessons with corrective exercises
- [x] CEFR levels per word + profile estimate
- [x] Daily quests with claimable XP bonus
- [x] Profile hub: history, weekly metrics, skill bars, SRS mastery and achievements
- [x] Progress backup (copy/download/restore JSON) + dark mode
- [ ] Expand the guided course to a full **A1 → B1** curriculum
      (currently 15 units / 45 lessons / 225 words)
- [ ] Grammar explanations per exercise with instant feedback
- [ ] Interactive stories that reuse your SRS vocabulary
- [ ] Timed challenges

### Phase 4 — Mastery tools (planned)

- [ ] Irregular verbs module
- [ ] Free writing practice with AI-style corrections (local rules)
- [ ] Reading stats dashboard (WPM over time, words met per book)

### Shipped along the way

- [x] Dark mode (design tokens are the single switch) — toggle in Settings
- [x] Progress backup (copy / download / restore JSON) — Settings → Backup

Made for anyone who wants to master English — without paying, without
internet and without giving away their data.
