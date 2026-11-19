import {
  ARP_RATES,
  LEADS,
  SCALES,
  STEPS,
  arpOrder,
  chordRows,
  drumFromY,
  drumTiming,
  drumX,
  frequency,
  lineNear,
  lineSteps,
  midiForRow,
  rowFromY,
  touches,
  type ArpName,
  type ArpRate,
  type Blob,
  type BotType,
  type ChordName,
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
import { GAITS, STRIDE, startBody, walk, type BotBody } from '@/robots/bots'

export interface Settings {
  bpm: number
  key: KeyName
  scale: ScaleName
  /** The sound new lines get. Each line keeps its own. */
  lead: LeadName
  drumGrid: DrumGrid
  /** Stack every line note into a chord. */
  chord: ChordName
  /** Play the chord's notes one at a time instead. With no chord, it climbs octaves. */
  arp: ArpName
  arpRate: ArpRate
}

/** Something a robot did to the song, for the app to apply to the items. */
export type BotEdit =
  | { kind: 'bite'; by: number; at: Point; radius: number; aspect: number }
  | { kind: 'swap'; by: number; lineId: number; lead: LeadName }
  | { kind: 'drop'; by: number; item: Omit<Blob, 'id'> | Omit<Line, 'id'> }

/** How a robot is standing at a moment, for drawing. */
export interface BotPose {
  x: number
  y: number
  facing: 1 | -1
  frame: number
}

/**
 * The singer's voice: one held note that slides wherever the robot walks. Two detuned saws and a
 * sine sub through a soft filter, with a slow vibrato, panned to where the robot stands.
 */
class GlideVoice {
  private oscs: OscillatorNode[] = []
  private pitch: ConstantSourceNode
  private pan: StereoPannerNode
  private amp: GainNode
  private ctx: AudioContext

  constructor(ctx: AudioContext, out: AudioNode) {
    this.ctx = ctx
    this.pitch = ctx.createConstantSource()
    this.pitch.offset.value = 220
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 2200
    filter.Q.value = 2
    const sweep = ctx.createOscillator()
    sweep.frequency.value = 0.13
    const sweepDepth = ctx.createGain()
    sweepDepth.gain.value = 900
    sweep.connect(sweepDepth).connect(filter.frequency)
    const vibrato = ctx.createOscillator()
    vibrato.frequency.value = 5.2
    const vibratoDepth = ctx.createGain()
    vibratoDepth.gain.value = 9
    vibrato.connect(vibratoDepth)
    this.amp = ctx.createGain()
    this.amp.gain.value = 0
    this.pan = ctx.createStereoPanner()
    filter.connect(this.amp).connect(this.pan).connect(out)
    for (const [type, cents, level] of [
      ['sawtooth', -9, 0.5],
      ['sawtooth', 9, 0.5],
      ['sine', -1200, 0.8],
    ] as const) {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = 0
      osc.detune.value = cents
      this.pitch.connect(osc.frequency)
      vibratoDepth.connect(osc.detune)
      const g = ctx.createGain()
      g.gain.value = level
      osc.connect(g).connect(filter)
      osc.start()
      this.oscs.push(osc)
    }
    for (const lfo of [sweep, vibrato]) {
      lfo.start()
      this.oscs.push(lfo)
    }
    this.pitch.start()
  }

  /** Slide toward a pitch and a place in the stereo field. */
  glide(time: number, hz: number, x: number): void {
    this.pitch.offset.setTargetAtTime(hz, time, 0.16)
    this.pan.pan.setTargetAtTime((x * 2 - 1) * 0.7, time, 0.2)
    this.amp.gain.setTargetAtTime(0.11, time, 0.3)
  }

  hush(time: number): void {
    this.amp.gain.setTargetAtTime(0, time, 0.25)
  }

  dispose(): void {
    const now = this.ctx.currentTime
    this.amp.gain.cancelScheduledValues(now)
    this.amp.gain.setTargetAtTime(0, now, 0.1)
    for (const osc of this.oscs) osc.stop(now + 0.8)
    this.pitch.stop(now + 0.8)
    setTimeout(() => this.amp.disconnect(), 1000)
  }
}

interface Bot {
  type: BotType
  body: BotBody
  /** Recent bodies with the audio time of each, so drawing can ease between them. */
  trail: { t: number; body: BotBody }[]
  lastAct: number
  drops: number
  /** Where it has been lately, oldest first, for the singer's trail. */
  path: Point[]
  voice: GlideVoice | null
  /** When each line was last swapped, so one pass does not flip it back and forth. */
  swapped: Map<number, number>
}

/** The pedals the hand can play in effects mode. */
export const EFFECTS = ['Filter', 'Echo', 'Reverb', 'Drive', 'Crush', 'Pitch'] as const
export type EffectName = (typeof EFFECTS)[number]

/**
 * Each pedal's four variants, one per finger (index, middle, ring, little). Pressing that finger to
 * the thumb plays the pedal in that variant.
 */
export const PEDAL_OPTIONS: Record<EffectName, readonly [string, string, string, string]> = {
  Filter: ['Low-pass', 'High-pass', 'Band-pass', 'Notch'],
  Echo: ['Straight', 'Dotted', 'Triplet', 'Free'],
  Reverb: ['Room', 'Hall', 'Cathedral', 'Endless'],
  Drive: ['Warm', 'Hard', 'Fuzz', 'Fold'],
  Crush: ['Light', 'Heavy', 'Broken', 'Shattered'],
  Pitch: ['Glide', 'Semitones', 'Fifths', 'Octaves'],
}

/** The four drive characters: soft saturation, hard clipping, a heavy asymmetric fuzz and a wavefolder. */
function driveCurve(kind: number): Float32Array<ArrayBuffer> {
  const n = 2048
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] =
      kind === 0
        ? Math.tanh(x * 2) / Math.tanh(2)
        : kind === 1
          ? Math.max(-0.6, Math.min(0.6, x * 1.5)) / 0.6
          : kind === 2
            ? Math.tanh(x * 10 + 0.4) / Math.tanh(10.4)
            : Math.sin(x * Math.PI * 2.5)
  }
  return curve
}

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

/**
 * A whole-mix pitch shifter built from two modulated delay lines, after Chris Wilson's Web Audio
 * "Jungle" shifter: each delay sweeps its time on a sawtooth while the pair crossfades, so the
 * signal is read back faster (higher) or slower (lower). Native nodes only, no worklet.
 */
class PitchShifter {
  readonly input: GainNode
  readonly output: GainNode
  private upGains: GainNode[] = []
  private downGains: GainNode[] = []
  private depths: GainNode[] = []
  private static readonly WINDOW = 0.1
  private static readonly FADE = 0.05

  constructor(ctx: AudioContext) {
    const W = PitchShifter.WINDOW
    const F = PitchShifter.FADE
    this.input = ctx.createGain()
    this.output = ctx.createGain()
    const sr = ctx.sampleRate
    const active = Math.floor(W * sr)
    const length = active + Math.floor((W - 2 * F) * sr)
    const ramp = (up: boolean) => {
      const b = ctx.createBuffer(1, length, sr)
      const d = b.getChannelData(0)
      for (let i = 0; i < active; i++) d[i] = up ? (active - i) / length : i / active
      return b
    }
    const fade = (() => {
      const b = ctx.createBuffer(1, length, sr)
      const d = b.getChannelData(0)
      const f = Math.floor(F * sr)
      // Linear, not equal-power: both delay lines carry the same signal, so their levels add directly.
      for (let i = 0; i < active; i++) d[i] = i < f ? i / f : i >= active - f ? 1 - (i - (active - f)) / f : 1
      return b
    })()
    const down = ramp(false)
    const up = ramp(true)
    const start = ctx.currentTime + 0.05
    const later = start + W - F
    for (const at of [start, later]) {
      const delay = ctx.createDelay(1)
      const depth = ctx.createGain()
      depth.gain.value = 0
      depth.connect(delay.delayTime)
      for (const [buffer, list, on] of [
        [down, this.downGains, 1],
        [up, this.upGains, 0],
      ] as const) {
        const src = ctx.createBufferSource()
        src.buffer = buffer
        src.loop = true
        const g = ctx.createGain()
        g.gain.value = on
        src.connect(g).connect(depth)
        src.start(at)
        list.push(g)
      }
      const mix = ctx.createGain()
      mix.gain.value = 0
      const fader = ctx.createBufferSource()
      fader.buffer = fade
      fader.loop = true
      fader.connect(mix.gain)
      fader.start(at)
      this.input.connect(delay).connect(mix).connect(this.output)
      this.depths.push(depth)
    }
  }

  private upward = false

  /**
   * Shift by `semitones`, up to an octave either way. Turning between up and down first eases the
   * delay depth to nothing, so the read position never jumps mid-sweep.
   */
  set(semitones: number, time: number): void {
    const ratio = 2 ** (semitones / 12)
    const upward = ratio >= 1
    const amount = upward ? ratio - 1 : 1 - ratio
    let at = time
    if (upward !== this.upward) {
      for (const d of this.depths) d.gain.setTargetAtTime(0, time, 0.008)
      at = time + 0.04
      for (const g of this.upGains) g.gain.setValueAtTime(upward ? 1 : 0, at)
      for (const g of this.downGains) g.gain.setValueAtTime(upward ? 0 : 1, at)
      this.upward = upward
    }
    for (const d of this.depths) d.gain.setTargetAtTime(PitchShifter.WINDOW * amount, at, 0.03)
  }
}

/** The pitch pedal's shift in semitones for a height on the grid (0 top, 1 bottom) and variant. */
export function pitchShift(y: number, option: number): number {
  const raw = (0.5 - Math.min(1, Math.max(0, y))) * 24
  if (option === 1) return Math.round(raw)
  if (option === 2) {
    const steps = [-12, -7, -5, 0, 5, 7, 12]
    return steps.reduce((best, s) => (Math.abs(s - raw) < Math.abs(best - raw) ? s : best), 0)
  }
  if (option === 3) return Math.round(raw / 12) * 12
  return Math.round(raw * 10) / 10
}

interface Pedals {
  filter: BiquadFilterNode
  wobble: OscillatorNode
  wobbleDepth: GainNode
  driveDry: GainNode
  drivePre: GainNode
  driveShape: WaveShaperNode
  driveKind: number
  driveWet: GainNode
  crushDry: GainNode
  crush: WaveShaperNode
  crushWet: GainNode
  crushLevels: number
  echo: DelayNode
  echoSend: GainNode
  echoFeedback: GainNode
  /** One send per reverb size, so changing size never swaps a buffer under a playing signal. */
  hallSends: GainNode[]
  /** Which rooms are plugged in yet, and what feeds them. */
  hallPlugged: boolean[]
  hallFeeds: AudioNode[]
  hallTone: BiquadFilterNode
  /** Built on first use: until then the pitch pedal costs nothing. */
  shifter: PitchShifter | null
  pitchFeed: AudioNode
  pitchOut: AudioNode
  pitchDry: GainNode
  pitchWet: GainNode
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

/** The oscillators behind one sounding phrase of a lead voice; they exist only while it sounds. */
interface LeadSources {
  pitch: ConstantSourceNode
  oscillators: OscillatorNode[]
  modDepth: GainNode | null
}

/**
 * Where a lead voice is in its life. Idle has no oscillators. Sounding has live ones. Releasing has
 * ones fading out that stop on their own at `until`; a new note never revives them, it builds fresh
 * ones, so a late or stalled tick cannot land on oscillators that have already ended.
 */
type VoicePhase =
  | { kind: 'idle' }
  | { kind: 'sounding'; src: LeadSources; row: number }
  | { kind: 'releasing'; until: number }

/**
 * One monophonic lead voice. Each line (and each note of its chord) owns one. The filter and level
 * stay put; the oscillators are built when a note starts and stopped once it has faded, so a silent
 * line costs nothing.
 */
class LeadVoice {
  private phase: VoicePhase = { kind: 'idle' }
  private filter: BiquadFilterNode
  private amp: GainNode
  private ctx: AudioContext
  private preset: LeadPreset

  constructor(ctx: AudioContext, preset: LeadPreset, out: AudioNode) {
    this.ctx = ctx
    this.preset = preset
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = preset.cutoff.rest
    this.filter.Q.value = preset.cutoff.q
    this.amp = ctx.createGain()
    this.amp.gain.value = 0
    this.filter.connect(this.amp).connect(out)
  }

  /** Whether a note is sounding. */
  get on(): boolean {
    return this.phase.kind === 'sounding'
  }

  /** The row of the sounding note, or -1. */
  get row(): number {
    return this.phase.kind === 'sounding' ? this.phase.row : -1
  }

  private build(time: number): LeadSources {
    const ctx = this.ctx
    const p = this.preset
    const pitch = ctx.createConstantSource()
    pitch.offset.value = 220
    const oscillators: OscillatorNode[] = []
    let modDepth: GainNode | null = null
    if (p.fm) {
      const mod = ctx.createOscillator()
      mod.frequency.value = 0
      const ratio = ctx.createGain()
      ratio.gain.value = p.fm.ratio
      pitch.connect(ratio).connect(mod.frequency)
      modDepth = ctx.createGain()
      modDepth.gain.value = 0
      mod.connect(modDepth)
      oscillators.push(mod)
    }
    const mix = 1 / Math.sqrt(p.detunes.length)
    const unison: OscillatorNode[] = []
    p.detunes.forEach((cents, i) => {
      const osc = ctx.createOscillator()
      osc.type = p.wave
      osc.frequency.value = 0
      osc.detune.value = cents
      pitch.connect(osc.frequency)
      if (modDepth) modDepth.connect(osc.frequency)
      const gain = ctx.createGain()
      gain.gain.value = cents >= 1200 ? mix * 0.4 : mix
      const pan = ctx.createStereoPanner()
      const t = p.detunes.length > 1 ? i / (p.detunes.length - 1) : 0.5
      pan.pan.value = (t * 2 - 1) * p.spread
      osc.connect(gain).connect(pan).connect(this.filter)
      oscillators.push(osc)
      unison.push(osc)
    })
    if (p.sub) {
      const sub = ctx.createOscillator()
      sub.type = 'sine'
      sub.frequency.value = 0
      sub.detune.value = -1200
      pitch.connect(sub.frequency)
      const gain = ctx.createGain()
      gain.gain.value = 0.7
      sub.connect(gain).connect(this.filter)
      oscillators.push(sub)
    }
    const at = Math.max(time, ctx.currentTime)
    // Unison voices start a few milliseconds apart, so they begin out of phase. Started together
    // they add up into one hard spike at the start of every phrase.
    for (const osc of oscillators) osc.start(unison.length > 1 && unison.includes(osc) ? at + Math.random() * 0.006 : at)
    pitch.start(at)
    return { pitch, oscillators, modDepth }
  }

  private static end(src: LeadSources, at: number): void {
    for (const osc of src.oscillators) osc.stop(at)
    src.pitch.stop(at)
  }

  /**
   * Start a note, or move to a new pitch if one is already sounding.
   * `share` scales the level so a stacked chord is no louder than one note; `pluck` re-strikes it.
   */
  play(time: number, hz: number, row: number, share = 1, pluck = false): void {
    const p = this.preset
    const f = hz * 2 ** p.octave
    const level = p.level * share
    if (this.phase.kind === 'sounding') {
      const src = this.phase.src
      if (pluck) {
        src.pitch.offset.setValueAtTime(f, time)
        this.amp.gain.setValueAtTime(level * 0.3, time)
        this.amp.gain.setTargetAtTime(level, time, 0.004)
      } else {
        src.pitch.offset.setTargetAtTime(f, time, p.glide)
      }
      this.phase = { kind: 'sounding', src, row }
      this.strike(src, f, time)
      return
    }
    // Idle or releasing: always fresh oscillators. Any still fading stop on their own.
    const src = this.build(time)
    if (p.bend) {
      src.pitch.offset.setValueAtTime(f * 2 ** (p.bend / 12), time)
      src.pitch.offset.exponentialRampToValueAtTime(f, time + 0.045)
    } else {
      src.pitch.offset.setValueAtTime(f, time)
    }
    this.amp.gain.setTargetAtTime(level, time, p.attack)
    this.phase = { kind: 'sounding', src, row }
    this.strike(src, f, time)
  }

  private strike(src: LeadSources, f: number, time: number): void {
    const p = this.preset
    this.filter.frequency.setValueAtTime(p.cutoff.peak, time)
    this.filter.frequency.setTargetAtTime(p.cutoff.rest, time, p.cutoff.decay)
    if (src.modDepth && p.fm) {
      src.modDepth.gain.setValueAtTime(f * p.fm.peak, time)
      src.modDepth.gain.setTargetAtTime(f * p.fm.index, time, p.fm.decay)
    }
  }

  /** Let the note fade out from `time`; the oscillators stop once it is silent. */
  stop(time: number): void {
    if (this.phase.kind !== 'sounding') return
    this.amp.gain.setTargetAtTime(0, time, this.preset.release)
    // Six time constants of release is silence.
    const until = time + this.preset.release * 6 + 0.05
    LeadVoice.end(this.phase.src, until)
    this.phase = { kind: 'releasing', until }
  }

  /** Silence now, dropping anything already scheduled ahead, as when the transport stops. */
  halt(now: number): void {
    this.amp.gain.cancelScheduledValues(now)
    this.amp.gain.setTargetAtTime(0, now, 0.02)
    if (this.phase.kind === 'sounding') LeadVoice.end(this.phase.src, now + 0.15)
    this.phase = { kind: 'idle' }
  }

  dispose(): void {
    this.halt(this.ctx.currentTime)
    setTimeout(() => this.amp.disconnect(), 400)
  }
}

/**
 * Gain staging for the mix. Every saturation stage boosts quiet signals as it colours them, so each
 * one has a trim in front of it; the master limiter should only catch peaks, not hold the mix down.
 */
const MIX = {
  /** Into the lead drive, before the per-line auto level: hot enough that the drive adds grit. */
  lead: 1,
  leadDrive: 2,
  /** After the lead drive, back down to a level the mix can hold. */
  leadTrim: 0.95,
  /** How far each kick pushes the leads down, as a gain. Deep, so the kick owns the low end. */
  duck: 0.15,
  drums: 0.5,
  drumDrive: 2.4,
  /** The kick has its own hot drive, pushed near square so its sub reads loud and dense, then a trim. */
  kick: 1,
  kickDrive: 3.2,
  kickTrim: 0.85,
  /** A clean sine under the driven kick that carries the low tail past the drive. */
  kickSub: 1,
  /** The master clipper's drive, and the level into it. */
  clip: 1.25,
  bus: 0.7,
  /** Reverbs only take what is above this, so the low end stays dry and tight. */
  verbLowCut: 280,
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
  private kickBus!: GainNode
  /** The last kick's sub, so the next kick can choke it like an 808 instead of muddying over it. */
  private kickTail: GainNode | null = null
  private reverb!: GainNode
  private noise!: AudioBuffer
  private fxIn!: GainNode
  private master!: GainNode
  private limiter!: DynamicsCompressorNode
  private pedals!: Pedals
  /** Which pedals are pressed right now, with their amount, height and variant, for the screen and for tests. */
  readonly effects: Partial<Record<EffectName, { x: number; y: number; option: number; detail: string }>> = {}

  private settings: Settings
  private items: Item[] = []
  private lines = new Map<number, { steps: (number | null)[]; lead: LeadName }>()
  /** Each line's voices: one per chord note, built with that line's sound. */
  private voices = new Map<number, { voices: LeadVoice[]; lead: LeadName }>()
  private arpStep = new Map<number, number>()
  private blobsAt: { blob: Blob; offset: number }[][] = Array.from({ length: STEPS }, () => [])
  private bots = new Map<number, Bot>()
  private simTime = -1
  private aspect = 1.6

  private timer: number | null = null
  private nextStep = 0
  private nextTime = 0
  private queue: { step: number; time: number; length: number }[] = []

  /** Counts of what has been scheduled, for the status line and for tests. */
  readonly stats = { notes: 0, drums: 0, robot: 0 }
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
      facing: (k < 0.5 ? a : b).body.facing,
      frame: Math.floor(walked / STRIDE),
    }
  }

  /** The trail a robot leaves, oldest point first, ending where it stands now. */
  botPath(id: number): Point[] {
    const bot = this.bots.get(id)
    const here = this.botPoint(id)
    if (!bot || !here) return []
    return [...bot.path, here]
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

  /** How many decibels the master limiter is pulling down right now, for tests and tuning. */
  get limiting(): number {
    return this.limiter?.reduction ?? 0
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
    out.gain.value = 0.9
    // A peak limiter: fast, hard and high, so it touches only the loudest hits.
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -4
    limiter.knee.value = 2
    limiter.ratio.value = 20
    limiter.attack.value = 0.001
    limiter.release.value = 0.08
    const bus = ctx.createGain()
    bus.gain.value = MIX.bus
    const clip = ctx.createWaveShaper()
    clip.curve = clipCurve(MIX.clip)
    clip.oversample = '2x'
    // Nothing below 25 Hz: it is felt as mush, not heard.
    const rumble = ctx.createBiquadFilter()
    rumble.type = 'highpass'
    rumble.frequency.value = 25
    bus.connect(rumble).connect(clip).connect(limiter).connect(out).connect(ctx.destination)
    this.master = out
    this.limiter = limiter
    this.fxIn = ctx.createGain()
    this.pedals = this.buildPedals(ctx, this.fxIn, bus)

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
    const verbCut = ctx.createBiquadFilter()
    verbCut.type = 'highpass'
    verbCut.frequency.value = MIX.verbLowCut
    const wet = ctx.createGain()
    wet.gain.value = 0.22
    this.reverb.connect(verbCut).connect(convolver).connect(wet).connect(this.fxIn)

    // Leads run through a drive stage, then get pushed down by every kick.
    this.leadBus = ctx.createGain()
    this.leadBus.gain.value = MIX.lead
    const drive = ctx.createWaveShaper()
    drive.curve = clipCurve(MIX.leadDrive)
    drive.oversample = '2x'
    this.duck = ctx.createGain()
    const leadTrim = ctx.createGain()
    leadTrim.gain.value = MIX.leadTrim
    this.leadBus.connect(drive).connect(leadTrim).connect(this.duck).connect(this.fxIn)
    const leadSend = ctx.createGain()
    leadSend.gain.value = 0.5
    this.duck.connect(leadSend).connect(this.reverb)

    this.drumBus = ctx.createGain()
    this.drumBus.gain.value = MIX.drums
    const drumDrive = ctx.createWaveShaper()
    drumDrive.curve = clipCurve(MIX.drumDrive)
    drumDrive.oversample = '2x'
    this.drumBus.connect(drumDrive).connect(this.fxIn)

    // The kick skips the drum drive for its own, hotter one, so it saturates into a fat sub.
    this.kickBus = ctx.createGain()
    this.kickBus.gain.value = MIX.kick
    const kickDrive = ctx.createWaveShaper()
    kickDrive.curve = clipCurve(MIX.kickDrive)
    kickDrive.oversample = '2x'
    const kickTrim = ctx.createGain()
    kickTrim.gain.value = MIX.kickTrim
    this.kickBus.connect(kickDrive).connect(kickTrim).connect(this.fxIn)

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
    driveShape.curve = driveCurve(0)
    driveShape.oversample = '2x'
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
    // Pitch sits after the crush, so the echo and the reverb repeat the shifted sound.
    const afterPitch = ctx.createGain()
    const pitchDry = ctx.createGain()
    const pitchWet = ctx.createGain()
    pitchWet.gain.value = 0
    afterCrush.connect(pitchDry).connect(afterPitch)
    pitchWet.connect(afterPitch)

    afterPitch.connect(output)
    afterPitch.connect(echoSend).connect(echo)
    echo.connect(echoFeedback).connect(echo)
    echo.connect(echoReturn).connect(output)

    // Four rooms, from a small room to an endless wash, separate from the short room the drums sit in.
    // They are fed after the echo so repeats wash too.
    const hallTone = ctx.createBiquadFilter()
    hallTone.type = 'lowpass'
    hallTone.frequency.value = 6000
    const hallCut = ctx.createBiquadFilter()
    hallCut.type = 'highpass'
    hallCut.frequency.value = MIX.verbLowCut
    const hallReturn = ctx.createGain()
    hallReturn.gain.value = 0.8
    hallTone.connect(hallCut).connect(hallReturn).connect(output)
    const hallSends = [0.8, 2.2, 4.5, 9].map((seconds) => {
      const impulse = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch)
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2.2
      }
      const hall = ctx.createConvolver()
      hall.buffer = impulse
      const send = ctx.createGain()
      send.gain.value = 0
      // Rooms stay unplugged until first played: a convolver costs CPU even when nothing reaches it.
      send.connect(hall).connect(hallTone)
      return send
    })

    return {
      filter,
      wobble,
      wobbleDepth,
      driveDry,
      drivePre,
      driveShape,
      driveKind: 0,
      driveWet,
      crushDry,
      crush,
      crushWet,
      crushLevels: 16,
      echo,
      echoSend,
      echoFeedback,
      hallSends,
      hallPlugged: hallSends.map(() => false),
      hallFeeds: [afterPitch, echo],
      hallTone,
      shifter: null,
      pitchFeed: afterCrush,
      pitchOut: pitchWet,
      pitchDry,
      pitchWet,
    }
  }

  /**
   * Press, move or release a pedal, played like an XY pad.
   * `amount` (0 to 1, left to right) is how much of the pedal you hear. `y` is the height on the grid
   * (0 at the top): moving up is the pedal's main move, faster, brighter, more open or harder. `option`
   * is the variant, one per finger, and `twist` (0 to 1) is one extra control.
   */
  setEffect(effect: EffectName, amount: number, y: number, on: boolean, option = 0, twist = 0.5): void {
    const detail = this.applyEffect(effect, amount, y, on, option, twist)
    if (on) this.effects[effect] = { x: amount, y, option, detail }
    else delete this.effects[effect]
  }

  /** Sets the pedal's nodes and returns a short readout of what it is doing, for the screen. */
  private applyEffect(effect: EffectName, amount: number, y: number, on: boolean, option: number, twist: number): string {
    const up = 1 - Math.min(1, Math.max(0, y))
    const step = 60 / this.settings.bpm / 4
    const name = PEDAL_OPTIONS[effect][option] ?? ''
    if (!this.ctx) return name
    const t = this.ctx.currentTime
    const p = this.pedals
    const ease = 0.03
    switch (effect) {
      case 'Filter': {
        // Up opens it; across is how strongly it rings and wobbles; twist is how fast it wobbles.
        const types: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch']
        if (on && p.filter.type !== types[option]) p.filter.type = types[option] ?? 'lowpass'
        if (!on && p.filter.type !== 'lowpass') p.filter.type = 'lowpass'
        const cutoff = on ? 60 * 2 ** (up * 8.2) : 20000
        p.filter.frequency.setTargetAtTime(cutoff, t, ease)
        p.filter.Q.setTargetAtTime(on ? 1 + amount * 12 : 0.7, t, ease)
        p.wobble.frequency.setTargetAtTime(0.25 * 2 ** (twist * 5), t, ease)
        p.wobbleDepth.gain.setTargetAtTime(on ? cutoff * 0.7 * amount : 0, t, ease)
        return `${name} ${cutoff < 1000 ? `${Math.round(cutoff)} Hz` : `${(cutoff / 1000).toFixed(1)} kHz`}`
      }
      case 'Echo': {
        // Up is faster repeats, down is slower, snapped to the beat unless the variant is Free.
        // Across is how loud they are; twist is how long they keep ringing.
        const divisions = [
          ['1/32', 0.5],
          ['1/16', 1],
          ['1/8', 2],
          ['1/4', 4],
          ['1/2', 8],
        ] as const
        let time: number
        let label: string
        if (option === 3) {
          time = 0.03 * 2 ** ((1 - up) * 5)
          label = `${Math.round(time * 1000)} ms`
        } else {
          const [division, steps] = divisions[Math.min(4, Math.floor((1 - up) * 5))]
          const feel = option === 1 ? 1.5 : option === 2 ? 2 / 3 : 1
          time = Math.min(1.9, steps * feel * step)
          label = option === 1 ? `${division} dotted` : option === 2 ? `${division} triplet` : division
        }
        p.echo.delayTime.setTargetAtTime(time, t, 0.06)
        p.echoFeedback.gain.setTargetAtTime(on ? 0.2 + twist * 0.7 : 0, t, ease)
        p.echoSend.gain.setTargetAtTime(on ? amount * 0.9 : 0, t, ease)
        return label
      }
      case 'Reverb':
        // The variant is the size of the room; across is how much of it; up is brighter.
        if (on && !p.hallPlugged[option]) {
          for (const feed of p.hallFeeds) feed.connect(p.hallSends[option])
          p.hallPlugged[option] = true
        }
        p.hallSends.forEach((send, i) => send.gain.setTargetAtTime(on && i === option ? 0.05 + amount * 1.3 : 0, t, ease))
        p.hallTone.frequency.setTargetAtTime(900 * 2 ** (up * 4), t, ease)
        return name
      case 'Drive':
        // The variant is the character; across is the mix; up pushes it harder.
        if (on && option !== p.driveKind) {
          p.driveShape.curve = driveCurve(option)
          // Fuzz and Fold are steep enough to alias, so they get the heavier oversampling.
          p.driveShape.oversample = option >= 2 ? '4x' : '2x'
          p.driveKind = option
        }
        p.drivePre.gain.setTargetAtTime(1 + up * 30, t, ease)
        p.driveWet.gain.setTargetAtTime(on ? amount * 0.85 : 0, t, ease)
        p.driveDry.gain.setTargetAtTime(on ? 1 - amount * 0.85 : 1, t, ease)
        return name
      case 'Pitch': {
        // Up shifts higher, down lower, an octave either way; the variant snaps it; across is the mix.
        const st = pitchShift(y, option)
        if (on && !p.shifter) {
          p.shifter = new PitchShifter(this.ctx)
          p.pitchFeed.connect(p.shifter.input)
          p.shifter.output.connect(p.pitchOut)
        }
        p.shifter?.set(st, t)
        const wet = on ? amount : 0
        p.pitchWet.gain.setTargetAtTime(wet, t, ease)
        p.pitchDry.gain.setTargetAtTime(1 - wet, t, ease)
        return `${st > 0 ? '+' : ''}${st} st`
      }
      case 'Crush': {
        // The variant sets how broken it starts; up breaks it further; across is the mix.
        const base = [12, 6, 3, 2][option] ?? 6
        const levels = Math.max(2, Math.round(base / (1 + up * 3)))
        if (on && levels !== p.crushLevels) {
          p.crush.curve = crushCurve(levels)
          p.crushLevels = levels
        }
        const wet = on ? amount : 0
        p.crushWet.gain.setTargetAtTime(wet, t, ease)
        p.crushDry.gain.setTargetAtTime(1 - wet, t, ease)
        return `${name} ${levels} steps`
      }
    }
  }

  /** The finished mix as a stream, for recording, and a way to unplug it when the recording ends. */
  recordTap(): { stream: MediaStream; release: () => void } {
    if (!this.ctx) {
      this.ctx = this.build()
      this.syncVoices()
    }
    const tap = this.ctx.createMediaStreamDestination()
    this.master.connect(tap)
    return { stream: tap.stream, release: () => this.master.disconnect(tap) }
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
    for (const { voices } of this.voices.values()) for (const voice of voices) voice.halt(now)
    for (const bot of this.bots.values()) bot.voice?.hush(now)
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
    const before = this.settings
    this.settings = { ...this.settings, ...settings }
    if (this.settings.drumGrid !== before.drumGrid) this.indexDrums()
    if (this.settings.chord !== before.chord || this.settings.arp !== before.arp || this.settings.scale !== before.scale) {
      this.syncVoices()
    }
  }

  /** The rows the current chord stacks on a line's note. An arpeggio with no chord climbs octaves. */
  private chordShape(): number[] {
    const size = SCALES[this.settings.scale].length
    const chord = this.settings.arp !== 'Off' && this.settings.chord === 'Off' ? 'Octaves' : this.settings.chord
    return chordRows(chord, size)
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
            path: [],
            voice: null,
          })
        }
      }
    }
    this.indexDrums()
    for (const [id, bot] of this.bots) {
      if (robots.has(id)) continue
      bot.voice?.dispose()
      this.bots.delete(id)
    }
    this.syncVoices()
  }

  /** One voice per line, built with that line's sound. */
  private syncVoices(): void {
    if (!this.ctx) return
    const size = this.settings.arp === 'Off' ? this.chordShape().length : 1
    for (const [id, entry] of this.voices) {
      const line = this.lines.get(id)
      if (!line || line.lead !== entry.lead) {
        for (const voice of entry.voices) voice.dispose()
        this.voices.delete(id)
      }
    }
    for (const [id, line] of this.lines) {
      let entry = this.voices.get(id)
      if (!entry) {
        entry = { voices: [], lead: line.lead }
        this.voices.set(id, entry)
      }
      while (entry.voices.length < size) {
        // Only the chord's root voice carries the sub; stacked subs only muddy the low end.
        const preset = PRESETS[line.lead]
        const root = entry.voices.length === 0
        entry.voices.push(new LeadVoice(this.ctx, root ? preset : { ...preset, sub: false }, this.leadBus))
      }
      while (entry.voices.length > size) entry.voices.pop()!.dispose()
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
    const shape = this.chordShape()
    const { arp } = this.settings
    // The leads level themselves by how many lines sound at once, so a crowded loop stays clear
    // instead of piling into the drive and the limiter.
    let sounding = 0
    for (const line of this.lines.values()) if (line.steps[step] !== null) sounding++
    this.leadBus.gain.setTargetAtTime(MIX.lead / Math.sqrt(Math.max(1, sounding)), time, 0.03)
    for (const [id, line] of this.lines) {
      const voices = this.voices.get(id)?.voices
      if (!voices || voices.length === 0) continue
      const y = line.steps[step]
      if (y === null) {
        for (const voice of voices) voice.stop(time)
        this.arpStep.delete(id)
        continue
      }
      const row = rowFromY(y)
      if (arp === 'Off') {
        // Every chord note held together, each voice gliding to its own note.
        const share = 1 / Math.sqrt(shape.length)
        shape.forEach((offset, i) => {
          const voice = voices[i]
          if (!voice) return
          const r = row + offset
          if (voice.on && voice.row === r) return
          voice.play(time, frequency(midiForRow(r, key, scale)), r, share)
          this.stats.notes++
        })
      } else {
        // One voice plucks the chord's notes in turn, several times a step when the rate is fast.
        const per = ARP_RATES[this.settings.arpRate]
        const notes = this.chordShape()
        const order = arpOrder(arp, notes.length)
        let n = this.arpStep.get(id) ?? 0
        for (let k = 0; k < per; k++) {
          const r = row + notes[order[n % order.length]]
          voices[0].play(time + (k * length) / per, frequency(midiForRow(r, key, scale)), r, 1, true)
          n++
          this.stats.notes++
        }
        this.arpStep.set(id, n)
      }
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
      bot.body = walk(bot.body, dt, this.aspect, Math.random, GAITS[bot.type])
      bot.trail.push({ t: time, body: bot.body })
      if (bot.trail.length > 8) bot.trail.shift()
      // Keep about four seconds of where it has been, one point every other step.
      if (step % 2 === 0) {
        bot.path.push({ x: bot.body.x, y: bot.body.y })
        if (bot.path.length > 22) bot.path.shift()
      }
      const at: Point = { x: bot.body.x, y: bot.body.y }
      const pitch = frequency(midiForRow(rowFromY(at.y), key, scale))

      switch (bot.type) {
        case 'singer':
          // One held note that glides to the pitch of the row it is walking on.
          if (this.ctx) {
            bot.voice ??= new GlideVoice(this.ctx, this.leadBus)
            bot.voice.glide(time, pitch, at.x)
            if (step === 0) this.stats.robot++
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
            this.onEdit?.({ kind: 'bite', by: id, at, radius: REACH, aspect: this.aspect })
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
        const life = 0.35 + 0.4 * size
        // The body: a fast drop to a deep sine, driven near square for weight.
        tone('sine', 170, 41, 0.09, life + 0.3).connect(env(level * 1.4, life)).connect(this.kickBus)
        // The sub: a clean sine gliding down under the body, ringing on after the body fades.
        this.kickTail?.gain.setTargetAtTime(0, time, 0.008)
        const tail = env(level * MIX.kickSub, life * 2.5)
        tone('sine', 62, 38, 0.3, life * 2.5 + 0.3).connect(tail).connect(this.fxIn)
        this.kickTail = tail
        const click = ctx.createBiquadFilter()
        click.type = 'highpass'
        click.frequency.value = 3000
        this.burst(time, 0.02).connect(click).connect(env(level * 0.5, 0.012)).connect(this.drumBus)
        // The kick shoves the leads out of the way, then lets them swell back.
        this.duck.gain.setTargetAtTime(MIX.duck, time, 0.003)
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
