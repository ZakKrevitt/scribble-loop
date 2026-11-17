import type { Point } from '@/model/score'

/** A stroke that stays within this distance of where it began is a blob, not a line. */
export const BLOB_TRAVEL = 0.022
const BLOB_GROW_MS = 1000
const BLOB_MIN = 0.45
const POINT_SPACING = 0.004

export type Draft =
  | { kind: 'line'; points: Point[] }
  | { kind: 'blob'; x: number; y: number; size: number }

/**
 * Turns one press, drag and release into a line or a blob.
 * Hands and the mouse both drive a Pen, so they place things the same way.
 */
export class Pen {
  private start: Point | null = null
  private startTime = 0
  private points: Point[] = []
  private isLine = false
  private aspect: () => number

  constructor(aspect: () => number) {
    this.aspect = aspect
  }

  get active(): boolean {
    return this.start !== null
  }

  down(p: Point, time: number): void {
    this.start = p
    this.startTime = time
    this.points = [p]
    this.isLine = false
  }

  move(p: Point): void {
    if (!this.start) return
    const aspect = this.aspect()
    if (!this.isLine && Math.hypot((p.x - this.start.x) * aspect, p.y - this.start.y) > BLOB_TRAVEL) {
      this.isLine = true
    }
    const last = this.points[this.points.length - 1]
    if (Math.hypot((p.x - last.x) * aspect, p.y - last.y) >= POINT_SPACING) this.points.push(p)
  }

  /** What the stroke would become if it ended now. */
  draft(time: number): Draft | null {
    if (!this.start) return null
    if (this.isLine) return { kind: 'line', points: this.points }
    const held = Math.min(1, (time - this.startTime) / BLOB_GROW_MS)
    return { kind: 'blob', x: this.start.x, y: this.start.y, size: BLOB_MIN + (1 - BLOB_MIN) * held }
  }

  up(time: number): Draft | null {
    const result = this.draft(time)
    this.start = null
    this.points = []
    return result
  }

  cancel(): void {
    this.start = null
    this.points = []
  }
}
