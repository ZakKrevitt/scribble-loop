import type { Engine } from '@/audio/engine'

/** The longest clip, in seconds. */
export const CLIP_SECONDS = 30

/** The first container the browser can record, best first: MP4 plays everywhere, WebM is the fallback. */
const TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

const STAGE = 'oklch(0.93 0.045 326)'
const WASH = 'oklch(0.8 0.11 335)'
const VEIL = 'oklch(0.93 0.045 326 / 0.25)'

/**
 * Records the stage as a video clip with its sound. Each frame it composites what the player sees
 * (the mirrored camera, the pink booth wash and the stage canvas) onto one canvas, which it captures
 * together with the engine's mix. It costs nothing until a recording starts, and saves the file
 * when the recording ends, at the latest after CLIP_SECONDS.
 */
export class Recorder {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private media: MediaRecorder | null = null
  private release: (() => void) | null = null
  private chunks: Blob[] = []
  private startedAt = 0
  private lastSecond = -1
  private report: ((seconds: number, done: boolean) => void) | null = null

  get active(): boolean {
    return this.media !== null
  }

  start(engine: Engine, width: number, height: number, report: (seconds: number, done: boolean) => void): void {
    if (this.media) return
    // At most 1280 pixels wide, so encoding stays light while the instrument plays.
    const scale = Math.min(1, 1280 / Math.max(1, width))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round((width * scale) / 2) * 2
    canvas.height = Math.round((height * scale) / 2) * 2
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.report = report

    const tap = engine.recordTap()
    this.release = tap.release
    const stream = canvas.captureStream(30)
    for (const track of tap.stream.getAudioTracks()) stream.addTrack(track)
    const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
    const media = new MediaRecorder(stream, { mimeType: type || undefined, videoBitsPerSecond: 6_000_000 })
    this.chunks = []
    media.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    media.onstop = () => this.save(media.mimeType || type || 'video/webm')
    media.start(1000)
    this.media = media
    this.startedAt = performance.now()
    this.lastSecond = -1
  }

  /** Draw this frame into the recording. `video` is the camera, or null when it is off. */
  frame(video: HTMLVideoElement | null, stage: HTMLCanvasElement): void {
    const { ctx, canvas, media } = this
    if (!ctx || !canvas || !media) return
    const w = canvas.width
    const h = canvas.height
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = STAGE
    ctx.fillRect(0, 0, w, h)
    if (video && video.videoWidth > 0) {
      // The camera mirrored and cropped to cover, as on screen, then the booth wash over it.
      const scale = Math.max(w / video.videoWidth, h / video.videoHeight)
      const dw = video.videoWidth * scale
      const dh = video.videoHeight * scale
      ctx.save()
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
      ctx.filter = 'brightness(1.1) saturate(1.15)'
      ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh)
      ctx.restore()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = WASH
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = VEIL
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(stage, 0, 0, w, h)

    const seconds = Math.floor((performance.now() - this.startedAt) / 1000)
    if (seconds !== this.lastSecond) {
      this.lastSecond = seconds
      this.report?.(seconds, false)
    }
    if (seconds >= CLIP_SECONDS) this.stop()
  }

  stop(): void {
    if (this.media && this.media.state !== 'inactive') this.media.stop()
    this.media = null
    this.release?.()
    this.release = null
  }

  private save(type: string): void {
    const blob = new Blob(this.chunks, { type })
    this.chunks = []
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `scribble-loop-${stamp}.${type.includes('mp4') ? 'mp4' : 'webm'}`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
    this.canvas = null
    this.ctx = null
    this.report?.(this.lastSecond, true)
    this.report = null
  }
}
