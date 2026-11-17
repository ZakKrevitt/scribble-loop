import { describe, expect, it } from 'vitest'
import type { Point } from '@/model/score'
import { Smoother, readHand } from './gestures'

/** A flat right hand, wrist at the bottom, fingers pointing up. */
function hand(overrides: Record<number, Point> = {}): Point[] {
  const base: Point[] = [
    { x: 0.5, y: 0.9 }, // wrist
    { x: 0.44, y: 0.84 }, { x: 0.39, y: 0.78 }, { x: 0.35, y: 0.72 }, { x: 0.32, y: 0.66 }, // thumb
    { x: 0.45, y: 0.68 }, { x: 0.44, y: 0.58 }, { x: 0.43, y: 0.51 }, { x: 0.43, y: 0.45 }, // index
    { x: 0.5, y: 0.67 }, { x: 0.5, y: 0.56 }, { x: 0.5, y: 0.48 }, { x: 0.5, y: 0.42 }, // middle
    { x: 0.55, y: 0.68 }, { x: 0.56, y: 0.58 }, { x: 0.56, y: 0.51 }, { x: 0.57, y: 0.46 }, // ring
    { x: 0.59, y: 0.71 }, { x: 0.61, y: 0.63 }, { x: 0.62, y: 0.58 }, { x: 0.63, y: 0.53 }, // little
  ]
  for (const [i, p] of Object.entries(overrides)) base[Number(i)] = p
  return base
}

describe('readHand', () => {
  it('reads an open hand and points between thumb and index', () => {
    const r = readHand(hand(), 1)
    expect(r.pose).toBe('open')
    expect(r.point.x).toBeCloseTo((0.32 + 0.43) / 2)
  })

  it('reads a pinch when thumb and index tips meet, and holds it until they clearly part', () => {
    const pinched = hand({ 4: { x: 0.4, y: 0.6 }, 8: { x: 0.41, y: 0.59 } })
    expect(readHand(pinched, 1).pose).toBe('pinch')
    const loosening = hand({ 4: { x: 0.37, y: 0.62 }, 8: { x: 0.42, y: 0.55 } })
    expect(readHand(loosening, 1, 'open').pose).toBe('open')
    expect(readHand(loosening, 1, 'pinch').pose).toBe('pinch')
  })

  it('reads a fist when all four fingers curl in, even with the thumb near the index', () => {
    const fist = hand({
      8: { x: 0.46, y: 0.72 },
      12: { x: 0.5, y: 0.72 },
      16: { x: 0.54, y: 0.73 },
      20: { x: 0.58, y: 0.75 },
      4: { x: 0.45, y: 0.71 },
    })
    const r = readHand(fist, 1)
    expect(r.pose).toBe('fist')
    expect(r.point.y).toBeCloseTo((0.9 + 0.67) / 2)
  })
})

describe('Smoother', () => {
  it('settles on a steady value and removes most of a small jitter', () => {
    const s = new Smoother()
    let out = 0
    let spread = 0
    for (let i = 0; i < 120; i++) {
      const jitter = i % 2 === 0 ? 1 : -1
      const next = s.next(100 + jitter, i * 16)
      if (i > 60) spread = Math.max(spread, Math.abs(next - out))
      out = next
    }
    expect(out).toBeGreaterThan(99)
    expect(out).toBeLessThan(101)
    expect(spread).toBeLessThan(1)
  })
})
