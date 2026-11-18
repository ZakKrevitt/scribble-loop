import { FaceLandmarker, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Point } from '@/model/score'

/** One tracked hand: 21 keypoints as fractions of the camera image. */
export interface TrackedHand {
  landmarks: Point[]
  /** Which of the player's hands this is, when the model can tell. */
  side: 'left' | 'right' | null
}

/**
 * Anything that can find hands in a video frame.
 * MediaPipe is the implementation here; another keypoint model can stand in by matching this shape.
 */
export interface HandTracker {
  detect(video: HTMLVideoElement, timeMs: number): TrackedHand[]
  close(): void
}

const WASM = '/mediapipe'
const MODEL = '/models/hand_landmarker.task'

export async function createHandTracker(): Promise<HandTracker> {
  const files = await FilesetResolver.forVisionTasks(WASM)
  const make = (delegate: 'GPU' | 'CPU') =>
    HandLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
    })
  let landmarker: HandLandmarker
  try {
    landmarker = await make('GPU')
  } catch {
    landmarker = await make('CPU')
  }
  return {
    detect(video, timeMs) {
      const result = landmarker.detectForVideo(video, timeMs)
      // Checked by the owner with a live camera: MediaPipe's label already names the player's own
      // hand for this raw (unmirrored) camera image, so it is used as is.
      return result.landmarks.map((landmarks, i) => {
        const label = result.handedness?.[i]?.[0]?.categoryName
        const side = label === 'Left' ? 'left' : label === 'Right' ? 'right' : null
        return { landmarks, side }
      })
    },
    close() {
      landmarker.close()
    },
  }
}

/** Blink and jaw scores for the player's face, from 0 to 1. Left and right are the player's own. */
export interface FaceReading {
  blinkLeft: number
  blinkRight: number
  jaw: number
}

export interface FaceTracker {
  detect(video: HTMLVideoElement, timeMs: number): FaceReading | null
  close(): void
}

const FACE_MODEL = '/models/face_landmarker.task'

export async function createFaceTracker(): Promise<FaceTracker> {
  const files = await FilesetResolver.forVisionTasks(WASM)
  const make = (delegate: 'GPU' | 'CPU') =>
    FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
    })
  let landmarker: FaceLandmarker
  try {
    landmarker = await make('GPU')
  } catch {
    landmarker = await make('CPU')
  }
  return {
    detect(video, timeMs) {
      const shapes = landmarker.detectForVideo(video, timeMs).faceBlendshapes?.[0]?.categories
      if (!shapes) return null
      const score = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0
      // MediaPipe follows ARKit's naming, where eyeBlinkLeft is the person's own left eye.
      return { blinkLeft: score('eyeBlinkLeft'), blinkRight: score('eyeBlinkRight'), jaw: score('jawOpen') }
    },
    close() {
      landmarker.close()
    },
  }
}
