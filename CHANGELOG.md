# Changelog

All notable changes to Aura are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and Aura follows [Semantic Versioning](https://semver.org/). The version shown
here always matches `package.json`, `src-tauri/tauri.conf.json`,
`src-tauri/Cargo.toml` and `src-tauri/Cargo.lock` (verified by
`npm run version:check`).

## [Unreleased]

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
