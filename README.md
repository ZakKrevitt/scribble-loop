# Scribble Loop

A browser instrument. Place lines and stickers on a grid with your hands in front of a webcam. A playhead sweeps the
grid from left to right on a loop and plays what it touches. Height is pitch, left to right is time.

- A line is melody. It sounds while the playhead is inside it and its height bends the pitch.
- A sticker is a drum. Its height picks the drum: kick at the bottom, then snare, clap, pop, zap and hat.
- A robot walks the grid by itself, one pace every other step, and chirps when the playhead reaches it. Every pass of
  the loop finds it somewhere new.

## Playing

Each line plays its own sound, shown by its colour: pink Supersaw, mint Rubber, yellow Glass, lilac Chip. The Sound
control sets the sound for the next line.

| | Writing hand (right by default) | Mouse or finger |
|---|---|---|
| Melody line | Pinch thumb and index, drag | Drag |
| Drum sticker | Pinch and hold still (longer is louder) | Press and hold still |
| Change a line's sound | Point at it | Alt-click it |
| Change the sound for new lines | Point at empty space and hold | Sound menu |
| Erase | Make a fist over it | Erase mode, or right-drag |

Drums snap to the grid set by Drums: free, 1/16, 1/8 or 1/4.

### Effects

The other hand (left by default) plays pedals over the whole mix. The gesture picks the pedal, the height of the hand
sets how strong it is, and twisting the hand like a dial sets its second control. Drop the hand out of view to let
go. The Pedals menu swaps which hand does what, reassigns gestures, and can hold pedals on.

| Gesture | Pedal | Height | Twist |
|---|---|---|---|
| Open palm | Filter | Cutoff | Wobble speed and depth |
| Fist | Drive | Amount | Grit |
| Pinch | Echo | Feedback | Time, 1/16 to 1/4 |
| Point | Crush | Bit depth | Mix |
| Two fingers | Reverb | Amount | Dark to bright |

With the mouse, choose Effects and drag; the Pedals menu picks which pedal it plays.

### Robots

Robots walk the grid on their own, so no two passes of the loop are the same. Add them from the Robots menu.

| Robot | Does |
|---|---|
| Singer | Sings a note on every other step at the height it walks |
| Swapper | Changes the sound of any line it walks over |
| Eater | Eats drums and bites chunks out of lines |
| Dropper | Leaves drums and short runs of melody behind, at most twelve at a time |
| Bumper | Shouts when you hit it with your hand or click it |

Space starts and stops. Cmd or Ctrl and Z undoes; robots' own changes are not in the undo history.

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
