import { useEffect, useRef, type ReactNode } from 'react'
import { PEDAL_OPTIONS, type EffectName, type Engine, type Settings } from '@/audio/engine'
import { HAND_FEEL, MOUSE_FEEL, Pen, type Draft } from '@/input/pen'
import {
  BOTS,
  LEADS,
  STEPS,
  drumFromY,
  drumX,
  lineNear,
  lineSteps,
  type BotType,
  type Item,
  type LeadName,
  type Line,
  type Point,
} from '@/model/score'
import { Smoother, readHand, type Pose, type Touch } from '@/tracking/gestures'
import type { HandTracker } from '@/tracking/handTracker'
import {
  BOT_TINT,
  LEAD_INK,
  blobRadius,
  drawBlob,
  drawCursor,
  drawGlint,
  drawGrid,
  drawHand,
  drawLine,
  drawNoteNames,
  drawPad,
  drawPlayhead,
  drawSticker,
  drawTipLabels,
  drawTrail,
  drawWalker,
  stickerSheet,
  walkerHeight,
  type Rect,
} from './draw'

/** What a mouse or touch press does: draw, erase, or play the effects pad. */
export type Mode = 'draw' | 'erase' | 'effects'

export type Side = 'left' | 'right'

/** The four fingers that press against the thumb, in the order their variants and sounds are listed. */
const FINGERS: readonly Touch[] = ['index', 'middle', 'ring', 'pinky']
/** Which hands play pedals. With both, neither hand writes; the mouse still can. */
export type PedalHands = Side | 'both'

/** Frames a new gesture must hold on the effects hand before it changes pedal. */
const GESTURE_FRAMES = 3
/** How close a pointing fingertip must come to a line to change its sound. */
const POINT_REACH = 0.035
/** Pointing at empty space this long changes the sound for the next line. */
const POINT_HOLD_MS = 700

/** How far the eraser reaches, as a fraction of the grid's height. */
const ERASE_RADIUS = 0.06
const HAND_LOST_MS = 250
const FLASH_SECONDS = 0.09

interface StageProps {
  items: Item[]
  settings: Settings
  engine: Engine
  mode: Mode
  /** Which hand plays the effects. The other one writes. */
  effectsHand: PedalHands
  /** The pedal each hand is holding. A fist moves that hand on to the next one. */
  pedalBySide: Record<Side, EffectName>
  onCyclePedal: (side: Side) => void
  /** The pedal the mouse plays in effects mode. */
  mousePedal: EffectName
  hold: boolean
  stream: MediaStream | null
  tracker: HandTracker | null
  /** Place a stroke. A hand's pinch passes the sound of the finger it pinched with. */
  onPlace: (draft: Draft, lead?: LeadName) => void
  onErase: (at: Point, radius: number, aspect: number) => void
  /** Step one line to the next sound. */
  onRecolor: (lineId: number) => void
  /** Step the sound that new lines get. */
  onNextPen: () => void
  children?: ReactNode
}

interface HandSlot {
  role: 'write' | 'effects' | null
  pen: Pen
  /** Smooths the effects hand's twist. */
  st: Smoother
  sx: Smoother
  sy: Smoother
  /** The pose as read this frame. */
  pose: Pose
  /** Whether the hand is pinching, after the debounce. */
  pinching: boolean
  pinchFrames: number
  openFrames: number
  /** Whether this hand is pressing the effects pad. */
  padding: boolean
  point: Point | null
  wrist: Point | null
  /** The 21 keypoints in stage pixels, for the robot hand drawn over the player's own. */
  joints: Point[]
  lastSeen: number
  /** Robots this hand is touching, so a bump sounds once on contact rather than every frame. */
  touching: Set<number>
  /** The finger pressed to the thumb: on the effects hand it picks the pedal's variant, on the writing hand the sound. */
  gesture: Touch | null
  pending: Touch | null | undefined
  pendingFrames: number
  /** The fingertip pressed to the thumb last frame, so the press has some stickiness. */
  touch: Touch | null
  /** The fingertips and palm in grid fractions, for labelling each finger. */
  tips: Record<Touch, Point> | null
  palm: Point | null
  side: Side
  /** Frames in a row showing a fist, so a fist on the effects hand moves on one pedal, once. */
  fistFrames: number
  /** The sound this hand's current stroke is drawing with. */
  lead: LeadName
  /** The pedal this hand is pressing, and its last reading. */
  pedal: EffectName | null
  pedalAt: { x: number; y: number }
  /** On the writing hand: frames spent pointing, the line under the fingertip, and since when it has pointed at nothing. */
  pointFrames: number
  pointLine: number | null
  pointIdleSince: number | null
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
    const flashing = (id: number) => {
      const at = hits.get(id)
      const clock = live.current.engine.now
      return at !== undefined && clock >= at && clock < at + FLASH_SECONDS && !still.matches
    }

    const slots: HandSlot[] = [0, 1].map(() => ({
      role: null,
      pen: new Pen(aspect, HAND_FEEL),
      st: new Smoother(1, 0.01),
      sx: new Smoother(),
      sy: new Smoother(),
      pose: 'open',
      pinching: false,
      pinchFrames: 0,
      openFrames: 0,
      padding: false,
      point: null,
      wrist: null,
      joints: [],
      lastSeen: 0,
      touching: new Set(),
      gesture: null,
      pending: undefined,
      pendingFrames: 0,
      touch: null,
      tips: null,
      palm: null,
      side: 'right' as Side,
      fistFrames: 0,
      lead: 'Supersaw' as LeadName,
      pedal: null,
      pedalAt: { x: 0.5, y: 0.5 },
      pointFrames: 0,
      pointLine: null,
      pointIdleSince: null,
    }))

    /** Where each pressed pedal is drawn, in grid fractions. */
    const marks = new Map<EffectName, Point>()
    const pedal = (name: EffectName, value: { x: number; y: number }, mark: Point, option = 0, twist = 0.5) => {
      live.current.engine.setEffect(name, value.x, value.y, true, option, twist)
      marks.set(name, mark)
    }
    const letGo = (name: EffectName, value: { x: number; y: number }) => {
      if (live.current.hold) return
      live.current.engine.setEffect(name, value.x, value.y, false)
    }

    // One tinted sticker sheet of the walk cycle per kind of robot.
    const sheets = new Map<BotType, HTMLCanvasElement>()
    const strip = new Image()
    strip.onload = () => {
      for (const bot of BOTS) sheets.set(bot, stickerSheet(strip, 8, BOT_TINT[bot]))
    }
    strip.src = '/sprites/stilt-walk.webp'

    let parts: HTMLCanvasElement | null = null
    const partsStrip = new Image()
    partsStrip.onload = () => {
      parts = stickerSheet(partsStrip, 5)
    }
    partsStrip.src = '/sprites/stilt-parts.webp'
    let lastVideoTime = -1

    const mouse = {
      pen: new Pen(aspect, MOUSE_FEEL),
      point: null as Point | null,
      erasing: false,
      padding: false,
    }

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
      const right = narrow ? 42 : 52
      grid = { x: left, y: 12, w: Math.max(1, width - left - right), h: Math.max(1, height - 24) }
      live.current.engine.setAspect(aspect())
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

    const place = (draft: Draft | null, lead?: LeadName) => {
      if (draft) live.current.onPlace(draft, lead)
    }
    const erase = (at: Point) => live.current.onErase(at, ERASE_RADIUS, aspect())

    /** The robot under a grid point, if any. Robots are drawn standing on their point. */
    const robotAt = (p: Point): number | undefined => {
      const { items, engine } = live.current
      const reach = walkerHeight(grid) * 0.38
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        if (item.kind !== 'walker') continue
        const at = engine.botPoint(item.id) ?? item
        if (Math.hypot((p.x - at.x) * grid.w, (p.y - at.y) * grid.h) <= reach) return item.id
      }
      return undefined
    }

    /** A press begins: what it does depends on the mode. */
    const press = (pen: Pen, p: Point, now: number): 'pen' | 'pad' | 'erase' => {
      const mode = live.current.mode
      if (mode === 'effects') {
        pedal(live.current.mousePedal, p, p)
        return 'pad'
      }
      if (mode === 'erase') {
        erase(p)
        return 'erase'
      }
      pen.down(p, now)
      return 'pen'
    }

    const releasePad = (p: Point) => letGo(live.current.mousePedal, p)

    /** Let go of whatever this hand was doing: finish its stroke and release its pedal. */
    const drop = (slot: HandSlot, now: number) => {
      if (slot.pen.active) place(slot.pen.up(now), slot.lead)
      if (slot.pedal) letGo(slot.pedal, slot.pedalAt)
      slot.pedal = null
      slot.gesture = null
      slot.pending = undefined
      slot.pendingFrames = 0
      slot.touch = null
      slot.tips = null
      slot.palm = null
      slot.fistFrames = 0
      slot.pinching = false
      slot.pinchFrames = 0
      slot.openFrames = 0
      slot.padding = false
      slot.st.reset()
    }

    const forget = (slot: HandSlot, now: number) => {
      drop(slot, now)
      slot.role = null
      slot.pinching = false
      slot.pinchFrames = 0
      slot.openFrames = 0
      slot.point = null
      slot.wrist = null
      slot.joints = []
      slot.pose = 'open'
      slot.touching.clear()
      slot.sx.reset()
      slot.sy.reset()
    }

    const trackHands = (now: number) => {
      const { tracker, stream, engine } = live.current
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
          const reading = readHand(hand.landmarks, videoAspect, slot.pinching ? 'pinch' : slot.pose, slot.touch)
          const px = fromVideo(reading.point)
          const point = toGrid(slot.sx.next(px.x, now), slot.sy.next(px.y, now))
          slot.wrist = wrist
          slot.joints = hand.landmarks.map(fromVideo)
          slot.lastSeen = now
          slot.point = point
          slot.pose = reading.pose

          // Which hand is this? Trust the model; failing that, the side of the screen it is on.
          const palmPx = fromVideo(reading.palm)
          const side: Side = hand.side ?? (palmPx.x < width / 2 ? 'left' : 'right')
          const pedals = live.current.effectsHand
          const role = pedals === 'both' || side === pedals ? 'effects' : 'write'
          if (slot.role !== role) {
            drop(slot, now)
            slot.role = role
          }
          slot.side = side
          slot.touch = reading.touch
          const toStage = (p: Point) => {
            const at = fromVideo(p)
            return toGrid(at.x, at.y)
          }
          slot.tips = {
            index: toStage(reading.tips.index),
            middle: toStage(reading.tips.middle),
            ring: toStage(reading.tips.ring),
            pinky: toStage(reading.tips.pinky),
          }
          slot.palm = toGrid(palmPx.x, palmPx.y)

          // Which finger is pressed to the thumb. A change must hold a few frames before it counts,
          // so one flickering frame neither starts nor ends anything.
          const press = reading.touch
          if (press === slot.gesture) {
            slot.pending = undefined
            slot.pendingFrames = 0
          } else if (press === slot.pending) {
            slot.pendingFrames++
          } else {
            slot.pending = press
            slot.pendingFrames = 1
          }
          if (slot.pending !== undefined && slot.pendingFrames >= GESTURE_FRAMES) {
            slot.gesture = slot.pending
            slot.pending = undefined
            slot.pendingFrames = 0
          }

          if (role === 'effects') {
            // A fist moves this hand on to its next pedal, once per fist.
            slot.fistFrames = reading.pose === 'fist' ? slot.fistFrames + 1 : 0
            if (slot.fistFrames === GESTURE_FRAMES) live.current.onCyclePedal(side)
            const name = live.current.pedalBySide[side]
            if (slot.pedal && (slot.pedal !== name || !slot.gesture)) {
              letGo(slot.pedal, slot.pedalAt)
              slot.pedal = null
            }
            if (slot.gesture) {
              // Played like an XY pad: across is the amount, up is the pedal's main move, the finger
              // picks its variant and twist is one extra.
              slot.pedal = name
              slot.pedalAt = { x: point.x, y: point.y }
              const twist = clamp01((slot.st.next(reading.twist, now) + 1) / 2)
              pedal(name, slot.pedalAt, point, FINGERS.indexOf(slot.gesture), twist)
            }
            continue
          }

          // Touching a robot bumps it, once per contact.
          const touched = robotAt(point)
          if (touched !== undefined && !slot.touching.has(touched)) engine.hit(touched)
          slot.touching = new Set(touched === undefined ? [] : [touched])

          // A finger pressed to the thumb draws, in that finger's sound. The pinch point is midway
          // between the thumb and that fingertip.
          const at = slot.gesture
            ? toStage({
                x: (reading.thumb.x + reading.tips[slot.gesture].x) / 2,
                y: (reading.thumb.y + reading.tips[slot.gesture].y) / 2,
              })
            : point
          if (!slot.pinching && slot.gesture) {
            slot.pinching = true
            slot.lead = LEADS[FINGERS.indexOf(slot.gesture)]
            if (live.current.mode === 'erase') erase(at)
            else slot.pen.down(at, now)
          } else if (slot.pinching && !slot.gesture) {
            slot.pinching = false
            if (slot.pen.active) place(slot.pen.up(now), slot.lead)
          } else if (slot.pinching) {
            if (slot.pen.active) slot.pen.move(at, now)
            else if (live.current.mode === 'erase') erase(at)
          }
          if (slot.pinching) slot.point = at
          if (!slot.pinching && reading.pose === 'fist') erase(point)

          // Pointing at a line steps it to the next sound; pointing at nothing for a moment steps the pen.
          slot.pointFrames = !slot.pinching && reading.pose === 'point' ? slot.pointFrames + 1 : 0
          if (slot.pointFrames >= GESTURE_FRAMES) {
            const line = lineNear(live.current.items, point, POINT_REACH, aspect())
            if (line) {
              if (slot.pointLine !== line.id) live.current.onRecolor(line.id)
              slot.pointLine = line.id
              slot.pointIdleSince = null
            } else {
              slot.pointLine = null
              slot.pointIdleSince ??= now
              if (now - slot.pointIdleSince >= POINT_HOLD_MS) {
                live.current.onNextPen()
                slot.pointIdleSince = now
              }
            }
          } else {
            slot.pointLine = null
            slot.pointIdleSince = null
          }
        }
      }
      for (const slot of slots) {
        if (slot.point && (!ready || now - slot.lastSeen > HAND_LOST_MS)) forget(slot, now)
      }
    }

    const render = (now: number) => {
      const { items, settings, engine, mode } = live.current
      ctx.clearRect(0, 0, width, height)
      drawGrid(ctx, grid)

      const position = engine.position()
      const step = position === null ? -1 : Math.min(STEPS - 1, Math.floor(position * STEPS))
      const rest = position === null ? 1 : 0.84
      const glints: Point[] = []

      // Robots walk under what the player placed, so placed ink always stays readable.
      const tall = walkerHeight(grid)
      // The singers' trails go under every robot, so a robot never hides behind another's ribbon.
      for (const item of items) {
        if (item.kind === 'walker' && item.bot === 'singer') {
          drawTrail(ctx, grid, engine.botPath(item.id), 'oklch(0.8 0.15 185)')
        }
      }
      for (const item of items) {
        if (item.kind !== 'walker') continue
        const sheet = sheets.get(item.bot)
        if (!sheet) continue
        const pose = engine.botPose(item.id)
        drawWalker(
          ctx,
          sheet,
          grid.x + (pose?.x ?? item.x) * grid.w,
          grid.y + (pose?.y ?? item.y) * grid.h,
          // A small lift when a robot does something, not a jump.
          tall * (flashing(item.id) ? 1.08 : 1),
          pose?.frame ?? 0,
          pose?.facing ?? 1,
        )
      }

      for (const item of items) {
        if (item.kind !== 'line') continue
        const y = step >= 0 ? stepsOf(item)[step] : null
        const sounding = y !== null && y !== undefined && position !== null
        // A sounding line swells for the first half of every step, in one jump.
        const onBeat = sounding && !still.matches && (position * STEPS) % 1 < 0.5
        drawLine(ctx, grid, item.points, LEAD_INK[item.lead], sounding ? 1 : rest, onBeat ? 1.45 : 1)
        if (onBeat) glints.push({ x: grid.x + position * grid.w, y: grid.y + y * grid.h })
      }
      for (const item of items) {
        if (item.kind !== 'blob') continue
        drawBlob(ctx, grid, item, flashing(item.id) ? 1.35 : 1, settings.drumGrid)
      }
      drawNoteNames(ctx, grid, settings.key, settings.scale, 15)

      const drafts: [Draft | null, LeadName][] = [
        [mouse.pen.draft(now), settings.lead],
        ...slots.map((s): [Draft | null, LeadName] => [s.pen.draft(now), s.lead]),
      ]
      for (const [draft, lead] of drafts) {
        if (!draft) continue
        if (draft.kind === 'line') drawLine(ctx, grid, draft.points, LEAD_INK[lead], 0.9)
        else
          drawSticker(
            ctx,
            drumFromY(draft.y),
            grid.x + drumX(draft.x, settings.drumGrid) * grid.w,
            grid.y + draft.y * grid.h,
            blobRadius(grid, draft.size),
          )
      }

      if (position !== null) drawPlayhead(ctx, grid, position)
      for (const g of glints) drawGlint(ctx, g.x, g.y, 18)

      // Every pedal that is pressed or held shows where it is being played.
      for (const [name, value] of Object.entries(engine.effects) as [EffectName, { x: number; y: number; detail: string }][]) {
        drawPad(ctx, grid, marks.get(name) ?? value, `${name} ${value.detail}`, value.x)
      }

      const reach = ERASE_RADIUS * grid.h
      for (const slot of slots) {
        if (!slot.point) continue
        drawHand(ctx, slot.joints, parts)
        if (slot.role === 'effects' && slot.tips && slot.palm) {
          const name = live.current.pedalBySide[slot.side]
          drawTipLabels(ctx, grid, slot.tips, PEDAL_OPTIONS[name], slot.gesture, slot.palm, name)
          continue
        }
        if (slot.role === 'write' && slot.tips && !slot.pen.active) {
          drawTipLabels(ctx, grid, slot.tips, LEADS, slot.gesture, null, null, LEADS.map((l) => LEAD_INK[l]))
        }
        if (slot.role !== 'write') continue
        const kind =
          slot.pose === 'fist' || (slot.pinching && mode === 'erase')
            ? 'erase'
            : slot.pinching
              ? 'draw'
              : slot.pointFrames >= GESTURE_FRAMES
                ? 'point'
                : 'hover'
        drawCursor(ctx, grid.x + slot.point.x * grid.w, grid.y + slot.point.y * grid.h, kind, reach, LEAD_INK[settings.lead])
      }
      if (mouse.point && (mode === 'erase' || mouse.erasing)) {
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
      const { mode, engine } = live.current
      // Alt-clicking a line steps it to the next sound.
      if (mode === 'draw' && e.altKey) {
        const line = lineNear(live.current.items, p, POINT_REACH, aspect())
        if (line) {
          live.current.onRecolor(line.id)
          return
        }
      }
      // Clicking a robot bumps it, unless there is placed ink right there to draw against.
      const onInk = lineNear(live.current.items, p, POINT_REACH, aspect())
      const bumped = mode === 'draw' && !onInk ? robotAt(p) : undefined
      if (bumped !== undefined) {
        engine.hit(bumped)
        return
      }
      if (e.button === 2) {
        mouse.erasing = true
        erase(p)
        return
      }
      const did = press(mouse.pen, p, performance.now())
      mouse.erasing = did === 'erase'
      mouse.padding = did === 'pad'
    }
    const move = (e: PointerEvent) => {
      if (!e.isPrimary) return
      const p = local(e)
      mouse.point = p
      if (mouse.erasing) erase(p)
      else if (mouse.padding) pedal(live.current.mousePedal, p, p)
      else if (mouse.pen.active) mouse.pen.move(p, performance.now())
    }
    const up = (e: PointerEvent) => {
      if (!e.isPrimary) return
      if (mouse.erasing) mouse.erasing = false
      else if (mouse.padding) {
        mouse.padding = false
        releasePad(local(e))
      } else if (mouse.pen.active) place(mouse.pen.up(performance.now()))
    }
    const leave = () => {
      if (!mouse.pen.active && !mouse.erasing && !mouse.padding) mouse.point = null
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
      {props.stream && (
        <>
          {/* Booth exposure: screen a pink over the shot so shadows lift to pink, then a thin veil. */}
          <div aria-hidden="true" className="absolute inset-0 bg-[oklch(0.8_0.11_335)] mix-blend-screen" />
          <div aria-hidden="true" className="absolute inset-0 bg-background/25" />
        </>
      )}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Loop grid. Left to right is time, height is pitch."
        className={`absolute inset-0 size-full touch-none ${props.mode === 'draw' ? 'cursor-crosshair' : 'cursor-none'}`}
      />
      {props.children}
    </div>
  )
}
