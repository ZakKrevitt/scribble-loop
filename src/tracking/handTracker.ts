import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
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
      // MediaPipe names hands as if the picture were mirrored. Ours is the raw camera image,
      // so its "Left" is the player's right hand.
      return result.landmarks.map((landmarks, i) => {
        const label = result.handedness?.[i]?.[0]?.categoryName
        const side = label === 'Left' ? 'right' : label === 'Right' ? 'left' : null
        return { landmarks, side }
      })
    },
    close() {
      landmarker.close()
    },
  }
}
