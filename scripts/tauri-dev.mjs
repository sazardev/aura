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
    const socket = net.connect({ host: '127.0.0.1', port })
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(false))
  })
}

async function findFreePort() {
  for (let offset = 0; offset < 100; offset += 1) {
    const candidate = PREFERRED_PORT + offset
    if (!(await isPortOpen(candidate))) return candidate
  }
  throw new Error(`No hay puertos libres a partir del ${PREFERRED_PORT}`)
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
    ? `\n🦉 Aura dev en http://localhost:${port}\n`
    : `\n🦉 Aura dev en http://localhost:${port}\n   (el puerto ${PREFERRED_PORT} está ocupado, se eligió uno libre)\n`,
)

const vite = spawn(process.execPath, [VITE_BIN, '--port', String(port), '--strictPort'], {
  env: { ...process.env, AURA_DEV_PORT: String(port) },
  stdio: 'inherit',
})

if (!(await waitForServer(port))) {
  vite.kill()
  console.error(`\n✖ El servidor de desarrollo no arrancó en el puerto ${port}`)
  process.exit(1)
}

const configOverride = JSON.stringify({ build: { devUrl: `http://localhost:${port}` } })
const tauri = spawn(process.execPath, [TAURI_BIN, 'dev', '--config', configOverride], {
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
