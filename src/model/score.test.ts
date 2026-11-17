import { describe, expect, it } from 'vitest'
import {
  ROWS,
  STEPS,
  drumFromY,
  eraseAt,
  lineSteps,
  midiForRow,
  noteName,
  paceWalker,
  rowFromY,
  type Item,
  type Line,
  type WalkerState,
} from './score'

const line = (points: [number, number][]): Line => ({
  kind: 'line',
  id: 1,
  ink: 0,
  points: points.map(([x, y]) => ({ x, y })),
})

describe('lineSteps', () => {
  it('sounds only on the steps the line covers, at the line height there', () => {
    const steps = lineSteps(line([[0.25, 0.8], [0.5, 0.2]]))
    expect(steps.slice(0, 8).every((v) => v === null)).toBe(true)
    expect(steps.slice(16).every((v) => v === null)).toBe(true)
    expect(steps[8]).toBeCloseTo(0.8 - 0.6 * (0.5 / 32 / 0.25), 5)
    expect(steps[15]!).toBeLessThan(steps[8]!)
  })

  it('gives a line with no width one step, so a dot of melody still plays', () => {
    const steps = lineSteps(line([[0.51, 0.3], [0.51, 0.5]]))
    expect(steps.filter((v) => v !== null)).toHaveLength(1)
    expect(steps[16]).toBeCloseTo(0.4)
  })
})

describe('pitch and drum lanes', () => {
  it('puts the lowest row at the bottom and climbs the scale', () => {
    expect(rowFromY(0.999)).toBe(0)
    expect(rowFromY(0)).toBe(ROWS - 1)
    expect(noteName(midiForRow(0, 'A', 'Minor pentatonic'))).toBe('A3')
    expect(noteName(midiForRow(1, 'A', 'Minor pentatonic'))).toBe('C4')
    expect(noteName(midiForRow(5, 'A', 'Minor pentatonic'))).toBe('A4')
  })

  it('reads drums from kick at the bottom to hat at the top', () => {
    expect(drumFromY(0.99)).toBe('kick')
    expect(drumFromY(0.01)).toBe('hat')
  })
})

describe('eraseAt', () => {
  const items: Item[] = [
    line([[0.1, 0.1], [0.3, 0.1]]),
    { kind: 'blob', id: 2, x: 0.8, y: 0.8, size: 0.5 },
    { kind: 'walker', id: 3, x: 0.5, y: 0.5 },
  ]
  it('removes whatever the rubber touches and nothing else', () => {
    expect(eraseAt(items, { x: 0.2, y: 0.12 }, 0.05, 1.6).map((i) => i.id)).toEqual([2, 3])
    expect(eraseAt(items, { x: 0.8, y: 0.8 }, 0.05, 1.6).map((i) => i.id)).toEqual([1, 3])
    expect(eraseAt(items, { x: 0.6, y: 0.3 }, 0.05, 1.6)).toHaveLength(3)
  })
  it('finds a robot where it has walked to, not where it was dropped', () => {
    const moved = () => ({ x: 0.9, y: 0.2 })
    expect(eraseAt(items, { x: 0.5, y: 0.5 }, 0.05, 1.6, moved)).toHaveLength(3)
    expect(eraseAt(items, { x: 0.9, y: 0.2 }, 0.05, 1.6, moved).map((i) => i.id)).toEqual([1, 2])
  })
})

describe('paceWalker', () => {
  it('stays on the grid and keeps moving over many paces', () => {
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    let w: WalkerState = { step: 0, row: 0, dir: -1, moves: 0 }
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) {
      const next = paceWalker(w, random)
      expect(Math.abs(next.step - w.step)).toBe(1)
      expect(next.step).toBeGreaterThanOrEqual(0)
      expect(next.step).toBeLessThan(STEPS)
      expect(next.row).toBeGreaterThanOrEqual(0)
      expect(next.row).toBeLessThan(ROWS)
      seen.add(next.step)
      w = next
    }
    expect(w.moves).toBe(500)
    expect(seen.size).toBeGreaterThan(8)
  })
})
