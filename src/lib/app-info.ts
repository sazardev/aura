import changelogMarkdown from '../../CHANGELOG.md?raw'

/**
 * App version, injected at build time from `package.json` (the single source
 * of truth for versioning) by Vite's `define`. Matches the Tauri bundle
 * version and the Rust package version.
 */
export const APP_VERSION: string = __APP_VERSION__

/**
 * The full release changelog, bundled into the app so it is always readable
 * offline.
 */
export const CHANGELOG_MARKDOWN: string = changelogMarkdown
