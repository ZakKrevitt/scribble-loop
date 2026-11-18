import type { Point } from '@/model/score'

export type Pose = 'open' | 'pinch' | 'fist' | 'point'

/** Thumb tip to index tip, as a fraction of the hand's size. */
const PINCH_ON = 0.33
const PINCH_OFF = 0.5

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

/** A fingertip pressed to the thumb tip. */
export type Touch = 'index' | 'middle' | 'ring' | 'pinky'

const TIPS: Record<Touch, number> = { index: 8, middle: 12, ring: 16, pinky: 20 }
/** Fingertip to thumb tip, as a fraction of the hand's size, to count as pressed and to let go. */
const TOUCH_ON = 0.3
const TOUCH_OFF = 0.42

export interface HandReading {
  pose: Pose
  /** Which fingertip is pressed to the thumb, if any. The closest one wins. */
  touch: Touch | null
  /** Each fingertip, for labelling the hand. */
  tips: Record<Touch, Point>
  /** The thumb tip. A pinch lands midway between it and the pressed fingertip. */
  thumb: Point
  /** Where the hand points: midway between thumb tip and index tip, or the palm for a fist. */
  point: Point
  /** The middle of the palm. */
  palm: Point
  /**
   * How far the hand is twisted like a dial, from -1 (turned left on screen) to 1 (turned right).
   * Measured on the mirrored picture the player sees.
   */
  twist: number
}

/** Twisting this far either way reads as fully turned. */
const TWIST_RANGE = (55 * Math.PI) / 180

/**
 * Read a pose from the 21 hand keypoints.
 * `aspect` is the image width over height, so distances are measured in a square space.
 * `previous` gives the pinch some stickiness so it does not flicker at the threshold.
 */
export function readHand(
  landmarks: Point[],
  aspect: number,
  previous: Pose = 'open',
  previousTouch: Touch | null = null,
): HandReading {
  const d = (a: number, b: number) =>
    Math.hypot((landmarks[a].x - landmarks[b].x) * aspect, landmarks[a].y - landmarks[b].y)

  const size = d(WRIST, MIDDLE_KNUCKLE) || 1e-6
  let touch: Touch | null = null
  let nearest = Infinity
  for (const finger of Object.keys(TIPS) as Touch[]) {
    const ratio = d(THUMB_TIP, TIPS[finger]) / size
    const limit = finger === previousTouch ? TOUCH_OFF : TOUCH_ON
    if (ratio < limit && ratio < nearest) {
      nearest = ratio
      touch = finger
    }
  }
  const tips = {
    index: landmarks[TIPS.index],
    middle: landmarks[TIPS.middle],
    ring: landmarks[TIPS.ring],
    pinky: landmarks[TIPS.pinky],
  }
  const isCurled = ([joint, tip]: readonly [number, number]) => d(tip, WRIST) < d(joint, WRIST)
  const curled = FINGERS.every(isCurled)

  const palmIds = [WRIST, 5, MIDDLE_KNUCKLE, 13, 17]
  const palm = {
    x: palmIds.reduce((sum, i) => sum + landmarks[i].x, 0) / palmIds.length,
    y: palmIds.reduce((sum, i) => sum + landmarks[i].y, 0) / palmIds.length,
  }
  // The wrist-to-knuckle axis against straight up. The camera image is unmirrored, so flip x
  // to measure the twist the player sees on screen.
  const axisX = -(landmarks[MIDDLE_KNUCKLE].x - landmarks[WRIST].x) * aspect
  const axisY = landmarks[MIDDLE_KNUCKLE].y - landmarks[WRIST].y
  const twist = Math.max(-1, Math.min(1, Math.atan2(axisX, -axisY) / TWIST_RANGE))

  if (curled) {
    return {
      pose: 'fist',
      point: {
        x: (landmarks[WRIST].x + landmarks[MIDDLE_KNUCKLE].x) / 2,
        y: (landmarks[WRIST].y + landmarks[MIDDLE_KNUCKLE].y) / 2,
      },
      palm,
      twist,
      touch: null,
      tips,
      thumb: landmarks[THUMB_TIP],
    }
  }

  const ratio = d(THUMB_TIP, INDEX_TIP) / size
  const pinched = ratio < (previous === 'pinch' ? PINCH_OFF : PINCH_ON)
  const pinchPoint = {
    x: (landmarks[THUMB_TIP].x + landmarks[INDEX_TIP].x) / 2,
    y: (landmarks[THUMB_TIP].y + landmarks[INDEX_TIP].y) / 2,
  }
  if (pinched) return { pose: 'pinch', point: pinchPoint, palm, twist, touch, tips, thumb: landmarks[THUMB_TIP] }

  // Pointing: the index finger out well past its middle joint, the other three curled.
  const [index, ...rest] = FINGERS
  if (d(index[1], WRIST) > d(index[0], WRIST) * 1.15 && rest.every(isCurled)) {
    return { pose: 'point', point: landmarks[INDEX_TIP], palm, twist, touch, tips, thumb: landmarks[THUMB_TIP] }
  }
  return { pose: 'open', point: pinchPoint, palm, twist, touch, tips, thumb: landmarks[THUMB_TIP] }
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

/** How far (in grid widths) and how fast an open hand must sweep sideways to wipe the board. */
const SWAT_DISTANCE = 0.6
const SWAT_WINDOW_MS = 320
const SWAT_COOLDOWN_MS = 1500

/**
 * Spots a swat: an open, flat hand sweeping sideways across a good part of the stage in a moment.
 * Fires once, then rests, so one swat clears once.
 */
export class SwatReader {
  private trail: { x: number; y: number; t: number }[] = []
  private restUntil = 0

  /** `x` and `y` are the palm in grid fractions; `open` is whether the hand is flat and open. */
  read(x: number, y: number, open: boolean, timeMs: number): boolean {
    if (!open) {
      this.trail = []
      return false
    }
    this.trail.push({ x, y, t: timeMs })
    while (this.trail.length && timeMs - this.trail[0].t > SWAT_WINDOW_MS) this.trail.shift()
    if (timeMs < this.restUntil || this.trail.length < 4) return false
    const first = this.trail[0]
    const dx = x - first.x
    const dy = y - first.y
    // The whole sweep must head one way: a hand moving to a new spot slows at the end, a swat does not.
    const last = this.trail[this.trail.length - 2]
    const stillGoing = Math.sign(x - last.x) === Math.sign(dx) && Math.abs(x - last.x) > 0.02
    if (Math.abs(dx) >= SWAT_DISTANCE && Math.abs(dx) > Math.abs(dy) * 2 && stillGoing) {
      this.trail = []
      this.restUntil = timeMs + SWAT_COOLDOWN_MS
      return true
    }
    return false
  }

  reset(): void {
    this.trail = []
  }
}

/**
 * Smooths all 21 keypoints of a hand, so the overlay and every gesture read from a steadier hand.
 * Each coordinate gets its own One Euro filter: still points barely move, fast moves stay quick.
 */
export class HandSmoother {
  private filters: Smoother[] = []

  next(points: Point[], timeMs: number): Point[] {
    if (this.filters.length !== points.length * 2) {
      this.filters = Array.from({ length: points.length * 2 }, () => new Smoother(1.2, 0.05))
    }
    return points.map((p, i) => ({
      x: this.filters[i * 2].next(p.x, timeMs),
      y: this.filters[i * 2 + 1].next(p.y, timeMs),
    }))
  }

  reset(): void {
    for (const f of this.filters) f.reset()
  }
}
