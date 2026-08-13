/**
 * Procedural sound effects built with the Web Audio API. No audio files, no
 * network: every effect is synthesized on the fly, so the app stays 100%
 * offline and the bundle stays tiny.
 */

export type SoundKind =
  | 'click'
  | 'correct'
  | 'wrong'
  | 'success'
  | 'achievement'
  | 'levelup'
  | 'heart'
  | 'page'
  | 'streak'

let enabled = true
let context: AudioContext | undefined

export function isSoundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(value: boolean): void {
  enabled = value
}

/**
 * Creates/resumes the AudioContext. Must happen from a user gesture on most
 * platforms, so this is also called on the first pointer-down of a session.
 */
export function primeAudio(): void {
  const ctx = ensureContext()
  if (ctx?.state === 'suspended') void ctx.resume()
}

function ensureContext(): AudioContext | undefined {
  if (typeof window === 'undefined') return undefined
  const AudioContextCtor =
    (window.AudioContext as typeof AudioContext | undefined) ?? getWebkitAudioContext()
  if (AudioContextCtor === undefined) return undefined
  context ??= new AudioContextCtor()
  return context
}

function getWebkitAudioContext(): typeof AudioContext | undefined {
  const webkit = window as unknown as { webkitAudioContext?: typeof AudioContext }
  return webkit.webkitAudioContext
}

/**
 * Plays a sound effect. Silently no-ops when disabled or when the platform
 * has no Web Audio support (e.g. older WebKitGTK or jsdom tests).
 */
export function playSound(kind: SoundKind): void {
  if (!enabled) return
  const ctx = ensureContext()
  if (ctx === undefined) return
  try {
    soundPlayers[kind](ctx)
  } catch {
    // Audio failures should never break the UI.
  }
}

const soundPlayers: Record<SoundKind, (ctx: AudioContext) => void> = {
  click: (ctx) => {
    slide(ctx, { type: 'sine', from: 720, to: 520, start: 0, dur: 0.06, gain: 0.1 })
  },
  correct: (ctx) => {
    note(ctx, { freq: 659.3, start: 0, dur: 0.09, type: 'triangle', gain: 0.2 })
    note(ctx, { freq: 880, start: 0.07, dur: 0.14, type: 'triangle', gain: 0.2 })
  },
  wrong: (ctx) => {
    slide(ctx, { type: 'sawtooth', from: 170, to: 130, start: 0, dur: 0.3, gain: 0.12 })
  },
  success: (ctx) => {
    const notes = [523.3, 659.3, 784, 1046.5]
    for (const [index, freq] of notes.entries()) {
      note(ctx, { freq, start: index * 0.08, dur: 0.16, type: 'triangle', gain: 0.18 })
    }
  },
  achievement: (ctx) => {
    const notes = [523.3, 659.3, 784, 1046.5]
    for (const [index, freq] of notes.entries()) {
      note(ctx, { freq, start: index * 0.11, dur: 0.22, type: 'triangle', gain: 0.18 })
    }
    note(ctx, { freq: 1046.5, start: 0.44, dur: 0.5, type: 'sine', gain: 0.16 })
  },
  levelup: (ctx) => {
    const notes = [440, 523.3, 659.3, 880]
    for (const [index, freq] of notes.entries()) {
      note(ctx, { freq, start: index * 0.06, dur: 0.12, type: 'square', gain: 0.08 })
    }
  },
  heart: (ctx) => {
    slide(ctx, { type: 'sine', from: 330, to: 210, start: 0, dur: 0.16, gain: 0.14 })
    slide(ctx, { type: 'sine', from: 300, to: 180, start: 0.14, dur: 0.2, gain: 0.12 })
  },
  page: (ctx) => {
    noise(ctx, { start: 0, dur: 0.16, from: 1200, to: 300, gain: 0.12 })
  },
  streak: (ctx) => {
    note(ctx, { freq: 1568, start: 0, dur: 0.12, type: 'sine', gain: 0.12 })
    note(ctx, { freq: 2093, start: 0.08, dur: 0.2, type: 'sine', gain: 0.1 })
  },
}

interface ToneOptions {
  type: OscillatorType
  from: number
  to: number
  start: number
  dur: number
  gain: number
}

function slide(ctx: AudioContext, options: ToneOptions): void {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  const { start, dur, from, to, gain } = options
  oscillator.type = options.type
  oscillator.frequency.setValueAtTime(from, ctx.currentTime + start)
  oscillator.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + start + dur)
  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime + start)
  gainNode.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.start(ctx.currentTime + start)
  oscillator.stop(ctx.currentTime + start + dur + 0.05)
}

interface NoteOptions {
  freq: number
  start: number
  dur: number
  type: OscillatorType
  gain: number
}

function note(ctx: AudioContext, options: NoteOptions): void {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  const { freq, start, dur, type, gain } = options
  oscillator.type = type
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime + start)
  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime + start)
  gainNode.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.start(ctx.currentTime + start)
  oscillator.stop(ctx.currentTime + start + dur + 0.05)
}

function noise(
  ctx: AudioContext,
  options: { start: number; dur: number; from: number; to: number; gain: number },
): void {
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * options.dur))
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < frameCount; index += 1) {
    data[index] = Math.random() * 2 - 1
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(options.from, ctx.currentTime + options.start)
  filter.frequency.exponentialRampToValueAtTime(
    options.to,
    ctx.currentTime + options.start + options.dur,
  )
  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime + options.start)
  gainNode.gain.exponentialRampToValueAtTime(options.gain, ctx.currentTime + options.start + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + options.start + options.dur)
  source.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  source.start(ctx.currentTime + options.start)
}
