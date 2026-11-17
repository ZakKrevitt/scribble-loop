# Scribble Loop

A browser instrument. Place lines and stickers on a grid with your hands in front of a webcam. A playhead sweeps the
grid from left to right on a loop and plays what it touches. Height is pitch, left to right is time.

- A line is melody. It sounds while the playhead is inside it and its height bends the pitch.
- A sticker is a drum. Its height picks the drum: kick at the bottom, then snare, clap, pop, zap and hat.
- A robot walks the grid by itself, one pace every other step, and chirps when the playhead reaches it. Every pass of
  the loop finds it somewhere new.

## Playing

| | With a hand | With a mouse or finger |
|---|---|---|
| Melody line | Pinch thumb and index, drag | Drag |
| Drum sticker | Pinch and hold still (longer is louder) | Press and hold still |
| Rub out | Make a fist over it | Choose Rub out, or right-drag |

Space starts and stops. Cmd or Ctrl and Z undoes.

## Running it

```
pnpm install
pnpm dev
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e`. The camera test runs only when `HAND_VIDEO` points at
a `.y4m` or `.mjpeg` clip of a hand, which Chromium plays as if it were the webcam.

## How it is built

- `src/model/score.ts`: what is on the grid, and how positions map to steps, pitches and drums.
- `src/audio/engine.ts`: the sound. Everything is synthesized with the Web Audio API; there are no samples.
- `src/tracking/`: hand keypoints from MediaPipe Hand Landmarker, read into three poses (open, pinch, fist).
  `HandTracker` is a small interface, so another keypoint model can replace MediaPipe.
- `src/input/pen.ts`: turns one press, drag and release into a line or a sticker, for hands and mouse alike.
- `src/stage/`: the canvas.

The hand model (`public/models/hand_landmarker.task`) is Google's MediaPipe model, Apache 2.0. The robot sprite
(`public/sprites/stilt-walk.webp`) is the Stilt walker from [AnyMachine](https://github.com/apekshik/anymachine)
(MIT), its walk cycle rendered from the side in Blender.

Camera frames are processed in the browser and are never sent anywhere.
