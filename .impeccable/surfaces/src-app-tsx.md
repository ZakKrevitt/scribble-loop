---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Instrument screen

Scope: the single screen of Scribble Loop (`src/App.tsx`). Visitor mode: Operate. Visual direction: photo sticker
booth pen. Intensity: bold palette, quiet shell. The direction and intensity were chosen by the building agent on
2026-11-17 without a decision round, on the owner's standing instruction to choose without asking; the owner can
change either.

Audience and job: one player at a laptop or a projector, hand raised to a webcam, building a two-bar hyperpop loop.
They need to see where their hand is, what they have placed, and where the playhead is. Controls: play and stop,
tempo, key, scale, lead sound, draw or rub out, undo, clear, camera.

Constraints: all controls are standard shadcn components. Works with mouse and touch when there is no camera. No
claims, numbers or testimonials anywhere.

Memorable moment: your own camera image with fat white-edged pen lines and stickers drawn across it, each one
flashing as the playhead reaches it.

Unresolved: tracking uses MediaPipe hand keypoints, not the Roboflow RF-DETR keypoints the owner named (see
PRODUCT.md). Gesture thresholds have not been tuned against a live hand.

## Direction contract

THESIS: You draw on your own picture, the way a photo sticker booth lets you scribble on the shot you just took, and
the scribble plays. Refused: the dark studio-plugin look of knobs, meters and a piano-roll grid with one neon accent.

OWN-WORLD: A bright booth. Candy pink bar, pale pink-lilac backdrop, deep plum ink for every word. Everything placed
on the grid is booth pen: a saturated core, a thick white edge, a soft drop shadow. Melody is a pen line in pink,
mint, yellow or lilac. Each drum is its own sticker shape. One rounded gothic face, M PLUS Rounded 1c, at one size
for every control, with rank carried by weight.

STORY: The player sees themselves, sees a ring following their fingers, pinches, and a white-edged line appears on
their image. The playhead reaches it and it sounds. They add stickers for drums and the loop is a beat.

FIRST VIEWPORT: One pink bar across the top, 56px, holding every control in a single row: name at left, then play,
tempo, key, scale, sound, tool, undo, clear, camera. The rest of the viewport is the stage: mirrored camera image
under a pale wash, a grid of small registration ticks, six drum stickers down the left edge, note names down the
right edge, a white playhead crossing left to right. Before the first press, the stage holds the name and two start
buttons, camera first.

SIGNATURE MOVE: booth pen ink over the live image, and on-the-beat lighting: the thing under the playhead is at full
strength and flashes in a two-frame step, with no easing.

RAISES: from the timetable challenger, one type size with rank by weight. From the design annual challenger, a grid
of registration ticks at intersections in place of ruled lines. From the acetate manual challenger, stepped motion
with no easing. From the sleeve challenger, drums told apart by shape before colour. The streaming wall and exposure
record challengers were declined with nothing kept.

FORM: Photo sticker booth pen, fifth of seven grounded candidates. seed:8a6e2e0ade182c9e

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
