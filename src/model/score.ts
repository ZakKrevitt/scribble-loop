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
  ink: number
}

export interface Blob {
  kind: 'blob'
  id: number
  x: number
  y: number
  /** 0 to 1. Larger blobs hit harder and ring longer. */
  size: number
}

/** A robot that walks the grid by itself and chirps when the playhead reaches it. */
export interface Walker {
  kind: 'walker'
  id: number
  /** Where it was dropped. It wanders from here once the loop is playing. */
  x: number
  y: number
}

export type Item = Line | Blob | Walker

export const MAX_WALKERS = 6

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function stepFromX(x: number): number {
  return clamp(Math.floor(x * STEPS), 0, STEPS - 1)
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

/** Remove every item that comes within `radius` of the point. `aspect` is grid width over height. */
export function eraseAt(
  items: Item[],
  at: Point,
  radius: number,
  aspect: number,
  /** Where a walker is now, if it has moved from where it was dropped. */
  walkerAt: (id: number) => Point | undefined = () => undefined,
): Item[] {
  const near = (p: Point) => Math.hypot((p.x - at.x) * aspect, p.y - at.y) <= radius
  return items.filter((item) => {
    if (item.kind === 'blob') return !near(item)
    if (item.kind === 'walker') return !near(walkerAt(item.id) ?? item)
    const pts = item.points
    if (pts.length === 1) return !near(pts[0])
    for (let i = 0; i < pts.length - 1; i++) {
      // Nearest point on this stretch of the line, measured in the same square space.
      const ax = pts[i].x * aspect
      const bx = pts[i + 1].x * aspect
      const dx = bx - ax
      const dy = pts[i + 1].y - pts[i].y
      const len = dx * dx + dy * dy || 1e-9
      const t = clamp(((at.x * aspect - ax) * dx + (at.y - pts[i].y) * dy) / len, 0, 1)
      if (Math.hypot(at.x * aspect - (ax + t * dx), at.y - (pts[i].y + t * dy)) <= radius) return false
    }
    return true
  })
}

/** A walker's place on the grid, in whole columns and rows. */
export interface WalkerState {
  step: number
  row: number
  dir: 1 | -1
  /** How many moves it has made. Drives the walk cycle. */
  moves: number
}

/**
 * Move a walker one pace: a column in the direction it faces, sometimes a row up or down,
 * turning round at the edges and now and then for no reason.
 */
export function paceWalker(w: WalkerState, random: () => number = Math.random): WalkerState {
  let dir = w.dir
  if (random() < 0.12) dir = dir === 1 ? -1 : 1
  let step = w.step + dir
  if (step < 0 || step >= STEPS) {
    dir = dir === 1 ? -1 : 1
    step = w.step + dir
  }
  let row = w.row
  const hop = random()
  if (hop < 0.2) row += 1
  else if (hop < 0.4) row -= 1
  row = clamp(row, 0, ROWS - 1)
  return { step, row, dir, moves: w.moves + 1 }
}

export function walkerPoint(w: WalkerState): Point {
  return { x: (w.step + 0.5) / STEPS, y: 1 - (w.row + 0.5) / ROWS }
}
