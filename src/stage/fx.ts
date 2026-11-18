import type { EffectName } from '@/audio/engine'
import type { Item } from '@/model/score'
import { LEAD_INK, drawBlob, drawLine, type Rect } from './draw'
import type { DrumGrid } from '@/model/score'

const WHITE = 'oklch(0.995 0.005 345)'

/** How long an effect's animation takes to creep in, and to fade back out, in seconds. */
const RISE = 1.2
const FALL = 0.7

interface Particle {
  kind: 'bubble' | 'cloud' | 'spark' | 'block'
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

/**
 * The stage's reaction to the pedals. Each pedal has its own 2D animation, which creeps in as the
 * pedal is pressed and grows with its amount: rising bubbles for the filter, ghost copies of the
 * score for the echo, drifting clouds for the reverb, sparks for the drive and glitch blocks for
 * the crush. Everything is drawn in the booth's sticker style.
 */
export class FxLayer {
  /** How strongly each pedal's animation is showing, 0 to 1, eased toward its target. */
  readonly level: Record<EffectName, number> = { Filter: 0, Echo: 0, Reverb: 0, Drive: 0, Crush: 0 }
  private particles: Particle[] = []
  private due: Record<EffectName, number> = { Filter: 0, Echo: 0, Reverb: 0, Drive: 0, Crush: 0 }
  private blockClock = 0

  update(dt: number, effects: Partial<Record<EffectName, { x: number }>>, grid: Rect): void {
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
    this.particles = this.particles.filter((p) => p.age < p.life && p.y > y - 120)

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
      const alpha = level * (0.32 - k * 0.08)
      for (const item of items) {
        if (item.kind === 'line') drawLine(ctx, grid, item.points, LEAD_INK[item.lead], alpha)
        else if (item.kind === 'blob') {
          ctx.globalAlpha = alpha
          drawBlob(ctx, grid, item, 1, drumGrid)
          ctx.globalAlpha = 1
        }
      }
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
        ctx.fillStyle = p.color
        for (const [dx, dy, r] of [
          [0, 0, 1],
          [-0.55, 0.15, 0.7],
          [0.55, 0.12, 0.75],
        ]) {
          ctx.beginPath()
          ctx.arc(p.x + dx * p.size, p.y + dy * p.size, r * p.size * 0.6, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (p.kind === 'bubble') {
        const wobble = Math.sin(p.age * 3 + p.phase) * 14
        ctx.globalAlpha = 0.85 * fade * Math.max(0.3, this.level.Filter)
        ctx.beginPath()
        ctx.arc(p.x + wobble, p.y, p.size, 0, Math.PI * 2)
        ctx.lineWidth = 4
        ctx.strokeStyle = WHITE
        ctx.stroke()
        ctx.lineWidth = 2.5
        ctx.strokeStyle = p.color
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(p.x + wobble - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.18, 0, Math.PI * 2)
        ctx.fillStyle = WHITE
        ctx.fill()
      }
    }
    ctx.restore()
  }

  /** Sparks and glitch blocks, drawn over the score. */
  drawFront(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    for (const p of this.particles) {
      if (p.kind === 'spark') {
        ctx.globalAlpha = Math.min(1, (p.life - p.age) / 0.4) * Math.max(0.4, this.level.Drive)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.phase + p.age * 6)
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? p.size : p.size * 0.35
          const a = (i * Math.PI) / 4
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        }
        ctx.closePath()
        ctx.lineWidth = 3
        ctx.strokeStyle = WHITE
        ctx.stroke()
        ctx.fillStyle = p.color
        ctx.fill()
        ctx.restore()
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
