import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const PACKAGE_JSON = resolve(ROOT, 'package.json')
const TAURI_CONF = resolve(ROOT, 'src-tauri', 'tauri.conf.json')
const CARGO_TOML = resolve(ROOT, 'src-tauri', 'Cargo.toml')
const CARGO_LOCK = resolve(ROOT, 'src-tauri', 'Cargo.lock')

export const VERSION_SOURCES = [
  'package.json',
  'src-tauri/tauri.conf.json',
  'src-tauri/Cargo.toml',
  'src-tauri/Cargo.lock',
]

export function readPackageVersion() {
  return JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version
}

function readTauriVersion() {
  return JSON.parse(readFileSync(TAURI_CONF, 'utf8')).version
}

function readCargoTomlVersion() {
  const match = /^version = "([^"]+)"/m.exec(readFileSync(CARGO_TOML, 'utf8'))
  return match?.[1]
}

function readCargoLockVersion() {
  const match = /\bname = "aura"\nversion = "([^"]+)"/.exec(readFileSync(CARGO_LOCK, 'utf8'))
  return match?.[1]
}

export function readVersions() {
  return {
    'package.json': readPackageVersion(),
    'src-tauri/tauri.conf.json': readTauriVersion(),
    'src-tauri/Cargo.toml': readCargoTomlVersion(),
    'src-tauri/Cargo.lock': readCargoLockVersion(),
  }
}

/**
 * Asserts that every version source agrees with `package.json` (the single
 * source of truth). Throws when they drift; returns the current version when
 * everything is in sync.
 */
export function verifyVersions() {
  const versions = readVersions()
  const base = versions['package.json']
  const mismatches = VERSION_SOURCES.filter(
    (file) => versions[file] !== undefined && versions[file] !== base,
  )
  if (mismatches.length > 0) {
    const detail = mismatches.map((file) => `${file}: ${versions[file] ?? '(missing)'}`).join(', ')
    throw new Error(`version drift: package.json is ${base} but ${detail}`)
  }
  return base
}

/**
 * Writes `version` into every source. `package.json` is rewritten via JSON,
 * the other three via a targeted replace so their formatting is preserved.
 */
export function syncVersions(version) {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'))
  writeFileSync(PACKAGE_JSON, `${JSON.stringify({ ...pkg, version }, null, 2)}\n`)

  writeFileSync(
    TAURI_CONF,
    readFileSync(TAURI_CONF, 'utf8').replace(/"version":\s*"[^"]+"/, `"version": "${version}"`),
  )

  writeFileSync(
    CARGO_TOML,
    readFileSync(CARGO_TOML, 'utf8').replace(/^version = "[^"]+"/m, `version = "${version}"`),
  )

  writeFileSync(
    CARGO_LOCK,
    readFileSync(CARGO_LOCK, 'utf8').replace(
      /\bname = "aura"\nversion = "[^"]+"/,
      `name = "aura"\nversion = "${version}"`,
    ),
  )

  verifyVersions()
}
