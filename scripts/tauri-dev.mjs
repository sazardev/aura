import { spawn } from 'node:child_process'
import net from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const VITE_BIN = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const TAURI_BIN = join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js')
const PREFERRED_PORT = 1420

function isPortOpen(port) {
  return new Promise((resolve) => {
    let remaining = 0
    for (const host of ['127.0.0.1', '::1']) {
      remaining += 1
      const socket = net.connect({ host, port })
      socket.setTimeout(500)
      const finish = (open) => {
        socket.destroy()
        remaining -= 1
        if (open) {
          resolve(true)
        } else if (remaining === 0) {
          resolve(false)
        }
      }
      socket.once('connect', () => finish(true))
      socket.once('timeout', () => finish(false))
      socket.once('error', () => finish(false))
    }
  })
}

async function findFreePort() {
  for (let offset = 0; offset < 100; offset += 1) {
    const candidate = PREFERRED_PORT + offset
    if (!(await isPortOpen(candidate))) return candidate
  }
  throw new Error(`No free ports available starting at ${PREFERRED_PORT}`)
}

async function waitForServer(port, timeoutMs = 30_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(port)) return true
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return false
}

const port = await findFreePort()
console.log(
  port === PREFERRED_PORT
    ? `\nAura dev server at http://localhost:${port}\n`
    : `\nAura dev server at http://localhost:${port}\n   (port ${PREFERRED_PORT} is busy, a free one was picked)\n`,
)

const vite = spawn(process.execPath, [VITE_BIN, '--port', String(port), '--strictPort'], {
  env: { ...process.env, AURA_DEV_PORT: String(port) },
  stdio: 'inherit',
})

if (!(await waitForServer(port))) {
  vite.kill()
  console.error(`\nError: the dev server did not start on port ${port}`)
  process.exit(1)
}

// `npm run tauri:android` / `tauri:ios` pass the platform as the first argument.
const platform = process.argv[2]
const tauriArgs = platform === 'android' || platform === 'ios' ? [platform, 'dev'] : ['dev']
const configOverride = JSON.stringify({ build: { devUrl: `http://localhost:${port}` } })
const tauri = spawn(process.execPath, [TAURI_BIN, ...tauriArgs, '--config', configOverride], {
  stdio: 'inherit',
})

let closing = false
function close(code) {
  if (closing) return
  closing = true
  vite.kill()
  process.exit(code ?? 0)
}

tauri.on('exit', (code) => close(code))
tauri.on('error', (error) => {
  console.error(error)
  close(1)
})
process.on('SIGINT', () => close(0))
process.on('SIGTERM', () => close(0))
