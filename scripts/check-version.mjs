import { verifyVersions } from './lib/version-sync.mjs'

try {
  const version = verifyVersions()
  console.log(`versions in sync: ${version}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
