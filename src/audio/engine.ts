import {
  LEADS,
  STEPS,
  drumFromY,
  drumTiming,
  drumX,
  frequency,
  lineNear,
  lineSteps,
  midiForRow,
  rowFromY,
  touches,
  type Blob,
  type BotType,
  type Drum,
  type DrumGrid,
  type Item,
  type KeyName,
  type LeadName,
  type Line,
  type Placement,
  type Point,
  type ScaleName,
} from '@/model/score'
import { STRIDE, startBody, walk, type BotBody } from '@/robots/bots'

export interface Settings {
  bpm: number
  key: KeyName
  scale: ScaleName
  /** The sound new lines get. Each line keeps its own. */
  lead: LeadName
  drumGrid: DrumGrid
}

/** Something a robot did to the song, for the app to apply to the items. */
export type BotEdit =
  | { kind: 'bite'; by: number; at: Point; radius: number }
  | { kind: 'swap'; by: number; lineId: number; lead: LeadName }
  | { kind: 'drop'; by: number; item: Omit<Blob, 'id'> | Omit<Line, 'id'> }

/** How a robot is standing at a moment, for drawing. */
export interface BotPose {
  x: number
  y: number
  facing: 1 | -1
  frame: number
}

interface Bot {
  type: BotType
  body: BotBody
  /** Recent bodies with the audio time of each, so drawing can ease between them. */
  trail: { t: number; body: BotBody }[]
  lastAct: number
  drops: number
  /** When each line was last swapped, so one pass does not flip it back and forth. */
  swapped: Map<number, number>
}

/** The pedals the hand can play in effects mode. */
export const EFFECTS = ['Filter', 'Drive', 'Crush', 'Echo', 'Reverb'] as const
export type EffectName = (typeof EFFECTS)[number]

/** A staircase curve: fewer levels is a harsher, more broken sound. */
function crushCurve(levels: number): Float32Array<ArrayBuffer> {
  const n = 2048
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = Math.round(x * levels) / levels
  }
  return curve
}

interface Pedals {
  filter: BiquadFilterNode
  wobble: OscillatorNode
  wobbleDepth: GainNode
  driveDry: GainNode
  drivePre: GainNode
  driveWet: GainNode
  crushDry: GainNode
  crush: WaveShaperNode
  crushWet: GainNode
  crushLevels: number
  echo: DelayNode
  echoSend: GainNode
  echoFeedback: GainNode
  hallSend: GainNode
  hallTone: BiquadFilterNode
}

/** How close a robot must come to something to act on it, as a fraction of grid height. */
const REACH = 0.045

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
  private fxIn!: GainNode
  private pedals!: Pedals
  /** Which pedals are pressed right now, for the screen and for tests. */
  readonly effects: Partial<Record<EffectName, { x: number; y: number }>> = {}

  private settings: Settings
  private items: Item[] = []
  private lines = new Map<number, { steps: (number | null)[]; lead: LeadName }>()
  private voices = new Map<number, { voice: LeadVoice; lead: LeadName }>()
  private blobsAt: { blob: Blob; offset: number }[][] = Array.from({ length: STEPS }, () => [])
  private bots = new Map<number, Bot>()
  private simTime = -1
  private aspect = 1.6

  private timer: number | null = null
  private nextStep = 0
  private nextTime = 0
  private queue: { step: number; time: number; length: number }[] = []

  /** Counts of what has been scheduled, for the status line and for tests. */
  readonly stats = { notes: 0, drums: 0, robot: 0, edits: 0 }
  /** Called as a drum fires or a robot acts, with the item and the audio time, so it can flash. */
  onDrum: ((itemId: number, time: number) => void) | null = null
  /** Called when a robot changes the song. */
  onEdit: ((edit: BotEdit) => void) | null = null

  /** Where a robot is at audio time `t`, eased between the steps it was moved on. */
  botPose(id: number, t = this.now): BotPose | undefined {
    const bot = this.bots.get(id)
    if (!bot) return undefined
    const trail = bot.trail
    let a = trail[0]
    let b = trail[0]
    for (const entry of trail) {
      if (entry.t <= t) a = entry
      if (entry.t >= t) {
        b = entry
        break
      }
      b = entry
    }
    const span = b.t - a.t
    const k = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 1
    const lerp = (u: number, v: number) => u + (v - u) * k
    const walked = lerp(a.body.walked, b.body.walked)
    return {
      x: lerp(a.body.x, b.body.x),
      y: lerp(a.body.y, b.body.y),
      facing: Math.cos(b.body.heading) >= 0 ? 1 : -1,
      frame: Math.floor(walked / STRIDE),
    }
  }

  botPoint(id: number): Point | undefined {
    const pose = this.botPose(id)
    return pose && { x: pose.x, y: pose.y }
  }

  /** Where blobs and robots are drawn now, for hit tests. */
  readonly where: Placement = (item) =>
    item.kind === 'walker' ? this.botPoint(item.id) : { x: drumX(item.x, this.settings.drumGrid), y: item.y }

  setAspect(aspect: number): void {
    this.aspect = aspect
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
    this.fxIn = ctx.createGain()
    this.pedals = this.buildPedals(ctx, this.fxIn, clip)

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
    this.reverb.connect(convolver).connect(wet).connect(this.fxIn)

    // Leads run through a drive stage, then get pushed down by every kick.
    this.leadBus = ctx.createGain()
    const drive = ctx.createWaveShaper()
    drive.curve = clipCurve(2.4)
    drive.oversample = '2x'
    this.duck = ctx.createGain()
    this.leadBus.connect(drive).connect(this.duck).connect(this.fxIn)
    const leadSend = ctx.createGain()
    leadSend.gain.value = 0.5
    this.duck.connect(leadSend).connect(this.reverb)

    this.drumBus = ctx.createGain()
    this.drumBus.gain.value = 0.9
    const drumDrive = ctx.createWaveShaper()
    drumDrive.curve = clipCurve(3)
    drumDrive.oversample = '2x'
    this.drumBus.connect(drumDrive).connect(this.fxIn)

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const n = this.noise.getChannelData(0)
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1

    return ctx
  }

  /** Filter, drive, crush and echo in a row across the whole mix, each at rest until pressed. */
  private buildPedals(ctx: AudioContext, input: AudioNode, output: AudioNode): Pedals {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 20000
    filter.Q.value = 0.7
    const wobble = ctx.createOscillator()
    wobble.frequency.value = 2
    const wobbleDepth = ctx.createGain()
    wobbleDepth.gain.value = 0
    wobble.connect(wobbleDepth).connect(filter.frequency)
    wobble.start()
    input.connect(filter)

    const afterDrive = ctx.createGain()
    const driveDry = ctx.createGain()
    const drivePre = ctx.createGain()
    const driveShape = ctx.createWaveShaper()
    driveShape.curve = clipCurve(3)
    driveShape.oversample = '4x'
    const driveWet = ctx.createGain()
    driveWet.gain.value = 0
    filter.connect(driveDry).connect(afterDrive)
    filter.connect(drivePre).connect(driveShape).connect(driveWet).connect(afterDrive)

    const afterCrush = ctx.createGain()
    const crushDry = ctx.createGain()
    const crush = ctx.createWaveShaper()
    crush.curve = crushCurve(16)
    const crushWet = ctx.createGain()
    crushWet.gain.value = 0
    afterDrive.connect(crushDry).connect(afterCrush)
    afterDrive.connect(crush).connect(crushWet).connect(afterCrush)

    const echo = ctx.createDelay(2)
    echo.delayTime.value = 0.25
    const echoSend = ctx.createGain()
    echoSend.gain.value = 0
    const echoFeedback = ctx.createGain()
    echoFeedback.gain.value = 0
    const echoReturn = ctx.createGain()
    echoReturn.gain.value = 0.7
    afterCrush.connect(output)
    afterCrush.connect(echoSend).connect(echo)
    echo.connect(echoFeedback).connect(echo)
    echo.connect(echoReturn).connect(output)

    // A long hall, separate from the short room the drums sit in, fed after the echo so repeats wash too.
    const seconds = 4
    const impulse = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2.2
    }
    const hall = ctx.createConvolver()
    hall.buffer = impulse
    const hallSend = ctx.createGain()
    hallSend.gain.value = 0
    const hallTone = ctx.createBiquadFilter()
    hallTone.type = 'lowpass'
    hallTone.frequency.value = 6000
    const hallReturn = ctx.createGain()
    hallReturn.gain.value = 0.8
    afterCrush.connect(hallSend)
    echo.connect(hallSend)
    hallSend.connect(hall).connect(hallTone).connect(hallReturn).connect(output)

    return {
      filter,
      wobble,
      wobbleDepth,
      driveDry,
      drivePre,
      driveWet,
      crushDry,
      crush,
      crushWet,
      crushLevels: 16,
      echo,
      echoSend,
      echoFeedback,
      hallSend,
      hallTone,
    }
  }

  /**
   * Press, move or release a pedal. `x` and `y` are grid fractions of the hand or pointer:
   * higher is more intense, and left to right sets each pedal's second control.
   */
  setEffect(effect: EffectName, x: number, y: number, on: boolean): void {
    if (on) this.effects[effect] = { x, y }
    else delete this.effects[effect]
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const p = this.pedals
    const ease = 0.03
    const up = 1 - y
    switch (effect) {
      case 'Filter': {
        // Height opens the filter; across, it wobbles faster and deeper.
        const cutoff = on ? 70 * 2 ** (up * 7.8) : 20000
        p.filter.frequency.setTargetAtTime(cutoff, t, ease)
        p.filter.Q.setTargetAtTime(on ? 9 : 0.7, t, ease)
        p.wobble.frequency.setTargetAtTime(0.25 * 2 ** (x * 5), t, ease)
        p.wobbleDepth.gain.setTargetAtTime(on ? cutoff * 0.75 * x : 0, t, ease)
        break
      }
      case 'Drive':
        p.drivePre.gain.setTargetAtTime(1 + x * 28, t, ease)
        p.driveWet.gain.setTargetAtTime(on ? 0.15 + up * 0.5 : 0, t, ease)
        p.driveDry.gain.setTargetAtTime(on ? 1 - up * 0.8 : 1, t, ease)
        break
      case 'Crush': {
        const levels = Math.round(2 ** (1 + (1 - up) * 4))
        if (on && levels !== p.crushLevels) {
          p.crush.curve = crushCurve(levels)
          p.crushLevels = levels
        }
        const wet = on ? 0.4 + x * 0.6 : 0
        p.crushWet.gain.setTargetAtTime(wet, t, ease)
        p.crushDry.gain.setTargetAtTime(1 - wet, t, ease)
        break
      }
      case 'Echo': {
        // Across picks the echo time in steps (1, 2, 3 or 4 sixteenths); height feeds it back.
        const steps = 1 + Math.min(3, Math.floor(x * 4))
        p.echo.delayTime.setTargetAtTime((steps * 60) / this.settings.bpm / 4, t, ease)
        p.echoFeedback.gain.setTargetAtTime(on ? up * 0.85 : 0, t, ease)
        p.echoSend.gain.setTargetAtTime(on ? 0.65 : 0, t, ease)
        break
      }
      case 'Reverb':
        // Height is how much hall; across goes from dark to bright. Letting go leaves the tail ringing.
        p.hallSend.gain.setTargetAtTime(on ? 0.2 + up * 1.1 : 0, t, ease)
        p.hallTone.frequency.setTargetAtTime(1200 * 2 ** (x * 3.4), t, ease)
        break
    }
  }

  async start(): Promise<void> {
    if (!this.ctx) {
      this.ctx = this.build()
      this.syncVoices()
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
    for (const { voice } of this.voices.values()) voice.stop(now)
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
    const gridChanged = settings.drumGrid !== undefined && settings.drumGrid !== this.settings.drumGrid
    this.settings = { ...this.settings, ...settings }
    if (gridChanged) this.indexDrums()
  }

  private indexDrums(): void {
    this.blobsAt = Array.from({ length: STEPS }, () => [])
    for (const item of this.items) {
      if (item.kind !== 'blob') continue
      const { step, offset } = drumTiming(item.x, this.settings.drumGrid)
      this.blobsAt[step].push({ blob: item, offset })
    }
  }

  setItems(items: Item[]): void {
    this.items = items
    this.lines.clear()
    const robots = new Set<number>()
    for (const item of items) {
      if (item.kind === 'line') this.lines.set(item.id, { steps: lineSteps(item), lead: item.lead })
      else if (item.kind === 'walker') {
        robots.add(item.id)
        if (!this.bots.has(item.id)) {
          const body = startBody(item.x, item.y)
          this.bots.set(item.id, {
            type: item.bot,
            body,
            trail: [{ t: this.simTime, body }],
            lastAct: -Infinity,
            drops: 0,
            swapped: new Map(),
          })
        }
      }
    }
    this.indexDrums()
    for (const id of this.bots.keys()) if (!robots.has(id)) this.bots.delete(id)
    this.syncVoices()
  }

  /** One voice per line, built with that line's sound. */
  private syncVoices(): void {
    if (!this.ctx) return
    for (const [id, entry] of this.voices) {
      const line = this.lines.get(id)
      if (!line || line.lead !== entry.lead) {
        entry.voice.dispose()
        this.voices.delete(id)
      }
    }
    for (const [id, line] of this.lines) {
      if (!this.voices.has(id)) {
        this.voices.set(id, { voice: new LeadVoice(this.ctx, PRESETS[line.lead], this.leadBus), lead: line.lead })
      }
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
    const length = 60 / this.settings.bpm / 4
    for (const [id, line] of this.lines) {
      const voice = this.voices.get(id)?.voice
      if (!voice) continue
      const y = line.steps[step]
      if (y === null) {
        voice.stop(time)
        continue
      }
      const row = rowFromY(y)
      if (voice.on && voice.row === row) continue
      voice.play(time, frequency(midiForRow(row, key, scale)), row)
      this.stats.notes++
    }
    for (const { blob, offset } of this.blobsAt[step]) {
      const at = time + offset * length
      this.drum(drumFromY(blob.y), at, blob.size)
      this.stats.drums++
      this.onDrum?.(blob.id, at)
    }
    this.moveBots(step, time)
  }

  /** Walk every robot up to `time` and let each do its job. */
  private moveBots(step: number, time: number): void {
    const dt = this.simTime < 0 ? 0 : Math.min(0.25, Math.max(0, time - this.simTime))
    this.simTime = time
    const { key, scale } = this.settings
    for (const [id, bot] of this.bots) {
      bot.body = walk(bot.body, dt, this.aspect)
      bot.trail.push({ t: time, body: bot.body })
      if (bot.trail.length > 8) bot.trail.shift()
      const at: Point = { x: bot.body.x, y: bot.body.y }
      const pitch = frequency(midiForRow(rowFromY(at.y), key, scale))

      switch (bot.type) {
        case 'singer':
          // Sings on every other step at the pitch of the row it walks on.
          if (step % 2 === 0) {
            this.sing(pitch, time, at.x)
            this.act(id, time)
          }
          break
        case 'swapper': {
          const line = lineNear(this.items, at, REACH, this.aspect)
          if (line && time - (bot.swapped.get(line.id) ?? -Infinity) > 2.5) {
            bot.swapped.set(line.id, time)
            const lead = LEADS[(LEADS.indexOf(line.lead) + 1) % LEADS.length]
            this.onEdit?.({ kind: 'swap', by: id, lineId: line.id, lead })
            this.swoop(time)
            this.act(id, time)
          }
          break
        }
        case 'eater':
          if (time - bot.lastAct > 0.22 && touches(this.items, at, REACH, this.aspect, this.where)) {
            bot.lastAct = time
            this.onEdit?.({ kind: 'bite', by: id, at, radius: REACH })
            this.crunch(time)
            this.act(id, time)
          }
          break
        case 'dropper':
          // Leaves something behind twice a bar: a drum, then a short run of melody.
          if (step % 8 === 4) {
            bot.drops++
            const item =
              bot.drops % 2 === 1
                ? { kind: 'blob' as const, x: at.x, y: at.y, size: 0.5, by: id }
                : {
                    kind: 'line' as const,
                    lead: this.settings.lead,
                    by: id,
                    points: Array.from({ length: 7 }, (_, i) => ({ x: Math.min(1, at.x + (i * 2.2) / STEPS / 6), y: at.y })),
                  }
            this.onEdit?.({ kind: 'drop', by: id, item })
            this.plip(time)
            this.act(id, time)
          }
          break
        case 'bumper':
          break
      }
    }
  }

  private act(id: number, time: number): void {
    this.stats.robot++
    this.onDrum?.(id, time)
  }

  /** Hit a robot by hand or pointer. Bumpers shout; the others just flinch. */
  hit(id: number): void {
    const bot = this.bots.get(id)
    if (!bot) return
    bot.body = { ...bot.body, heading: bot.body.heading + Math.PI, turn: 0 }
    if (!this.ctx || bot.type !== 'bumper') return
    const time = this.ctx.currentTime + 0.005
    const { key, scale } = this.settings
    this.shout(frequency(midiForRow(rowFromY(bot.body.y), key, scale)), time)
    this.act(id, time)
  }

  private voiceOut(time: number, x: number): AudioNode {
    const pan = this.ctx!.createStereoPanner()
    pan.pan.setValueAtTime((x * 2 - 1) * 0.7, time)
    pan.connect(this.leadBus)
    return pan
  }

  /** The singer: a bright, glassy FM pluck with a sub under it, panned to where it stands. */
  private sing(hz: number, time: number, x: number): void {
    const ctx = this.ctx!
    const out = this.voiceOut(time, x)
    const carrier = ctx.createOscillator()
    carrier.frequency.setValueAtTime(hz * 2.02, time)
    carrier.frequency.exponentialRampToValueAtTime(hz * 2, time + 0.03)
    const mod = ctx.createOscillator()
    mod.frequency.value = hz * 6
    const depth = ctx.createGain()
    depth.gain.setValueAtTime(hz * 7, time)
    depth.gain.setTargetAtTime(hz * 0.6, time, 0.05)
    mod.connect(depth).connect(carrier.frequency)
    const sub = ctx.createOscillator()
    sub.type = 'triangle'
    sub.frequency.value = hz
    const amp = ctx.createGain()
    amp.gain.setValueAtTime(0, time)
    amp.gain.linearRampToValueAtTime(0.32, time + 0.003)
    amp.gain.setTargetAtTime(0, time + 0.003, 0.09)
    carrier.connect(amp)
    sub.connect(amp)
    amp.connect(out)
    for (const osc of [carrier, mod, sub]) {
      osc.start(time)
      osc.stop(time + 0.6)
    }
  }

  /** The swapper: a quick rising swoop as a line changes sound. */
  private swoop(time: number): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(380, time)
    osc.frequency.exponentialRampToValueAtTime(2400, time + 0.14)
    const amp = ctx.createGain()
    amp.gain.setValueAtTime(0.14, time)
    amp.gain.setTargetAtTime(0, time + 0.1, 0.03)
    osc.connect(amp).connect(this.leadBus)
    osc.start(time)
    osc.stop(time + 0.3)
  }

  /** The eater: a crunch, filtered noise over a low thud. */
  private crunch(time: number): void {
    const ctx = this.ctx!
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 1700
    band.Q.value = 1.6
    const amp = ctx.createGain()
    amp.gain.setValueAtTime(0.5, time)
    amp.gain.setTargetAtTime(0, time, 0.025)
    this.burst(time, 0.1).connect(band).connect(amp).connect(this.drumBus)
    const thud = ctx.createOscillator()
    thud.frequency.setValueAtTime(140, time)
    thud.frequency.exponentialRampToValueAtTime(55, time + 0.06)
    const low = ctx.createGain()
    low.gain.setValueAtTime(0.5, time)
    low.gain.setTargetAtTime(0, time, 0.03)
    thud.connect(low).connect(this.drumBus)
    thud.start(time)
    thud.stop(time + 0.2)
  }

  /** The dropper: a small falling plip as it leaves something. */
  private plip(time: number): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(1500, time)
    osc.frequency.exponentialRampToValueAtTime(700, time + 0.06)
    const amp = ctx.createGain()
    amp.gain.setValueAtTime(0.18, time)
    amp.gain.setTargetAtTime(0, time, 0.03)
    osc.connect(amp).connect(this.leadBus)
    osc.start(time)
    osc.stop(time + 0.2)
  }

  /** The bumper: a pitched vocal chop, a sawtooth through two vowel formants, sliding up into the note. */
  private shout(hz: number, time: number): void {
    const ctx = this.ctx!
    const src = ctx.createOscillator()
    src.type = 'sawtooth'
    src.frequency.setValueAtTime(hz * 0.75, time)
    src.frequency.exponentialRampToValueAtTime(hz, time + 0.05)
    const amp = ctx.createGain()
    amp.gain.setValueAtTime(0, time)
    amp.gain.linearRampToValueAtTime(0.55, time + 0.008)
    amp.gain.setTargetAtTime(0, time + 0.12, 0.06)
    for (const [f, q, level] of [
      [800, 6, 1],
      [1250, 7, 0.7],
      [2600, 9, 0.3],
    ]) {
      const band = ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = f
      band.Q.value = q
      const g = ctx.createGain()
      g.gain.value = level
      src.connect(band).connect(g).connect(amp)
    }
    amp.connect(this.leadBus)
    amp.connect(this.reverb)
    src.start(time)
    src.stop(time + 0.6)
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
