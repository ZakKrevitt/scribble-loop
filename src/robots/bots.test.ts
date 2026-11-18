import { describe, expect, it } from 'vitest'
import { GAITS, STRIDE, WALK_SPEED, startBody, walk } from './bots'

function seeded(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}

describe('walk', () => {
  it('moves smoothly, at walking pace, and never leaves the grid', () => {
    const random = seeded(11)
    let body = startBody(0.5, 0.5, random)
    let maxJump = 0
    for (let i = 0; i < 4000; i++) {
      const next = walk(body, 0.094, 1.6, random)
      maxJump = Math.max(maxJump, Math.hypot(next.x - body.x, next.y - body.y))
      expect(next.x).toBeGreaterThanOrEqual(0)
      expect(next.x).toBeLessThanOrEqual(1)
      expect(next.y).toBeGreaterThanOrEqual(0)
      expect(next.y).toBeLessThanOrEqual(1)
      body = next
    }
    // No teleporting: each step covers about one step of walking, never more than twice that.
    expect(maxJump).toBeLessThan(WALK_SPEED * 0.094 * 2)
    expect(body.walked).toBeCloseTo(WALK_SPEED * 0.094 * 4000)
  })

  it('wanders the whole width rather than pacing in one spot', () => {
    const random = seeded(3)
    let body = startBody(0.5, 0.5, random)
    let left = 1
    let right = 0
    for (let i = 0; i < 9000; i++) {
      body = walk(body, 0.094, 1.6, random)
      left = Math.min(left, body.x)
      right = Math.max(right, body.x)
    }
    expect(left).toBeLessThan(0.2)
    expect(right).toBeGreaterThan(0.8)
  })

  it('turns gradually, not in jerks', () => {
    const random = seeded(5)
    let body = startBody(0.5, 0.5, random)
    let sharpest = 0
    for (let i = 0; i < 2000; i++) {
      const next = walk(body, 0.094, 1.6, random)
      const nearEdge = next.x < 0.05 || next.x > 0.95 || next.y < 0.12 || next.y > 0.88
      if (!nearEdge) sharpest = Math.max(sharpest, Math.abs(next.heading - body.heading))
      body = next
    }
    expect(sharpest).toBeLessThan(0.1)
    expect(STRIDE).toBeGreaterThan(0)
  })

  it('does not flip to face the other way while drifting up or down', () => {
    const random = seeded(9)
    let body = startBody(0.5, 0.5, random)
    let flips = 0
    for (let i = 0; i < 3000; i++) {
      const next = walk(body, 0.094, 1.6, random)
      if (next.facing !== body.facing) flips++
      body = next
    }
    // Over about ten loops at walking pace, a handful of real turns, not a twitch on every step.
    expect(flips).toBeLessThan(12)
  })
})

describe('gaits', () => {
  const travel = (bot: keyof typeof GAITS) => {
    const random = seeded(21)
    let body = startBody(0.5, 0.5, random)
    let vertical = 0
    for (let i = 0; i < 3000; i++) {
      const next = walk(body, 0.094, 1.6, random, GAITS[bot])
      vertical += Math.abs(next.y - body.y)
      body = next
    }
    return { walked: body.walked, vertical }
  }
  it('makes the swapper fast, the eater a crawl and the singer the most up and down', () => {
    const swapper = travel('swapper')
    const eater = travel('eater')
    const singer = travel('singer')
    const dropper = travel('dropper')
    expect(swapper.walked).toBeGreaterThan(eater.walked * 4)
    expect(singer.vertical / singer.walked).toBeGreaterThan(dropper.vertical / dropper.walked)
  })
})

