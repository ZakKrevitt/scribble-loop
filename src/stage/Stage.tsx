import { useEffect, useRef, type ReactNode } from 'react'
import type { Engine, Settings } from '@/audio/engine'
import { Pen, type Draft } from '@/input/pen'
import { STEPS, drumFromY, lineSteps, type Item, type Line, type Point } from '@/model/score'
import { Smoother, readHand, type Pose } from '@/tracking/gestures'
import type { HandTracker } from '@/tracking/handTracker'
import {
  INKS,
  blobRadius,
  drawBlob,
  drawCursor,
  drawGlint,
  drawGrid,
  drawHand,
  drawLine,
  drawPlayhead,
  drawSticker,
  drawWalker,
  stickerSheet,
  walkerHeight,
  type Rect,
} from './draw'

export type Tool = 'draw' | 'erase'

/** How far the rubber reaches, as a fraction of the grid's height. */
const ERASE_RADIUS = 0.06
const HAND_LOST_MS = 250
const FLASH_SECONDS = 0.09

interface StageProps {
  items: Item[]
  settings: Settings
  engine: Engine
  tool: Tool
  stream: MediaStream | null
  tracker: HandTracker | null
  nextInk: number
  onPlace: (draft: Draft) => void
  onErase: (at: Point, radius: number, aspect: number) => void
  children?: ReactNode
}

interface HandSlot {
  pen: Pen
  sx: Smoother
  sy: Smoother
  pose: Pose
  point: Point | null
  wrist: Point | null
  /** The 21 keypoints in stage pixels, for the robot hand drawn over the player's own. */
  joints: Point[]
  lastSeen: number
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function Stage(props: StageProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const live = useRef(props)
  live.current = props

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = props.stream
    if (props.stream) void video.play().catch(() => {})
  }, [props.stream])

  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const video = videoRef.current!
    const ctx = canvas.getContext('2d')!
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')

    let grid: Rect = { x: 0, y: 0, w: 1, h: 1 }
    let width = 0
    let height = 0
    const aspect = () => grid.w / grid.h

    const stepsCache = new WeakMap<Line, (number | null)[]>()
    const stepsOf = (line: Line) => {
      let steps = stepsCache.get(line)
      if (!steps) {
        steps = lineSteps(line)
        stepsCache.set(line, steps)
      }
      return steps
    }

    const hits = new Map<number, number>()
    live.current.engine.onDrum = (id, time) => hits.set(id, time)

    const slots: HandSlot[] = [0, 1].map(() => ({
      pen: new Pen(aspect),
      sx: new Smoother(),
      sy: new Smoother(),
      pose: 'open',
      point: null,
      wrist: null,
      joints: [],
      lastSeen: 0,
    }))

    let robots: HTMLCanvasElement | null = null
    const strip = new Image()
    strip.onload = () => {
      robots = stickerSheet(strip)
    }
    strip.src = '/sprites/stilt-walk.webp'
    let lastVideoTime = -1

    const mouse = { pen: new Pen(aspect), point: null as Point | null, erasing: false }

    const layout = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (rect.width !== width || rect.height !== height) {
        width = rect.width
        height = rect.height
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const narrow = width < 640
      const left = narrow ? 34 : 52
      const right = narrow ? 34 : 46
      grid = { x: left, y: 12, w: Math.max(1, width - left - right), h: Math.max(1, height - 24) }
    }

    const toGrid = (px: number, py: number): Point => ({
      x: clamp01((px - grid.x) / grid.w),
      y: clamp01((py - grid.y) / grid.h),
    })

    /** Camera image fractions to stage pixels, matching the mirrored, cropped video on screen. */
    const fromVideo = (p: Point): Point => {
      const scale = Math.max(width / video.videoWidth, height / video.videoHeight)
      const dw = video.videoWidth * scale
      const dh = video.videoHeight * scale
      return { x: (width - dw) / 2 + (1 - p.x) * dw, y: (height - dh) / 2 + p.y * dh }
    }

    const place = (draft: Draft | null) => {
      if (draft) live.current.onPlace(draft)
    }
    const erase = (at: Point) => live.current.onErase(at, ERASE_RADIUS, aspect())

    const trackHands = (now: number) => {
      const { tracker, stream } = live.current
      const ready = tracker && stream && video.readyState >= 2 && video.videoWidth > 0
      if (ready && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime
        const hands = tracker.detect(video, now)
        const videoAspect = video.videoWidth / video.videoHeight
        const free = new Set(slots)
        for (const hand of hands.slice(0, slots.length)) {
          const wrist = hand.landmarks[0]
          let slot: HandSlot | null = null
          let best = Infinity
          for (const candidate of free) {
            const d = candidate.wrist ? Math.hypot(candidate.wrist.x - wrist.x, candidate.wrist.y - wrist.y) : 0.5
            if (d < best) {
              best = d
              slot = candidate
            }
          }
          if (!slot) continue
          free.delete(slot)
          const reading = readHand(hand.landmarks, videoAspect, slot.pose)
          const px = fromVideo(reading.point)
          const point = toGrid(slot.sx.next(px.x, now), slot.sy.next(px.y, now))
          slot.wrist = wrist
          slot.joints = hand.landmarks.map(fromVideo)
          slot.lastSeen = now
          slot.point = point

          if (reading.pose === 'pinch') {
            if (slot.pen.active) slot.pen.move(point)
            else slot.pen.down(point, now)
          } else {
            if (slot.pen.active) place(slot.pen.up(now))
            if (reading.pose === 'fist') erase(point)
          }
          slot.pose = reading.pose
        }
      }
      for (const slot of slots) {
        if (slot.point && (!ready || now - slot.lastSeen > HAND_LOST_MS)) {
          if (slot.pen.active) place(slot.pen.up(now))
          slot.point = null
          slot.wrist = null
          slot.joints = []
          slot.pose = 'open'
          slot.sx.reset()
          slot.sy.reset()
        }
      }
    }

    const render = (now: number) => {
      const { items, settings, engine, tool, nextInk } = live.current
      ctx.clearRect(0, 0, width, height)
      drawGrid(ctx, grid, settings.key, settings.scale, width < 640 ? 11 : 12)

      const position = engine.position()
      const step = position === null ? -1 : Math.min(STEPS - 1, Math.floor(position * STEPS))
      const rest = position === null ? 1 : 0.84
      const clock = engine.now
      const glints: Point[] = []

      for (const item of items) {
        if (item.kind !== 'line') continue
        const y = step >= 0 ? stepsOf(item)[step] : null
        drawLine(ctx, grid, item.points, INKS[item.ink % INKS.length], y === null || y === undefined ? rest : 1)
        if (y !== null && y !== undefined && position !== null && !still.matches) {
          if ((position * STEPS) % 1 < 0.5) glints.push({ x: grid.x + position * grid.w, y: grid.y + y * grid.h })
        }
      }
      for (const item of items) {
        if (item.kind !== 'blob') continue
        const hitAt = hits.get(item.id)
        const flashing = hitAt !== undefined && clock >= hitAt && clock < hitAt + FLASH_SECONDS
        drawBlob(ctx, grid, item, flashing && !still.matches ? 1.35 : 1)
      }
      if (robots) {
        const tall = walkerHeight(grid)
        for (const item of items) {
          if (item.kind !== 'walker') continue
          const state = engine.walker(item.id)
          const at = engine.walkerPoint(item.id) ?? item
          const hitAt = hits.get(item.id)
          const flashing = hitAt !== undefined && clock >= hitAt && clock < hitAt + FLASH_SECONDS
          drawWalker(
            ctx,
            robots,
            grid.x + at.x * grid.w,
            grid.y + at.y * grid.h,
            tall * (flashing && !still.matches ? 1.25 : 1),
            state?.moves ?? 0,
            state?.dir ?? 1,
          )
        }
      }

      const drafts: (Draft | null)[] = [mouse.pen.draft(now), ...slots.map((s) => s.pen.draft(now))]
      for (const draft of drafts) {
        if (!draft) continue
        if (draft.kind === 'line') drawLine(ctx, grid, draft.points, INKS[nextInk % INKS.length], 0.9)
        else
          drawSticker(
            ctx,
            drumFromY(draft.y),
            grid.x + draft.x * grid.w,
            grid.y + draft.y * grid.h,
            blobRadius(grid, draft.size),
          )
      }

      if (position !== null) drawPlayhead(ctx, grid, position)
      for (const g of glints) drawGlint(ctx, g.x, g.y, 11)

      const reach = ERASE_RADIUS * grid.h
      for (const slot of slots) {
        if (!slot.point) continue
        drawHand(ctx, slot.joints)
        const kind = slot.pose === 'fist' ? 'erase' : slot.pose === 'pinch' ? 'draw' : 'hover'
        drawCursor(ctx, grid.x + slot.point.x * grid.w, grid.y + slot.point.y * grid.h, kind, reach)
      }
      if (mouse.point && (tool === 'erase' || mouse.erasing)) {
        drawCursor(ctx, grid.x + mouse.point.x * grid.w, grid.y + mouse.point.y * grid.h, 'erase', reach)
      }
    }

    let raf = 0
    let seen = -1
    const frame = () => {
      const now = performance.now()
      layout()
      trackHands(now)
      render(now)
      const hands = slots.filter((s) => s.point).length
      if (hands !== seen) {
        seen = hands
        canvas.dataset.hands = String(hands)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const local = (e: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect()
      return toGrid(e.clientX - rect.left, e.clientY - rect.top)
    }
    const down = (e: PointerEvent) => {
      if (!e.isPrimary) return
      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      const p = local(e)
      mouse.point = p
      if (live.current.tool === 'erase' || e.button === 2) {
        mouse.erasing = true
        erase(p)
      } else {
        mouse.pen.down(p, performance.now())
      }
    }
    const move = (e: PointerEvent) => {
      if (!e.isPrimary) return
      const p = local(e)
      mouse.point = p
      if (mouse.erasing) erase(p)
      else if (mouse.pen.active) mouse.pen.move(p)
    }
    const up = (e: PointerEvent) => {
      if (!e.isPrimary) return
      if (mouse.erasing) mouse.erasing = false
      else if (mouse.pen.active) place(mouse.pen.up(performance.now()))
    }
    const leave = () => {
      if (!mouse.pen.active && !mouse.erasing) mouse.point = null
    }
    const menu = (e: Event) => e.preventDefault()

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('contextmenu', menu)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('contextmenu', menu)
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden bg-background">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        className={`absolute inset-0 size-full -scale-x-100 object-cover brightness-110 saturate-[1.15] ${props.stream ? '' : 'hidden'}`}
      />
      {props.stream && <div aria-hidden="true" className="absolute inset-0 bg-background/55" />}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Loop grid. Left to right is time, height is pitch."
        className={`absolute inset-0 size-full touch-none ${props.tool === 'erase' ? 'cursor-none' : 'cursor-crosshair'}`}
      />
      {props.children}
    </div>
  )
}
