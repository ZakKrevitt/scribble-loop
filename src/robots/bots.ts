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

/** Grid widths per second, for a robot with an ordinary gait. */
export const WALK_SPEED = 0.034

/** How a kind of robot moves. */
export interface Gait {
  /** Multiplies the walking speed. */
  speed: number
  /** How restlessly it changes direction. */
  wander: number
  /** 0 keeps it walking across; 1 lets it climb and dive as freely. */
  climb: number
  /** The sharpest it may turn, in radians per second. */
  maxTurn: number
  /** A sideways zigzag laid over its path, 0 for none. */
  zigzag: number
}

export const GAITS: Record<BotType, Gait> = {
  // The singer swoops up and down, so its held note keeps moving.
  singer: { speed: 1.1, wander: 1.4, climb: 1, maxTurn: 1.1, zigzag: 0 },
  // The swapper darts.
  swapper: { speed: 2.4, wander: 1.8, climb: 0.3, maxTurn: 1.6, zigzag: 0 },
  // The eater crawls.
  eater: { speed: 0.4, wander: 0.5, climb: 0.2, maxTurn: 0.4, zigzag: 0 },
  // The dropper sweeps in long, wide arcs.
  dropper: { speed: 1, wander: 0.6, climb: 0.5, maxTurn: 0.5, zigzag: 0 },
  // The bumper hops along in a zigzag.
  bumper: { speed: 1.3, wander: 0.9, climb: 0.3, maxTurn: 0.9, zigzag: 1 },
}

const STEADY: Gait = { speed: 1, wander: 0.9, climb: 0, maxTurn: 0.7, zigzag: 0 }
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
export function walk(
  body: BotBody,
  dt: number,
  aspect: number,
  random: () => number = Math.random,
  gait: Gait = STEADY,
): BotBody {
  let { heading, turn } = body
  // Long, lazy curves: small nudges to the turn, slowly damped, never a sharp change.
  turn += (random() - 0.5) * gait.wander * Math.sqrt(dt)
  // A pull back toward walking sideways, the way the robots are drawn, unless the gait climbs.
  turn -= Math.sin(2 * heading) * 0.25 * (1 - gait.climb) * dt
  turn *= Math.exp(-0.6 * dt)
  turn = Math.max(-gait.maxTurn, Math.min(gait.maxTurn, turn))
  heading += turn * dt

  const speed = WALK_SPEED * gait.speed
  const walked = body.walked + speed * dt
  // A zigzag rides on the path as a sideways wobble that follows distance walked.
  const zig = gait.zigzag * Math.cos(walked * 90) * speed * 1.6
  let x = body.x + (Math.cos(heading) * speed - Math.sin(heading) * zig) * dt
  let y = body.y + (Math.sin(heading) * speed + Math.cos(heading) * zig) * dt * aspect * (0.6 + 0.6 * gait.climb)
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
  return { x, y, heading, turn, walked, facing }
}

export function startBody(x: number, y: number, random: () => number = Math.random): BotBody {
  const right = random() < 0.5
  return { x, y, heading: right ? 0 : Math.PI, turn: 0, walked: 0, facing: right ? 1 : -1 }
}

/** Each robot's name, for menus and messages. */
export const BOT_INFO: Record<BotType, { name: string }> = {
  singer: { name: 'Singer' },
  swapper: { name: 'Swapper' },
  eater: { name: 'Eater' },
  dropper: { name: 'Dropper' },
  bumper: { name: 'Bumper' },
}
