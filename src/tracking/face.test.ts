import { describe, expect, it } from 'vitest'
import { WinkReader, mouthOpen } from './face'

describe('WinkReader', () => {
  it('fires once for a held wink, and again only after the eyes reopen', () => {
    const r = new WinkReader()
    const seen = [r.read(0.9, 0.05), r.read(0.9, 0.05), r.read(0.9, 0.05), r.read(0.9, 0.05)]
    expect(seen).toEqual([null, null, 'left', null])
    r.read(0.05, 0.05)
    expect([r.read(0.05, 0.9), r.read(0.05, 0.9), r.read(0.05, 0.9)]).toEqual([null, null, 'right'])
  })

  it('never counts a blink of both eyes, or a twitch shorter than the hold', () => {
    const r = new WinkReader()
    for (let i = 0; i < 6; i++) expect(r.read(0.9, 0.9)).toBe(null)
    expect([r.read(0.9, 0.05), r.read(0.9, 0.05), r.read(0.05, 0.05)]).toEqual([null, null, null])
  })
})

describe('mouthOpen', () => {
  it('reads a closed mouth as zero and a wide one as one', () => {
    expect(mouthOpen(0.05)).toBe(0)
    expect(mouthOpen(0.7)).toBe(1)
    expect(mouthOpen(0.35)).toBeGreaterThan(0.4)
  })
})
