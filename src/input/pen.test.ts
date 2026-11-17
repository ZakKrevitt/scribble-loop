import { describe, expect, it } from 'vitest'
import { Pen } from './pen'

describe('Pen', () => {
  it('makes a blob from a press that stays put, larger the longer it is held', () => {
    const quick = new Pen(() => 1.6)
    quick.down({ x: 0.5, y: 0.5 }, 0)
    quick.move({ x: 0.502, y: 0.501 })
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
    pen.move({ x: 0.3, y: 0.4 })
    pen.move({ x: 0.4, y: 0.6 })
    pen.move({ x: 0.2, y: 0.5 })
    const draft = pen.up(400)
    expect(draft?.kind).toBe('line')
    if (draft?.kind === 'line') expect(draft.points).toHaveLength(4)
  })
})
