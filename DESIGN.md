---
name: Scribble Loop
description: A bright photo sticker booth where the scribbles on your own picture play as a loop.
colors:
  bar-candy-pink: "oklch(0.8 0.15 352)"
  booth-backdrop: "oklch(0.93 0.045 326)"
  plum-ink: "oklch(0.27 0.09 340)"
  sticker-paper: "oklch(0.985 0.012 345)"
  pen-white: "oklch(0.995 0.005 345)"
  blush-muted: "oklch(0.9 0.06 348)"
  plum-soft: "oklch(0.4 0.09 340)"
  mint-highlight: "oklch(0.88 0.1 185)"
  plum-hairline: "oklch(0.27 0.09 340 / 18%)"
  plum-field: "oklch(0.27 0.09 340 / 28%)"
  alarm-red: "oklch(0.52 0.22 25)"
  pen-pink: "oklch(0.68 0.25 357)"
  pen-mint: "oklch(0.8 0.15 185)"
  pen-yellow: "oklch(0.9 0.17 98)"
  pen-lilac: "oklch(0.66 0.21 305)"
  drum-kick-red: "oklch(0.62 0.24 22)"
  drum-clap-pink: "oklch(0.72 0.22 352)"
  drum-zap-blue: "oklch(0.68 0.18 255)"
  drum-hat-orange: "oklch(0.78 0.17 62)"
  booth-wash: "oklch(0.8 0.11 335)"
typography:
  wordmark:
    fontFamily: "'M PLUS Rounded 1c', ui-rounded, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.5
  label:
    fontFamily: "'M PLUS Rounded 1c', ui-rounded, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "'M PLUS Rounded 1c', ui-rounded, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  base: "14px"
  bubble: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  control-x: "14px"
  lg: "16px"
  xl: "24px"
components:
  bar:
    backgroundColor: "{colors.bar-candy-pink}"
    textColor: "{colors.plum-ink}"
    padding: "8px 16px"
    height: "56px"
  button-primary:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.sticker-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  button-light:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  button-start:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.sticker-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  toggle-pressed:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.sticker-paper}"
    rounded: "{rounded.pill}"
  segmented-tool:
    backgroundColor: "{colors.sticker-paper}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-tool-item:
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  select-menu:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.base}"
    padding: "4px"
  select-item-focus:
    backgroundColor: "{colors.mint-highlight}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.base}"
  message-bubble:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.bubble}"
    padding: "8px 16px"
  alert-band:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.sticker-paper}"
    typography: "{typography.body}"
    padding: "8px 16px"
  slider-track:
    backgroundColor: "{colors.blush-muted}"
    rounded: "{rounded.pill}"
    height: "8px"
---

# Design System: Scribble Loop

## Overview

**Creative North Star: "The sticker booth pen"**

The screen is a bright photo sticker booth. You stand in front of the camera, your own picture fills the stage under a pink exposure, and everything you place on it is drawn with booth pen: a saturated colour core, a thick white cut edge, a soft plum drop shadow. The scribble is the instrument. A candy pink bar holds every control at the top; the rest of the viewport belongs to the grid.

The shell is quiet and the ink is loud. Chrome stays in two colours (candy pink and plum, with off-white sticker paper for light controls), so the saturated pens and stickers on the stage carry all of the colour. Rank in the controls comes from weight, never from size or case. Motion is tied to the beat and stepped: things under the playhead jump to full size for a fraction of a beat and jump back, with no easing.

The world refuses the dark studio-plugin look: no knobs, meters, black panels or a piano-roll grid with one neon accent.

**Key Characteristics:**
- Bright pink-lilac booth backdrop, plum ink for every word.
- Booth pen treatment on everything placed: colour core, white edge, soft plum shadow.
- One rounded gothic face at one size, rank by weight.
- Fully round controls on a single candy pink bar.
- Registration ticks instead of ruled grid lines.
- Beat-locked, stepped motion with no easing.

## Colors

A candy-and-plum shell around a sweet-shop set of saturated pen inks; every colour is authored in OKLCH.

### Primary
- **Plum ink** (plum-ink): every word on the page, the pressed and primary control fill, focus rings, grid ticks at reduced alpha, the cursor core, and the camera alert band. It is the only dark in the system.
- **Candy pink** (bar-candy-pink): the control bar and nothing else. The favicon and `theme-color` carry its hex approximation (#f58fbf).

### Secondary
- **Pen inks** (pen-pink, pen-mint, pen-yellow, pen-lilac): melody lines, taken in turn so each new line gets the next pen.
- **Drum inks** (drum-kick-red, pen-yellow for snare, drum-clap-pink, pen-mint for pop, drum-zap-blue, drum-hat-orange): one per drum sticker. Each drum also has its own silhouette, so colour is never the only cue.

### Tertiary
- **Mint highlight** (mint-highlight): the focused option in an open menu and text selection. Used sparingly so it reads as "this one".

### Neutral
- **Booth backdrop** (booth-backdrop): the page and stage background, pale pink-lilac.
- **Sticker paper** (sticker-paper): light control fills, open menus, message bubbles, and text on plum.
- **Pen white** (pen-white): the cut edge on lines, stickers and sprites, the playhead core, the glint, and the halo behind note names. Canvas only.
- **Blush** (blush-muted): slider track and default toggle hover.
- **Soft plum** (plum-soft): secondary text such as the select chevron.
- **Plum hairline** and **plum field** (plum-hairline, plum-field): borders and input outlines at 18% and 28% plum.
- **Booth wash** (booth-wash): screened over the live camera image so its shadows lift to pink, followed by a 25% veil of the backdrop.
- **Alarm red** (alarm-red): reserved for destructive and invalid states inherited from the component library; nothing on the current screen uses it.

### Named Rules
**The Two Colour Shell Rule.** Chrome uses only candy pink, plum and sticker paper. Saturated colour belongs to things placed on the stage.

**The Plum Only Rule.** All text is plum ink or sticker paper on plum. No grey text, no coloured text.

## Typography

**Display Font:** M PLUS Rounded 1c (with ui-rounded, system-ui, sans-serif)
**Body Font:** M PLUS Rounded 1c, the same family
**Label/Mono Font:** none. Numbers that change (tempo) use tabular figures, not a monospace face.

**Character:** One rounded Japanese gothic, loaded locally at weights 500, 700 and 800 for Latin. Its soft terminals match the round pen caps and pill controls.

### Hierarchy
- **Wordmark** (800, 15px): the product name at the left of the bar. Hidden visually on narrow screens and kept for screen readers.
- **Label** (700, 15px): every control, menu option, message bubble, and the note names drawn down the right edge of the canvas (700, 15px, with a 4px white halo).
- **Body** (500, 15px): the camera alert band.

### Named Rules
**The One Size Rule.** Every piece of text is 15px. Rank comes from weight (500, 700, 800) and from plum fill versus paper fill, never from a larger size or uppercase.

**The Upright Rule.** No italic or oblique text anywhere, including canvas text. `font-synthesis: none` is set on the root so the browser never fakes a slant or a bold.

## Layout

A full-height column: the bar on top, an optional alert band, and the stage taking every remaining pixel. On desktop the bar is a single 56px row (8px vertical padding around 40px controls), ordered name, play, tempo, key, scale, sound, tool, robot, undo, clear, then camera pushed to the far right. Gaps are 8px (6px on narrow screens).

Below 640px the bar wraps: play, tempo and key first, then scale, sound and camera, then tool, robot, undo and clear. Controls tighten to 12px side padding and long values truncate.

The stage draws its grid inset 12px top and bottom, with a 52px left gutter for the drum lane stickers and a 52px right gutter for note names (34px and 42px below 640px). Floating messages are centred and capped at the stage width minus 32px; the in-play hint sits 20px above the bottom edge.

**The Edges Rule.** Controls live in the bar and the gutters. The grid itself carries no chrome.

## Elevation & Depth

Depth is a sticker effect, not a layering system. One soft plum shadow says "this is stuck on top": it sits under placed ink on the canvas and under the floating message bubbles and the secondary start button. The bar and its controls are flat.

### Shadow Vocabulary
- **Sticker shadow** (canvas: plum at 35%, blur 8, offset y 3): lines, drum stickers, walking robots. The robot hand and cursor use a tighter blur 5 to 6, offset 2.
- **Lift** (`box-shadow: 0 3px 10px oklch(0.27 0.09 340 / 0.25)`): message bubbles and the "Start with mouse" button over the stage.
- **Menu** (component library medium shadow plus a 1px ring of plum at 10%): open select menus.

### Named Rules
**The Stuck On Rule.** A shadow is always soft and plum, always falls straight down, and only marks something sitting over the stage. No hard offset shadows, no glow.

## Shapes

Everything is round. Controls are full pills, message bubbles have 24px corners, menus and menu options use the 14px base radius. Lines have round caps and joins. Drum stickers are drawn shapes, one per drum: a disc (kick), a five-point star (snare), a heart (clap), a ring (pop), a lightning bolt (zap) and a four-point sparkle (hat). The sparkle doubles as the glint where the playhead crosses a sounding line.

The grid is not ruled. It marks intersections with registration crosses at every beat (4px arms, 6px and heavier at the bar line) and 1px dots between. Drum lanes in the left gutter are divided by short plum rules.

**The Cut Edge Rule.** Anything placed on the stage gets a white edge roughly as thick as its colour core (lines: edge 2.1 times the core width; stickers: 0.62 of the radius; sprites: 8px; robot hand parts: 5px). Without the edge it does not belong to this world.

## Components

Controls are shadcn components on Base UI, restyled as fat, round, bold booth buttons.

### Buttons
- **Shape:** full pill (9999px), 40px tall in the bar, 48px for the two start buttons.
- **Primary:** plum fill, paper text, 14px side padding (24px for start buttons). Play and Stop carry a 16px Lucide icon before the word.
- **Light:** paper fill, plum text, no border. Used for Robot, Undo, Clear and every select trigger.
- **Hover / Focus:** hover fades the fill slightly. Focus is a 3px solid plum outline with a 2px offset, set globally so it outranks component focus styles.
- **Disabled:** 50% opacity on the pink bar, still in place so the row does not shift.

### Segmented tool
- **Style:** Draw and Rub out sit in a paper pill with 4px padding; items are 32px pills.
- **State:** the pressed item fills plum with paper text, matching the pressed Camera toggle.

### Select menus
- **Trigger:** a light pill showing the current value in words ("Key A", "Minor pentatonic", "Supersaw") with a chevron.
- **Menu:** paper, 14px corners, 4px padding, at least 176px wide, opening below the trigger with no open or close animation. The focused option fills mint; the chosen option shows a check.

### Slider
- **Style:** 8px blush track with a plum fill, a 20px paper thumb with a 2px plum ring. Tempo sits beside its value in tabular figures ("160 bpm").

### Message bubble and alert band
- **Bubble:** paper, 24px corners, 8px by 16px padding, label weight, lift shadow, centred over the stage. Holds the one-sentence explanation before the first play and the gesture hint while the stage is nearly empty.
- **Alert band:** a full-width plum strip under the bar with paper body text, shown only when the camera is blocked or tracking failed.

### Stage ink (signature component)
The canvas layer is the system's signature. Melody lines (5 to 9px core by stage height), drum stickers, walking robot sprites tinted plum, and a robot hand built from limb segments laid over the tracked joints all wear the booth pen treatment. The playhead is a 4px white bar over a 7px plum shadow bar. The hand cursor is a ring: plum and white when hovering, a filled plum dot with a white edge when pinching, and a dashed plum ring with a white edge when rubbing out.

On the beat, the thing under the playhead jumps: lines swell to 1.45 times their width for the first half of each step, stickers to 1.35 and robots to 1.25 for 90ms, with no easing. With reduced motion requested the jumps stop and the playhead remains.

## Do's and Don'ts

### Do:
- **Do** set every word at 15px in M PLUS Rounded 1c and rank it by weight (500, 700, 800).
- **Do** keep chrome to candy pink, plum and sticker paper, and give the saturated pen and drum inks to the stage.
- **Do** give anything placed on the stage a white cut edge and the soft plum sticker shadow.
- **Do** tell drums apart by sticker shape as well as colour.
- **Do** step beat motion in a single jump with no easing, and remove it under reduced motion while keeping the playhead.
- **Do** keep controls as full pills labelled in plain words, using the existing shadcn components.
- **Do** keep UI text to the minimum: one sentence before the first play, one hint while the stage is nearly empty, and nothing else.

### Don't:
- **Don't** use italic or oblique text anywhere, including canvas text, wordmarks and labels.
- **Don't** put all-caps eyebrows, kickers or decorative labels above anything.
- **Don't** use JetBrains Mono (or any alias of it) anywhere, including fallback stacks.
- **Don't** use em dashes in any copy, label or generated text.
- **Don't** put an accent stripe on one side of a container, by border, pseudo-element, background or shadow.
- **Don't** use gradient text, glass panels, glows or neon effects.
- **Don't** add text sizes beyond 15px or uppercase labels to create hierarchy.
- **Don't** draw ruled grid lines; mark intersections with registration ticks and dots.
- **Don't** drift toward the dark studio-plugin look: knobs, meters, black panels, a piano roll with one neon accent.
- **Don't** add hard offset shadows; the only shadow is the soft, downward plum one.
