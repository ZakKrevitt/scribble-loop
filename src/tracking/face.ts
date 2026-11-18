export type Wink = 'left' | 'right'

/** A wink is one eye shut clearly more than the other, held this many frames. */
/** An eye counts as shut above this blink score; the face readout uses it too. */
export const WINK_SHUT = 0.42
const WINK_GAP = 0.25
const HOLD_FRAMES = 3
/** Reads in a row without a wink before another can fire. */
const RELAX_FRAMES = 2

/**
 * Turns per-frame blink scores into winks. One eye has to be shut clearly more than the other,
 * because the open eye usually squints a little during a wink. Each wink fires once, and the wink
 * has to end before another can. Ending is judged by the gap between the eyes, not by both eyes
 * reading wide open, because many faces rest with one eye a little shut on camera and would
 * otherwise never re-arm. Blinking both eyes never counts.
 */
export class WinkReader {
  private side: Wink | null = null
  private frames = 0
  private fired = false
  private relaxed = 0

  /** `left` and `right` are the player's own eyes. Returns the wink that just happened, if any. */
  read(left: number, right: number): Wink | null {
    const winking: Wink | null =
      left > WINK_SHUT && left - right > WINK_GAP
        ? 'left'
        : right > WINK_SHUT && right - left > WINK_GAP
          ? 'right'
          : null
    if (winking === null) {
      if (++this.relaxed >= RELAX_FRAMES) this.fired = false
      this.side = null
      this.frames = 0
      return null
    }
    this.relaxed = 0
    if (winking !== this.side) {
      this.side = winking
      this.frames = 0
    }
    this.frames++
    if (!this.fired && this.frames >= HOLD_FRAMES) {
      this.fired = true
      return winking
    }
    return null
  }
}

/** How open the mouth is, 0 shut to 1 wide, from MediaPipe's jaw score with its resting floor removed. */
export function mouthOpen(jaw: number): number {
  return Math.max(0, Math.min(1, (jaw - 0.08) / 0.55))
}

/** Fires once each time the mouth opens wide, and re-arms when it closes again. */
export class MouthReader {
  private frames = 0
  private fired = false

  read(open: number): boolean {
    if (open < 0.25) {
      this.fired = false
      this.frames = 0
      return false
    }
    this.frames = open > 0.55 ? this.frames + 1 : 0
    if (!this.fired && this.frames >= HOLD_FRAMES) {
      this.fired = true
      return true
    }
    return false
  }
}

/** A head tilted this far (about 15 degrees) counts; it must come back near upright before the next. */
const TILT_ON = 0.26
const TILT_OFF = 0.12

/**
 * Fires 'left' or 'right' once per tilt of the head, as the player sees it on screen. It starts
 * disarmed: the head has to be seen upright once, so a head that rests at an angle never fires.
 */
export class TiltReader {
  private frames = 0
  private fired = true

  read(tilt: number): Wink | null {
    if (Math.abs(tilt) < TILT_OFF) {
      this.fired = false
      this.frames = 0
      return null
    }
    this.frames = Math.abs(tilt) > TILT_ON ? this.frames + 1 : 0
    if (!this.fired && this.frames >= HOLD_FRAMES + 1) {
      this.fired = true
      return tilt < 0 ? 'left' : 'right'
    }
    return null
  }
}

/** What the camera reads off the face, for the on-screen readout. */
export interface FaceState {
  found: boolean
  left: number
  right: number
  mouth: number
}
