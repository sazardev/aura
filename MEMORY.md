# MEMORY — Aura project session log

Working knowledge for continuing work on **Aura** (`/home/omar/personal/aura`),
a Duolingo-style **English learning app**: 100% local, free, open source (MIT),
built with Tauri 2 + React 19 + TypeScript 7.

> Last updated after commit `1b6cba0` (everything-in-English refactor).

---

## 1. What the app is

- **Not a translator** — a way to learn English. Duolingo-style course, offline-first.
- WordNet dictionary + a **3,884-word local vocabulary bank**, text analyzer, spaced
  repetition, TTS + pronunciation practice, gamification
  (XP/levels/streaks/hearts/daily goals/achievements).
- Course: **36 lessons / 12 units / 180 words** (90 hand-authored + 90 generated).
- **All content lives in `src/data/` as JSON** (validated with Zod); UI, code and docs
  are 100% English (language-agnostic).

## 2. Tech stack

| Layer    | Choice                                                    | Notes                                      |
| -------- | --------------------------------------------------------- | ------------------------------------------ |
| Shell    | Tauri 2.11 + Vite 8 (Rolldown)                            | WebViewGTK on Linux                        |
| UI       | React 19.2, zustand (persist → localStorage `aura-state`) | no router; state-based routes              |
| Language | **TypeScript 7.0.2** (native `tsgo`)                      | `tsc` binary from `@typescript/native`     |
| Lint     | ESLint 10 flat, typescript-eslint type-aware              | see §4                                     |
| Format   | Prettier 3.9, Stylelint 17 (standard + clean-order)       |                                            |
| Tests    | Vitest 4 + Testing Library + jsdom                        | 45 tests                                   |
| Rust     | clippy `-D warnings`, rustfmt                             | plugins: clipboard-manager, dialog, opener |
| CI       | GitHub Actions `.github/workflows/ci.yml`                 | runs `npm run ci`                          |

### The TS7/TS6 side-by-side trick (important!)

`typescript-eslint` **does not support TS 7** yet. Microsoft's recommended setup is used:

- `"@typescript/native": "npm:typescript@^7.0.2"` → provides the **`tsc`** binary (native, ~10× faster)
- `"typescript": "npm:@typescript/typescript6@^6.0.2"` → provides the **TS 6 API** used by typescript-eslint

So: `tsc -b` typechecks with TS7; ESLint type-aware rules run against TS 6 via `projectService`.

## 3. Scripts (package.json)

`dev` · `build` (copy:wn + tsc + vite) · `preview` · `copy:wn` · `typecheck` ·
`lint`/`lint:fix` · `format`/`format:check` · `stylelint` · `test`/`test:coverage` ·
`docs` (typedoc) · `tauri:dev` (orchestrator) · `tauri:build` ·
`lint:rust`/`format:rust` · `analyze` · `ci`

- `npm run ci` = `analyze` + `lint:rust` + `format:rust` + `test` + `build` — must be exit 0.

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
  `max-nested-calls` (zod DSL), jsdoc `require-jsdoc`/`require-returns`/`require-param`,
  perfectionist sorts other than imports.
- Type-aware configs restricted to `**/*.{ts,tsx,mts,cts}`; node config files get node globals.

## 5. Data model (`src/data/` + `src/engine/schemas.ts`)

- `course.json` — hand-authored course (6 units, 18 lessons, 90 words).
- `course-expansion.json` — **generated** course (6 units, 18 lessons, 90 words) merged at
  load in `lessons.ts` (same `courseSchema`). Word schema is `{ word, meaning, sentence }`
  (**English-only**). Lesson `type` is `"lesson" | "quiz"`.
- `vocabulary.json` — **giant bank: 3,884 words** `{ word, meaning, example?, pos,
synonyms[], rank, tier }` generated from WordNet + SUBTLEX-US; loaded lazily via
  `src/engine/vocabulary.ts` (only Dictionary/Analyzer import it → stays out of the main chunk).
- `achievements.json` — 15 achievements `{ id, name, description, emoji }`;
  ids match rules in `src/engine/achievements.ts` (`first-steps`, `streak-3`, `words-500`…).
- `config.json` — `gamification` (xp per correct/lesson/perfect/review, maxHearts,
  dailyGoal default+options, levelCurve) and `srs` (SM-2 initial efactor/interval/repetition).
- `schemas.ts` (zod 4.4.3) is the single source of truth: it validates at import
  (**fails fast**) and **derives the TS types** (re-exported via `src/engine/types.ts`).
- `@/data/course.json` is declared `unknown` in `vite-env.d.ts` (ambient) to avoid slow
  literal-type checking of the big JSON.

## 6. Engine modules (`src/engine/`)

- `lessons.ts` — loads `COURSE` via `courseSchema.parse`; helpers `allLessons`,
  `allWords`, `lessonById`, `unitForLesson`, `previousLessonId`.
- `exercises.ts` — **deterministic** generator (RNG seeded by lesson id, `mulberry32`).
  7 types: `choice` (meaning → pick word), `listen` (hear word → pick meaning),
  `type` (meaning → type word), `tap` (blanked sentence → build), `speak`, `match` (word↔meaning), `card`.
- `srs.ts` — SM-2 via `supermemo`; `createCard`/`reviewCard`/`isDue`/`dueCards`/`dueLabel`.
  Card = `{ id, word, meaning, note?, createdAt, state }` (no translation).
- `xp.ts` — `XP_*` from config, `levelFromXp`, `updateStreak`, `streakStatus`
  (`new|alive|lost`), `DEFAULT_DAILY_GOAL`.
- `frequency.ts` — SUBTLEX-US (74,286 words) → `frequencyOf`, `frequencyTierOf`
  (`very-common|common|uncommon|rare|very-rare`), `wordDifficulty` (1–5),
  `FREQUENCY_TIER_LABELS`, `commonWords`.
- `analyzer.ts` — retext pipeline (contractions, indefinite-article, redundant-acronyms,
  repeated-words, intensify, equality, simplify, readability) + 7 readability formulas
  - AFINN-165 sentiment + compromise POS. Result includes `readability`, `notes`,
    `topWords`, `posDistribution`, `unknownWords`, `readingAge`, `sentiment`.
- `dictionary.ts` — `lookupWord` via `invokeOptional('lookup_word')` (Tauri only).
- `vocabulary.ts` — instant bank lookups: `lookupVocab`, `searchVocab`, `randomVocabEntry`,
  `vocabularySize`.
- `speech.ts` — `speak` (TTS), `loadVoices`, `createRecognizer` (speech recognition).

## 7. Rust backend (`src-tauri/`)

- `src/lib.rs` — `AppState { wordnet: Mutex<Option<WordNet>> }` lazy-loaded.
  Commands: `lookup_word` (custom reader, see below) and `read_text_file`.
- `src/wordnet_db.rs` — **custom WordNet 3.0 reader** (replaces the `wordnet` crate):
  loads `index.*` into a `HashMap` once (O(1) lookups) and reads single synset lines
  from `data.*` (`read_line_at`). `[lib] name = "aura_lib"`.
- `src/bin/gen_vocab.rs` — generator behind `npm run gen:vocab` (rebuilds the bank +
  expansion from WordNet + SUBTLEX-US).
- `resources/wn/` — WordNet 3.0 data copied from npm `wordnet-db` by `scripts/copy-wordnet.mjs`
  (runs in `build` and `beforeDevCommand`). **Gitignored**; ~35 MB.
- `tauri.conf.json` — window 480×800, CSP restricts `connect-src` to IPC only,
  bundle resources map `resources/wn/* → wn/`, icon set generated with `tauri icon`.

## 8. Dev server resilience

- `npm run tauri:dev` → `scripts/tauri-dev.mjs` orchestrator: finds a free port
  (prefers 1420), starts Vite on it (`--strictPort`), waits, then runs
  `tauri dev --config {"build":{"devUrl":"http://localhost:<port>"}}`. Kills Vite on exit.
- `vite.config.ts`: `strictPort: false`, port from `AURA_DEV_PORT` (default 1420).
- `beforeDevCommand` is only `npm run copy:wn` (Vite is started by the orchestrator).

## 9. Tests (50)

`srs`, `xp`, `frequency`, `vocabulary`, `exercises`, `analyzer`, `lessons`, `config`,
`achievements`, `strings`, `App` (smoke). Data integrity is asserted in tests (unique ids, 5 words/lesson,
every achievement rule has a JSON definition). Setup: `src/test-setup.ts` + jsdom.

## 10. Commit history

1. `ecd4ae4` — initial scaffold: full app + toolchain (TS7/TS6, ESLint max, 37 tests).
2. `3444c04` — data separated to `src/data/*.json`, loaded with Zod schemas (45 tests).
3. `cde829d` — resilient dev port (`scripts/tauri-dev.mjs`).
4. `1b6cba0` — everything in English (UI, content, ids, docs); course schema simplified.
5. `5a2e38c` — giant data bank (3,885 words) + course expansion (36 lessons/180 words)
   via `gen_vocab` and a custom WordNet reader (`wordnet_db.rs`).

## 11. Known gotchas / notes

- **Speech recognition is unavailable on WebKitGTK (Linux)** → speak exercises fall back to
  self-grading ("I said it well" / "I need to review"). TTS works.
- **Don't use the `wordnet` crate**: its binary search hangs on missing words (e.g. "you") —
  `src/engine`/backend use the custom `wordnet_db` HashMap reader instead.
- **WordNet glosses rarely include usable example sentences** (~3–5% of words) → the generated
  course expansion scans the whole SUBTLEX list for words that have one; the bank keeps
  `example` optional.
- `index.sense` must NOT be copied to `resources/wn` (invalid POS extension breaks the reader).
- Vite 8 is Rolldown-based; **esbuild is not bundled** — don't set `minify: 'esbuild'`.
- The analyzer/retext chunk is heavy (~830 KB gzip); Dictionary and Analyzer screens are
  **lazy-loaded** to keep the main chunk ~77 KB gzip.
- `wordnet-db` is a devDependency used only as a data source; its `dict/` is copied, not bundled via npm.
- On npm install, `unrs-resolver` has a blocked postinstall script (warning is harmless).
- localStorage persistence key is `aura-state` (version 1).

## 12. Roadmap (from README)

- More units/lessons up to B1
- Interactive stories + timed challenges
- Progress export/import (JSON)
- Irregular verbs module
- Free writing practice with corrections
