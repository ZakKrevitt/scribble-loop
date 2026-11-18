/** Eyes count as shut above this and open below that, from MediaPipe's 0 to 1 blink scores. */
const SHUT = 0.55
const OPEN = 0.3
/** A wink must hold for this many frames, so a twitch does not count. */
const HOLD_FRAMES = 3

export type Wink = 'left' | 'right'

/**
 * Turns per-frame blink scores into winks. A wink is one eye shut while the other stays open;
 * it fires once, and the eyes must open again before another can. Blinking both eyes never counts.
 */
export class WinkReader {
  private side: Wink | null = null
  private frames = 0
  private fired = false

  /** `left` and `right` are the player's own eyes. Returns the wink that just happened, if any. */
  read(left: number, right: number): Wink | null {
    const winking: Wink | null =
      left > SHUT && right < OPEN ? 'left' : right > SHUT && left < OPEN ? 'right' : null
    if (winking === null) {
      if (left < OPEN && right < OPEN) this.fired = false
      this.side = null
      this.frames = 0
      return null
    }
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
