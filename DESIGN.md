---
name: Scribble Loop
description: A bright photo sticker booth where the scribbles on your own picture play as a loop.
colors:
  bar-candy-pink: "oklch(0.8 0.15 352)"
  booth-backdrop: "oklch(0.93 0.045 326)"
  plum-ink: "oklch(0.27 0.09 340)"
  plum-deep: "oklch(0.2 0.07 340)"
  plum-soft: "oklch(0.4 0.09 340)"
  plum-muted: "oklch(0.47 0.08 340)"
  sticker-paper: "oklch(0.985 0.012 345)"
  blush-wash: "oklch(0.94 0.04 345)"
  blush-muted: "oklch(0.9 0.06 348)"
  blush-track-hover: "oklch(0.86 0.07 348)"
  plum-hairline: "oklch(0.27 0.09 340 / 0.16)"
  plum-hairline-subtle: "oklch(0.27 0.09 340 / 0.09)"
  plum-rule-strong: "oklch(0.27 0.09 340 / 0.32)"
  plum-tint: "oklch(0.27 0.09 340 / 0.1)"
  thumb-white: "oklch(100% 0 0)"
  dialog-scrim: "oklch(10% 0 0 / .46)"
  pen-white: "oklch(0.995 0.005 345)"
  mint-highlight: "oklch(0.88 0.1 185)"
  pen-pink: "oklch(0.68 0.25 357)"
  pen-mint: "oklch(0.8 0.15 185)"
  pen-glass: "oklch(0.86 0.17 92)"
  pen-lilac: "oklch(0.66 0.21 305)"
  pen-yellow: "oklch(0.9 0.17 98)"
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
  control-inner: "10px"
  control: "14px"
  control-lg: "16px"
  panel: "20px"
  surface: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  bar:
    backgroundColor: "{colors.bar-candy-pink}"
    textColor: "{colors.plum-ink}"
    padding: "8px 16px"
    height: "104px"
  button-primary:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.booth-backdrop}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-primary-lg:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.booth-backdrop}"
    typography: "{typography.body}"
    rounded: "{rounded.control-lg}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.blush-wash}"
  button-ghost:
    textColor: "{colors.plum-soft}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.blush-wash}"
    textColor: "{colors.plum-ink}"
  segmented-control:
    backgroundColor: "{colors.blush-wash}"
    rounded: "{rounded.control}"
    padding: "3px"
  segmented-item:
    textColor: "{colors.plum-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.control-inner}"
    padding: "0 12px"
    height: "32px"
  segmented-item-selected:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.control-inner}"
  select-trigger:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  select-list:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.control-lg}"
    padding: "6px"
  select-item:
    textColor: "{colors.plum-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control-inner}"
    padding: "0 34px 0 11px"
    height: "36px"
  select-item-highlight:
    backgroundColor: "{colors.blush-wash}"
  dropdown-menu:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.panel}"
    padding: "5px"
  dropdown-item:
    textColor: "{colors.plum-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 11px"
    height: "36px"
  dropdown-item-highlight:
    backgroundColor: "{colors.blush-wash}"
  popover:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.panel}"
    padding: "16px"
  dialog:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.surface}"
    padding: "20px"
    width: "440px"
  switch-track:
    backgroundColor: "{colors.blush-muted}"
    rounded: "{rounded.pill}"
    padding: "3px"
    width: "42px"
    height: "24px"
  switch-track-on:
    backgroundColor: "{colors.plum-ink}"
  switch-thumb:
    backgroundColor: "{colors.thumb-white}"
    rounded: "{rounded.pill}"
    size: "18px"
  slider-track:
    backgroundColor: "{colors.blush-muted}"
    rounded: "{rounded.pill}"
    height: "6px"
  slider-fill:
    backgroundColor: "{colors.plum-ink}"
    rounded: "{rounded.pill}"
  slider-thumb:
    backgroundColor: "{colors.thumb-white}"
    rounded: "{rounded.pill}"
    size: "22px"
  message-bubble:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.surface}"
    padding: "8px 16px"
  alert-band:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.sticker-paper}"
    typography: "{typography.body}"
    padding: "8px 16px"
  fingertip-pill:
    backgroundColor: "{colors.pen-white}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  fingertip-pill-pressed:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.pen-white}"
    rounded: "{rounded.pill}"
---

# Design System: Scribble Loop

## Overview

**Creative North Star: "The sticker booth pen"**

The screen is a bright photo sticker booth. You stand in front of the camera, your own picture fills the stage under a pink exposure, and everything you place on it is drawn with booth pen: a saturated colour core, a thick white cut edge, a soft plum drop shadow. The scribble is the instrument. A candy pink bar holds every control at the top in two deliberate rows; the rest of the viewport belongs to the grid.

The shell is quiet and the ink is loud. The controls are Arc UI components with Arc's semantic tokens retuned to the booth: candy pink bar, sticker paper surfaces, plum text and hairlines, so the saturated pens, stickers and robots on the stage carry all of the colour. Rank in the controls comes from weight and plum depth, never from size or case. Stage motion is tied to the beat and stepped; chrome motion is Arc's short, non-overshooting springs.

The world refuses the dark studio-plugin look: no knobs, meters, black panels or a piano-roll grid with one neon accent.

**Key Characteristics:**
- Bright pink-lilac booth backdrop, plum ink for every word.
- Booth pen treatment on everything placed: colour core, white edge, soft plum shadow.
- A line's pen colour is its sound.
- One rounded gothic face at one size, rank by weight.
- Softly rounded Arc controls (14px) on a single candy pink bar of two rows.
- Registration ticks instead of ruled grid lines.
- Beat-locked, stepped motion on the stage; quick settling springs in the chrome.

## Colors

A candy-and-plum shell around a sweet-shop set of saturated pen inks; every colour is authored in OKLCH. The shell colours are Arc UI's semantic tokens (`src/components/arc/foundation.css`) retuned in `src/index.css`.

### Primary
- **Plum ink** (plum-ink; Arc `--foreground`, `--accent`, `--control-on`, `--focus-ring`): every word, the primary button fill, the switch when on, the slider fill, grid ticks at reduced alpha, the cursor core, the pedal ring, the pressed fingertip pill and the camera alert band. It is the only dark in the shell.
- **Plum deep** (plum-deep; Arc `--accent-strong`): the keyboard focus outline, mixed at 72%.
- **Candy pink** (bar-candy-pink; `--bar`): the control bar and nothing else. The favicon and `theme-color` carry its hex approximation (#f58fbf).

### Secondary
- **Pen inks** (pen-pink, pen-mint, pen-glass, pen-lilac): melody lines. Each lead sound has its own pen: Supersaw pink, Rubber mint, Glass gold, Chip lilac. A line shows what it plays, and changing its sound changes its colour. The writing hand's fingertip pills wear the pen of the sound each finger draws, and the pointing cursor is filled with the current pen.
- **Drum inks** (drum-kick-red, pen-yellow for snare, drum-clap-pink, pen-mint for pop, drum-zap-blue, drum-hat-orange): one per drum sticker. Each drum also has its own silhouette, so colour is never the only cue.
- **Robot tints**: the five robot kinds reuse inks already in the world, laid over the sprite at 82%: Singer pen mint, Swapper hat orange, Eater kick red, Dropper pen lilac, Bumper zap blue. The same tint is the 14px dot before each name in the Robots menu.

### Tertiary
- **Mint highlight** (mint-highlight): text selection only. Pen mint, its saturated sibling, draws the pedal ring's second-control arc and the Singer's ribbon.

### Neutral
- **Booth backdrop** (booth-backdrop; `--background`): the page and stage background, pale pink-lilac, and the text on a primary button.
- **Sticker paper** (sticker-paper; `--surface`, `--surface-raised`, `--accent-foreground`): secondary buttons, select triggers, the selected segment, menus, popovers, the dialog, message bubbles, and text on plum.
- **Blush wash** (blush-wash; `--surface-muted`): the segmented control's well, hover and highlight fills for buttons, select options and menu items.
- **Blush** (blush-muted; `--control-track`) and its hover step (blush-track-hover): switch and slider tracks.
- **Soft plum** (plum-soft; `--text-secondary`): ghost buttons (Undo, Clear), the How to play table headers.
- **Muted plum** (plum-muted; `--text-muted`): unselected segments and select chevrons.
- **Plum hairlines** (plum-hairline 16%, plum-hairline-subtle 9%, plum-rule-strong 32%, plum-tint 10%; Arc `--border`, `--border-subtle`, `--border-strong`, `--accent-subtle`): control and panel outlines, menu separators, the dialog header rule and table rules, and hover or open borders.
- **Thumb white** (thumb-white; Arc `--control-thumb`): switch and slider thumbs, left at Arc's pure white so they read on either track state.
- **Dialog scrim** (dialog-scrim): Arc's dimming layer behind the How to play dialog.
- **Pen white** (pen-white): the cut edge on lines, stickers, sprites and the pedal ring, the playhead core, the glint, the dotted pad guides, effects-hand fingertip pills and the halo behind canvas text. Canvas only.
- **Booth wash** (booth-wash): screened over the live camera image so its shadows lift to pink, followed by a 25% veil of the backdrop.

### Named Rules
**The Two Colour Shell Rule.** Chrome uses only candy pink, plum and its alpha hairlines, sticker paper and the blush steps. Saturated colour belongs to things on the stage. The one exception is a 14px round dot in a menu item that names the stage ink it stands for (a robot's tint).

**The Plum Only Rule.** All text is plum: plum ink, soft plum, muted plum, or paper on plum. No grey text, no coloured text.

**The Ink Is The Sound Rule.** A melody line's colour comes from its sound, never from the order it was drawn in.

## Typography

**Display Font:** M PLUS Rounded 1c (with ui-rounded, system-ui, sans-serif), set as Arc's `--font-display`
**Body Font:** M PLUS Rounded 1c, the same family, set as Arc's `--font-body` and on the root
**Label/Mono Font:** none. Numbers that change (tempo) use tabular figures, not a monospace face.

**Character:** One rounded Japanese gothic, loaded locally at weights 500, 700 and 800 for Latin. Its soft terminals match the round pen caps and the softly rounded controls. Arc's `--text-sm` and `--text-field` are retuned to 15px so every control, option and field sits at the one size; `--tracking-body` is 0.

### Hierarchy
- **Wordmark** (800, 15px): the product name at the left of the bar, shown from 1700px wide and kept for screen readers below that. The section headings in the How to play guide share it.
- **Label** (700, 15px): the tempo readout ("160 bpm"), the "Pedal hand" heading in the Pedals panel, message bubbles, fingertip pills, the note names drawn down the right edge of the canvas (4px white halo) and the pedal readout over its ring (5px white halo).
- **Body** (500, 15px): every Arc control, option and menu item, visible field labels inside panels, the dialog body, the guide's lists and table, and the camera alert band.

### Named Rules
**The One Size Rule.** Every piece of text is 15px. Rank comes from weight (500, 700, 800), from plum depth, and from plum fill versus paper fill, never from a larger size or uppercase.

**The Upright Rule.** No italic or oblique text anywhere, including canvas text. `font-synthesis: none` is set on the root so the browser never fakes a slant or a bold.

## Layout

A full-height column: the bar on top, an optional alert band, and the stage taking every remaining pixel.

The bar is a grid of two deliberate rows with 8px between rows and between controls, 8px by 16px padding, and 40px controls (Arc `--control-height-md`), so it stands 104px tall at 1280 to 1440px and wider. Row one is the music: Play or Stop, the tempo slider (112px) with its value beside it (72px), Key (96px), Scale (192px), Sound (128px), Quantize (160px), then Chords and arp. Row two is the hands and the canvas: the Draw, Erase and Effects segmented control, Robots, Pedals, Undo, Clear, then How to play and the Camera switch pushed to the right. Each row wraps on its own when narrower; a 390px phone shows seven rows, accepted because the instrument is laptop-first.

In the bar every field names itself by its value ("Key A", "Minor pentatonic", "Supersaw", "Quantize 1/16"), so Arc's field labels and the slider's label and value header are hidden for screen readers only. Inside panels the labels are visible above each field.

Popover panels hold the rest: Chords and arp (256px wide: Chord, Arpeggiator, Arpeggio speed) and Pedals (288px: Pedal hand, a pedal per hand, Mouse plays, Hold pedals on, Release all pedals), each a column with 12px gaps.

The stage draws its grid inset 12px top and bottom, with a 52px left gutter for the drum lane stickers and a 52px right gutter for note names (34px and 42px below 640px). Floating messages are centred and capped at the stage width minus 32px; the in-play hint sits 20px above the bottom edge.

**The Edges Rule.** Controls live in the bar and the gutters. The grid itself carries no chrome; the pedal ring, its guides and the fingertip pills are instrument readouts that exist only while a hand or pedal is in play.

## Elevation & Depth

Depth is a sticker effect on the stage and one floating layer in the chrome. One soft plum shadow says "this is stuck on top": it sits under placed ink, fingertip pills, the floating message bubbles. Bar controls are flat with plum hairlines; a light resting shadow appears only on hover. Menus, popovers and the dialog float on Arc's floating shadow retuned to plum.

Stage order, bottom to top: grid and gutters, Singer ribbons, walking robots, melody lines, drum stickers, note names, strokes in progress, playhead, glints, pedal rings, robot hands, fingertip pills, cursors. Robots walk under placed ink so the player's own marks always stay readable.

### Shadow Vocabulary
- **Sticker shadow** (canvas: plum at 35%, blur 8, offset y 3): lines, drum stickers, walking robots, the pedal ring. The robot hand uses blur 5, offset 2; the cursor and fingertip pills blur 6, offset 2; the glint blur 6 with no offset. The Singer's ribbon has no shadow.
- **Lift** (`box-shadow: 0 3px 10px oklch(0.27 0.09 340 / 0.25)`): message bubbles over the stage.
- **Floating** (`--shadow-floating: 0 18px 40px oklch(0.27 0.09 340 / 0.16), 0 3px 10px oklch(0.27 0.09 340 / 0.08)`): open select lists, dropdown menus, popovers and the dialog.
- **Resting** (Arc `--shadow-resting`, a 1px hairline shadow): hover on secondary buttons and the dropdown trigger, and the selected segment.

### Named Rules
**The Stuck On Rule.** A shadow is always soft, falls straight down, and only marks something sitting over the stage or floating over it. No hard offset shadows, no glow.

## Shapes

Everything is rounded, nothing is square. Arc's radius tokens are the system's: controls 14px (`--radius-control`), large buttons and select lists 16px, menus and popovers 20px (`--radius-panel`), the dialog and message bubbles 24px (`--radius-surface`), tracks, thumbs, fingertip pills and dots full round (`--radius-pill`). Nested shapes step in so their corners stay concentric: segments and select options 10px inside a 14px well, menu items 14px inside a 20px menu. Lines and ribbons have round caps and joins. Drum stickers are drawn shapes, one per drum: a disc (kick), a five-point star (snare), a heart (clap), a ring (pop), a lightning bolt (zap) and a four-point sparkle (hat). The sparkle doubles as the glint where the playhead crosses a sounding line.

The grid is not ruled. It marks intersections with registration crosses at every beat (4px arms, 6px and heavier at the bar line) and 1px dots between. Drum lanes in the left gutter are divided by short plum rules.

**The Cut Edge Rule.** Anything placed on the stage gets a white edge roughly as thick as its colour core (lines and the Singer ribbon: edge 2.1 times the core width; stickers: 0.62 of the radius; robot sprites: 8px; robot hand parts: 5px; the pedal ring: 12px under a 6px core). Without the edge it does not belong to this world.

## Components

Controls are Arc UI components (`src/components/arc/<name>`), used as shipped with their CSS modules untouched; the booth comes entirely from the retuned tokens. Arc's motion tokens (`src/components/arc/lib/motion-tokens.ts`) govern chrome motion: 100 to 200ms state changes on the standard ease, and panels that settle on a 440ms spring that never overshoots. Under reduced motion Arc drops these transitions.

### Buttons
- **Shape:** 14px corners, 40px tall (`md`); `lg` is 44px with 16px corners and 20px side padding, used for the start buttons over the stage.
- **Primary:** plum fill, backdrop text, 16px side padding. Play and Stop only, at least 80px wide.
- **Secondary:** paper fill, plum text, plum hairline border. Chords and arp, Pedals, How to play, Release all pedals.
- **Ghost:** no fill, soft plum text; hover fills blush wash and turns the text plum. Undo and Clear.
- **Hover / Focus:** primary fades to 91% with a resting shadow; secondary fills blush wash. Keyboard focus is Arc's 2px outline in plum deep at 72%, 2px offset; pointer focus draws no ring.
- **Disabled:** stays in place so the row does not shift. Undo and Clear disable when there is nothing to undo or clear.

### Segmented control
- **Style:** a blush wash well with a plum hairline, 14px corners, 3px padding; items are 32px with 10px corners and muted plum text.
- **State:** the selected item sits on a paper tile with a hairline and resting shadow, in plum ink; the tile slides between items. Draw, Erase and Effects in the bar; Left, Right and Both full width in the Pedals panel.

### Select
- **Trigger:** paper, plum hairline, 14px corners, 40px tall, the current value in words with a muted plum chevron. Hover and open fill blush wash with the strong hairline.
- **List:** paper, 16px corners, 6px padding, floating shadow, as wide as its trigger, rising in over 200ms. Options are 36px with 10px corners; the highlighted option fills blush wash and the chosen one shows a check.

### Dropdown menu
- **Trigger:** Robots, a secondary-style trigger with a chevron, held to 40px in the bar.
- **Menu:** paper, 20px corners, 5px padding, floating shadow, at least 192px wide, settling on a spring. Items are 36px with 14px corners and a blush wash highlight that slides between them. Each robot item leads with a 14px dot in its tint; items disable when the grid holds its maximum.

### Popover
- **Panel:** paper, plum hairline, 20px corners, 16px padding, floating shadow, settling from its trigger on a spring. Holds the Chords and arp and Pedals panels, whose field labels are visible.

### Switch
- **Style:** a 42 by 24px blush track with an 18px white thumb; on, the track fills plum. The label sits to the right in body weight. Camera in the bar, Hold pedals on in the Pedals panel.

### Slider
- **Style:** a 6px blush track with a plum fill and a 22px white thumb. Tempo shows its value beside the slider in label weight with tabular figures; the slider's own header is hidden in the bar.

### Dialog
- **Style:** the How to play guide (`src/HowTo.tsx`): paper, 24px corners, at most 440px wide, over Arc's dim, blurred scrim. A header with a 32px close button sits above a hairline rule; header and body pad 20px.
- **Content:** sentence case section headings at 800, disc lists with 4px gaps, and a full-width table with soft plum header cells and a plum hairline under each row.

### Message bubble and alert band
- **Bubble:** paper, 24px corners, 8px by 16px padding, label weight, lift shadow, centred over the stage. Holds the one-sentence explanation before the first play and the gesture hint while the stage is nearly empty or the mouse is playing a pedal.
- **Alert band:** a full-width plum strip under the bar with paper body text, shown only when the camera is blocked or tracking failed.

### Stage ink (signature component)
The canvas layer is the system's signature, and everything on it wears the booth pen treatment.

- **Melody lines:** a 5 to 9px core by stage height in the pen of the line's sound, over a white edge 2.1 times as wide.
- **Robots:** the AnyMachine Stilt walk cycle cut into stickers with an 8px white edge, one sheet per kind, tinted at 82% with that kind's ink. They walk under all placed ink.
- **Singer ribbon:** each Singer drags one continuous ribbon of booth pen in pen mint (4 to 7px core, white edge 2.1 times as wide), smoothed through its samples and fading to zero alpha toward the tail. It fades to the same colour at zero alpha, never to transparent black, and lies under every robot.
- **Robot hand:** laid over each tracked hand and built from AnyMachine Stilt parts: one limb segment stretched along each finger bone, a bar across the knuckles and one strut to the wrist (no webbing over the palm), with a knee cap on all 21 joints. Parts are tinted plum with a 5px white edge; girth follows hand size from 9 to 26px.
- **Fingertip pills:** each fingertip carries a full-round pill 24px above it saying what pinching that finger does, in label type (pill 1.75 times the type tall, sticker shadow at blur 6, offset 2). On the writing hand each pill wears the pen of its sound with plum text; on the effects hand pills are pen white with plum text and name the pedal's variant, and the pedal's name sits in a plum pill on the palm. The pressed finger's pill goes solid plum with white text.
- **Cursor:** hovering is a plum ring of 19px radius on a 10px white edge; drawing is a filled plum dot of 11px radius with a white edge; pointing is a dot of 14px radius filled with the current pen ink on a 6px white edge; erasing is a dashed plum ring on a white edge at the erase radius.
- **Pedal ring:** a 26px radius ring at the point being played, 6px plum on a 12px white edge, with a pen mint arc of the same weight running clockwise from the top to show the pedal's second control. A live readout of the pedal and its variant ("Echo 1/8 dotted") sits 46px above in label type with a 5px white halo. Dotted guides (2px white at 85%, 2px dots with 8px gaps) run the full width and height of the grid through the point. Every pressed or held pedal shows its own ring.
- **Playhead:** a 4px white bar over a 7px plum bar at 50%.

On the beat, the thing under the playhead jumps: lines swell to 1.45 times their width for the first half of each step, drum stickers to 1.35 for 90ms, and a robot lifts to 1.08 for 90ms when it acts, with no easing. With reduced motion requested the jumps stop and the playhead remains.

## Do's and Don'ts

### Do:
- **Do** set every word at 15px in M PLUS Rounded 1c and rank it by weight (500, 700, 800).
- **Do** keep chrome to candy pink, plum, sticker paper and the blush steps, and give the saturated pen, drum and robot inks to the stage; a dot that names a stage ink is the only colour allowed in a control.
- **Do** colour a melody line by its sound, and give any new robot kind an ink already in the pen or drum sets.
- **Do** give anything placed on the stage a white cut edge and the soft plum sticker shadow.
- **Do** keep robots under placed ink so the player's marks stay readable.
- **Do** tell drums apart by sticker shape as well as colour.
- **Do** step beat motion in a single jump with no easing, and remove it under reduced motion while keeping the playhead.
- **Do** build controls from the Arc UI components in `src/components/arc`, styled only by retuning Arc's tokens in `src/index.css`, and use Arc's radius, control height and motion tokens rather than new values.
- **Do** let bar fields name themselves by their value and keep their labels for screen readers; show labels inside panels.
- **Do** keep UI text to the minimum: one sentence before the first play, one hint while the stage is nearly empty or the mouse plays a pedal, fingertip pills and the pedal readout while a hand or pedal is in play.

### Don't:
- **Don't** use italic or oblique text anywhere, including canvas text, wordmarks and labels.
- **Don't** put all-caps eyebrows, kickers or decorative labels above anything, including panel field labels.
- **Don't** use JetBrains Mono (or any alias of it) anywhere, including fallback stacks.
- **Don't** use em dashes in any copy, label or generated text.
- **Don't** put an accent stripe on one side of a container, by border, pseudo-element, background or shadow.
- **Don't** use gradient text, glass panels, glows or neon effects, including Arc's unused brand gradient tokens.
- **Don't** add text sizes beyond 15px or uppercase labels to create hierarchy.
- **Don't** draw ruled grid lines; mark intersections with registration ticks and dots. The pedal pad's dotted guides are the only full-length lines, and only while a pedal is down.
- **Don't** drift toward the dark studio-plugin look: knobs, meters, black panels, a piano roll with one neon accent.
- **Don't** add hard offset shadows; every shadow is soft and falls straight down.
