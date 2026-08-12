import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = join(root, 'node_modules', 'wordnet-db', 'dict')
const target = join(root, 'src-tauri', 'resources', 'wn')

if (!existsSync(source)) {
  throw new Error('wordnet-db was not found. Run "npm install" before copying the dictionary data.')
}

// The Rust `wordnet` crate only reads these files. `index.sense` must be
// excluded because its extension is not a valid part of speech.
const FILES = [
  'index.adj',
  'index.adv',
  'index.noun',
  'index.verb',
  'data.adj',
  'data.adv',
  'data.noun',
  'data.verb',
]

mkdirSync(target, { recursive: true })
for (const file of FILES) {
  copyFileSync(join(source, file), join(target, file))
}
for (const existing of readdirSync(target)) {
  if (!FILES.includes(existing)) {
    rmSync(join(target, existing), { force: true })
  }
}
console.log(`WordNet data (${FILES.length} files) copied to src-tauri/resources/wn`)
