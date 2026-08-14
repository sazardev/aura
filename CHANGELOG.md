# Changelog

All notable changes to Aura are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and Aura follows [Semantic Versioning](https://semver.org/). The version shown
here always matches `package.json`, `src-tauri/tauri.conf.json`,
`src-tauri/Cargo.toml` and `src-tauri/Cargo.lock` (verified by
`npm run version:check`).

## [Unreleased]

## [0.3.1] - 2026-08-14

### Fixed

- accessibility and layout audit fixes

## [0.3.0] - 2026-08-14

### Added

- turn review into an adaptive quiz

## [0.2.6] - 2026-08-14

### Fixed

- clean up the generated course and harden the engine

## [0.2.5] - 2026-08-13

### Fixed

- select the app binary via cargo default-run

## [0.2.4] - 2026-08-13

### Fixed

- place mainBinaryName at the config root

## [0.2.3] - 2026-08-13

### Fixed

- bundle the aura binary as the app executable

## [0.2.2] - 2026-08-13

### Fixed

- keep only installer assets in GitHub Releases

## [0.2.1] - 2026-08-13

### Fixed

- copy WordNet data before clippy

## [0.2.0] - 2026-08-13

### Added

- changelog, automated versioning and release pipeline
- offline classics library, telemetry & insights, career track, dialogues, onboarding and UI fixes

### Documentation

- record the full session in MEMORY.md

## [0.1.0] - 2026-08-12

### Added

- Duolingo-style English course: hand-authored and generated lessons, XP,
  levels, streaks, hearts, daily goals and 15 achievements.
- WordNet dictionary (offline, via the Rust backend) with a 3,885-word local
  vocabulary bank.
- Text analyzer: readability scores, sentiment, POS tagging and word-frequency
  insights.
- Spaced repetition reviews (SM-2) and offline pronunciation practice with
  text-to-speech.
