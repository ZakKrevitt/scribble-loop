import type { BotType } from '@/model/score'

/** A robot's body on the grid. Positions are grid fractions, heading is in radians (0 walks right). */
export interface BotBody {
  x: number
  y: number
  heading: number
  /** How fast the heading is turning, in radians per second. */
  turn: number
  /** Distance walked, in grid widths. Drives the walk cycle. */
  walked: number
}

/** Grid widths per second. */
export const WALK_SPEED = 0.055
/** Grid widths per frame of the twelve-frame walk cycle, so the feet keep pace with the ground. */
export const STRIDE = 0.011

const MARGIN_X = 0.03
const TOP = 0.1
const BOTTOM = 0.9

/**
 * Walk a robot forward by `dt` seconds. It wanders: its heading drifts smoothly, it prefers
 * walking across rather than up and down, and it turns back from the edges of the grid.
 * `aspect` is grid width over height, so vertical travel looks as fast as horizontal.
 */
export function walk(body: BotBody, dt: number, aspect: number, random: () => number = Math.random): BotBody {
  let { heading, turn } = body
  turn += (random() - 0.5) * 2.4 * Math.sqrt(dt)
  // A gentle pull back toward walking sideways, the way the robot is drawn.
  turn -= Math.sin(2 * heading) * 0.35 * dt
  turn *= Math.exp(-1.2 * dt)
  turn = Math.max(-1.4, Math.min(1.4, turn))
  heading += turn * dt

  let x = body.x + Math.cos(heading) * WALK_SPEED * dt
  let y = body.y + Math.sin(heading) * WALK_SPEED * dt * aspect * 0.6
  if ((x < MARGIN_X && Math.cos(heading) < 0) || (x > 1 - MARGIN_X && Math.cos(heading) > 0)) {
    heading = Math.PI - heading
    turn = 0
  }
  if ((y < TOP && Math.sin(heading) < 0) || (y > BOTTOM && Math.sin(heading) > 0)) {
    heading = -heading
    turn = 0
  }
  x = Math.max(0, Math.min(1, x))
  y = Math.max(0, Math.min(1, y))
  return { x, y, heading, turn, walked: body.walked + WALK_SPEED * dt }
}

export function startBody(x: number, y: number, random: () => number = Math.random): BotBody {
  return { x, y, heading: random() < 0.5 ? 0 : Math.PI, turn: 0, walked: 0 }
}

/** What each robot does, in a few words, for its menu entry. */
export const BOT_INFO: Record<BotType, { name: string; does: string }> = {
  singer: { name: 'Singer', does: 'Sings where it walks' },
  swapper: { name: 'Swapper', does: 'Swaps a line’s sound' },
  eater: { name: 'Eater', does: 'Eats what it walks over' },
  dropper: { name: 'Dropper', does: 'Leaves notes and drums' },
  bumper: { name: 'Bumper', does: 'Sounds when you hit it' },
}
