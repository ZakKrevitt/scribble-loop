import { describe, expect, it } from 'vitest'
import { HAND_FEEL, MOUSE_FEEL, Pen } from './pen'

describe('Pen', () => {
  it('makes a blob from a press that stays put, larger the longer it is held', () => {
    const quick = new Pen(() => 1.6)
    quick.down({ x: 0.5, y: 0.5 }, 0)
    quick.move({ x: 0.502, y: 0.501 }, 50)
    const small = quick.up(100)
    const slow = new Pen(() => 1.6)
    slow.down({ x: 0.5, y: 0.5 }, 0)
    const large = slow.up(1500)
    expect(small?.kind).toBe('blob')
    expect(large?.kind).toBe('blob')
    if (small?.kind === 'blob' && large?.kind === 'blob') {
      expect(large.size).toBe(1)
      expect(small.size).toBeLessThan(large.size)
    }
    expect(quick.active).toBe(false)
  })

  it('makes a line from a press that travels, and keeps it a line if it returns', () => {
    const pen = new Pen(() => 1.6)
    pen.down({ x: 0.2, y: 0.5 }, 0)
    pen.move({ x: 0.3, y: 0.4 }, 50)
    pen.move({ x: 0.4, y: 0.6 }, 100)
    pen.move({ x: 0.2, y: 0.5 }, 150)
    const draft = pen.up(400)
    expect(draft?.kind).toBe('line')
    if (draft?.kind === 'line') expect(draft.points).toHaveLength(4)
  })

  it('keeps a held press a drum even if the hand drifts after it locks', () => {
    const pen = new Pen(() => 1.6, HAND_FEEL)
    pen.down({ x: 0.5, y: 0.5 }, 0)
    pen.move({ x: 0.51, y: 0.5 }, 100)
    pen.move({ x: 0.6, y: 0.4 }, 400)
    expect(pen.up(600)?.kind).toBe('blob')
  })

  it('gives a hand more wobble room than the mouse before a press becomes a line', () => {
    const wobble = { x: 0.52, y: 0.5 }
    const mouse = new Pen(() => 1.6, MOUSE_FEEL)
    mouse.down({ x: 0.5, y: 0.5 }, 0)
    mouse.move(wobble, 40)
    const hand = new Pen(() => 1.6, HAND_FEEL)
    hand.down({ x: 0.5, y: 0.5 }, 0)
    hand.move(wobble, 40)
    expect(mouse.up(300)?.kind).toBe('line')
    expect(hand.up(300)?.kind).toBe('blob')
  })
})
