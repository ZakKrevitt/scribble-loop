# Product

Scribble Loop is a browser instrument. You place lines and blobs on a grid with your hands in front of a webcam, a
playhead sweeps the grid from left to right on a loop, and what you placed becomes sound. Height is pitch, left to
right is time.

This record was inferred from the owner's written brief on 2026-11-17. No interview took place. Inferences are marked
"assumed".

## Platform

web

## Stack

Vite, React, TypeScript, Tailwind CSS, shadcn/ui components, Web Audio API, MediaPipe Hand Landmarker in the browser.
Hosted on Vercel as a static site.

## Users

- The owner, a DJ and visual artist, playing it live at a laptop, alone or in front of people (assumed).
- Anyone they send the link to, who has a webcam and no instructions.

## Product Purpose

Make a loop of hyperpop music by drawing in the air. The instrument must be playable within seconds: raise a hand,
pinch, drag, hear it on the next pass of the playhead.

## Positioning

A drawn-sound instrument in the line of UPIC and the ANS synthesizer, played with bare hands and voiced like
hyperpop production (the owner named SOPHIE and underscores as sound references). It is not a DAW, a piano roll
editor, or a general hand-tracking demo.

## Operating Context

One screen, landscape, at a laptop or projected. The player stands or sits about an arm's length to a metre from the
camera, often in mixed or dim room light. Their eyes move between their own hand, the grid, and the playhead. Sound
is the main feedback; the screen confirms where the hand is and what has been placed.

## Capabilities and Constraints

- Two kinds of object. A line is melody: it sounds for as long as the playhead is inside it and its height bends the
  pitch, and each line keeps its own lead sound. A blob is percussion: it fires when the playhead reaches it, its
  height picks the drum, and its timing snaps to a chosen grid or plays free.
- Hands have roles. The writing hand (right by default) draws: pinch and drag for a line, pinch and hold for a drum,
  point at a line to change its sound, fist to erase. The effects hand plays pedals (filter, drive, crush, echo,
  reverb): the gesture picks the pedal, height sets intensity, twist sets a second control. The roles can be swapped.
- Robots walk the grid by themselves and change the music: a singer, a swapper, an eater, a dropper and a bumper.
- Mouse and touch do the same jobs, so the instrument works without a camera.
- The loop is two bars of sixteenth notes. Tempo, key, scale and lead sound can be changed while it plays.
- All sound is synthesized in the browser. No samples, no server, no account, nothing is uploaded. Camera frames stay
  on the device.
- Browsers require a click before audio and camera start.
- The owner's brief named Roboflow RF-DETR keypoints for hand tracking. That model is a body-pose preview that needs a
  Roboflow account and key, and has no documented in-browser hand model. Tracking uses MediaPipe hand keypoints
  behind a small tracker interface so another model can replace it.

## Brand Commitments

- Name: Scribble Loop (assumed; chosen for the build).
- Sound: hyperpop. Detuned saw leads, rubbery FM, pitch bends, distorted kicks, metallic and laser percussion, hard
  sidechain pumping.

## Evidence on Hand

None. No users, recordings, press or metrics exist yet. Nothing on the page may claim any.

## Product Principles

- Sound within seconds. Nothing stands between opening the page and the first note except the browser's own
  permission click.
- The grid is the instrument. Controls stay few and at the edges.
- The hand is always visible on the grid, so the player never has to guess where a pinch will land.
- Anything placed can be removed as easily as it was placed.

## Accessibility & Inclusion

- Fully playable with mouse, touch or keyboard-reachable controls when a camera is unavailable or unwanted.
- Controls are labelled in words, reachable by keyboard, with visible focus.
- Melody and percussion differ by shape as well as colour.
- Motion on screen is tied to the music. With reduced motion requested, decorative movement is removed and the
  playhead remains.
- A visible stop control silences everything at once.
