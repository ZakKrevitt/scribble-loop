import {
  DRUMS,
  ROWS,
  STEPS,
  drumFromY,
  midiForRow,
  noteName,
  type Blob,
  type Drum,
  type KeyName,
  type Point,
  type ScaleName,
} from '@/model/score'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const PLUM = 'oklch(0.27 0.09 340)'
const WHITE = 'oklch(0.995 0.005 345)'
const SHADOW = 'oklch(0.27 0.09 340 / 0.35)'

/** Pen colours for melody lines, taken in turn. */
export const INKS = [
  'oklch(0.68 0.25 357)',
  'oklch(0.8 0.15 185)',
  'oklch(0.9 0.17 98)',
  'oklch(0.66 0.21 305)',
]

export const DRUM_INK: Record<Drum, string> = {
  kick: 'oklch(0.62 0.24 22)',
  snare: 'oklch(0.9 0.17 98)',
  clap: 'oklch(0.72 0.22 352)',
  pop: 'oklch(0.8 0.15 185)',
  zap: 'oklch(0.68 0.18 255)',
  hat: 'oklch(0.78 0.17 62)',
}

export const FONT = "'M PLUS Rounded 1c', ui-rounded, system-ui, sans-serif"

const toPx = (r: Rect, p: Point): Point => ({ x: r.x + p.x * r.w, y: r.y + p.y * r.h })

/** The outline of each drum's sticker, in a box from -1 to 1. */
function stickerPath(ctx: CanvasRenderingContext2D, drum: Drum): void {
  ctx.beginPath()
  switch (drum) {
    case 'kick':
      ctx.arc(0, 0, 1, 0, Math.PI * 2)
      break
    case 'snare':
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? 1.08 : 0.5
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
      }
      ctx.closePath()
      break
    case 'clap':
      ctx.moveTo(0, 0.95)
      ctx.bezierCurveTo(-1.5, -0.1, -0.75, -1.15, 0, -0.42)
      ctx.bezierCurveTo(0.75, -1.15, 1.5, -0.1, 0, 0.95)
      ctx.closePath()
      break
    case 'pop':
      ctx.arc(0, 0, 1, 0, Math.PI * 2)
      ctx.moveTo(0.42, 0)
      ctx.arc(0, 0, 0.42, 0, Math.PI * 2, true)
      break
    case 'zap':
      ctx.moveTo(0.3, -1.1)
      ctx.lineTo(-0.7, 0.15)
      ctx.lineTo(-0.05, 0.15)
      ctx.lineTo(-0.3, 1.1)
      ctx.lineTo(0.7, -0.2)
      ctx.lineTo(0.05, -0.2)
      ctx.closePath()
      break
    case 'hat':
      ctx.moveTo(0, -1.15)
      ctx.quadraticCurveTo(0.16, -0.16, 1.15, 0)
      ctx.quadraticCurveTo(0.16, 0.16, 0, 1.15)
      ctx.quadraticCurveTo(-0.16, 0.16, -1.15, 0)
      ctx.quadraticCurveTo(-0.16, -0.16, 0, -1.15)
      ctx.closePath()
      break
  }
}

export function drawSticker(
  ctx: CanvasRenderingContext2D,
  drum: Drum,
  x: number,
  y: number,
  radius: number,
  alpha = 1,
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.scale(radius, radius)
  ctx.lineJoin = 'round'
  stickerPath(ctx, drum)
  ctx.shadowColor = SHADOW
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 0.62
  ctx.stroke()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = DRUM_INK[drum]
  ctx.fill('evenodd')
  ctx.restore()
}

export function blobRadius(grid: Rect, size: number): number {
  return Math.max(9 + 5 * size, (0.016 + 0.026 * size) * Math.min(grid.h, grid.w * 0.7))
}

export function drawBlob(ctx: CanvasRenderingContext2D, grid: Rect, blob: Blob, scale: number): void {
  const p = toPx(grid, blob)
  drawSticker(ctx, drumFromY(blob.y), p.x, p.y, blobRadius(grid, blob.size) * scale)
}

const FRAME = 256
export const WALK_FRAMES = 12

/**
 * Turn the rendered walk cycle into booth stickers: each frame tinted plum with a white cut edge.
 * The source is a strip of square frames, the AnyMachine Stilt walking in place, seen from the side.
 */
export function stickerSheet(strip: HTMLImageElement, edge = 8): HTMLCanvasElement {
  const tinted = document.createElement('canvas')
  tinted.width = strip.naturalWidth
  tinted.height = strip.naturalHeight
  const t = tinted.getContext('2d')!
  t.drawImage(strip, 0, 0)
  t.globalCompositeOperation = 'source-atop'
  t.fillStyle = 'oklch(0.38 0.15 340 / 0.62)'
  t.fillRect(0, 0, tinted.width, tinted.height)

  const sheet = document.createElement('canvas')
  sheet.width = tinted.width
  sheet.height = tinted.height
  const c = sheet.getContext('2d')!
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    c.drawImage(strip, Math.cos(a) * edge, Math.sin(a) * edge)
  }
  c.globalCompositeOperation = 'source-in'
  c.fillStyle = WHITE
  c.fillRect(0, 0, sheet.width, sheet.height)
  c.globalCompositeOperation = 'source-over'
  c.drawImage(tinted, 0, 0)
  return sheet
}

export function walkerHeight(grid: Rect): number {
  return Math.max(44, Math.min(150, grid.h * 0.2, grid.w * 0.24))
}

export function drawWalker(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  x: number,
  y: number,
  height: number,
  frame: number,
  facing: 1 | -1,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(facing, 1)
  ctx.shadowColor = SHADOW
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3
  ctx.drawImage(sheet, (frame % WALK_FRAMES) * FRAME, 0, FRAME, FRAME, -height / 2, -height / 2, height, height)
  ctx.restore()
}

/** Finger bones, a bar across the knuckles and one strut to the wrist. No webbing over the palm. */
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
  [0, 9],
] as const

const SEGMENT = { x: 0, w: 512, h: 128 }
const CAP = { x: 512, w: 128, h: 128 }

/**
 * A robot hand laid over the player's own. Each bone is a limb segment of the AnyMachine Stilt
 * stretched between two tracked joints, with one of its knee caps on every joint.
 * `parts` is the sticker sheet made from the parts strip: segment on the left, cap on the right.
 */
export function drawHand(ctx: CanvasRenderingContext2D, joints: Point[], parts: HTMLCanvasElement | null): void {
  if (!parts || joints.length < 21) return
  const size = Math.hypot(joints[0].x - joints[9].x, joints[0].y - joints[9].y)
  const girth = Math.max(9, Math.min(26, size * 0.13))
  ctx.save()
  ctx.shadowColor = SHADOW
  ctx.shadowBlur = 5
  ctx.shadowOffsetY = 2
  for (const [a, b] of BONES) {
    const dx = joints[b].x - joints[a].x
    const dy = joints[b].y - joints[a].y
    ctx.save()
    ctx.translate(joints[a].x, joints[a].y)
    ctx.rotate(Math.atan2(dy, dx))
    ctx.drawImage(parts, SEGMENT.x, 0, SEGMENT.w, SEGMENT.h, 0, -girth / 2, Math.hypot(dx, dy), girth)
    ctx.restore()
  }
  const cap = girth * 0.85
  for (const joint of joints) {
    ctx.drawImage(parts, CAP.x, 0, CAP.w, CAP.h, joint.x - cap / 2, joint.y - cap / 2, cap, cap)
  }
  ctx.restore()
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  grid: Rect,
  points: Point[],
  ink: string,
  alpha: number,
  /** Above 1 while the line is sounding, so it swells on the beat. */
  swell = 1,
): void {
  if (points.length === 0) return
  const width = Math.max(5, Math.min(9, grid.h / 75)) * swell
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const first = toPx(grid, points[0])
  ctx.moveTo(first.x, first.y)
  if (points.length === 1) ctx.lineTo(first.x + 0.01, first.y)
  for (let i = 1; i < points.length; i++) {
    const p = toPx(grid, points[i])
    ctx.lineTo(p.x, p.y)
  }
  ctx.shadowColor = SHADOW
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3
  ctx.strokeStyle = WHITE
  ctx.lineWidth = width * 2.1
  ctx.stroke()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = ink
  ctx.lineWidth = width
  ctx.stroke()
  ctx.restore()
}

/** A four-point glint, drawn where the playhead meets a sounding line. */
export function drawGlint(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(radius, radius)
  stickerPath(ctx, 'hat')
  ctx.fillStyle = WHITE
  ctx.shadowColor = SHADOW
  ctx.shadowBlur = 6
  ctx.fill()
  ctx.restore()
}

export function drawGrid(ctx: CanvasRenderingContext2D, grid: Rect): void {
  ctx.save()
  // Registration ticks at every beat and row, dots between.
  for (let s = 0; s <= STEPS; s++) {
    const x = grid.x + (s / STEPS) * grid.w
    const beat = s % 4 === 0
    const bar = s % 16 === 0
    for (let r = 0; r <= ROWS; r++) {
      const y = grid.y + (r / ROWS) * grid.h
      if (beat) {
        const arm = bar ? 6 : 4
        ctx.strokeStyle = bar ? 'oklch(0.27 0.09 340 / 0.55)' : 'oklch(0.27 0.09 340 / 0.38)'
        ctx.lineWidth = bar ? 1.5 : 1
        ctx.beginPath()
        ctx.moveTo(x - arm, y)
        ctx.lineTo(x + arm, y)
        ctx.moveTo(x, y - arm)
        ctx.lineTo(x, y + arm)
        ctx.stroke()
      } else {
        ctx.fillStyle = 'oklch(0.27 0.09 340 / 0.3)'
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Drum stickers down the left edge, one per lane.
  const lane = grid.h / DRUMS.length
  const iconRadius = Math.min(11, lane * 0.22, grid.x * 0.26)
  DRUMS.forEach((drum, i) => {
    const y = grid.y + grid.h - (i + 0.5) * lane
    drawSticker(ctx, drum, grid.x / 2, y, iconRadius)
  })
  ctx.strokeStyle = 'oklch(0.27 0.09 340 / 0.45)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 1; i < DRUMS.length; i++) {
    const y = grid.y + grid.h - i * lane
    ctx.moveTo(4, y)
    ctx.lineTo(grid.x - 8, y)
  }
  ctx.stroke()
  ctx.restore()
}

/** Note names down the right edge, one per row, with a white edge so they hold over any camera image. */
export function drawNoteNames(
  ctx: CanvasRenderingContext2D,
  grid: Rect,
  key: KeyName,
  scale: ScaleName,
  size: number,
): void {
  ctx.save()
  ctx.font = `700 ${size}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 4
  ctx.strokeStyle = WHITE
  ctx.fillStyle = PLUM
  const x = grid.x + grid.w + (ctx.canvas.clientWidth - grid.x - grid.w) / 2
  const row = grid.h / ROWS
  const every = row < size * 1.15 ? 2 : 1
  for (let r = 0; r < ROWS; r += every) {
    const y = grid.y + grid.h - (r + 0.5) * row
    const name = noteName(midiForRow(r, key, scale))
    ctx.strokeText(name, x, y)
    ctx.fillText(name, x, y)
  }
  ctx.restore()
}

export function drawPlayhead(ctx: CanvasRenderingContext2D, grid: Rect, position: number): void {
  const x = grid.x + position * grid.w
  ctx.save()
  ctx.fillStyle = 'oklch(0.27 0.09 340 / 0.5)'
  ctx.fillRect(x - 3.5, grid.y, 7, grid.h)
  ctx.fillStyle = WHITE
  ctx.fillRect(x - 2, grid.y, 4, grid.h)
  ctx.restore()
}

export type CursorKind = 'hover' | 'draw' | 'erase'

export function drawCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: CursorKind,
  eraseRadius: number,
): void {
  ctx.save()
  ctx.shadowColor = SHADOW
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  const ring = (radius: number) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
  }
  if (kind === 'erase') {
    ctx.setLineDash([9, 7])
    ring(eraseRadius)
    ctx.lineWidth = 7
    ctx.strokeStyle = WHITE
    ctx.stroke()
    ctx.shadowColor = 'transparent'
    ctx.lineWidth = 3
    ctx.strokeStyle = PLUM
    ctx.stroke()
  } else if (kind === 'draw') {
    ring(11)
    ctx.lineWidth = 5
    ctx.strokeStyle = WHITE
    ctx.stroke()
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = PLUM
    ctx.fill()
  } else {
    ring(19)
    ctx.lineWidth = 10
    ctx.strokeStyle = WHITE
    ctx.stroke()
    ctx.shadowColor = 'transparent'
    ctx.lineWidth = 4
    ctx.strokeStyle = PLUM
    ctx.stroke()
  }
  ctx.restore()
}
