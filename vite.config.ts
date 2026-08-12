import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const host = process.env['TAURI_DEV_HOST']
const devPort = Number(process.env['AURA_DEV_PORT'] ?? 1420)

export default defineConfig({
  plugins: [react()],
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
