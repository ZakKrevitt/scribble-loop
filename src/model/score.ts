/** The score: what is on the grid, and how grid positions map to steps, pitches and drums. */

export const STEPS = 32
export const ROWS = 15

/** Drum lanes from the bottom of the grid to the top. */
export const DRUMS = ['kick', 'snare', 'clap', 'pop', 'zap', 'hat'] as const
export type Drum = (typeof DRUMS)[number]

export const SCALES = {
  'Major pentatonic': [0, 2, 4, 7, 9],
  'Minor pentatonic': [0, 3, 5, 7, 10],
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
} as const
export type ScaleName = keyof typeof SCALES

/** The lead sounds. Every line plays one; its colour on the grid says which. */
export const LEADS = ['Supersaw', 'Rubber', 'Glass', 'Chip'] as const
export type LeadName = (typeof LEADS)[number]

/** Drum timing: how many sixteenth steps a drum snaps to. Free plays exactly where it sits. */
export const DRUM_GRIDS = { Free: 0, '1/16': 1, '1/8': 2, '1/4': 4 } as const
export type DrumGrid = keyof typeof DRUM_GRIDS

export const CHORDS = ['Off', 'Power', 'Triad', 'Seventh', 'Octaves'] as const
export type ChordName = (typeof CHORDS)[number]

export const ARPS = ['Off', 'Up', 'Down', 'Up and down', 'Random'] as const
export type ArpName = (typeof ARPS)[number]

/** Arpeggio speed: notes per sixteenth step. */
export const ARP_RATES = { '1/16': 1, '1/32': 2, Triplets: 3 } as const
export type ArpRate = keyof typeof ARP_RATES

export const BOTS = ['singer', 'swapper', 'eater', 'dropper', 'bumper'] as const
export type BotType = (typeof BOTS)[number]

export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export type KeyName = (typeof KEYS)[number]

/** Positions are fractions of the grid: x 0 is the left edge, y 0 is the top. */
export interface Point {
  x: number
  y: number
}

export interface Line {
  kind: 'line'
  id: number
  points: Point[]
  lead: LeadName
  /** The robot that left it, if one did. */
  by?: number
}

export interface Blob {
  kind: 'blob'
  id: number
  x: number
  y: number
  /** 0 to 1. Larger blobs hit harder and ring longer. */
  size: number
  by?: number
}

/** A robot that walks the grid by itself. What it does depends on its type. */
export interface Walker {
  kind: 'walker'
  id: number
  bot: BotType
  /** Where it was dropped. It walks from here once the loop is playing. */
  x: number
  y: number
}

export type Item = Line | Blob | Walker

export const MAX_WALKERS = 8

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function stepFromX(x: number): number {
  return clamp(Math.floor(x * STEPS), 0, STEPS - 1)
}

/**
 * When a drum at `x` plays: the step it fires on, and how far into that step (0 to 1).
 * Snapped drums fire at the start of the nearest allowed step; free drums fire exactly at `x`.
 */
export function drumTiming(x: number, grid: DrumGrid): { step: number; offset: number } {
  const every = DRUM_GRIDS[grid]
  if (every === 0) {
    const step = stepFromX(x)
    return { step, offset: clamp(x * STEPS - step, 0, 0.999) }
  }
  return { step: (Math.round((x * STEPS) / every) * every) % STEPS, offset: 0 }
}

/** Where a drum is drawn: on the grid line it snaps to, or where it was placed when free. */
export function drumX(x: number, grid: DrumGrid): number {
  if (DRUM_GRIDS[grid] === 0) return x
  return drumTiming(x, grid).step / STEPS
}

export function rowFromY(y: number): number {
  return clamp(Math.floor((1 - y) * ROWS), 0, ROWS - 1)
}

export function drumFromY(y: number): Drum {
  return DRUMS[clamp(Math.floor((1 - y) * DRUMS.length), 0, DRUMS.length - 1)]
}

/** MIDI note for a grid row. Row 0 is the lowest row. */
export function midiForRow(row: number, key: KeyName, scale: ScaleName): number {
  const degrees = SCALES[scale]
  const octave = Math.floor(row / degrees.length)
  return 48 + KEYS.indexOf(key) + 12 * octave + degrees[row % degrees.length]
}

export function noteName(midi: number): string {
  return `${KEYS[midi % 12]}${Math.floor(midi / 12) - 1}`
}

export function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/**
 * The height of a line at each step, or null where the line is absent.
 * A step sounds when the line crosses the middle of its column.
 */
export function lineSteps(line: Line): (number | null)[] {
  const out = new Array<number | null>(STEPS).fill(null)
  const pts = line.points
  if (pts.length === 0) return out
  for (let s = 0; s < STEPS; s++) {
    const cx = (s + 0.5) / STEPS
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      if (a.x === b.x) continue
      if ((a.x - cx) * (b.x - cx) <= 0) {
        out[s] = a.y + ((cx - a.x) / (b.x - a.x)) * (b.y - a.y)
        break
      }
    }
  }
  if (!out.some((v) => v !== null)) {
    const mx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length
    const my = pts.reduce((sum, p) => sum + p.y, 0) / pts.length
    out[stepFromX(mx)] = my
  }
  return out
}

/** Where an item is on screen now, when that differs from where it was stored. */
export type Placement = (item: Blob | Walker) => Point | undefined

function nearLine(points: Point[], at: Point, radius: number, aspect: number): boolean {
  if (points.length === 1) return Math.hypot((points[0].x - at.x) * aspect, points[0].y - at.y) <= radius
  for (let i = 0; i < points.length - 1; i++) {
    // Nearest point on this stretch of the line, measured in the same square space.
    const ax = points[i].x * aspect
    const dx = points[i + 1].x * aspect - ax
    const dy = points[i + 1].y - points[i].y
    const len = dx * dx + dy * dy || 1e-9
    const t = clamp(((at.x * aspect - ax) * dx + (at.y - points[i].y) * dy) / len, 0, 1)
    if (Math.hypot(at.x * aspect - (ax + t * dx), at.y - (points[i].y + t * dy)) <= radius) return true
  }
  return false
}

/** Remove every item that comes within `radius` of the point. `aspect` is grid width over height. */
export function eraseAt(
  items: Item[],
  at: Point,
  radius: number,
  aspect: number,
  where: Placement = () => undefined,
): Item[] {
  const near = (p: Point) => Math.hypot((p.x - at.x) * aspect, p.y - at.y) <= radius
  return items.filter((item) => {
    if (item.kind === 'line') return !nearLine(item.points, at, radius, aspect)
    return !near(where(item) ?? item)
  })
}

/**
 * Take a bite out of the song: drums under the point go, and lines lose the stretch under it,
 * splitting in two where the bite lands in the middle. Robots are never eaten. Returns the same
 * array when nothing was in reach, so callers can skip an update.
 */
export function biteAt(
  items: Item[],
  at: Point,
  radius: number,
  aspect: number,
  nextId: () => number,
  where: Placement = () => undefined,
): Item[] {
  const near = (p: Point) => Math.hypot((p.x - at.x) * aspect, p.y - at.y) <= radius
  const out: Item[] = []
  for (const item of items) {
    if (item.kind === 'walker') out.push(item)
    else if (item.kind === 'blob') {
      if (!near(where(item) ?? item)) out.push(item)
    } else {
      if (!item.points.some(near)) {
        out.push(item)
        continue
      }
      let run: Point[] = []
      let first = true
      const flush = () => {
        if (run.length >= 2) {
          out.push({ ...item, id: first ? item.id : nextId(), points: run })
          first = false
        }
        run = []
      }
      for (const p of item.points) {
        if (near(p)) flush()
        else run.push(p)
      }
      flush()
    }
  }
  return out.length === items.length && out.every((item, i) => item === items[i]) ? items : out
}

/** True when anything edible is within reach. */
export function touches(items: Item[], at: Point, radius: number, aspect: number, where: Placement = () => undefined): boolean {
  const near = (p: Point) => Math.hypot((p.x - at.x) * aspect, p.y - at.y) <= radius
  return items.some((item) => {
    if (item.kind === 'walker') return false
    if (item.kind === 'blob') return near(where(item) ?? item)
    return item.points.some(near)
  })
}

/** The first line within reach of the point, if any. */
export function lineNear(items: Item[], at: Point, radius: number, aspect: number): Line | undefined {
  return items.find((i): i is Line => i.kind === 'line' && nearLine(i.points, at, radius, aspect))
}

/**
 * The rows a chord stacks on its root, counted in steps of the current scale so every note stays
 * in key. `scaleSize` is how many notes the scale has in an octave.
 */
export function chordRows(chord: ChordName, scaleSize: number): number[] {
  const octave = scaleSize
  const fifth = Math.round((scaleSize * 4) / 7)
  switch (chord) {
    case 'Off':
      return [0]
    case 'Power':
      return [0, fifth, octave]
    case 'Triad':
      return [0, 2, 4].map((d) => Math.round((d * scaleSize) / 7))
    case 'Seventh':
      return [0, 2, 4, 6].map((d) => Math.round((d * scaleSize) / 7))
    case 'Octaves':
      return [0, octave]
  }
}

/** The order an arpeggio plays a chord's notes in, as indexes into the chord. One full cycle. */
export function arpOrder(arp: ArpName, size: number, random: () => number = Math.random): number[] {
  const up = Array.from({ length: size }, (_, i) => i)
  switch (arp) {
    case 'Off':
    case 'Up':
      return up
    case 'Down':
      return [...up].reverse()
    case 'Up and down':
      return size < 3 ? up : [...up, ...up.slice(1, -1).reverse()]
    case 'Random':
      return up.map(() => Math.floor(random() * size))
  }
}
