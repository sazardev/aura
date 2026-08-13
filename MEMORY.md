# MEMORY — Aura project session log

Working knowledge for continuing work on **Aura** (`/home/omar/personal/aura`),
a Duolingo-style **English learning app**: 100% local, free, open source (MIT),
built with Tauri 2 + React 19 + TypeScript 7.

> End-of-session state (commit `c737453`). **Published** as a public GitHub repo:
> https://github.com/sazardev/aura (owner **sazardev**), release **v0.1.0**, 12 topics.

---

## 1. What the app is

- **Not a translator** — a way to learn English. Duolingo-style course, offline-first.
- WordNet dictionary + a **3,885-word local vocabulary bank**, text analyzer, spaced
  repetition, TTS + pronunciation practice, gamification
  (XP/levels/streaks/hearts/daily goals/achievements).
- Course: **36 lessons / 12 units / 180 words** (90 hand-authored + 90 generated).
- **All content lives in `src/data/` as JSON** (validated with Zod); UI, code and docs
  are 100% English and **zero-emoji** (Lucide icons only).

## 2. Tech stack

| Layer    | Choice                                                                          | Notes                                  |
| -------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| Shell    | Tauri 2.11 + Vite 8 (Rolldown)                                                  | WebViewGTK on Linux                    |
| UI       | React 19.2, zustand (persist → localStorage `aura-state`)                       | no router; state-based routes          |
| Icons    | `lucide-react` + `UiIcon` (data-driven by icon name)                            | zero emojis anywhere                   |
| Font     | `@fontsource-variable/nunito` (self-hosted)                                     | `var(--font-sans)` = "Nunito Variable" |
| Language | **TypeScript 7.0.2** (native `tsgo`)                                            | `tsc` binary from `@typescript/native` |
| Lint     | ESLint 10 flat, typescript-eslint type-aware                                    | see §4                                 |
| Format   | Prettier 3.9, Stylelint 17 (standard + clean-order)                             |                                        |
| Tests    | Vitest 4 + Testing Library + jsdom                                              | **50 tests**                           |
| Rust     | clippy `-D warnings`, rustfmt; deps: clipboard, dialog, opener, **pdf-extract** |                                        |
| CI       | GitHub Actions `.github/workflows/ci.yml`                                       | runs `npm run ci`                      |

### The TS7/TS6 side-by-side trick (important!)

`typescript-eslint` **does not support TS 7** yet. Microsoft's recommended setup is used:

- `"@typescript/native": "npm:typescript@^7.0.2"` → provides the **`tsc`** binary (native, ~10× faster)
- `"typescript": "npm:@typescript/typescript6@^6.0.2"` → provides the **TS 6 API** used by typescript-eslint

So: `tsc -b` typechecks with TS7; ESLint type-aware rules run against TS 6 via `projectService`.

## 3. Scripts (package.json)

`dev` · `build` (copy:wn + tsc + vite) · `preview` · `copy:wn` · `gen:vocab` · `typecheck` ·
`lint`/`lint:fix` · `format`/`format:check` · `stylelint` · `test`/`test:coverage` ·
`docs` (typedoc) · `tauri:dev` (orchestrator) · `tauri:build` ·
`lint:rust`/`format:rust` · `analyze` · `ci`

- `npm run ci` = `analyze` + `lint:rust` + `format:rust` + `test` + `build` — must be exit 0.
- `npm run gen:vocab` regenerates `vocabulary.json` + `course-expansion.json` from the engines.

## 4. ESLint configuration highlights

Maxed-out, but tuned to stay green (`--max-warnings=0`). In `eslint.config.mjs`:

- **Enabled**: `recommended` + `recommendedTypeChecked` + `strictTypeChecked` +
  `stylisticTypeChecked`, react-hooks v7, react-refresh, unicorn, jsdoc
  (flat/recommended, minus require-*), perfectionist (**imports only**), eslint-config-prettier.
- **Disabled (with reason)**: `no-non-null-assertion` (conflicts with
  `non-nullable-type-assertion-style`), `react-hooks/set-state-in-effect` + `refs`
  (false positives on correct usage), unicorn `filename-case`, `name-replacements`,
  `consistent-boolean-name`, `no-null`, `no-array-reduce`, `prevent-abbreviations`,
  `prefer-iterator-to-array`, `prefer-iterator-helpers`, `prefer-global-this`,
  `no-declarations-before-early-exit`, `number-literal-case` (prettier conflict),
  `max-nested-calls` (zod DSL), `no-top-level-assignment-in-function` (lazy singletons
  like caches/workers), jsdoc `require-jsdoc`/`require-returns`/`require-param`,
  perfectionist sorts other than imports.
- Type-aware configs restricted to `**/*.{ts,tsx,mts,cts}`; node config files get node globals.

## 5. Data model (`src/data/` + `src/engine/schemas.ts`)

- `course.json` — hand-authored course (6 units, 18 lessons, 90 words). Unit schema:
  `{ id, title, icon (Lucide name), color, lessons }`; word schema `{ word, meaning, sentence }`.
- `course-expansion.json` — **generated** course (6 units, 18 lessons, 90 words) merged at
  load in `lessons.ts` (same `courseSchema`).
- `vocabulary.json` — **giant bank: 3,885 words** `{ word, meaning, example?, pos,
synonyms[], rank, tier }` generated from WordNet + SUBTLEX-US; lazy-loaded via
  `src/engine/vocabulary.ts`.
- `achievements.json` — 15 achievements `{ id, name, description, icon }` (icon = Lucide
  name, e.g. Sprout/Trophy); ids match rules in `src/engine/achievements.ts`.
- `config.json` — `gamification` (xp rates, maxHearts, dailyGoal, levelCurve) and `srs`
  (SM-2 initial values).
- `schemas.ts` (zod 4.4.3) is the single source of truth: validates at import
  (**fails fast**) and **derives the TS types** (re-exported via `src/engine/types.ts`).
- `@/data/course.json` (+ expansion + vocabulary) are declared `unknown` in
  `vite-env.d.ts` (ambient) to avoid slow literal-type checking of big JSON.

## 6. Engine modules (`src/engine/`)

- `lessons.ts` — loads `COURSE`; memoized `allLessons`/`allWords` (`??=`), `lessonById`,
  `unitForLesson`, `previousLessonId`.
- `exercises.ts` — **deterministic** generator (RNG seeded by lesson id, `mulberry32`).
  7 types: `choice`, `listen`, `type`, `tap`, `speak`, `match`, `card`.
- `srs.ts` — SM-2 via `supermemo`; card = `{ id, word, meaning, note?, createdAt, state }`.
- `xp.ts` — XP/level/streak helpers driven by `config.json`.
- `frequency.ts` — SUBTLEX-US (74,286 words) → tiers, difficulty, `FREQUENCY_TIER_LABELS`.
  Its own lazy chunk (~405 KB gzip).
- `analyzer.ts` — **pure engine** (testable): retext pipeline + 7 readability formulas +
  AFINN-165 + compromise POS. Used by the worker and by tests.
- `analyzer-worker.ts` + `analyze.ts` — full NLP runs in a **Web Worker**
  (`analyzeText` client with LRU cache of 12 results); the UI never blocks and the
  heavy bundle (~1.4 MB gzip) is fetched only when analysis runs.
- `dictionary.ts` — `lookupWord` via `invokeOptional('lookup_word')`, **LRU cache (300)**.
- `vocabulary.ts` — `lookupVocab`, `searchVocab`, `randomVocabEntry`, `vocabularySize`
  (own lazy chunk ~163 KB gzip).
- `speech.ts` — TTS + speech recognition (feature-detected).

## 7. Rust backend (`src-tauri/`)

- `src/lib.rs` — `AppState { wordnet: Mutex<Option<WordNet>> }` lazy-loaded.
  Commands: `lookup_word`, `read_text_file`, **`read_document_text`** (PDF via
  `pdf-extract`, otherwise plain text). `[lib] name = "aura_lib"`.
- `src/wordnet_db.rs` — **custom WordNet 3.0 reader** (replaces the `wordnet` crate):
  `HashMap` index (O(1)) + single-line reads (`read_line_at`), correct verb frame parsing.
- `src/bin/gen_vocab.rs` — generator behind `npm run gen:vocab`.
- `resources/wn/` — WordNet 3.0 data copied by `scripts/copy-wordnet.mjs`
  (only the 8 `index.*`/`data.*` files — **excludes `index.sense`**). Gitignored; ~35 MB.
- `tauri.conf.json` — window 480×800, strict CSP (`connect-src` IPC only),
  resources map, `beforeDevCommand` = copy only.

## 8. Dev server resilience

- `npm run tauri:dev` → `scripts/tauri-dev.mjs`: finds a free port (prefers 1420),
  starts Vite, waits, runs `tauri dev --config {"build":{"devUrl":"http://localhost:<port>"}}`.
- `vite.config.ts`: `strictPort: false`, port from `AURA_DEV_PORT`.

## 9. Performance notes

- Main thread chunk ~**98 KB gzip**; heavy screens are lazy + **idle-preloaded** in `App`.
- Dictionary screen ~7 KB, Analyzer screen ~9 KB, Lesson screen ~15 KB (all lazy).
- NLP (retext/compromise) lives in the **worker** bundle, not the main thread.
- `frequency` and `vocabulary` are separate shared chunks (subtlex is duplicated in the
  worker heap — accepted trade-off for a non-blocking UI).

## 10. Tests (50)

`srs`, `xp`, `frequency`, `vocabulary`, `exercises`, `analyzer`, `lessons`, `config`,
`achievements`, `strings`, `App` (smoke). Data integrity asserted (unique ids, 5 words/lesson,
achievement rules match JSON). Setup: `src/test-setup.ts` + jsdom.

## 11. Design system (`DESIGN.md` + `src/styles/global.css`)

- **Tokens** in `:root`: palette (+`-soft`, `--aura-focus`), font scale, spacing (4px grid),
  radii, elevation, `--icon-sm/md/lg/xl`. Radii fully tokenized (zero hardcoded).
- **Logo**: minimalist **soaring bird** (Lucide `Bird`) — app icon, favicon, OG image.
- **Zero-emoji policy**: no emoji code points anywhere; `UiIcon` maps data icon names.
- Buttons (3D press), progress bars, top bar, bottom nav, cards, badges, toast, empty states.

## 12. Publishing

- Repo: **https://github.com/sazardev/aura** (public, owner `sazardev`, branch `main`).
- Description + **12 topics** (`english-learning`, `education`, `duolingo`, `tauri`,
  `react`, `typescript`, `wordnet`, `spaced-repetition`, `offline-first`,
  `open-source`, `language-learning`, `vocabulary`).
- Tag **`v0.1.0`** + release **"Aura v0.1.0"** with full notes.
- Publish flow: `git push origin main` → `git tag -a vX.Y.Z` →
  `git push origin vX.Y.Z` → `gh release create vX.Y.Z --title "..." --notes "..."`.

## 13. Commit history

1. `ecd4ae4` — initial scaffold: full app + toolchain (TS7/TS6, ESLint max).
2. `3444c04` — data separated to `src/data/*.json`, loaded with Zod.
3. `cde829d` — resilient dev port (`scripts/tauri-dev.mjs`).
4. `1b6cba0` — everything in English (UI, content, ids, docs).
5. `5a2e38c` — giant data bank (3,885 words) + course expansion + `wordnet_db` reader.
6. `388fc94` — DESIGN implementation: lucide icons + Nunito font + tokens.
7. `29511b1` — minimalist logo + full web SEO/marketing assets.
8. `fcfec39` — all emojis removed from UI/data (icon names in data).
9. `cadb228` — logo redesigned to a soaring bird (Lucide `Bird`).
10. `36a46aa` — zero tolerance for emojis across the whole repo.
11. `8e0ebfa` — design conformance sweep (radii/icon tokens, heading 800, badges).
12. `bbb7651` — analyzer ultra processor: PDF/TXT/MD via `pdf-extract`.
13. `c737453` — performance pass: NLP Web Worker, lazy Lesson, idle preload, caches.

## 14. Known gotchas / notes

- **Speech recognition is unavailable on WebKitGTK (Linux)** → speak exercises self-grade.
- **Don't use the `wordnet` crate**: its binary search hangs on missing words — custom
  `wordnet_db` HashMap reader is used instead.
- WordNet glosses rarely include usable example sentences → the expansion scans the whole
  SUBTLEX list; the bank keeps `example` optional.
- `index.sense` must NOT be copied to `resources/wn` (invalid POS extension).
- Vite 8 is Rolldown-based; **esbuild is not bundled** — don't set `minify: 'esbuild'`.
- `wordnet-db` is a devDependency (data source only); `unrs-resolver` postinstall warning is harmless.
- localStorage key `aura-state` (version 1).

## 15. Roadmap (from README)

- More units/lessons up to B1
- Interactive stories + timed challenges
- Progress export/import (JSON)
- Irregular verbs module
- Free writing practice with corrections
