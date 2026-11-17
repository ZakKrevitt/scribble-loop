import { describe, expect, it } from 'vitest'
import {
  ROWS,
  STEPS,
  drumFromY,
  eraseAt,
  lineSteps,
  midiForRow,
  noteName,
  rowFromY,
  biteAt,
  drumTiming,
  drumX,
  type Item,
  type Line,
} from './score'

const line = (points: [number, number][]): Line => ({
  kind: 'line',
  id: 1,
  lead: 'Supersaw',
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
    { kind: 'walker', id: 3, bot: 'eater', x: 0.5, y: 0.5 },
  ]
  it('removes whatever the rubber touches and nothing else', () => {
    expect(eraseAt(items, { x: 0.2, y: 0.12 }, 0.05, 1.6).map((i) => i.id)).toEqual([2, 3])
    expect(eraseAt(items, { x: 0.8, y: 0.8 }, 0.05, 1.6).map((i) => i.id)).toEqual([1, 3])
    expect(eraseAt(items, { x: 0.6, y: 0.3 }, 0.05, 1.6)).toHaveLength(3)
  })
  it('finds a robot where it has walked to, not where it was dropped', () => {
    const moved = (item: Item) => (item.kind === 'walker' ? { x: 0.9, y: 0.2 } : undefined)
    expect(eraseAt(items, { x: 0.5, y: 0.5 }, 0.05, 1.6, moved)).toHaveLength(3)
    expect(eraseAt(items, { x: 0.9, y: 0.2 }, 0.05, 1.6, moved).map((i) => i.id)).toEqual([1, 2])
  })
})

describe('drum timing', () => {
  it('snaps to the nearest allowed step, and plays exactly where it sits when free', () => {
    const x = 5.4 / STEPS
    expect(drumTiming(x, '1/16')).toEqual({ step: 5, offset: 0 })
    expect(drumTiming(x, '1/8')).toEqual({ step: 6, offset: 0 })
    expect(drumTiming(x, '1/4')).toEqual({ step: 4, offset: 0 })
    const free = drumTiming(x, 'Free')
    expect(free.step).toBe(5)
    expect(free.offset).toBeCloseTo(0.4)
  })

  it('draws a snapped drum on the grid line it plays on, and wraps the last one round', () => {
    expect(drumX(5.4 / STEPS, '1/4')).toBeCloseTo(4 / STEPS)
    expect(drumX(31.8 / STEPS, '1/4')).toBe(0)
    expect(drumX(0.123, 'Free')).toBe(0.123)
  })
})

describe('biteAt', () => {
  it('splits a line where the bite lands and swallows drums, never robots', () => {
    let next = 100
    const points = Array.from({ length: 21 }, (_, i) => [0.1 + i * 0.02, 0.5] as [number, number])
    const items: Item[] = [
      line(points),
      { kind: 'blob', id: 2, x: 0.3, y: 0.52, size: 0.5 },
      { kind: 'walker', id: 3, bot: 'eater', x: 0.3, y: 0.5 },
    ]
    const out = biteAt(items, { x: 0.3, y: 0.5 }, 0.03, 1, () => next++)
    const lines = out.filter((i) => i.kind === 'line')
    expect(lines.map((l) => l.id)).toEqual([1, 100])
    expect(out.some((i) => i.kind === 'blob')).toBe(false)
    expect(out.some((i) => i.kind === 'walker')).toBe(true)
  })
})
