import { invoke } from '@tauri-apps/api/core'

/**
 * Detecta si la app corre dentro de la runtime de Tauri (vs. el navegador en dev).
 */
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in globalThis
}

/**
 * Invoca un comando Rust solo si estamos dentro de Tauri. En navegador dev
 * devuelve `undefined` sin lanzar errores.
 */
export async function invokeOptional<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | undefined> {
  if (!isTauriRuntime()) {
    return undefined
  }
  return invoke<T>(command, args)
}
