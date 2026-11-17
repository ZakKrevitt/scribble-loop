import {
  STEPS,
  drumFromY,
  frequency,
  lineSteps,
  midiForRow,
  paceWalker,
  rowFromY,
  stepFromX,
  walkerPoint,
  type Blob,
  type Drum,
  type Item,
  type KeyName,
  type Point,
  type ScaleName,
  type WalkerState,
} from '@/model/score'

export const LEADS = ['Supersaw', 'Rubber', 'Glass', 'Chip'] as const
export type LeadName = (typeof LEADS)[number]

export interface Settings {
  bpm: number
  key: KeyName
  scale: ScaleName
  lead: LeadName
}

interface LeadPreset {
  wave: OscillatorType
  /** Cents for each oscillator in the stack. */
  detunes: number[]
  spread: number
  sub: boolean
  fm?: { ratio: number; index: number; peak: number; decay: number }
  /** Semitones the pitch starts above the note before snapping down. */
  bend: number
  cutoff: { peak: number; rest: number; decay: number; q: number }
  attack: number
  release: number
  glide: number
  level: number
  octave: number
}

const PRESETS: Record<LeadName, LeadPreset> = {
  Supersaw: {
    wave: 'sawtooth',
    detunes: [-19, -11, -5, 0, 4, 10, 18],
    spread: 0.8,
    sub: true,
    bend: 0,
    cutoff: { peak: 11000, rest: 3200, decay: 0.09, q: 2 },
    attack: 0.004,
    release: 0.05,
    glide: 0.016,
    level: 0.13,
    octave: 0,
  },
  Rubber: {
    wave: 'sine',
    detunes: [0],
    spread: 0,
    sub: false,
    fm: { ratio: 1, index: 1.4, peak: 9, decay: 0.045 },
    bend: 12,
    cutoff: { peak: 14000, rest: 9000, decay: 0.08, q: 0.7 },
    attack: 0.002,
    release: 0.04,
    glide: 0.03,
    level: 0.34,
    octave: -1,
  },
  Glass: {
    wave: 'sine',
    detunes: [0, 1200],
    spread: 0.5,
    sub: false,
    fm: { ratio: 3.5, index: 0.5, peak: 4.5, decay: 0.22 },
    bend: 0,
    cutoff: { peak: 16000, rest: 12000, decay: 0.2, q: 0.5 },
    attack: 0.002,
    release: 0.22,
    glide: 0.01,
    level: 0.22,
    octave: 1,
  },
  Chip: {
    wave: 'square',
    detunes: [-7, 7],
    spread: 0.4,
    sub: false,
    bend: 0,
    cutoff: { peak: 9000, rest: 5200, decay: 0.05, q: 1 },
    attack: 0.001,
    release: 0.02,
    glide: 0.004,
    level: 0.11,
    octave: 1,
  },
}

/** A soft clipping curve. Higher drive squashes harder. */
function clipCurve(drive: number): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const norm = Math.tanh(drive)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = Math.tanh(x * drive) / norm
  }
  return curve
}

/** One monophonic lead voice. Each line on the grid owns one. */
class LeadVoice {
  private pitch: ConstantSourceNode
  private oscillators: OscillatorNode[] = []
  private modDepth: GainNode | null = null
  private filter: BiquadFilterNode
  private amp: GainNode
  on = false
  row = -1
  private ctx: AudioContext
  private preset: LeadPreset

  constructor(ctx: AudioContext, preset: LeadPreset, out: AudioNode) {
    this.ctx = ctx
    this.preset = preset
    const p = preset
    this.pitch = ctx.createConstantSource()
    this.pitch.offset.value = 220
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = p.cutoff.rest
    this.filter.Q.value = p.cutoff.q
    this.amp = ctx.createGain()
    this.amp.gain.value = 0
    this.filter.connect(this.amp).connect(out)

    let modOut: GainNode | null = null
    if (p.fm) {
      const mod = ctx.createOscillator()
      mod.frequency.value = 0
      const ratio = ctx.createGain()
      ratio.gain.value = p.fm.ratio
      this.pitch.connect(ratio).connect(mod.frequency)
      modOut = ctx.createGain()
      modOut.gain.value = 0
      mod.connect(modOut)
      mod.start()
      this.oscillators.push(mod)
      this.modDepth = modOut
    }

    const mix = 1 / Math.sqrt(p.detunes.length)
    p.detunes.forEach((cents, i) => {
      const osc = ctx.createOscillator()
      osc.type = p.wave
      osc.frequency.value = 0
      osc.detune.value = cents
      this.pitch.connect(osc.frequency)
      if (modOut) modOut.connect(osc.frequency)
      const gain = ctx.createGain()
      gain.gain.value = cents >= 1200 ? mix * 0.4 : mix
      const pan = ctx.createStereoPanner()
      const t = p.detunes.length > 1 ? i / (p.detunes.length - 1) : 0.5
      pan.pan.value = (t * 2 - 1) * p.spread
      osc.connect(gain).connect(pan).connect(this.filter)
      osc.start()
      this.oscillators.push(osc)
    })

    if (p.sub) {
      const sub = ctx.createOscillator()
      sub.type = 'sine'
      sub.frequency.value = 0
      sub.detune.value = -1200
      this.pitch.connect(sub.frequency)
      const gain = ctx.createGain()
      gain.gain.value = 0.7
      sub.connect(gain).connect(this.filter)
      sub.start()
      this.oscillators.push(sub)
    }
    this.pitch.start()
  }

  /** Start a note, or move to a new pitch if one is already sounding. */
  play(time: number, hz: number, row: number): void {
    const p = this.preset
    const f = hz * 2 ** p.octave
    if (!this.on) {
      if (p.bend) {
        this.pitch.offset.setValueAtTime(f * 2 ** (p.bend / 12), time)
        this.pitch.offset.exponentialRampToValueAtTime(f, time + 0.045)
      } else {
        this.pitch.offset.setValueAtTime(f, time)
      }
      this.amp.gain.setTargetAtTime(p.level, time, p.attack)
    } else {
      this.pitch.offset.setTargetAtTime(f, time, p.glide)
    }
    this.filter.frequency.setValueAtTime(p.cutoff.peak, time)
    this.filter.frequency.setTargetAtTime(p.cutoff.rest, time, p.cutoff.decay)
    if (this.modDepth && p.fm) {
      this.modDepth.gain.setValueAtTime(f * p.fm.peak, time)
      this.modDepth.gain.setTargetAtTime(f * p.fm.index, time, p.fm.decay)
    }
    this.on = true
    this.row = row
  }

  stop(time: number): void {
    if (!this.on) return
    this.amp.gain.setTargetAtTime(0, time, this.preset.release)
    this.on = false
    this.row = -1
  }

  dispose(): void {
    const now = this.ctx.currentTime
    this.amp.gain.cancelScheduledValues(now)
    this.amp.gain.setTargetAtTime(0, now, 0.01)
    const end = now + 0.2
    for (const osc of this.oscillators) osc.stop(end)
    this.pitch.stop(end)
    setTimeout(() => this.amp.disconnect(), 400)
  }
}

const LOOKAHEAD = 0.12
const TICK_MS = 25

/**
 * The instrument's sound. A playhead steps across the grid; lines hold lead notes
 * for as long as the playhead is inside them, and blobs fire a drum as it arrives.
 */
export class Engine {
  private ctx: AudioContext | null = null
  private leadBus!: GainNode
  private duck!: GainNode
  private drumBus!: GainNode
  private reverb!: GainNode
  private noise!: AudioBuffer

  private settings: Settings
  private lines = new Map<number, (number | null)[]>()
  private voices = new Map<number, LeadVoice>()
  private blobsAt: Blob[][] = Array.from({ length: STEPS }, () => [])
  private walkers = new Map<number, WalkerState>()

  private timer: number | null = null
  private nextStep = 0
  private nextTime = 0
  private queue: { step: number; time: number; length: number }[] = []

  /** Counts of what has been scheduled, for the status line and for tests. */
  readonly stats = { notes: 0, drums: 0, chirps: 0 }
  /** Called as a drum or a robot's chirp is scheduled, with the item that caused it. */
  onDrum: ((itemId: number, time: number) => void) | null = null

  /** Where a robot is standing now. */
  walker(id: number): WalkerState | undefined {
    return this.walkers.get(id)
  }

  walkerPoint(id: number): Point | undefined {
    const state = this.walkers.get(id)
    return state && walkerPoint(state)
  }

  constructor(settings: Settings) {
    this.settings = { ...settings }
  }

  get running(): boolean {
    return this.timer !== null
  }

  /** Audio clock time in seconds, or 0 before the first start. */
  get now(): number {
    return this.ctx?.currentTime ?? 0
  }

  private build(): AudioContext {
    const ctx = new AudioContext({ latencyHint: 'interactive' })

    const out = ctx.createGain()
    out.gain.value = 0.85
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -9
    limiter.knee.value = 4
    limiter.ratio.value = 14
    limiter.attack.value = 0.002
    limiter.release.value = 0.12
    const clip = ctx.createWaveShaper()
    clip.curve = clipCurve(1.6)
    clip.oversample = '2x'
    clip.connect(limiter).connect(out).connect(ctx.destination)

    // A short bright room, built from decaying noise.
    const seconds = 1.4
    const impulse = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
      }
    }
    const convolver = ctx.createConvolver()
    convolver.buffer = impulse
    this.reverb = ctx.createGain()
    this.reverb.gain.value = 1
    const wet = ctx.createGain()
    wet.gain.value = 0.22
    this.reverb.connect(convolver).connect(wet).connect(clip)

    // Leads run through a drive stage, then get pushed down by every kick.
    this.leadBus = ctx.createGain()
    const drive = ctx.createWaveShaper()
    drive.curve = clipCurve(2.4)
    drive.oversample = '2x'
    this.duck = ctx.createGain()
    this.leadBus.connect(drive).connect(this.duck).connect(clip)
    const leadSend = ctx.createGain()
    leadSend.gain.value = 0.5
    this.duck.connect(leadSend).connect(this.reverb)

    this.drumBus = ctx.createGain()
    this.drumBus.gain.value = 0.9
    const drumDrive = ctx.createWaveShaper()
    drumDrive.curve = clipCurve(3)
    drumDrive.oversample = '2x'
    this.drumBus.connect(drumDrive).connect(clip)

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const n = this.noise.getChannelData(0)
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1

    return ctx
  }

  async start(): Promise<void> {
    if (!this.ctx) {
      this.ctx = this.build()
      this.rebuildVoices()
    }
    await this.ctx.resume()
    if (this.timer !== null) return
    this.nextStep = 0
    this.nextTime = this.ctx.currentTime + 0.06
    this.queue = []
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
    this.tick()
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.queue = []
    const now = this.now
    for (const voice of this.voices.values()) voice.stop(now)
  }

  /** How far through the loop the playhead is, from 0 to 1. Null while stopped. */
  position(): number | null {
    if (!this.ctx || this.timer === null) return null
    const now = this.ctx.currentTime
    while (this.queue.length > 1 && this.queue[1].time <= now) this.queue.shift()
    const current = this.queue[0]
    if (!current || current.time > now) return 0
    return (current.step + Math.min(1, (now - current.time) / current.length)) / STEPS
  }

  update(settings: Partial<Settings>): void {
    const leadChanged = settings.lead !== undefined && settings.lead !== this.settings.lead
    this.settings = { ...this.settings, ...settings }
    if (leadChanged) this.rebuildVoices()
  }

  setItems(items: Item[]): void {
    this.lines.clear()
    this.blobsAt = Array.from({ length: STEPS }, () => [])
    const robots = new Set<number>()
    for (const item of items) {
      if (item.kind === 'line') this.lines.set(item.id, lineSteps(item))
      else if (item.kind === 'blob') this.blobsAt[stepFromX(item.x)].push(item)
      else {
        robots.add(item.id)
        if (!this.walkers.has(item.id)) {
          this.walkers.set(item.id, {
            step: stepFromX(item.x),
            row: rowFromY(item.y),
            dir: Math.random() < 0.5 ? 1 : -1,
            moves: 0,
          })
        }
      }
    }
    for (const id of this.walkers.keys()) if (!robots.has(id)) this.walkers.delete(id)
    if (!this.ctx) return
    for (const [id, voice] of this.voices) {
      if (!this.lines.has(id)) {
        voice.dispose()
        this.voices.delete(id)
      }
    }
    for (const id of this.lines.keys()) {
      if (!this.voices.has(id)) {
        this.voices.set(id, new LeadVoice(this.ctx, PRESETS[this.settings.lead], this.leadBus))
      }
    }
  }

  private rebuildVoices(): void {
    if (!this.ctx) return
    for (const voice of this.voices.values()) voice.dispose()
    this.voices.clear()
    for (const id of this.lines.keys()) {
      this.voices.set(id, new LeadVoice(this.ctx, PRESETS[this.settings.lead], this.leadBus))
    }
  }

  private tick(): void {
    if (!this.ctx) return
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      const length = 60 / this.settings.bpm / 4
      this.schedule(this.nextStep, this.nextTime)
      this.queue.push({ step: this.nextStep, time: this.nextTime, length })
      this.nextStep = (this.nextStep + 1) % STEPS
      this.nextTime += length
    }
  }

  private schedule(step: number, time: number): void {
    const { key, scale } = this.settings
    for (const [id, steps] of this.lines) {
      const voice = this.voices.get(id)
      if (!voice) continue
      const y = steps[step]
      if (y === null) {
        voice.stop(time)
        continue
      }
      const row = rowFromY(y)
      if (voice.on && voice.row === row) continue
      voice.play(time, frequency(midiForRow(row, key, scale)), row)
      this.stats.notes++
    }
    for (const blob of this.blobsAt[step]) {
      this.drum(drumFromY(blob.y), time, blob.size)
      this.stats.drums++
      this.onDrum?.(blob.id, time)
    }
    // Robots take a pace on every other step, so each pass of the playhead finds them somewhere new.
    for (const [id, state] of this.walkers) {
      const next = step % 2 === 0 ? paceWalker(state) : state
      this.walkers.set(id, next)
      if (next.step === step) {
        this.chirp(frequency(midiForRow(next.row, key, scale)), time)
        this.stats.chirps++
        this.onDrum?.(id, time)
      }
    }
  }

  /** A robot's voice: a short, bright, metallic pluck at the pitch of the row it stands on. */
  private chirp(hz: number, time: number): void {
    const ctx = this.ctx!
    const f = hz * 2
    const carrier = ctx.createOscillator()
    carrier.frequency.setValueAtTime(f * 1.5, time)
    carrier.frequency.exponentialRampToValueAtTime(f, time + 0.02)
    const mod = ctx.createOscillator()
    mod.type = 'square'
    mod.frequency.value = f * 2.01
    const depth = ctx.createGain()
    depth.gain.setValueAtTime(f * 5, time)
    depth.gain.setTargetAtTime(f * 0.3, time, 0.03)
    mod.connect(depth).connect(carrier.frequency)
    const amp = ctx.createGain()
    amp.gain.setValueAtTime(0, time)
    amp.gain.linearRampToValueAtTime(0.2, time + 0.002)
    amp.gain.setTargetAtTime(0, time + 0.002, 0.045)
    carrier.connect(amp).connect(this.leadBus)
    for (const osc of [carrier, mod]) {
      osc.start(time)
      osc.stop(time + 0.4)
    }
  }

  private burst(time: number, seconds: number): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noise
    src.start(time, Math.random() * 0.5, seconds + 0.05)
    return src
  }

  private drum(drum: Drum, time: number, size: number): void {
    const ctx = this.ctx!
    const level = 0.45 + 0.55 * size
    const env = (peak: number, decay: number, at = time): GainNode => {
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(peak, at + 0.001)
      g.gain.setTargetAtTime(0, at + 0.001, decay / 4)
      return g
    }
    const tone = (type: OscillatorType, from: number, to: number, sweep: number, life: number) => {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.setValueAtTime(from, time)
      osc.frequency.exponentialRampToValueAtTime(to, time + sweep)
      osc.start(time)
      osc.stop(time + life)
      return osc
    }

    switch (drum) {
      case 'kick': {
        const life = 0.3 + 0.35 * size
        tone('sine', 190, 44, 0.11, life + 0.2).connect(env(level * 1.3, life)).connect(this.drumBus)
        const click = ctx.createBiquadFilter()
        click.type = 'highpass'
        click.frequency.value = 3000
        this.burst(time, 0.02).connect(click).connect(env(level * 0.5, 0.012)).connect(this.drumBus)
        // The kick shoves the leads out of the way, then lets them swell back.
        this.duck.gain.setTargetAtTime(0.12, time, 0.003)
        this.duck.gain.setTargetAtTime(1, time + 0.05, 0.07)
        break
      }
      case 'snare': {
        const life = 0.12 + 0.14 * size
        const band = ctx.createBiquadFilter()
        band.type = 'bandpass'
        band.frequency.value = 2100
        band.Q.value = 0.6
        const hit = env(level, life)
        this.burst(time, life * 2).connect(band).connect(hit)
        hit.connect(this.drumBus)
        hit.connect(this.reverb)
        tone('triangle', 260, 170, 0.05, life + 0.1).connect(env(level * 0.7, 0.07)).connect(this.drumBus)
        break
      }
      case 'clap': {
        const band = ctx.createBiquadFilter()
        band.type = 'bandpass'
        band.frequency.value = 1300
        band.Q.value = 1.1
        const sum = ctx.createGain()
        band.connect(sum)
        sum.connect(this.drumBus)
        sum.connect(this.reverb)
        for (const [offset, peak, decay] of [
          [0, 0.7, 0.012],
          [0.012, 0.8, 0.012],
          [0.026, 1, 0.1 + 0.1 * size],
        ]) {
          const g = env(level * peak, decay, time + offset)
          const src = ctx.createBufferSource()
          src.buffer = this.noise
          src.start(time + offset, Math.random() * 0.5, decay * 3 + 0.05)
          src.connect(g).connect(band)
        }
        break
      }
      case 'pop': {
        const life = 0.05 + 0.05 * size
        tone('sine', 340, 1500, life, life + 0.08).connect(env(level * 0.9, life)).connect(this.drumBus)
        break
      }
      case 'zap': {
        const life = 0.09 + 0.14 * size
        const hit = env(level * 0.5, life)
        tone('sawtooth', 4200, 110, life, life + 0.1).connect(hit)
        hit.connect(this.drumBus)
        hit.connect(this.reverb)
        break
      }
      case 'hat': {
        const life = 0.025 + 0.16 * size * size
        const high = ctx.createBiquadFilter()
        high.type = 'highpass'
        high.frequency.value = 7800
        this.burst(time, life * 2).connect(high).connect(env(level * 0.6, life)).connect(this.drumBus)
        break
      }
    }
  }
}
