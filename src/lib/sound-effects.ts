/**
 * Slide transition sound effects — lightweight Web Audio API beeps.
 *
 * No audio files needed; sounds are synthesized at runtime using oscillators.
 * This keeps the bundle small and avoids asset loading delays. The sounds
 * are subtle "click" / "whoosh" cues that play on slide transitions during
 * presentation mode (when enabled by the user).
 *
 * Sound types:
 *   - "click" — short high-pitched click for forward navigation
 *   - "whoosh" — filtered noise sweep for slide transitions
 *   - "ding" — pleasant chime for reaching the last slide
 *   - "pop" — soft pop (bubble-like)
 *   - "chime" — bell-like descending tones
 *   - "none" — silence
 */

export type SoundType = "click" | "whoosh" | "ding" | "pop" | "chime" | "none"

export const SOUND_OPTIONS: { value: SoundType; label: string; desc: string }[] = [
  { value: "whoosh", label: "Whoosh", desc: "Airy noise sweep" },
  { value: "click", label: "Click", desc: "Short electronic click" },
  { value: "ding", label: "Ding", desc: "Two-note chime" },
  { value: "pop", label: "Pop", desc: "Soft bubble pop" },
  { value: "chime", label: "Chime", desc: "Bell-like descending" },
  { value: "none", label: "None", desc: "Silent" },
]

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (audioCtx) return audioCtx
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Play a short click sound — used for forward/backward slide navigation.
 * Two quick oscillator pulses at a pleasant frequency.
 */
export function playClickSound(): void {
  const ctx = getCtx()
  if (!ctx) return
  // Resume if suspended (browsers require user gesture)
  if (ctx.state === "suspended") ctx.resume().catch(() => {})

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.08)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.15, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.12)
}

/**
 * Play a whoosh sound — a filtered noise sweep for slide transitions.
 * Creates a sense of motion without being distracting.
 */
export function playWhooshSound(): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === "suspended") ctx.resume().catch(() => {})

  const now = ctx.currentTime
  const duration = 0.3

  // Create a noise buffer (white noise)
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  // Bandpass filter sweeps from low to high for a "whoosh" effect
  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.setValueAtTime(400, now)
  filter.frequency.exponentialRampToValueAtTime(2000, now + duration * 0.5)
  filter.frequency.exponentialRampToValueAtTime(600, now + duration)
  filter.Q.value = 2

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.08, now + 0.05)
  gain.gain.linearRampToValueAtTime(0.04, now + duration * 0.5)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  noise.start(now)
  noise.stop(now + duration)
}

/**
 * Play a pleasant ding — used when reaching the last slide or starting
 * presentation mode.
 */
export function playDingSound(): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === "suspended") ctx.resume().catch(() => {})

  const now = ctx.currentTime
  // Two-note chime (C5 + E5) for a pleasant "ding"
  const freqs = [523.25, 659.25]
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = freq
    const start = now + i * 0.08
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.12, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.55)
  })
}

/**
 * Play a soft pop sound — bubble-like, playful. Uses a quick frequency
 * drop with a sine wave for a "pop" character.
 */
export function playPopSound(): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === "suspended") ctx.resume().catch(() => {})

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  // Frequency drops quickly from 800 to 200 for a "pop" effect
  osc.frequency.setValueAtTime(800, now)
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.08)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.18, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.14)
}

/**
 * Play a bell-like chime — descending tones (E5 → C5 → A4) with a
 * triangle wave for a warmer, bell-like timbre.
 */
export function playChimeSound(): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === "suspended") ctx.resume().catch(() => {})

  const now = ctx.currentTime
  // Descending three-note pattern
  const freqs = [659.25, 523.25, 440]
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "triangle" // warmer than sine
    osc.frequency.value = freq
    const start = now + i * 0.12
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.1, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.45)
  })
}

/**
 * Play a specific transition sound based on the sound type.
 * Falls back to click for unknown types.
 */
export function playTransitionSound(type: SoundType = "whoosh"): void {
  switch (type) {
    case "click": playClickSound(); break
    case "whoosh": playWhooshSound(); break
    case "ding": playDingSound(); break
    case "pop": playPopSound(); break
    case "chime": playChimeSound(); break
    case "none": break
  }
}
