# AGENTS.md

Aura: Duolingo-style English learning app, 100% offline, MIT. Tauri 2 + React 19 + Vite 8 (Rolldown) + TypeScript 7. All copy/ids/docs are English, zero-emoji.

Reference docs: `README.md` (overview + scripts), `DESIGN.md` (design system source of truth), `MEMORY.md` (session log; may drift from code — verify claims).

## Commands

- `npm run analyze` — fast pre-push gate: `version:check` + `typecheck` + `lint` + `stylelint` + `format:check`. Run after any change.
- `npm run ci` — full gate CI runs: analyze + `lint:rust` + `format:rust` + `test` + `build`. Must exit 0.
- `npm run test` / `test:watch` — Vitest. Tests are colocated (`src/**/*.test.ts`); run one: `npx vitest run src/engine/srs.test.ts`.
- `npm run version:check` — asserts `package.json` / `tauri.conf.json` / `Cargo.toml` / `Cargo.lock` all carry the same version (part of `analyze`).
- `npm run release:check` — dry-run of the release: prints the next version and changelog source; never writes.
- `npm run release` — automatic bump: computes the bump from conventional commits since the last `v*` tag, rolls the `[Unreleased]` changelog section into a dated release, syncs all version files, commits `chore(release): vX.Y.Z` and tags `vX.Y.Z`. Idempotent: with nothing since the last tag it does nothing.
- `npm run tauri:dev` — desktop dev via `scripts/tauri-dev.mjs` (auto-picks a free port). Don't run bare `tauri dev`; it hardcodes port 1420 and skips port fallback.
- `npm run dev` — browser-only dev. No Tauri IPC; Rust-backed features return `undefined` (see `invokeOptional` below).
- `npm run gen:vocab` — regenerates `src/data/vocabulary.json` + `course-expansion.json` from Rust (`src-tauri/src/bin/gen_vocab.rs`). Commit the regenerated JSON if engine data logic changed.
- `npm run gen:library` — regenerates `src/data/library.json` (public-domain classics) from raw texts in `scripts/books/` (gitignored) via `scripts/gen-library.mjs`. Commit the regenerated JSON.
- `npm run lint:rust` / `format:rust` — clippy `-D warnings`, rustfmt `--check`.
- `npm run audit:lighthouse` / `audit:lighthouse:view` — Lighthouse audit of the built app via `scripts/lighthouse.mjs`. Deep pass audits every screen + every lesson/grammar/dialogue route (91), seeded past onboarding; writes HTML+JSON reports + an `index.html` summary to `lighthouse-reports/` (gitignored). Uses Puppeteer's bundled Chrome over the DevTools protocol (fresh per route — avoids chrome-launcher's WSL path bug); falls back to a system Chrome/`CHROME_PATH`. Add `--no-build` to reuse `dist/`, `--screen` for one route per screen type, `--mobile` for the mobile preset, `--view` to open the summary.

## TypeScript: TS7/TS6 dual setup — do not "fix" it

- `tsc` resolves to native TS7 (`@typescript/native`, the `tsgo` compiler) and runs `tsc -b` for typecheck.
- The `typescript` package is aliased to `@typescript/typescript6` solely so typescript-eslint can run type-aware rules via `projectService`. This is intentional; typescript-eslint doesn't support TS7 yet.
- Strict flags that shape code: `verbatimModuleSyntax` (use `import type`), `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`.
- Path alias `@/*` → `./src/*` (configured in tsconfig, vite, vitest).

## Architecture

- All content lives in `src/data/*.json`; `src/engine/schemas.ts` (Zod 4) is the single source of truth — validates at import (fails fast) and derives the TS types (re-exported via `src/engine/types.ts`). Editing `course.json` etc. is safe; keep lesson/word ids unique across the whole course. `library.json` holds public-domain classics (chapters/sections/paragraphs); ids unique within each book.
- Library reader (`src/screens/reader-screen.tsx`): tap-any-word lookup, TTS, reading-speed WPM, deterministic comprehension questions (`sectionQuestions`, seeded by section id), expressions and rare-word lists; imported PDF/TXT/MD docs stored in the store (capped at 3, truncated to 150k chars).
- `src/engine/` is pure, React-free and deterministic: exercises are generated from an RNG seeded by lesson id (same lesson ⇒ same exercises, testable).
- Rust backend (`src-tauri/`): commands `lookup_word`, `read_text_file`, `read_document_text`. WordNet is read by the custom `src-tauri/src/wordnet_db.rs` — do NOT reintroduce the `wordnet` crate (hangs on missing words).
- Call Tauri only through `src/lib/tauri.ts` `invokeOptional` so the app works in plain-browser dev.
- Heavy NLP (retext/compromise/readability) runs in a Web Worker (`src/engine/analyzer-worker.ts`); keep it off the main thread.
- No router: **hash-based router** (`src/lib/router.ts` + `useHashRoute`) — every screen
  is a `#/route`, with sub-routes for context (book/chapter/section, lesson, grammar lesson,
  dialogue, profile tab, dictionary word). Refresh and deep links restore the exact place.
  zustand persists to `localStorage` key `aura-state`.

## Build & WordNet gotchas

- WordNet data (~35 MB, gitignored) must be copied from `node_modules/wordnet-db` into `src-tauri/resources/wn` by `npm run copy:wn` before Rust compiles. `npm run build` / tauri dev/build run it automatically; bare `cargo build` fails without it. Only the 8 `index.*`/`data.*` files — never copy `index.sense`.
- Vite 8 is Rolldown-based; esbuild is not bundled — don't set `minify: 'esbuild'`.
- CSP restricts `connect-src` to Tauri IPC: app must work fully offline (no CDN fonts/icons; fonts are self-hosted).

## Enforced conventions (lint will fail otherwise)

- Zero-emoji policy: no emoji code points anywhere (UI, data, docs, scripts). Use `lucide-react` icons; `UiIcon` maps icon names stored in data.
- perfectionist `sort-imports` / `sort-named-imports` are `error` — keep imports sorted.
- Design tokens live in `src/styles/global.css` `:root`; use spacing/radius/shadow tokens, never magic numbers; BEM class names. `DESIGN.md` is the source of truth.
- `no-console` is warn, only `warn`/`error` allowed. `no-non-null-assertion` is off; `react-hooks/set-state-in-effect` and `react-hooks/refs` are off (false positives).

## Platform facts

- Speech recognition is unavailable on Linux WebKitGTK → speak exercises self-grade when recognition is missing.
- WebKitGTK also lacks `speechSynthesis` → TTS falls back to the OS engine via the Rust commands `speak_text`/`stop_speech`/`tts_available` (spd-say → espeak-ng/espeak on Linux, `say` on macOS, PowerShell `System.Speech` on Windows). On Linux, install `speech-dispatcher` or `espeak-ng` for voice.
- Tests: ~50 Vitest tests (jsdom, setup in `src/test-setup.ts`), covering the engine + an `App` smoke test. Data-integrity is asserted (unique ids, achievement rules match JSON).
