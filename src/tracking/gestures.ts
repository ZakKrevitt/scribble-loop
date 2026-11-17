import type { Point } from '@/model/score'

export type Pose = 'open' | 'pinch' | 'fist'

/** Thumb tip to index tip, as a fraction of the hand's size. */
const PINCH_ON = 0.3
const PINCH_OFF = 0.45

const WRIST = 0
const THUMB_TIP = 4
const INDEX_TIP = 8
const MIDDLE_KNUCKLE = 9
/** [middle joint, tip] for the index, middle, ring and little fingers. */
const FINGERS = [
  [6, 8],
  [10, 12],
  [14, 16],
  [18, 20],
] as const

export interface HandReading {
  pose: Pose
  /** Where the hand points: midway between thumb tip and index tip, or the palm for a fist. */
  point: Point
}

/**
 * Read a pose from the 21 hand keypoints.
 * `aspect` is the image width over height, so distances are measured in a square space.
 * `previous` gives the pinch some stickiness so it does not flicker at the threshold.
 */
export function readHand(landmarks: Point[], aspect: number, previous: Pose = 'open'): HandReading {
  const d = (a: number, b: number) =>
    Math.hypot((landmarks[a].x - landmarks[b].x) * aspect, landmarks[a].y - landmarks[b].y)

  const size = d(WRIST, MIDDLE_KNUCKLE) || 1e-6
  const curled = FINGERS.every(([joint, tip]) => d(tip, WRIST) < d(joint, WRIST))

  if (curled) {
    return {
      pose: 'fist',
      point: {
        x: (landmarks[WRIST].x + landmarks[MIDDLE_KNUCKLE].x) / 2,
        y: (landmarks[WRIST].y + landmarks[MIDDLE_KNUCKLE].y) / 2,
      },
    }
  }

  const ratio = d(THUMB_TIP, INDEX_TIP) / size
  const pinched = ratio < (previous === 'pinch' ? PINCH_OFF : PINCH_ON)
  return {
    pose: pinched ? 'pinch' : 'open',
    point: {
      x: (landmarks[THUMB_TIP].x + landmarks[INDEX_TIP].x) / 2,
      y: (landmarks[THUMB_TIP].y + landmarks[INDEX_TIP].y) / 2,
    },
  }
}

/** One Euro filter: steady when the hand is still, quick when it moves. */
export class Smoother {
  private x: number | null = null
  private dx = 0
  private last = 0
  private minCutoff: number
  private beta: number

  constructor(minCutoff = 1.4, beta = 0.02) {
    this.minCutoff = minCutoff
    this.beta = beta
  }

  private static alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff)
    return 1 / (1 + tau / dt)
  }

  next(value: number, timeMs: number): number {
    if (this.x === null) {
      this.x = value
      this.last = timeMs
      return value
    }
    const dt = Math.max(1e-3, (timeMs - this.last) / 1000)
    this.last = timeMs
    const rawDx = (value - this.x) / dt
    this.dx += Smoother.alpha(1, dt) * (rawDx - this.dx)
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx) * 100
    this.x += Smoother.alpha(cutoff, dt) * (value - this.x)
    return this.x
  }

  reset(): void {
    this.x = null
    this.dx = 0
  }
}
