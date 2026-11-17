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
  /** Which way the robot faces. It only turns round once it is clearly walking the other way. */
  facing: 1 | -1
}

/** Grid widths per second. */
export const WALK_SPEED = 0.034
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
  // Long, lazy curves: small nudges to the turn, slowly damped, never a sharp change.
  turn += (random() - 0.5) * 0.9 * Math.sqrt(dt)
  // A gentle pull back toward walking sideways, the way the robot is drawn.
  turn -= Math.sin(2 * heading) * 0.25 * dt
  turn *= Math.exp(-0.6 * dt)
  turn = Math.max(-0.7, Math.min(0.7, turn))
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
  const c = Math.cos(heading)
  const facing = c > 0.3 ? 1 : c < -0.3 ? -1 : body.facing
  return { x, y, heading, turn, walked: body.walked + WALK_SPEED * dt, facing }
}

export function startBody(x: number, y: number, random: () => number = Math.random): BotBody {
  const right = random() < 0.5
  return { x, y, heading: right ? 0 : Math.PI, turn: 0, walked: 0, facing: right ? 1 : -1 }
}

/** What each robot does, in a few words, for its menu entry. */
export const BOT_INFO: Record<BotType, { name: string; does: string }> = {
  singer: { name: 'Singer', does: 'Glides a held note as it walks' },
  swapper: { name: 'Swapper', does: 'Swaps a line’s sound' },
  eater: { name: 'Eater', does: 'Eats what it walks over' },
  dropper: { name: 'Dropper', does: 'Leaves notes and drums' },
  bumper: { name: 'Bumper', does: 'Sounds when you hit it' },
}
