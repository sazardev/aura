import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const host = process.env['TAURI_DEV_HOST']
const devPort = Number(process.env['AURA_DEV_PORT'] ?? 1420)

const appVersion = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
    version: string
  }
).version

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: devPort,
    // Si el puerto está ocupado, Vite elige el siguiente libre en vez de fallar.
    strictPort: false,
    host: host ?? false,
    ...(host !== undefined ? { hmr: { protocol: 'ws', host, port: devPort + 1 } } : {}),
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'es2021',
    sourcemap: false,
  },
})
