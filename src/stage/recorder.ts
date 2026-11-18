import type { Engine } from '@/audio/engine'

/** The longest clip, in seconds. */
export const CLIP_SECONDS = 30

/** Where a recording is: running (with its seconds), saved to downloads, or failed. */
export type RecordState = 'recording' | 'saved' | 'failed'

/** The first container the browser can record, best first: MP4 plays everywhere, WebM is the fallback. */
const TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

const FPS = 30
const STAGE = 'oklch(0.93 0.045 326)'
const WASH = 'oklch(0.8 0.11 335)'
const VEIL = 'oklch(0.93 0.045 326 / 0.25)'

type Report = (seconds: number, state: RecordState) => void

/** One clip being recorded. Everything it needs is its own, so a clip still saving never touches the next. */
interface Take {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  media: MediaRecorder
  startedAt: number
  lastDrawn: number
  lastSecond: number
  timer: number
}

/**
 * Records the stage as a video clip with its sound. At 30 frames a second it composites what the
 * player sees (the mirrored camera, the pink booth wash and the stage canvas) onto one canvas, which
 * it captures together with the engine's mix. It costs nothing until a recording starts, and saves
 * the file when the recording ends, at the latest after CLIP_SECONDS.
 */
export class Recorder {
  private take: Take | null = null

  start(engine: Engine, width: number, height: number, report: Report): void {
    if (this.take) return
    let release: (() => void) | null = null
    try {
      // At most 1280 pixels wide, so encoding stays light while the instrument plays.
      const scale = Math.min(1, 1280 / Math.max(1, width))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(2, Math.round((width * scale) / 2) * 2)
      canvas.height = Math.max(2, Math.round((height * scale) / 2) * 2)
      const ctx = canvas.getContext('2d')!

      const tap = engine.recordTap()
      release = tap.release
      const stream = canvas.captureStream(FPS)
      for (const track of tap.stream.getAudioTracks()) stream.addTrack(track)
      const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
      const media = new MediaRecorder(stream, { mimeType: type || undefined, videoBitsPerSecond: 6_000_000 })

      const chunks: Blob[] = []
      const take: Take = { canvas, ctx, media, startedAt: performance.now(), lastDrawn: 0, lastSecond: 0, timer: 0 }
      const tapRelease = release
      media.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      media.onstop = () => {
        tapRelease()
        for (const track of stream.getTracks()) track.stop()
        const seconds = take.lastSecond
        if (chunks.length === 0) {
          report(seconds, 'failed')
          return
        }
        save(new Blob(chunks, { type: media.mimeType || type || 'video/webm' }))
        report(seconds, 'saved')
      }
      media.onerror = () => this.stop()
      media.start(1000)
      // The clip ends on time even when the tab is hidden and frames stop.
      take.timer = window.setTimeout(() => this.stop(), CLIP_SECONDS * 1000)
      this.take = take
      report(0, 'recording')
      this.report = report
    } catch {
      release?.()
      this.take = null
      report(0, 'failed')
    }
  }

  private report: Report | null = null

  /** Draw this frame into the recording. `video` is the camera, or null when it is off. */
  frame(video: HTMLVideoElement | null, stage: HTMLCanvasElement): void {
    const take = this.take
    if (!take) return
    const now = performance.now()
    if (now - take.lastDrawn < 1000 / FPS - 2) return
    take.lastDrawn = now
    const { ctx, canvas } = take
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

    const seconds = Math.min(CLIP_SECONDS, Math.floor((now - take.startedAt) / 1000))
    if (seconds !== take.lastSecond) {
      take.lastSecond = seconds
      this.report?.(seconds, 'recording')
    }
  }

  /** End the clip; it saves itself once the last data arrives. */
  stop(): void {
    const take = this.take
    if (!take) return
    this.take = null
    this.report = null
    window.clearTimeout(take.timer)
    if (take.media.state !== 'inactive') take.media.stop()
  }
}

function save(blob: Blob): void {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `scribble-loop-${stamp}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
}
