import { pitchShift, type EffectName } from '@/audio/engine'
import type { Item } from '@/model/score'
import { LEAD_INK, drawBlob, drawLine, setShadows, type Rect } from './draw'
import type { DrumGrid } from '@/model/score'

const WHITE = 'oklch(0.995 0.005 345)'

/** How long an effect's animation takes to creep in, and to fade back out, in seconds. */
const RISE = 1.2
const FALL = 0.7

interface Particle {
  kind: 'bubble' | 'cloud' | 'spark' | 'block' | 'diamond'
  x: number
  y: number
  vx: number
  vy: number
  size: number
  age: number
  life: number
  phase: number
  color: string
}

const BUBBLE_INKS = ['oklch(0.8 0.15 185)', 'oklch(0.68 0.25 357)', 'oklch(0.86 0.17 92)']
const SPARK_INKS = ['oklch(0.78 0.17 62)', 'oklch(0.86 0.17 92)', 'oklch(0.62 0.24 22)']
const BLOCK_INKS = ['oklch(0.27 0.09 340)', 'oklch(0.68 0.25 357)', 'oklch(0.8 0.15 185)']

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

/** Sprites are drawn once at this size and stamped scaled, instead of drawn shape by shape each frame. */
const SPRITE = 64
const sprites = new Map<string, HTMLCanvasElement>()

/** A prerendered particle sprite: bubble, spark, diamond or cloud, in one colour. */
function sprite(kind: 'bubble' | 'spark' | 'diamond' | 'cloud', color: string): HTMLCanvasElement {
  const key = `${kind}|${color}`
  const cached = sprites.get(key)
  if (cached) return cached
  const c = document.createElement('canvas')
  c.width = c.height = SPRITE
  const g = c.getContext('2d')!
  const m = SPRITE / 2
  g.translate(m, m)
  if (kind === 'bubble') {
    const r = m - 5
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    g.lineWidth = 9
    g.strokeStyle = WHITE
    g.stroke()
    g.lineWidth = 5
    g.strokeStyle = color
    g.stroke()
    g.beginPath()
    g.arc(-r * 0.35, -r * 0.35, r * 0.18, 0, Math.PI * 2)
    g.fillStyle = WHITE
    g.fill()
  } else if (kind === 'spark') {
    const r = m - 5
    g.beginPath()
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 === 0 ? r : r * 0.35
      const a = (i * Math.PI) / 4
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    g.closePath()
    g.lineWidth = 7
    g.strokeStyle = WHITE
    g.stroke()
    g.fillStyle = color
    g.fill()
  } else if (kind === 'diamond') {
    const r = (m - 6) * 0.72
    g.rotate(Math.PI / 4)
    g.lineWidth = 7
    g.strokeStyle = WHITE
    g.strokeRect(-r, -r, 2 * r, 2 * r)
    g.fillStyle = color
    g.fillRect(-r, -r, 2 * r, 2 * r)
  } else {
    g.fillStyle = color
    for (const [dx, dy, rr] of [
      [0, 0, 0.5],
      [-0.33, 0.1, 0.36],
      [0.33, 0.08, 0.38],
    ]) {
      g.beginPath()
      g.arc(dx * SPRITE, dy * SPRITE, rr * SPRITE * 0.6, 0, Math.PI * 2)
      g.fill()
    }
  }
  sprites.set(key, c)
  return c
}

/**
 * The stage's reaction to the pedals. Each pedal has its own 2D animation, which creeps in as the
 * pedal is pressed and grows with its amount: rising bubbles for the filter, ghost copies of the
 * score for the echo, drifting clouds for the reverb, sparks for the drive and glitch blocks for
 * the crush. Everything is drawn in the booth's sticker style.
 */
export class FxLayer {
  /** How strongly each pedal's animation is showing, 0 to 1, eased toward its target. */
  readonly level: Record<EffectName, number> = { Filter: 0, Echo: 0, Reverb: 0, Drive: 0, Crush: 0, Pitch: 0 }
  private particles: Particle[] = []
  private due: Record<EffectName, number> = { Filter: 0, Echo: 0, Reverb: 0, Drive: 0, Crush: 0, Pitch: 0 }
  private blockClock = 0

  update(dt: number, effects: Partial<Record<EffectName, { x: number; y: number; option: number }>>, grid: Rect): void {
    for (const name of Object.keys(this.level) as EffectName[]) {
      const pressed = effects[name]
      // Even a light touch shows something; the amount takes it the rest of the way.
      const target = pressed ? 0.35 + 0.65 * pressed.x : 0
      const current = this.level[name]
      const rate = target > current ? dt / RISE : dt / FALL
      this.level[name] = current + Math.max(-rate, Math.min(rate, target - current))
    }

    const spawn = (name: EffectName, perSecond: number, make: () => Particle) => {
      this.due[name] += perSecond * this.level[name] * dt
      while (this.due[name] >= 1) {
        this.due[name] -= 1
        if (this.particles.length < 260) this.particles.push(make())
      }
    }
    const { x, y, w, h } = grid
    spawn('Filter', 14, () => ({
      kind: 'bubble',
      x: x + Math.random() * w,
      y: y + h + 20,
      vx: 0,
      vy: -(50 + Math.random() * 70),
      size: 6 + Math.random() * 16 * (0.5 + this.level.Filter),
      age: 0,
      life: 5,
      phase: Math.random() * Math.PI * 2,
      color: pick(BUBBLE_INKS),
    }))
    spawn('Reverb', 2.2, () => ({
      kind: 'cloud',
      x: x + Math.random() * w,
      y: y + h * (0.5 + Math.random() * 0.6),
      vx: (Math.random() - 0.5) * 12,
      vy: -(8 + Math.random() * 14),
      size: 40 + Math.random() * 70,
      age: 0,
      life: 7,
      phase: 0,
      color: 'oklch(0.66 0.21 305)',
    }))
    // Pitch: diamonds drift up when the shift heard is up and fall when it is down; none at no shift.
    const pressed = effects.Pitch
    const shift = pressed ? pitchShift(pressed.y, pressed.option) : 0
    const pitchUp = shift > 0
    spawn('Pitch', shift === 0 ? 0 : 10, () => ({
      kind: 'diamond',
      x: x + Math.random() * w,
      y: pitchUp ? y + h + 10 : y - 10,
      vx: 0,
      vy: (pitchUp ? -1 : 1) * (90 + Math.random() * 90),
      size: 5 + Math.random() * 6,
      age: 0,
      life: 4,
      phase: Math.random() * Math.PI,
      color: pick(BUBBLE_INKS),
    }))
    spawn('Drive', 26, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
      const speed = 160 + Math.random() * 260
      return {
        kind: 'spark',
        x: x + Math.random() * w,
        y: y + h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 7,
        age: 0,
        life: 1.1,
        phase: Math.random() * Math.PI,
        color: pick(SPARK_INKS),
      }
    })

    for (const p of this.particles) {
      p.age += dt
      if (p.kind === 'spark') p.vy += 420 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    this.particles = this.particles.filter((p) => p.age < p.life && p.y > y - 120 && p.y < y + h + 120)

    // Crush blocks are redrawn in steps, not eased, so they read as a broken picture.
    this.blockClock += dt
    if (this.blockClock > 0.09) {
      this.blockClock = 0
      this.particles = this.particles.filter((p) => p.kind !== 'block')
      const count = Math.round(this.level.Crush * 26)
      for (let i = 0; i < count; i++) {
        const size = 10 + Math.floor(Math.random() * 4) * 10
        this.particles.push({
          kind: 'block',
          x: x + Math.floor((Math.random() * w) / 10) * 10,
          y: y + Math.floor((Math.random() * h) / 10) * 10,
          vx: 0,
          vy: 0,
          size,
          age: 0,
          life: 0.12,
          phase: 0,
          color: pick(BLOCK_INKS),
        })
      }
    }
  }

  /** Ghost copies of the score, trailing right like repeats, under everything placed. */
  drawEchoes(ctx: CanvasRenderingContext2D, grid: Rect, items: Item[], drumGrid: DrumGrid): void {
    const level = this.level.Echo
    if (level < 0.02) return
    for (let k = 1; k <= 3; k++) {
      ctx.save()
      ctx.translate(k * 26 * level, 0)
      // Ghosts skip the soft shadow, which is the expensive part of drawing ink.
      setShadows(false)
      const alpha = level * (0.32 - k * 0.08)
      for (const item of items) {
        if (item.kind === 'line') drawLine(ctx, grid, item.points, LEAD_INK[item.lead], alpha)
        else if (item.kind === 'blob') drawBlob(ctx, grid, item, 1, drumGrid, alpha)
      }
      setShadows(true)
      ctx.restore()
    }
  }

  /** Clouds and bubbles, drawn behind the score. */
  drawBack(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    for (const p of this.particles) {
      const fade = Math.min(1, p.age / 0.6, (p.life - p.age) / 1.2)
      if (p.kind === 'cloud') {
        ctx.globalAlpha = 0.2 * fade * this.level.Reverb
        ctx.drawImage(sprite('cloud', p.color), p.x - p.size, p.y - p.size, p.size * 2, p.size * 2)
      } else if (p.kind === 'bubble') {
        const wobble = Math.sin(p.age * 3 + p.phase) * 14
        ctx.globalAlpha = 0.85 * fade * Math.max(0.3, this.level.Filter)
        const r = p.size * 1.15
        ctx.drawImage(sprite('bubble', p.color), p.x + wobble - r, p.y - r, r * 2, r * 2)
      }
    }
    ctx.restore()
  }

  /** Sparks, diamonds and glitch blocks, drawn over the score. */
  drawFront(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    for (const p of this.particles) {
      if (p.kind === 'spark' || p.kind === 'diamond') {
        const level = p.kind === 'spark' ? this.level.Drive : this.level.Pitch
        const tail = p.kind === 'spark' ? 0.4 : 0.8
        ctx.globalAlpha = Math.min(1, (p.life - p.age) / tail) * Math.max(0.4, level)
        const r = p.size * 1.3
        if (p.kind === 'spark') {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.phase + p.age * 6)
          ctx.drawImage(sprite('spark', p.color), -r, -r, r * 2, r * 2)
          ctx.restore()
        } else {
          ctx.drawImage(sprite('diamond', p.color), p.x - r, p.y - r, r * 2, r * 2)
        }
      } else if (p.kind === 'block') {
        ctx.globalAlpha = 0.55 * this.level.Crush
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }
    }
    ctx.restore()
  }

  /** Drive shakes the whole stage a little, harder as it rises. */
  shake(): { x: number; y: number } {
    const amount = this.level.Drive * 3
    return { x: (Math.random() - 0.5) * amount, y: (Math.random() - 0.5) * amount }
  }
}
