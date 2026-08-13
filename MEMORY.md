# MEMORY — Aura project session log

Working knowledge for continuing work on **Aura** (`/home/omar/personal/aura`),
a Duolingo-style **English learning app**: 100% local, free, open source (MIT),
built with Tauri 2 + React 19 + TypeScript 7.

> End-of-session state (commit `c737453`). **Published** as a public GitHub repo:
> https://github.com/sazardev/aura (owner **sazardev**), release **v0.1.0**, 12 topics.

---

## 1. What the app is

- **Not a translator** — a way to learn English. Duolingo-style course, offline-first.
- **UI dead-end audit**: no screen can get stuck. `analyzeText` never hangs (worker `onerror` +
  15s timeout), reader analysis/lookup and WriteScreen show real errors on failure, the lesson
  "failed" timer can't kick you out after you continue, Dictation falls back to "Reveal the
  sentence" when TTS is off/unavailable, and `useSpeech` resets guiding/speaking when voice is
  disabled.
- **Onboarding = tour + setup**: 6 intro slides then 5 "setup" steps where the user chooses
  name, age, learning goal, native language, avatar (icon + color) and accent theme — all saved
  to the profile/store on "Start learning" (`src/screens/onboarding-screen.tsx`).
- **Profile & identity**: name, **20 avatar icons** + **10-color avatar tint**, **age**, **learning
  goal** (travel/work/study/exams/move/fun), **native language** and **profession** — set in
  Profile → About you or the onboarding (`src/engine/profile.ts`). Goals and age feed the
  recommendations: age < 18 clamps book difficulty, travel/move pushes speaking practice, work
  pushes writing, and the Home greeting shows your goal. Plus 13 accent themes, dark mode and
  daily goal in Settings.
- **Career lessons by profession** (`src/data/profession-lessons.json` + `professionLessons()` in
  `lessons.ts`): 8 professions (business, tech, healthcare, education, hospitality, sales,
  engineering, law) × 2 lessons of job-specific vocabulary, shown as a "Career track" section on
  the Home when a profession is set and completable through the normal lesson flow.
- WordNet dictionary + a **3,885-word local vocabulary bank**, text analyzer, spaced
  repetition, TTS + pronunciation practice, gamification
  (XP/levels/streaks/hearts/daily goals/achievements).
- **Total telemetry** (`src/engine/telemetry.ts`): every action is tracked offline —
  sessions (with lengths), active days, per-screen time/views and transitions (who goes where),
  usage by hour, per-day activity, word lookups/saves, book views/sections/reading time/**WPM per
  book**, **answer/response time** (lessons, reviews, reader quiz, grammar — global average +
  per-answer ms in events), **lesson duration**, lesson starts/answers/completions,
  **reader comprehension quiz accuracy**, **grammar accuracy**, reviews, speak/write attempts,
  analyzer runs and imports. Persisted to localStorage (`aura-telemetry`) with cumulative
  counters + a capped raw event ring buffer (for future data science).
- **Insights, predictions & recommendations** (`src/engine/insights.ts`): infers a learner
  profile (dominant activity, best hour, days/week, avg session, reading WPM, word pace,
  favourite genre/difficulty/book, top lookup), **merges it with the declared identity**
  (`learnerIdentity` + `describeLearner`: age, goal, native language), predicts the next screen
  from the transition matrix, and recommends the next book (genre affinity + **goal match** +
  difficulty sweet spot + continuation), the next unlocked lesson and the practice mode you
  neglect. Surfaced in the Home "Recommended for you" (with a "why" line) and a Statistics
  "Insights & predictions" section in the Profile.
- **Daily briefing & forecasts** (`src/engine/briefing.ts`): `dailyBriefing()` returns the full
  day-ahead picture — identity sentence, predicted next screen, **streak risk** (low/medium/high
  from inactivity), **daily-goal status**, best study hour, expected session length, **book
  finish estimate** (sections left × average pace), **vocabulary projection (30 days)** and a
  concrete **daily plan**. Shown in Profile → Statistics → "Forecast & plan".
- **Settings → Data & privacy**: `#/settings` links to `#/data` ("Analytics & telemetry"), a
  screen to inspect the inferred profile, **export the raw telemetry log** (copy or download
  JSON for data science), browse recent events, see storage used and **reset telemetry**
  (progress is never touched).
- Course: **45 lessons / 15 units / 225 words** (135 hand-authored + 90 generated). Hand-authored
  topics now cover A1→A2: greetings, food, travel, work, body, verbs, home & family, shopping & money,
  weather & nature.
- Library: **59 public-domain classics + story collections bundled offline** (Alice, Oz, Peter
  Pan, Sherlock Holmes complete, Grimm's, Aesop, Austen ×6, Dickens ×6, Verne, Wells, Hugo,
  Thackeray, … — ~6.4M words). Books are **lazy-loaded**: `src/data/library.json` is a small
  index and each full book lives in `src/data/library/<id>.json`. Each book carries genre,
  difficulty, tags, description, gutenberg id, opening line and famous quotes.
- **Library browsing** (`src/engine/browse.ts`): search by title/author, filter by genre,
  difficulty and reading status, sort (title/author/longest/easiest/most-read) and group into
  sections (none/genre/level/status) — used by the Library screen. Plus hide/restore books.
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
`lint:rust`/`format:rust` · `version:check` · `release:check` · `release` · `analyze` · `ci`

- `npm run ci` = `analyze` + `lint:rust` + `format:rust` + `test` + `build` — must be exit 0.
- `npm run gen:vocab` regenerates `vocabulary.json` + `course-expansion.json` from the engines.
- `npm run release` = single source of truth (`package.json`) + auto changelog/bump/tag (see session 33).

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
- Publish flow is now **automated**: `.github/workflows/release.yml` on push to
  `main` (or `workflow_dispatch`) bumps from conventional commits, tags `vX.Y.Z`,
  builds the 3-OS bundles and creates the GitHub Release with changelog notes.
  Local alternative: `npm run release` (commits + tags), then push.

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
14. `(uncommitted)` — onboarding tour (7 steps) + **Classics Library**: public-domain
    books bundled offline (`src/data/library.json`, `npm run gen:library`), guided reader
    with tap-to-lookup, TTS, WPM, comprehension questions, expressions, passage analysis,
    and PDF/TXT/MD import (`documentToBook`, 150k char cap, 3 stored).
15. `(uncommitted)` — audio pass: procedural SFX (Web Audio, `src/engine/sounds.ts`,
    sounds/voices/rate settings sheet), realistic voice selection, **guided read-along**
    (`speakGuided` with word-by-word highlighting, `useSpeech` hook).
16. `(uncommitted)` — course expansion to A2: 3 hand-authored units (Home & Family,
    Shopping & Money, Weather & Nature) → 45 lessons / 225 words; README roadmap
    restructured into phased product roadmap.
17. `(uncommitted)` — power pack: **Stats** screen (weekly XP chart, accuracy, reading
    time/WPM, focus words), **Speaking practice** (listen-and-repeat + word highlight),
    **Writing practice** (free sentences with instant local analysis), per-day
    `history` + `weakWords` + reading metrics in the store (persist v5), voice **pitch**
    control + "test voice", review prioritizes weak words.
18. `(uncommitted)` — **Profile hub** (persist v6): editable name/avatar (`profile`),
    joined date, tabs Overview (weekly chart, skill bars, SRS mastery) / History
    (daily activity, words-learned timeline, per-book reading) / Achievements.
    Speaking/writing counters (`recordSpeakingSession`/`recordWriting`), `readSeconds`
    per day in history. Old standalone Stats screen merged into the hub; Home hero
    shows the avatar/name and opens the profile.
19. `(uncommitted)` — educator power pack (persist v7): **Grammar** lessons
    (`grammar.json`, corrective choice/fill/reorder exercises), **Dictation**
    (listen+type, adjustable TTS speed), role-play **Dialogues**, **CEFR levels**
    per word + profile estimate, **daily quests** with XP bonus, **backup**
    (copy/download/restore JSON), **dark mode**. `darkMode`/`questBonusClaimed`
    in store; settings sheet gains dark toggle. NOTE: external refactor also landed
    — library is now 44-book **index** (`library.json`) + per-book lazy chunks
    (`src/data/library/*.json`, `loadBook` async, `LibraryIndexBook` w/ tags,
    gutenbergId, quotes); relaxes `year` to `int` (Aesop −600 BC).
20. `(uncommitted)` — **cross-platform document import**: the Library (and the
    Analyzer's "Open file") now use a universal `<input type="file">` + `readDocumentFile`
    (`src/lib/document-reader.ts`) that works in plain browsers, Tauri desktop and
    mobile. PDFs are extracted offline by a lazy-loaded PDF.js worker
    (`src/lib/pdf-extract.ts`, own chunk ~102 KB gzip, loaded only on import);
    TXT/MD read as text. Tauri-native dialog/Rust path removed from the Library flow.
21. `(uncommitted)` — **hash router / full deep linking**: `src/lib/router.ts`
    (pure `parseHash`/`routeToHash` + tests) + `useHashRoute`. Every screen is a
    `#/route`; sub-routes carry context: `#/read/<book>/<chapter>/<section>` (Reader is
    now URL-controlled), `#/grammar/<lesson>`, `#/dialogue/<id>`, `#/profile/<tab>`
    (incl. new telemetry "Statistics" tab → `profile-stats.tsx`), `#/dictionary?word=…`.
    Refresh/back/forward restore exact position. Also fixed external in-flight edits
    (telemetry.ts types, profile-stats StatRow `icon` optional, library-screen import
    of `readDocumentFile`, numeric separators in telemetry.test).
22. `(uncommitted)` — **responsive layout (web/tablet/desktop)**: CSS breakpoints at
    768px and 1100px. Tablet widens the shell to 900px and expands grids
    (achievements 4-up, stats 6-up, exercise options ≥200px; reading column capped
    ~720px). Desktop widens to 1080px and turns the bottom nav into a **fixed left
    rail** (220px); full-screen screens (lesson/reader/book/dialogue) widen to
    ~1000px. DESIGN.md §10 documents the breakpoints.
23. `(uncommitted)` — **Settings is a real page, not a modal**: new
    `#/settings` route (`settings-screen.tsx`, lazy) with sections Appearance
    (dark mode), Sound, Voice & narration (TTS rate/pitch/test voice/voice picker),
    Learning (daily goal chips via `DAILY_GOAL_OPTIONS`) and Data & privacy
    (backup link). The TopBar gear now navigates to the page; the old
    `SettingsSheet` modal was deleted (its overlay class stays for the avatar
    picker). Also absorbed the external `#/data` route (DataScreen) + new Home
    props `onReadBook`/`onReview`.
24. `(uncommitted)` — **user-chosen accent themes**: Settings → Appearance gains
    an "Accent color" picker (Forest/Ocean/Mint/Violet/Rose/Sunset) that
    recolors the whole app. `data-accent='<id>'` CSS blocks override the
    green+blue tokens (placed before the dark block so dark still wins);
    `src/engine/theme.ts` holds the palette list; store `accent` (persist v8,
    `setAccent`). The Logo now uses `var(--aura-green)` so the brand follows
    the theme.
25. `(uncommitted)` — **more accent colors** (13 total): added Indigo, Cyan,
    Lime, Gold, Crimson, Fuchsia, Slate, each with `[data-accent][data-theme='dark']`
    dark-mode tints so soft/text-on-soft keep the accent hue. Also reconciled the
    external avatar-color feature: `profile.avatarColor` + `setProfileAvatarColor`
    (persist v9), avatar tile (profile + Home) uses the chosen color with a white
    icon, and trimmed the avatar set to the 14 Lucide icons that actually exist in
    the installed lucide version (Bee/Dragon/Fox/Frog/Owl/Tiger/Whale/Wolf do not).
26. `(uncommitted)` — **multiplatform prep**: `viewport-fit=cover` +
    `apple-mobile-web-app-capable` + `color-scheme` in index.html; safe-area CSS
    (`env(safe-area-inset-*)`) on top bar, bottom nav, app content and full-screen
    footers for iOS notch / Android gesture bars; `tauri icon` generated the full
    desktop + Android + iOS icon set (`src-tauri/icons/`); npm scripts
    `tauri:android` / `tauri:ios` (dev, free-port orchestrator) and
    `tauri:android:build` / `tauri:ios:build`; CI gains a `desktop-build` matrix
    (Linux/macOS/Windows) compiling the native binary (`tauri build --no-bundle`).
    README documents the Platforms + mobile commands.
27. `(uncommitted)` — **guided action tour ("Try it yourself")**: after onboarding
    intro+profile setup, the app enters a guided tour (`guidedActive`, store v10)
    listing 10 real actions (lesson, dictionary, reading, speaking, dictation,
    writing, dialogue, grammar, review, quests). Each action navigates to the real
    screen and is marked done only when the learner performs it
    (`markGuidedAction` wired into every screen + `claimDailyBonus`). A persistent
    `GuidedBar` pill returns to `#/tour` from anywhere; `TourScreen` shows progress
    and a finish button once all actions are done. `src/engine/guide.ts` holds the
    action list.
28. `(uncommitted)` — **repeat the tour from Settings**: Settings gains a "Guided
    tour" section with a "Repeat the guided tour" button that re-enables
    `guidedActive` (clears completed actions via `startGuidedTour`) and opens
    `#/tour`.
29. `(uncommitted)` — **hide/restore default books + data safety**: store v11
    `hiddenBooks` with `hideBook`/`unhideBook`/`showAllBooks`. The Library lets
    you hide any classic (EyeOff) without touching its reading progress; a
    "Hidden (n)" section restores them individually or all at once, and a
    "Back up your data" shortcut points to the Backup screen.
30. `(uncommitted)` — **Roadmap screen + better lessons**: new `#/roadmap` view
    (`src/engine/roadmap.ts` + `roadmap-screen.tsx`) splits the course into
    three CEFR stages (A1 Foundations / A2 Everyday English / B1 Growing
    fluency) with overall + per-unit progress, stage milestones and a
    "Continue" button that picks the next available lesson. Added 2 hand-authored
    A2 units (Daily Life, People & Descriptions) → course is now 17 units /
    51 lessons / 255 words. Home gains a Roadmap tile; UiIcon gains Sun/Users.
31. `(uncommitted)` — **clean Home = lessons only + navigation drawer**: Home now
    shows just the hero and the lesson path (course map + career track). The
    practice tiles (Speaking/Dictation/Writing/Dialogues/Grammar/Profile & stats)
    and the Roadmap tile moved out, and the daily-quests banner was removed.
    The bottom nav (and desktop rail) gains a "More" item that opens a slide-in
    **navigation drawer** (`navigation-drawer.tsx`) with every section: Speaking,
    Dictation, Writing, Dialogues, Grammar, Roadmap, Profile & stats, Settings,
    Backup. The guided tour now has 9 actions (quests removed, since the banner
    is gone).
32. `(uncommitted)` — **sticky app bars / footers audit**: fixed the broken,
    non-fixed headers/footers across full-screen screens (same bug as the
    dialogue). `.lesson-screen__header` and `.lesson-screen__footer` (lesson +
    grammar lessons), `.book-screen__header`, `.onboarding__header/__footer` are
    now `position: sticky` with safe-area insets; `.exercise-body`/`.onboarding__body`
    gained bottom padding so content never hides behind the sticky footer; the
    reader toolbar's `top` now accounts for `env(safe-area-inset-top)`.
33. `(uncommitted)` — **changelog + release pipeline**: single source of truth
    for the version is `package.json`; `scripts/release.mjs` computes the bump
    from conventional commits since the last `v*` tag (`feat`→minor,
    `feat!`/breaking→major, else patch), rolls `CHANGELOG.md`'s `[Unreleased]`
    section into a dated release (auto-generated from commits, or curated
    if the section is hand-filled), syncs `tauri.conf.json`/`Cargo.toml`/
    `Cargo.lock`, and commits `chore(release): vX.Y.Z` + tags `vX.Y.Z`.
    Idempotent (nothing since last tag ⇒ no-op). `npm run version:check`
    (part of `analyze`) fails on version drift. `.github/workflows/release.yml`
    on push to main: prepare (bump+tag) → build 3-OS bundles → GitHub Release
    with changelog notes. In-app visibility: `#/about` screen shows version
    (`__APP_VERSION__` Vite define) and the bundled changelog (`?raw` import),
    reached from Settings → About and the navigation drawer.

## 14. Known gotchas / notes

- **Speech recognition is unavailable on WebKitGTK (Linux)** → speak exercises self-grade.
- **Don't use the `wordnet` crate**: its binary search hangs on missing words — custom
  `wordnet_db` HashMap reader is used instead.
- WordNet glosses rarely include usable example sentences → the expansion scans the whole
  SUBTLEX list; the bank keeps `example` optional.
- `index.sense` must NOT be copied to `resources/wn` (invalid POS extension).
- Vite 8 is Rolldown-based; **esbuild is not bundled** — don't set `minify: 'esbuild'`.
- `wordnet-db` is a devDependency (data source only); `unrs-resolver` postinstall warning is harmless.
- localStorage key `aura-state` (version 3: v1→v2 onboarding, v2→v3 library progress/imports).
- Raw book texts in `scripts/books/` are gitignored; regenerate `src/data/library.json` with `npm run gen:library`.

## 15. Roadmap (from README)

- More units/lessons up to B1
- Interactive stories + timed challenges
- Progress export/import (JSON)
- Irregular verbs module
- Free writing practice with corrections
