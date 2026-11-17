import type { Point } from '@/model/score'

const BLOB_GROW_MS = 1000
const BLOB_MIN = 0.45
const POINT_SPACING = 0.004

export interface PenFeel {
  /** A stroke that stays within this distance of where it began is a drum, not a line. */
  travel: number
  /** Held still this long, the stroke is a drum for good, however the hand then wobbles. */
  lockMs: number
}

/** The mouse is steady, so a small wiggle is already a line. */
export const MOUSE_FEEL: PenFeel = { travel: 0.022, lockMs: 350 }
/** A hand shakes and its pinch point shifts as fingers close, so it gets more room. */
export const HAND_FEEL: PenFeel = { travel: 0.05, lockMs: 250 }

export type Draft =
  | { kind: 'line'; points: Point[] }
  | { kind: 'blob'; x: number; y: number; size: number }

/**
 * Turns one press, drag and release into a line or a drum.
 * Hands and the mouse both drive a Pen, so they place things the same way.
 */
export class Pen {
  private start: Point | null = null
  private startTime = 0
  private points: Point[] = []
  private decided: 'line' | 'blob' | null = null
  private aspect: () => number
  private feel: PenFeel

  constructor(aspect: () => number, feel: PenFeel = MOUSE_FEEL) {
    this.aspect = aspect
    this.feel = feel
  }

  get active(): boolean {
    return this.start !== null
  }

  down(p: Point, time: number): void {
    this.start = p
    this.startTime = time
    this.points = [p]
    this.decided = null
  }

  move(p: Point, time: number): void {
    if (!this.start) return
    const aspect = this.aspect()
    if (this.decided === null) {
      if (time - this.startTime >= this.feel.lockMs) this.decided = 'blob'
      else if (Math.hypot((p.x - this.start.x) * aspect, p.y - this.start.y) > this.feel.travel) this.decided = 'line'
    }
    if (this.decided === 'blob') return
    const last = this.points[this.points.length - 1]
    if (Math.hypot((p.x - last.x) * aspect, p.y - last.y) >= POINT_SPACING) this.points.push(p)
  }

  /** What the stroke would become if it ended now. */
  draft(time: number): Draft | null {
    if (!this.start) return null
    if (this.decided === 'line') return { kind: 'line', points: this.points }
    if (this.decided === null && time - this.startTime >= this.feel.lockMs) this.decided = 'blob'
    const held = Math.min(1, (time - this.startTime) / BLOB_GROW_MS)
    return { kind: 'blob', x: this.start.x, y: this.start.y, size: BLOB_MIN + (1 - BLOB_MIN) * held }
  }

  up(time: number): Draft | null {
    const result = this.draft(time)
    this.start = null
    this.points = []
    this.decided = null
    return result
  }

  cancel(): void {
    this.start = null
    this.points = []
    this.decided = null
  }
}
