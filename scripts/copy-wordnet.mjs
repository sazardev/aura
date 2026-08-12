import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = join(root, 'node_modules', 'wordnet-db', 'dict')
const target = join(root, 'src-tauri', 'resources', 'wn')

if (!existsSync(source)) {
  throw new Error(
    'No se encontró wordnet-db. Ejecuta "npm install" antes de copiar los datos del diccionario.',
  )
}

mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true, force: true })
console.log(`WordNet (${dirname(source)}/dict) copiado a src-tauri/resources/wn`)
