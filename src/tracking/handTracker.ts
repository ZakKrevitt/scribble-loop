import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Point } from '@/model/score'

/** One tracked hand: 21 keypoints as fractions of the camera image. */
export interface TrackedHand {
  landmarks: Point[]
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
      return result.landmarks.map((landmarks) => ({ landmarks }))
    },
    close() {
      landmarker.close()
    },
  }
}
