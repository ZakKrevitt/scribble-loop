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
  ink-swatch:
    rounded: "{rounded.pill}"
    size: "14px"
  select-menu:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.base}"
    padding: "4px"
  select-item-focus:
    backgroundColor: "{colors.mint-highlight}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.base}"
  dropdown-menu:
    backgroundColor: "{colors.sticker-paper}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.base}"
    padding: "4px"
  dropdown-item:
    textColor: "{colors.plum-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "6px 12px"
  dropdown-item-focus:
    backgroundColor: "{colors.mint-highlight}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.base}"
  dropdown-check-item:
    textColor: "{colors.plum-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "6px 36px 6px 12px"
  dropdown-group-label:
    textColor: "{colors.plum-soft}"
    typography: "{typography.label}"
    padding: "4px 12px"
  dropdown-value:
    textColor: "{colors.plum-soft}"
    typography: "{typography.body}"
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

The shell is quiet and the ink is loud. Chrome stays in two colours (candy pink and plum, with off-white sticker paper for light controls), so the saturated pens, stickers and robots on the stage carry all of the colour. Rank in the controls comes from weight, never from size or case. Motion is tied to the beat and stepped: things under the playhead jump to full size for a fraction of a beat and jump back, with no easing.

The world refuses the dark studio-plugin look: no knobs, meters, black panels or a piano-roll grid with one neon accent.

**Key Characteristics:**
- Bright pink-lilac booth backdrop, plum ink for every word.
- Booth pen treatment on everything placed: colour core, white edge, soft plum shadow.
- A line's pen colour is its sound.
- One rounded gothic face at one size, rank by weight.
- Fully round controls on a single candy pink bar.
- Registration ticks instead of ruled grid lines.
- Beat-locked, stepped motion with no easing.

## Colors

A candy-and-plum shell around a sweet-shop set of saturated pen inks; every colour is authored in OKLCH.

### Primary
- **Plum ink** (plum-ink): every word on the page, the pressed and primary control fill, focus rings, grid ticks at reduced alpha, the cursor core, the pedal ring, and the camera alert band. It is the only dark in the system.
- **Candy pink** (bar-candy-pink): the control bar and nothing else. The favicon and `theme-color` carry its hex approximation (#f58fbf).

### Secondary
- **Pen inks** (pen-pink, pen-mint, pen-glass, pen-lilac): melody lines. Each lead sound has its own pen: Supersaw pink, Rubber mint, Glass gold, Chip lilac. A line shows what it plays, and changing its sound changes its colour. The Sound select shows the current pen as a swatch, and the pointing cursor is filled with it.
- **Drum inks** (drum-kick-red, pen-yellow for snare, drum-clap-pink, pen-mint for pop, drum-zap-blue, drum-hat-orange): one per drum sticker. Each drum also has its own silhouette, so colour is never the only cue.
- **Robot tints**: the five robot kinds reuse inks already in the world, laid over the sprite at 82%: Singer pen mint, Swapper hat orange, Eater kick red, Dropper pen lilac, Bumper zap blue. No robot colour exists outside the pen and drum sets.

### Tertiary
- **Mint highlight** (mint-highlight): the focused item in an open menu, an open submenu's trigger, and text selection. Used sparingly so it reads as "this one". Pen mint, its saturated sibling, draws the pedal ring's second-control arc and the Singer's ribbon.

### Neutral
- **Booth backdrop** (booth-backdrop): the page and stage background, pale pink-lilac.
- **Sticker paper** (sticker-paper): light control fills, open menus, message bubbles, and text on plum.
- **Pen white** (pen-white): the cut edge on lines, stickers, sprites and the pedal ring, the playhead core, the glint, the dotted pad guides, and the halo behind canvas text. Canvas only. The 2px ring around a chrome swatch is plain white.
- **Blush** (blush-muted): slider track and default toggle hover.
- **Soft plum** (plum-soft): secondary text: the select chevron, menu group labels, the current-value column in menus, and the robot descriptions.
- **Plum hairline** and **plum field** (plum-hairline, plum-field): borders, menu separators and input outlines at 18% and 28% plum.
- **Booth wash** (booth-wash): screened over the live camera image so its shadows lift to pink, followed by a 25% veil of the backdrop.
- **Alarm red** (alarm-red): reserved for destructive and invalid states inherited from the component library; nothing on the current screen uses it.

### Named Rules
**The Two Colour Shell Rule.** Chrome uses only candy pink, plum and sticker paper. Saturated colour belongs to things on the stage. The one exception is a 14px round swatch in a control or menu item that names the stage ink it stands for (a sound's pen, a robot's tint).

**The Plum Only Rule.** All text is plum ink, soft plum for a secondary value, or sticker paper on plum. No grey text, no coloured text.

**The Ink Is The Sound Rule.** A melody line's colour comes from its sound, never from the order it was drawn in.

## Typography

**Display Font:** M PLUS Rounded 1c (with ui-rounded, system-ui, sans-serif)
**Body Font:** M PLUS Rounded 1c, the same family
**Label/Mono Font:** none. Numbers that change (tempo) use tabular figures, not a monospace face.

**Character:** One rounded Japanese gothic, loaded locally at weights 500, 700 and 800 for Latin. Its soft terminals match the round pen caps and pill controls.

### Hierarchy
- **Wordmark** (800, 15px): the product name at the left of the bar, shown from 1700px wide and kept for screen readers below that.
- **Label** (700, 15px): every control, menu item, menu group label, message bubble, the note names drawn down the right edge of the canvas (4px white halo), and the pedal name over its ring (5px white halo).
- **Body** (500, 15px): the camera alert band, and the soft plum second column in menus (current values, robot descriptions).

### Named Rules
**The One Size Rule.** Every piece of text is 15px. Rank comes from weight (500, 700, 800), from soft plum versus plum, and from plum fill versus paper fill, never from a larger size or uppercase.

**The Upright Rule.** No italic or oblique text anywhere, including canvas text. `font-synthesis: none` is set on the root so the browser never fakes a slant or a bold.

## Layout

A full-height column: the bar on top, an optional alert band, and the stage taking every remaining pixel. The bar holds, in order: Play or Stop, tempo, Key, Scale, Sound, Settings, the Draw, Erase and Effects toggle, Robots, Pedals, Undo, Clear, then Camera pushed to the far right. Each row is 56px (8px vertical padding around 40px controls) with 8px gaps.

The bar is one row at 1440px and wider and wraps to two rows from about 1024 to 1366px. Below 1600px the gaps tighten to 6px, control side padding to 12px, the tempo slider to 96px, and the pentatonic scales shorten to "Major pent." and "Minor pent." (the menu keeps full names). Below 640px the order changes: Play, tempo, Key, Scale, Sound and Settings, then Camera, then the toggle, Robots, Pedals, Undo and Clear; the bar's side padding drops to 12px and the tempo slider to 80px. A 390px phone shows five rows. That is accepted: the instrument is laptop-first.

The stage draws its grid inset 12px top and bottom, with a 52px left gutter for the drum lane stickers and a 52px right gutter for note names (34px and 42px below 640px). Floating messages are centred and capped at the stage width minus 32px; the in-play hint sits 20px above the bottom edge.

**The Edges Rule.** Controls live in the bar and the gutters. The grid itself carries no chrome; the pedal ring and its guides are instrument readouts that exist only while a pedal is pressed or held.

## Elevation & Depth

Depth is a sticker effect, not a layering system. One soft plum shadow says "this is stuck on top": it sits under placed ink on the canvas and under the floating message bubbles and the secondary start button. The bar and its controls are flat.

Stage order, bottom to top: grid and gutters, Singer ribbons, walking robots, melody lines, drum stickers, note names, strokes in progress, playhead, glints, pedal rings, robot hands, cursors. Robots walk under placed ink so the player's own marks always stay readable.

### Shadow Vocabulary
- **Sticker shadow** (canvas: plum at 35%, blur 8, offset y 3): lines, drum stickers, walking robots, the pedal ring. The robot hand uses blur 5, offset 2; the cursor blur 6, offset 2; the glint blur 6 with no offset. The Singer's ribbon has no shadow.
- **Lift** (`box-shadow: 0 3px 10px oklch(0.27 0.09 340 / 0.25)`): message bubbles and the "Start with mouse" button over the stage.
- **Menu** (component library medium shadow plus a 1px ring of plum at 10%): open select and dropdown menus. Submenus use the library's large shadow with the same ring.

### Named Rules
**The Stuck On Rule.** A shadow is always soft and plum, always falls straight down, and only marks something sitting over the stage. No hard offset shadows, no glow.

## Shapes

Everything is round. Controls are full pills, message bubbles have 24px corners, menus and menu items use the 14px base radius, and ink swatches are 14px discs with a 2px white ring. Lines and ribbons have round caps and joins. Drum stickers are drawn shapes, one per drum: a disc (kick), a five-point star (snare), a heart (clap), a ring (pop), a lightning bolt (zap) and a four-point sparkle (hat). The sparkle doubles as the glint where the playhead crosses a sounding line.

The grid is not ruled. It marks intersections with registration crosses at every beat (4px arms, 6px and heavier at the bar line) and 1px dots between. Drum lanes in the left gutter are divided by short plum rules.

**The Cut Edge Rule.** Anything placed on the stage gets a white edge roughly as thick as its colour core (lines and the Singer ribbon: edge 2.1 times the core width; stickers: 0.62 of the radius; robot sprites: 8px; robot hand parts: 5px; the pedal ring: 12px under a 6px core). Without the edge it does not belong to this world.

## Components

Controls are shadcn components on Base UI, restyled as fat, round, bold booth buttons.

### Buttons
- **Shape:** full pill (9999px), 40px tall in the bar, 48px for the two start buttons.
- **Primary:** plum fill, paper text, 14px side padding (24px for start buttons). Play and Stop carry a 16px Lucide icon before the word.
- **Light:** paper fill, plum text, no border. Used for Settings, Robots, Pedals, Undo, Clear and every select trigger.
- **Hover / Focus:** hover fades the fill slightly. Focus is a 3px solid plum outline with a 2px offset, set globally so it outranks component focus styles.
- **Disabled:** 50% opacity on the pink bar, still in place so the row does not shift. Undo and Clear disable when there is nothing to undo or clear, Robots when the grid holds its maximum.

### Segmented tool
- **Style:** Draw, Erase and Effects sit in a paper pill with 4px padding; items are 32px pills.
- **State:** the pressed item fills plum with paper text, matching the pressed Camera toggle.

### Select menus
- **Trigger:** a light pill showing the current value in words ("Key A", "Minor pentatonic", "Supersaw") with a chevron. The Sound trigger leads with the current pen as a swatch.
- **Menu:** paper, 14px corners, 4px padding, at least 176px wide, opening below the trigger with no open or close animation. Options are 15px label weight with 6px by 12px padding and 36px on the right; the focused option fills mint and the chosen one shows a check. Each Sound option carries its pen swatch.

### Dropdown menus
- **Trigger:** a light pill with a plain word (Settings, Robots, Pedals) and no chevron.
- **Menu:** paper, 14px corners, 4px padding, at least 176px wide and sized to its content, opening below and aligned to the trigger's start with a 4px gap, no open or close animation, menu shadow.
- **Item:** label weight, 6px by 12px padding, 14px corners; focus fills mint with plum text. A robot item reads swatch, name, then its description.
- **Submenu:** the trigger is an item with a muted second column showing the current value and a chevron at the right, 24px between label and value. The submenu opens to the right, aligned to the trigger, with the large menu shadow; its trigger stays mint while it is open. Settings holds four submenus (Chord, Arpeggiator, Arpeggio speed, Drum timing); Pedals holds one per gesture.
- **Group label:** sentence case, label weight, soft plum, 12px side padding ("Mouse plays", "Pedal hand", "Gestures"). Never uppercase, never above the menu as a heading.
- **Radio and checkbox items:** label weight with 36px right padding; the chosen or checked item shows a plain check at the right. No radio dots or boxes.
- **Muted second column:** body weight (500) in soft plum, pushed right with `margin-left: auto` (16px minimum gap in the Robots menu). It holds a current value in a submenu trigger or a short description of what a robot does.
- **Separator:** a 1px plum hairline across the full menu width between groups.

### Slider
- **Style:** 8px blush track with a plum fill, a 20px paper thumb with a 2px plum ring. Tempo sits beside its value in tabular figures ("160 bpm").

### Message bubble and alert band
- **Bubble:** paper, 24px corners, 8px by 16px padding, label weight, lift shadow, centred over the stage. Holds the one-sentence explanation before the first play and the gesture hint while the stage is nearly empty or the mouse is playing a pedal.
- **Alert band:** a full-width plum strip under the bar with paper body text, shown only when the camera is blocked or tracking failed.

### Stage ink (signature component)
The canvas layer is the system's signature, and everything on it wears the booth pen treatment.

- **Melody lines:** a 5 to 9px core by stage height in the pen of the line's sound, over a white edge 2.1 times as wide.
- **Robots:** the AnyMachine Stilt walk cycle cut into stickers with an 8px white edge, one sheet per kind, tinted at 82% with that kind's ink. They walk under all placed ink.
- **Singer ribbon:** each Singer drags one continuous ribbon of booth pen in pen mint (4 to 7px core, white edge 2.1 times as wide), smoothed through its samples and fading to zero alpha toward the tail. It fades to the same colour at zero alpha, never to transparent black, and lies under every robot.
- **Robot hand:** laid over each tracked hand and built from AnyMachine Stilt parts: one limb segment stretched along each finger bone, a bar across the knuckles and one strut to the wrist (no webbing over the palm), with a knee cap on all 21 joints. Parts are tinted plum with a 5px white edge; girth follows hand size from 9 to 26px.
- **Cursor:** hovering is a plum ring of 19px radius on a 10px white edge; drawing is a filled plum dot of 11px radius with a white edge; pointing is a dot of 14px radius filled with the current pen ink on a 6px white edge, so the player sees which sound is loaded; erasing is a dashed plum ring on a white edge at the erase radius.
- **Pedal ring:** a 26px radius ring at the point being played, 6px plum on a 12px white edge, with a pen mint arc of the same weight running clockwise from the top to show the pedal's second control. The pedal's name sits 46px above in label type with a 5px white halo. Dotted guides (2px white at 85%, 2px dots with 8px gaps) run the full width and height of the grid through the point. Every pressed or held pedal shows its own ring.
- **Playhead:** a 4px white bar over a 7px plum bar at 50%.

On the beat, the thing under the playhead jumps: lines swell to 1.45 times their width for the first half of each step, drum stickers to 1.35 for 90ms, and a robot lifts to 1.08 for 90ms when it acts, with no easing. With reduced motion requested the jumps stop and the playhead remains.

## Do's and Don'ts

### Do:
- **Do** set every word at 15px in M PLUS Rounded 1c and rank it by weight (500, 700, 800).
- **Do** keep chrome to candy pink, plum and sticker paper, and give the saturated pen, drum and robot inks to the stage; a swatch that names a stage ink is the only colour allowed in a control.
- **Do** colour a melody line by its sound, and give any new robot kind an ink already in the pen or drum sets.
- **Do** give anything placed on the stage a white cut edge and the soft plum sticker shadow.
- **Do** keep robots under placed ink so the player's marks stay readable.
- **Do** tell drums apart by sticker shape as well as colour.
- **Do** step beat motion in a single jump with no easing, and remove it under reduced motion while keeping the playhead.
- **Do** keep controls as full pills labelled in plain words, using the existing shadcn components, and put further settings in a dropdown menu with sentence case group labels and the current value in a soft plum second column.
- **Do** keep UI text to the minimum: one sentence before the first play, one hint while the stage is nearly empty or the mouse plays a pedal, the pedal's name over its ring, and a short description per robot in the Robots menu.

### Don't:
- **Don't** use italic or oblique text anywhere, including canvas text, wordmarks and labels.
- **Don't** put all-caps eyebrows, kickers or decorative labels above anything, including menu group labels.
- **Don't** use JetBrains Mono (or any alias of it) anywhere, including fallback stacks.
- **Don't** use em dashes in any copy, label or generated text.
- **Don't** put an accent stripe on one side of a container, by border, pseudo-element, background or shadow.
- **Don't** use gradient text, glass panels, glows or neon effects.
- **Don't** add text sizes beyond 15px or uppercase labels to create hierarchy.
- **Don't** draw ruled grid lines; mark intersections with registration ticks and dots. The pedal pad's dotted guides are the only full-length lines, and only while a pedal is down.
- **Don't** drift toward the dark studio-plugin look: knobs, meters, black panels, a piano roll with one neon accent.
- **Don't** add hard offset shadows; the only shadow is the soft, downward plum one.
