import { useEffect, useRef, type ReactNode } from 'react'
import { EFFECTS, PEDAL_OPTIONS, type EffectName, type Engine, type Settings } from '@/audio/engine'
import { HAND_FEEL, MOUSE_FEEL, Pen, type Draft } from '@/input/pen'
import {
  BOTS,
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
import { HandSmoother, Smoother, SwatReader, readHand, type Pose, type Touch } from '@/tracking/gestures'
import type { FaceTracker, HandTracker } from '@/tracking/handTracker'
import { MouthReader, TiltReader, WinkReader, mouthOpen, type FaceState, type Wink } from '@/tracking/face'
import { FxLayer } from './fx'
import { Recorder, type RecordState } from './recorder'
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
/** Which hands play pedals. With both, neither hand writes; the mouse still can. */
export type PedalHands = Side | 'both'

/**
 * What a hand or the mouse is doing right now. One state at a time: a hand cannot be drawing and
 * pressing a pedal at once, and every way out of a state goes through `finish` below.
 */
type Action = { kind: 'idle' } | { kind: 'draw' } | { kind: 'erase' } | { kind: 'pedal'; name: EffectName }
const IDLE: Action = { kind: 'idle' }

/** The four fingers that press against the thumb, in the order their pedal variants are listed. */
const FINGERS: readonly Touch[] = ['index', 'middle', 'ring', 'pinky']

/** Frames a new press must hold before it counts, so one flickering frame changes nothing. */
const GESTURE_FRAMES = 3
/** How close a pointing fingertip must come to a line to change its sound. */
const POINT_REACH = 0.035
/** Pointing at empty space this long changes the sound for the next line. */
const POINT_HOLD_MS = 700
/** A wrist that jumps this far between frames is a different hand, not the same one moving. */
const SWAPPED_HAND = 0.18
/** Frames the tracker must call a hand the other side before the hand switches roles. */
const SIDE_FRAMES = 10

/** How big each robot is drawn, against the walker. */
const BOT_SIZE: Record<BotType, number> = { swapper: 1, dropper: 0.95, bumper: 0.85, eater: 0.75, singer: 0.7 }

/** How far the eraser reaches, as a fraction of the grid's height. */
const ERASE_RADIUS = 0.06
const HAND_LOST_MS = 250
const FLASH_SECONDS = 0.09

interface StageProps {
  items: Item[]
  settings: Settings
  engine: Engine
  mode: Mode
  /** Which hands play pedals. Any other hand writes. */
  effectsHand: PedalHands
  /** The pedal each hand is holding. A fist moves that hand on to the next one. */
  pedalBySide: Record<Side, EffectName>
  onCyclePedal: (side: Side) => void
  /** The pedal the mouse plays in effects mode. */
  mousePedal: EffectName
  hold: boolean
  stream: MediaStream | null
  tracker: HandTracker | null
  /** Face controls: winks toggle chords and the arpeggiator, the mouth drops robots, a tilt picks one. */
  faceTracker: FaceTracker | null
  faceOn: boolean
  onWink: (eye: Wink) => void
  onPlace: (draft: Draft, lead?: LeadName) => void
  onErase: (at: Point, radius: number, aspect: number) => void
  /** Step one line to the next sound. */
  onRecolor: (lineId: number) => void
  /** The robot an open mouth drops, where the mouth is on the stage. Tilting the head picks it. */
  deployBot: BotType
  onDeploy: (at: Point, bot: BotType) => void
  onTilt: (side: Wink) => void
  /** Filled in with what the camera reads off the face, for the on-screen readout. */
  face: FaceState
  /** Step the sound that new lines get. */
  onNextPen: () => void
  /** A swat of an open hand: clear the board. */
  onSwat: () => void
  /** True while a clip is being recorded. */
  recording: boolean
  /** Called each second of a recording, then once with whether the clip was saved or failed. */
  onRecordProgress: (seconds: number, state: RecordState) => void
  children?: ReactNode
}

interface HandSlot {
  role: 'write' | 'effects' | null
  action: Action
  pen: Pen
  /** Smooths the effects hand's twist. */
  twist: Smoother
  smooth: HandSmoother
  swat: SwatReader
  pose: Pose
  /** Where the hand points, in grid fractions, or null when no hand is in this slot. */
  point: Point | null
  wrist: Point | null
  /** The 21 keypoints in stage pixels, for the robot hand drawn over the player's own. */
  joints: Point[]
  tips: Record<Touch, Point> | null
  palm: Point | null
  side: Side
  /** Frames in a row the tracker has called this hand the other side. */
  sideVotes: number
  lastSeen: number
  /** Robots this hand is touching, so a bump sounds once on contact rather than every frame. */
  touching: Set<number>
  /** The finger pressed to the thumb, after a few frames' agreement, and a different one waiting. */
  press: Touch | null
  pending: Touch | null | undefined
  pendingFrames: number
  /** The raw finger pressed last frame, so a press has some stickiness. */
  rawTouch: Touch | null
  fistFrames: number
  /** The sound this hand's current stroke is drawing with. */
  lead: LeadName
  /** The pedal's last reading, for letting go. */
  pedalAt: { x: number; y: number }
  pointFrames: number
  pointLine: number | null
  pointIdleSince: number | null
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** An offscreen canvas that is redrawn only when its key changes. */
class Layer {
  readonly canvas = document.createElement('canvas')
  readonly ctx = this.canvas.getContext('2d')!
  private key = ''

  /** Redraw through `paint` if `key` changed; returns the canvas either way. */
  get(key: string, w: number, h: number, dpr: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    const full = `${key}|${w}|${h}|${dpr}`
    if (full !== this.key) {
      this.key = full
      this.canvas.width = Math.round(w * dpr)
      this.canvas.height = Math.round(h * dpr)
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.ctx.clearRect(0, 0, w, h)
      paint(this.ctx)
    }
    return this.canvas
  }
}

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
    let dpr = 1
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

    const newSlot = (): HandSlot => ({
      role: null,
      action: IDLE,
      pen: new Pen(aspect, HAND_FEEL),
      twist: new Smoother(1, 0.01),
      smooth: new HandSmoother(),
      swat: new SwatReader(),
      pose: 'open',
      point: null,
      wrist: null,
      joints: [],
      tips: null,
      palm: null,
      side: 'right',
      sideVotes: 0,
      lastSeen: 0,
      touching: new Set(),
      press: null,
      pending: undefined,
      pendingFrames: 0,
      rawTouch: null,
      fistFrames: 0,
      lead: 'Supersaw',
      pedalAt: { x: 0.5, y: 0.5 },
      pointFrames: 0,
      pointLine: null,
      pointIdleSince: null,
    })
    const slots: HandSlot[] = [newSlot(), newSlot()]
    const free = new Set<HandSlot>()
    const mouse = { pen: new Pen(aspect, MOUSE_FEEL), point: null as Point | null, action: IDLE }

    const fx = new FxLayer()
    const recorder = new Recorder()
    let lastFrame = performance.now()

    // Cached layers: the grid, the note names, and the score at rest. Each redraws only when what it
    // shows changes, so a frame mostly stamps three images and draws what moves.
    const gridLayer = new Layer()
    const namesLayer = new Layer()
    const inkLayer = new Layer()
    let inkItems: Item[] | null = null
    // Cached text is redrawn once the bundled fonts arrive, or it keeps the fallback face.
    let fontsLoaded = 0
    const onFonts = () => fontsLoaded++
    void document.fonts.ready.then(onFonts)
    document.fonts.addEventListener('loadingdone', onFonts)
    let inkVersion = 0

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

    // Each kind of robot has its own body, cut from the AnyMachine Stilt, as a tinted sticker sheet.
    const sheets = new Map<BotType, HTMLCanvasElement>()
    for (const bot of BOTS) {
      const strip = new Image()
      strip.onload = () => sheets.set(bot, stickerSheet(strip, 8, BOT_TINT[bot]))
      strip.src = `/sprites/bot-${bot}.webp`
    }
    let parts: HTMLCanvasElement | null = null
    const partsStrip = new Image()
    partsStrip.onload = () => {
      parts = stickerSheet(partsStrip, 5)
    }
    partsStrip.src = '/sprites/stilt-parts.webp'

    let lastVideoTime = -1
    const winks = new WinkReader()
    const mouth = new MouthReader()
    const tilts = new TiltReader()
    let faceFrame = 0

    // The stage's size comes from a ResizeObserver rather than a layout read every frame.
    let boxW = wrap.clientWidth
    let boxH = wrap.clientHeight
    const resize = new ResizeObserver(([entry]) => {
      boxW = entry.contentRect.width
      boxH = entry.contentRect.height
    })
    resize.observe(wrap)

    const layout = () => {
      // 1.5x is sharp enough for stickers and saves almost half the pixels of a retina canvas.
      // Checked every frame so moving the window to a screen of another density redraws sharply.
      const nextDpr = Math.min(1.5, window.devicePixelRatio || 1)
      if (boxW !== width || boxH !== height || nextDpr !== dpr) {
        dpr = nextDpr
        width = boxW
        height = boxH
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
    const toStage = (p: Point) => {
      const at = fromVideo(p)
      return toGrid(at.x, at.y)
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

    /** Leave whatever a pen is doing: place its stroke, or release its pedal. */
    const finish = (action: Action, pen: Pen, now: number, at: { x: number; y: number }, lead?: LeadName): Action => {
      if (action.kind === 'draw' && pen.active) place(pen.up(now), lead)
      if (action.kind === 'pedal') letGo(action.name, at)
      return IDLE
    }

    /** Clear everything a hand slot knows, as when a hand leaves or a different hand takes its place. */
    const reset = (slot: HandSlot, now: number) => {
      slot.action = finish(slot.action, slot.pen, now, slot.pedalAt, slot.lead)
      slot.role = null
      slot.smooth.reset()
      slot.swat.reset()
      slot.twist.reset()
      slot.point = null
      slot.wrist = null
      slot.joints = []
      slot.tips = null
      slot.palm = null
      slot.pose = 'open'
      slot.touching.clear()
      slot.press = null
      slot.pending = undefined
      slot.pendingFrames = 0
      slot.rawTouch = null
      slot.fistFrames = 0
      slot.pointFrames = 0
    }

    const readFace = (now: number) => {
      const { faceTracker, faceOn } = live.current
      // The face is read every other frame; winks and the mouth do not need full speed.
      if (!faceTracker || !faceOn || faceFrame++ % 2 !== 0) return
      const face = faceTracker.detect(video, now)
      if (canvas.dataset.face !== String(Boolean(face))) canvas.dataset.face = String(Boolean(face))
      const state = live.current.face
      state.found = Boolean(face)
      if (!face) return
      const open = mouthOpen(face.jaw)
      state.left = face.blinkLeft
      state.right = face.blinkRight
      state.mouth = open
      const wink = winks.read(face.blinkLeft, face.blinkRight)
      if (wink) live.current.onWink(wink)
      const tilt = tilts.read(face.tilt)
      if (tilt) live.current.onTilt(tilt)
      // An open mouth drops a robot right where the mouth is on the stage.
      if (mouth.read(open)) live.current.onDeploy(toStage(face.mouth), live.current.deployBot)
    }

    /** The pedal hand: a fist moves on to the next pedal; a finger pressed to the thumb plays it. */
    const playPedals = (slot: HandSlot, point: Point, twistRaw: number, fist: boolean, now: number) => {
      slot.fistFrames = fist ? slot.fistFrames + 1 : 0
      if (slot.fistFrames === GESTURE_FRAMES) live.current.onCyclePedal(slot.side)
      const name = live.current.pedalBySide[slot.side]
      if (slot.action.kind === 'pedal' && (slot.action.name !== name || !slot.press)) {
        slot.action = finish(slot.action, slot.pen, now, slot.pedalAt)
      }
      if (!slot.press) return
      // Played like an XY pad: across is the amount, up is the pedal's main move, the finger picks
      // its variant and twist is one extra.
      slot.action = { kind: 'pedal', name }
      slot.pedalAt = { x: point.x, y: point.y }
      const twist = clamp01((slot.twist.next(twistRaw, now) + 1) / 2)
      pedal(name, slot.pedalAt, point, FINGERS.indexOf(slot.press), twist)
    }

    /** The writing hand: thumb and index draw, a fist steps the sound, pointing recolours a line. */
    const write = (slot: HandSlot, point: Point, pinchAt: Point, pose: Pose, now: number) => {
      const { engine, mode, items } = live.current
      const touched = robotAt(point)
      if (touched !== undefined && !slot.touching.has(touched)) engine.hit(touched)
      slot.touching.clear()
      if (touched !== undefined) slot.touching.add(touched)

      const pinched = slot.press === 'index'
      if (slot.action.kind === 'idle' && pinched) {
        slot.lead = live.current.settings.lead
        if (mode === 'erase') {
          slot.action = { kind: 'erase' }
          erase(pinchAt)
        } else {
          slot.action = { kind: 'draw' }
          slot.pen.down(pinchAt, now)
        }
      } else if (slot.action.kind !== 'idle' && !pinched) {
        slot.action = finish(slot.action, slot.pen, now, slot.pedalAt, slot.lead)
      } else if (slot.action.kind === 'draw') {
        slot.pen.move(pinchAt, now)
      } else if (slot.action.kind === 'erase') {
        erase(pinchAt)
      }
      if (slot.action.kind !== 'idle') slot.point = pinchAt

      // A fist moves on to the next sound, once per fist.
      slot.fistFrames = slot.action.kind === 'idle' && pose === 'fist' ? slot.fistFrames + 1 : 0
      if (slot.fistFrames === GESTURE_FRAMES) live.current.onNextPen()

      // Pointing at a line steps it to the next sound; pointing at nothing for a moment steps the pen.
      slot.pointFrames = slot.action.kind === 'idle' && pose === 'point' ? slot.pointFrames + 1 : 0
      if (slot.pointFrames < GESTURE_FRAMES) {
        slot.pointLine = null
        slot.pointIdleSince = null
        return
      }
      const line = lineNear(items, point, POINT_REACH, aspect())
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
    }

    const trackHands = (now: number) => {
      const { tracker, stream } = live.current
      const ready = tracker && stream && video.readyState >= 2 && video.videoWidth > 0
      if (ready && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime
        readFace(now)
        const hands = tracker.detect(video, now)
        const videoAspect = video.videoWidth / video.videoHeight
        free.clear()
        for (const s of slots) free.add(s)
        // Two hands with the same label (or none) are told apart by where they are on screen: the
        // mirrored video puts the player's left hand on the left.
        const count = Math.min(hands.length, slots.length)
        const sameLabel = count === 2 && hands[0].side === hands[1].side
        for (let h = 0; h < count; h++) {
          const hand = hands[h]
          let label = hand.side
          if (sameLabel || !label) {
            const x = 1 - hand.landmarks[9].x
            label = count === 2 ? (x < 1 - hands[1 - h].landmarks[9].x ? 'left' : 'right') : x < 0.5 ? 'left' : 'right'
          }
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
          // A wrist that leapt is a different hand: forget the old one, or its swipe history and
          // smoothing would read the leap as a swat or a lurch.
          if (slot.wrist && best > SWAPPED_HAND) reset(slot, now)

          // Every keypoint is smoothed once, so gestures and the overlay read a steadier hand.
          const landmarks = slot.smooth.next(hand.landmarks, now)
          const reading = readHand(landmarks, videoAspect, slot.press === 'index' ? 'pinch' : slot.pose, slot.rawTouch)
          const point = toStage(reading.point)
          const palm = toStage(reading.palm)
          slot.wrist = wrist
          slot.joints = landmarks.map(fromVideo)
          slot.lastSeen = now
          slot.point = point
          slot.pose = reading.pose
          slot.palm = palm
          slot.tips = {
            index: toStage(reading.tips.index),
            middle: toStage(reading.tips.middle),
            ring: toStage(reading.tips.ring),
            pinky: toStage(reading.tips.pinky),
          }

          // Which hand is this? A hand keeps its side until the label has disagreed for a while, so a
          // flickering label never flips a hand between writing and pedals mid-gesture.
          if (slot.role === null) {
            slot.side = label
            slot.sideVotes = 0
          } else if (label !== slot.side) {
            if (++slot.sideVotes >= SIDE_FRAMES) {
              slot.side = label
              slot.sideVotes = 0
            }
          } else slot.sideVotes = 0
          const side = slot.side
          const pedals = live.current.effectsHand
          const role = pedals === 'both' || side === pedals ? 'effects' : 'write'
          if (slot.role !== role) {
            slot.action = finish(slot.action, slot.pen, now, slot.pedalAt, slot.lead)
            slot.role = role
          }

          // A fast sideways sweep of a flat, open hand wipes the board.
          if (slot.swat.read(palm.x, palm.y, reading.pose === 'open' && !reading.touch, now)) live.current.onSwat()

          // Which finger is pressed to the thumb. A change must hold a few frames before it counts.
          slot.rawTouch = reading.touch
          if (reading.touch === slot.press) {
            slot.pending = undefined
            slot.pendingFrames = 0
          } else if (reading.touch === slot.pending) {
            slot.pendingFrames++
          } else {
            slot.pending = reading.touch
            slot.pendingFrames = 1
          }
          if (slot.pending !== undefined && slot.pendingFrames >= GESTURE_FRAMES) {
            slot.press = slot.pending
            slot.pending = undefined
            slot.pendingFrames = 0
          }

          if (role === 'effects') {
            playPedals(slot, point, reading.twist, reading.pose === 'fist', now)
          } else {
            const pinchAt = toStage({
              x: (reading.thumb.x + reading.tips.index.x) / 2,
              y: (reading.thumb.y + reading.tips.index.y) / 2,
            })
            write(slot, point, pinchAt, reading.pose, now)
          }
        }
      }
      for (const slot of slots) {
        if (slot.point && (!ready || now - slot.lastSeen > HAND_LOST_MS)) reset(slot, now)
      }
    }

    const render = (now: number) => {
      const { items, settings, engine, mode } = live.current
      ctx.clearRect(0, 0, width, height)
      // The pedals' animations creep in as they are pressed; none of it runs with reduced motion.
      const animate = !still.matches
      if (animate) fx.update(Math.min(0.1, (now - lastFrame) / 1000), engine.effects, grid)
      lastFrame = now

      const position = engine.position()
      const playing = position !== null
      const step = playing ? Math.min(STEPS - 1, Math.floor(position * STEPS)) : -1
      // Lines at rest are dimmed a touch while the loop plays, so the sounding ones stand out.
      const rest = playing ? 0.84 : 1

      ctx.save()
      if (animate) {
        const shake = fx.shake()
        ctx.translate(shake.x, shake.y)
      }
      ctx.drawImage(
        gridLayer.get(settings.drumGrid, width, height, dpr, (c) => drawGrid(c, grid, settings.drumGrid)),
        0,
        0,
        width,
        height,
      )
      if (animate) {
        fx.drawBack(ctx)
        fx.drawEchoes(ctx, grid, items, settings.drumGrid)
      }

      // Robots walk under what the player placed, so placed ink always stays readable.
      const tall = walkerHeight(grid)
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
          tall * BOT_SIZE[item.bot] * (flashing(item.id) ? 1.08 : 1),
          // Walkers step with the ground they cover; the head and the claw keep their own time while
          // the loop plays, and hold still when it stops or motion is reduced.
          item.bot === 'singer' || item.bot === 'eater'
            ? playing && animate
              ? Math.floor(now / 140)
              : 0
            : (pose?.frame ?? 0),
          pose?.facing ?? 1,
        )
      }

      // The score at rest is one cached image, redrawn only when the items change.
      if (items !== inkItems) {
        inkItems = items
        inkVersion++
      }
      ctx.drawImage(
        inkLayer.get(`${inkVersion}|${settings.drumGrid}|${rest}`, width, height, dpr, (c) => {
          for (const item of items) {
            if (item.kind === 'line') drawLine(c, grid, item.points, LEAD_INK[item.lead], rest)
            else if (item.kind === 'blob') drawBlob(c, grid, item, 1, settings.drumGrid)
          }
        }),
        0,
        0,
        width,
        height,
      )
      // Over it, only what is sounding: the lines under the playhead swell, the drums it hits flash.
      const glints: Point[] = []
      if (playing) {
        const onBeat = !still.matches && (position * STEPS) % 1 < 0.5
        for (const item of items) {
          if (item.kind !== 'line') continue
          const y = stepsOf(item)[step]
          if (y === null || y === undefined) continue
          drawLine(ctx, grid, item.points, LEAD_INK[item.lead], 1, onBeat ? 1.45 : 1)
          if (onBeat) glints.push({ x: grid.x + position * grid.w, y: grid.y + y * grid.h })
        }
        for (const item of items) {
          if (item.kind === 'blob' && flashing(item.id)) drawBlob(ctx, grid, item, 1.35, settings.drumGrid)
        }
      }
      ctx.drawImage(
        namesLayer.get(`${settings.key}|${settings.scale}|${fontsLoaded}`, width, height, dpr, (c) =>
          drawNoteNames(c, grid, settings.key, settings.scale, 15),
        ),
        0,
        0,
        width,
        height,
      )

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

      if (playing) drawPlayhead(ctx, grid, position)
      for (const g of glints) drawGlint(ctx, g.x, g.y, 18)
      if (animate) fx.drawFront(ctx)
      ctx.restore()

      // Every pedal that is pressed or held shows where it is being played.
      for (const name of EFFECTS) {
        const value = engine.effects[name]
        if (!value) continue
        drawPad(ctx, grid, marks.get(name) ?? value, `${name} ${value.detail}`, value.x)
      }

      const reach = ERASE_RADIUS * grid.h
      for (const slot of slots) {
        if (!slot.point) continue
        drawHand(ctx, slot.joints, parts)
        if (slot.role === 'effects' && slot.tips && slot.palm) {
          const name = live.current.pedalBySide[slot.side]
          drawTipLabels(ctx, grid, slot.tips, PEDAL_OPTIONS[name], slot.press, slot.palm, name)
          continue
        }
        if (slot.role !== 'write') continue
        // The writing hand shows its current sound on the palm, in that sound's ink.
        if (slot.palm && slot.tips && slot.action.kind === 'idle') {
          drawTipLabels(ctx, grid, slot.tips, [], null, slot.palm, settings.lead, undefined, LEAD_INK[settings.lead])
        }
        const kind =
          slot.action.kind === 'erase'
            ? 'erase'
            : slot.action.kind === 'draw'
              ? 'draw'
              : slot.pointFrames >= GESTURE_FRAMES
                ? 'point'
                : 'hover'
        drawCursor(ctx, grid.x + slot.point.x * grid.w, grid.y + slot.point.y * grid.h, kind, reach, LEAD_INK[settings.lead])
      }
      if (mouse.point && (mode === 'erase' || mouse.action.kind === 'erase')) {
        drawCursor(ctx, grid.x + mouse.point.x * grid.w, grid.y + mouse.point.y * grid.h, 'erase', reach)
      }
    }

    let raf = 0
    let seenHands = -1
    let wasRecording = false
    const frame = () => {
      // The next frame is asked for first, so one error never freezes the stage for good.
      raf = requestAnimationFrame(frame)
      const now = performance.now()
      layout()
      trackHands(now)
      render(now)

      // Recording: composite the camera, the booth wash and the stage into one frame.
      const { recording, engine, stream } = live.current
      if (recording && !wasRecording) {
        recorder.start(engine, width, height, (seconds, state) => live.current.onRecordProgress(seconds, state))
      } else if (!recording && wasRecording) {
        recorder.stop()
      }
      wasRecording = recording
      if (recording) recorder.frame(stream ? video : null, canvas)

      const hands = (slots[0].point ? 1 : 0) + (slots[1].point ? 1 : 0)
      if (hands !== seenHands) {
        seenHands = hands
        canvas.dataset.hands = String(hands)
      }
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
      const { mode, engine, items } = live.current
      // Alt-clicking a line steps it to the next sound.
      const onInk = lineNear(items, p, POINT_REACH, aspect())
      if (mode === 'draw' && e.altKey && onInk) {
        live.current.onRecolor(onInk.id)
        return
      }
      // Clicking a robot bumps it, unless there is placed ink right there to draw against.
      const bumped = mode === 'draw' && !onInk ? robotAt(p) : undefined
      if (bumped !== undefined) {
        engine.hit(bumped)
        return
      }
      if (e.button === 2 || mode === 'erase') {
        mouse.action = { kind: 'erase' }
        erase(p)
      } else if (mode === 'effects') {
        mouse.action = { kind: 'pedal', name: live.current.mousePedal }
        pedal(live.current.mousePedal, p, p)
      } else {
        mouse.action = { kind: 'draw' }
        mouse.pen.down(p, performance.now())
      }
    }
    const move = (e: PointerEvent) => {
      if (!e.isPrimary) return
      const p = local(e)
      mouse.point = p
      const action = mouse.action
      if (action.kind === 'erase') erase(p)
      else if (action.kind === 'pedal') pedal(action.name, p, p)
      else if (action.kind === 'draw') mouse.pen.move(p, performance.now())
    }
    const up = (e: PointerEvent) => {
      if (!e.isPrimary) return
      mouse.action = finish(mouse.action, mouse.pen, performance.now(), local(e))
    }
    const leave = () => {
      if (mouse.action.kind === 'idle') mouse.point = null
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
      recorder.stop()
      resize.disconnect()
      document.fonts.removeEventListener('loadingdone', onFonts)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('contextmenu', menu)
    }
  }, [])

  return (
    <div ref={wrapRef} className="stage relative min-h-0 flex-1 overflow-hidden">
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
          <div aria-hidden="true" className="stage-veil absolute inset-0" />
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
