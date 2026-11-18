import { describe, expect, it } from 'vitest'
import { MouthReader, TiltReader, WinkReader, mouthOpen } from './face'

describe('WinkReader', () => {
  it('fires once for a held wink, and again only after the eyes relax', () => {
    const r = new WinkReader()
    const seen = [r.read(0.9, 0.05), r.read(0.9, 0.05), r.read(0.9, 0.05), r.read(0.9, 0.05)]
    expect(seen).toEqual([null, null, 'left', null])
    r.read(0.05, 0.05)
    expect([r.read(0.05, 0.9), r.read(0.05, 0.9), r.read(0.05, 0.9)]).toEqual([null, null, 'right'])
  })

  it('counts a wink even when the open eye squints a little', () => {
    const r = new WinkReader()
    expect([r.read(0.7, 0.4), r.read(0.72, 0.38), r.read(0.7, 0.4)]).toEqual([null, null, 'left'])
  })

  it('never counts a blink of both eyes, or a twitch shorter than the hold', () => {
    const r = new WinkReader()
    for (let i = 0; i < 6; i++) expect(r.read(0.9, 0.85)).toBe(null)
    expect([r.read(0.9, 0.05), r.read(0.9, 0.05), r.read(0.05, 0.05)]).toEqual([null, null, null])
  })
})

describe('MouthReader', () => {
  it('fires once per wide open, and re-arms when the mouth closes', () => {
    const m = new MouthReader()
    expect([m.read(0.8), m.read(0.8), m.read(0.8), m.read(0.8)]).toEqual([false, false, true, false])
    m.read(0.1)
    expect([m.read(0.8), m.read(0.8), m.read(0.8)]).toEqual([false, false, true])
    expect(mouthOpen(0.05)).toBe(0)
    expect(mouthOpen(0.7)).toBe(1)
  })
})

describe('TiltReader', () => {
  it('reads one left or right per tilt and needs the head upright again in between', () => {
    const t = new TiltReader()
    const lean = (v: number, n: number) => Array.from({ length: n }, () => t.read(v))
    // A head already tilted when tracking starts does nothing until it has been upright.
    expect(lean(0.4, 6)).not.toContain('right')
    t.read(0)
    expect(lean(0.4, 5)).toEqual([null, null, null, 'right', null])
    expect(lean(-0.4, 5).includes('left')).toBe(false)
    t.read(0)
    expect(lean(-0.4, 5)).toContain('left')
  })
})
