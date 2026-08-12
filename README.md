# 🦉 Aura — Learn English at full power

**Aura is not a translator: it is a way to learn English.** A Duolingo-style
course that is **100% local, free, libre and open source**, with a full
dictionary, a text analyzer and spaced repetition. Your data never leaves
your device.

Built with **Tauri 2 + React 19 + TypeScript 7** (the native `tsgo` compiler)
and a maximum-quality toolchain: type-aware ESLint, Prettier, Stylelint,
Vitest, Clippy and rustfmt.

---

## ✨ Features

| Module                       | What it does                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 📚 **Course**                | 36 lessons in 12 units (90 guided + 90 generated from WordNet) with 7 exercise types: multiple choice, listening, typing, sentence building, speaking, matching and flashcards.            |
| 🧠 **Spaced repetition**     | **SM-2** (SuperMemo) algorithm to memorize vocabulary scientifically.                                                                                                                      |
| 📖 **WordNet dictionary**    | Full WordNet 3.0 database (~35 MB) embedded in the app: definitions, examples, synonyms, antonyms, hypernyms and hyponyms, plus an instant offline bank of **3,884 high-frequency words**. |
| 🔤 **Real frequencies**      | **SUBTLEX-US** corpus (74,286 words) to know whether a word is common, rare or very rare.                                                                                                  |
| 🧪 **Text analyzer**         | Readability (Flesch, Gunning Fog, SMOG, ARI, Dale–Chall, Coleman-Liau…), grammar and style (retext ecosystem), sentiment (AFINN-165), parts of speech and words to learn.                  |
| 🔊 **Voice & pronunciation** | Text-to-speech (TTS) on every word plus speaking exercises with speech recognition when the platform supports it.                                                                          |
| 🎮 **Gamification**          | XP, levels, streaks, hearts, daily goals and 15 achievements.                                                                                                                              |
| 🔒 **Total privacy**         | No account, no internet, no telemetry. Everything lives on your machine.                                                                                                                   |

---

## 🚀 Getting started

Requirements: [Node.js ≥ 22](https://nodejs.org), [Rust ≥ 1.77](https://rustup.rs)
and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm install          # install dependencies
npm run tauri:dev    # open the desktop app in development mode
npm run dev          # frontend only (no WordNet dictionary)
```

The WordNet dictionary is copied automatically from `node_modules/wordnet-db` to
`src-tauri/resources/wn/` before compiling (`npm run copy:wn`).

---

## 🛠 Scripts

| Command                 | Description                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`           | Vite dev server (port 1420).                                                     |
| `npm run tauri:dev`     | Tauri app in dev mode. If port 1420 is busy, it picks a free port automatically. |
| `npm run tauri:build`   | Desktop release build (deb, AppImage, etc.).                                     |
| `npm run typecheck`     | TypeScript 7 (`tsgo`, native) — typechecks the whole project.                    |
| `npm run lint`          | ESLint 10 with maxed-out type-aware rule sets (strict + stylistic).              |
| `npm run format`        | Prettier (writes).                                                               |
| `npm run stylelint`     | Stylelint (CSS order and style).                                                 |
| `npm run lint:rust`     | Clippy with `-D warnings`.                                                       |
| `npm run format:rust`   | rustfmt in check mode.                                                           |
| `npm run test`          | Vitest (engine tests).                                                           |
| `npm run test:coverage` | Code coverage.                                                                   |
| `npm run copy:wn`       | Copies the WordNet data files into `src-tauri/resources/wn/`.                    |
| `npm run gen:vocab`     | Regenerates `vocabulary.json` + `course-expansion.json` from the engines.        |
| `npm run docs`          | TypeDoc for the internal API in `docs/`.                                         |
| `npm run analyze`       | `typecheck` + `lint` + `stylelint` + `format:check`.                             |
| `npm run ci`            | Everything: analysis, Rust, tests and build.                                     |

---

## 🧱 Architecture

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
├── screens/          # Home, lesson, dictionary, analyzer, review
├── state/store.ts    # Global state (zustand + local persistence)
├── hooks/            # useSpeech, useDebouncedValue
└── lib/              # tauri, dates, RNG, strings
src-tauri/
├── src/lib.rs        # Rust commands: lookup_word (WordNet), read_text_file
├── resources/wn/     # WordNet 3.0 data (generated on build)
└── capabilities/     # Minimal permissions
```

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

## 🧪 Quality

- **50 tests** with Vitest over the engine (SM-2, streaks, frequencies,
  vocabulary bank, exercises, text analyzer, strings) plus a UI smoke test.
- **ESLint 10** with `recommended` + `recommendedTypeChecked` +
  `strictTypeChecked` + `stylisticTypeChecked`, react-hooks, react-refresh,
  unicorn, jsdoc and perfectionist.
- **Stylelint** with standard property ordering.
- Strict **Clippy** and **rustfmt** on the backend.
- CI on GitHub Actions: analysis, tests, frontend build and `cargo check`.

---

## 📄 License

**MIT** — free and for everyone. Uses WordNet (Princeton), SUBTLEX-US
frequency data and AFINN-165, all under permissive licenses.

---

## 🗺 Roadmap

- [ ] More units and lessons (full course up to B1 level)
- [ ] Interactive stories and timed challenges
- [ ] Export/import progress (JSON)
- [ ] Irregular verbs module
- [ ] Free writing practice with corrections

Made with ❤️ for anyone who wants to master English — without paying, without
internet and without giving away their data.
