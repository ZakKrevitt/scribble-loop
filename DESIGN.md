---
name: Scribble Loop
description: A pastel photo sticker booth where your scribbles play as a loop, framed by a pink console dashboard.
colors:
  chrome-plum-black: "oklch(0.15 0.045 340)"
  web-glow: "oklch(0.32 0.14 352 / 0.55)"
  web-line: "oklch(0.7 0.2 352 / 0.09)"
  web-line-faint: "oklch(0.7 0.2 352 / 0.06)"
  neon: "oklch(0.78 0.21 352)"
  neon-dim: "oklch(0.62 0.19 352 / 0.5)"
  neon-hairline: "oklch(0.62 0.19 352 / 0.25)"
  lit-pink: "oklch(0.83 0.17 352)"
  lit-pink-edge: "oklch(0.9 0.12 352)"
  lit-pink-tint: "oklch(0.78 0.21 352 / 0.18)"
  lit-plate-text: "oklch(0.17 0.06 340)"
  plate: "oklch(0.22 0.075 345 / 0.84)"
  plate-raised: "oklch(0.19 0.065 343 / 0.97)"
  plate-hover: "oklch(0.32 0.12 350 / 0.7)"
  console-text: "oklch(0.94 0.05 350)"
  console-text-soft: "oklch(0.82 0.09 350)"
  console-text-muted: "oklch(0.72 0.11 350)"
  track: "oklch(0.3 0.09 345)"
  track-hover: "oklch(0.36 0.11 348)"
  thumb-pearl: "oklch(0.96 0.03 350)"
  orb-off: "oklch(0.2 0.06 345)"
  orb-rim-lit: "oklch(0.97 0.02 350)"
  dialog-scrim: "oklch(10% 0 0 / .46)"
  booth-backdrop: "oklch(0.93 0.045 326)"
  booth-wash: "oklch(0.8 0.11 335)"
  plum-ink: "oklch(0.27 0.09 340)"
  pen-white: "oklch(0.995 0.005 345)"
  pen-pink: "oklch(0.68 0.25 357)"
  pen-mint: "oklch(0.8 0.15 185)"
  pen-glass: "oklch(0.86 0.17 92)"
  pen-lilac: "oklch(0.66 0.21 305)"
  pen-yellow: "oklch(0.9 0.17 98)"
  drum-kick-red: "oklch(0.62 0.24 22)"
  drum-clap-pink: "oklch(0.72 0.22 352)"
  drum-zap-blue: "oklch(0.68 0.18 255)"
  drum-hat-orange: "oklch(0.78 0.17 62)"
typography:
  heading:
    fontFamily: "'Chakra Petch', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.01em"
  control:
    fontFamily: "'Chakra Petch', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.01em"
  body:
    fontFamily: "'Chakra Petch', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.01em"
  canvas-label:
    fontFamily: "'M PLUS Rounded 1c', ui-rounded, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  control: "3px"
  panel: "4px"
  surface: "6px"
  cut: "9px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  bar:
    textColor: "{colors.console-text}"
    padding: "8px 12px"
  button-primary:
    backgroundColor: "{colors.lit-pink}"
    textColor: "{colors.lit-plate-text}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.console-text}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.plate-hover}"
  button-ghost:
    textColor: "{colors.console-text-soft}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.plate-hover}"
    textColor: "{colors.console-text}"
  select-trigger:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.console-text}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  select-list:
    backgroundColor: "{colors.plate-raised}"
    textColor: "{colors.console-text}"
    padding: "6px"
  segmented-control:
    backgroundColor: "{colors.plate-hover}"
    rounded: "{rounded.control}"
    padding: "3px"
  segmented-item-selected:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.console-text}"
  hand-panel:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.console-text}"
    rounded: "{rounded.panel}"
    padding: "16px"
    width: "216px"
  popover:
    backgroundColor: "{colors.plate-raised}"
    textColor: "{colors.console-text}"
    rounded: "{rounded.panel}"
  dialog:
    backgroundColor: "{colors.plate-raised}"
    textColor: "{colors.console-text}"
    typography: "{typography.body}"
    rounded: "{rounded.surface}"
    width: "440px"
  switch-track:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.pill}"
    width: "42px"
    height: "24px"
  switch-track-on:
    backgroundColor: "{colors.neon}"
  switch-thumb:
    backgroundColor: "{colors.thumb-pearl}"
    rounded: "{rounded.pill}"
    size: "18px"
  slider-track:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.pill}"
  slider-thumb:
    backgroundColor: "{colors.thumb-pearl}"
    rounded: "{rounded.pill}"
  orb:
    backgroundColor: "{colors.orb-off}"
    rounded: "{rounded.pill}"
    size: "14px"
  message-plate:
    backgroundColor: "{colors.plate-raised}"
    textColor: "{colors.console-text}"
    typography: "{typography.control}"
    padding: "8px 16px"
  alert-band:
    backgroundColor: "{colors.lit-pink}"
    textColor: "{colors.lit-plate-text}"
    typography: "{typography.body}"
    padding: "8px 16px"
  fingertip-pill:
    backgroundColor: "{colors.pen-white}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.canvas-label}"
    rounded: "{rounded.pill}"
  fingertip-pill-pressed:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.pen-white}"
    rounded: "{rounded.pill}"
---

# Design System: Scribble Loop

## Overview

**Creative North Star: "The sticker booth in a pink console"**

Two worlds, one screen. In the middle is a bright photo sticker booth: your own picture under a pink exposure on a pastel stage, and everything you place on it drawn with booth pen (a saturated colour core, a thick white cut edge, a soft plum drop shadow). The scribble is the instrument. Around it, every control lives in a late-night console dashboard in pink, after the original Xbox dashboard: a plum-black field laced with a faint web of pink lines, translucent plates with notched corners and lit edges, the chosen item as a solid lit plate, and glowing orbs that light when something sounds.

The owner pinned this console direction for the controls. It is the reason glows, translucent plates and the web-grid background are allowed in the chrome; outside the chrome they remain banned as generic polish, and the stage keeps its own pastel sticker-booth rules. The controls are Arc UI components with Arc's semantic tokens retuned in `src/index.css` and their shape applied from outside; their code is untouched. Rank in the controls comes from weight, from the lit plate versus the dim plate, and from neon versus soft text, never from size or case.

Stage motion is tied to the beat and stepped; chrome motion is Arc's short, non-overshooting springs.

**Key Characteristics:**
- Pastel pink-lilac stage, plum ink and booth pen for everything placed on it.
- A plum-black console frame with a faint triangular web of pink lines, brightest round the stage.
- Translucent plates with two notched corners (9px) and a pink lit edge; the chosen item is a solid lit plate.
- Orbs that light in a pedal's neon or a sound's own pen ink.
- Chakra Petch in the chrome, M PLUS Rounded 1c on the canvas, every word at 15px.
- Each hand owns the panel on its side of the screen; on a phone the stage leads.
- Beat-locked, stepped motion on the stage; quick settling springs in the chrome.

## Colors

A plum-black console lit in one pink, wrapped round a pastel booth whose saturated pen inks carry the stage. Every colour is authored in OKLCH.

### Primary
- **Neon pink** (neon; `--neon`, Arc `--border-strong`, `--control-on`): panel headings, the How to play headings and list markers, the on switch, plate edges on hover, the lit edge of floating plates, and an unlit pedal orb when it glows.
- **Lit pink** (lit-pink; Arc `--accent`): the solid lit plate (Play or Stop, the chosen pedal, the chosen sound, the start-with-camera button), the slider fill, text selection and the camera alert band. Its edge is lit-pink-edge (`--accent-strong`) and its text is lit-plate-text (`--accent-foreground`).
- **Neon dim** (neon-dim; `--neon-dim`, Arc `--border`): resting plate edges, the stage's 1px inset ring and the unlit orb rim. Neon hairline (neon-hairline; `--border-subtle`) rules the How to play table.

### Secondary
- **Pen inks** (pen-pink, pen-mint, pen-glass, pen-lilac): melody lines. Each lead sound has its own pen: Supersaw pink, Rubber mint, Glass gold, Chip lilac. A line's colour is its sound. The same ink lights that sound's orb in the hand panel, fills the writing hand's fingertip pills, and fills the pointing cursor.
- **Drum inks** (drum-kick-red, pen-yellow for snare, drum-clap-pink, pen-mint for pop, drum-zap-blue, drum-hat-orange): one per drum sticker. Each drum also has its own silhouette, so colour is never the only cue.
- **Robot tints**: the five kinds reuse inks already in the world at 82%: Singer pen mint, Swapper hat orange, Eater kick red, Dropper pen lilac, Bumper zap blue. The same tint is the 14px dot before each name in the Add a robot menu.

### Neutral
- **Chrome plum-black** (chrome-plum-black; `--chrome`, Arc `--background`): the page and the field under the web.
- **Web** (web-glow, web-line, web-line-faint): the frame's only decoration. A pink radial glow centred behind the stage, two families of 1px lines at 60 and -60 degrees every 47px, and a fainter horizontal line every 81px.
- **Plates** (plate `--surface`, plate-raised `--surface-raised`, plate-hover `--surface-muted`): translucent plum plates for secondary buttons, triggers and panels; a near-opaque raised plate for menus, lists, popovers, the dialog and messages over the stage; a pinker step for hover, open and highlight.
- **Console text** (console-text `--foreground`, console-text-soft `--text-secondary`, console-text-muted `--text-muted`): every word in the chrome, the panel subtitles and field labels, ghost buttons, and chevrons.
- **Track and thumb** (track, track-hover, thumb-pearl): switch and slider tracks and their pearl thumbs.
- **Orb off and lit rim** (orb-off, orb-rim-lit): an unlit orb's core, and the bright rim of a lit one.
- **Dialog scrim** (dialog-scrim): Arc's dimming layer behind How to play, with a 7px blur.
- **Booth backdrop** (booth-backdrop; `--stage`): the stage, and at 25% the veil laid over the camera image.
- **Booth wash** (booth-wash): screened over the live camera image so its shadows lift to pink.
- **Plum ink** (plum-ink): canvas only. Grid ticks at reduced alpha, the cursor, pedal ring, robot hand tint, pressed fingertip pills and the sticker shadow.
- **Pen white** (pen-white): canvas only. The cut edge on everything placed, the playhead core, the glint, dotted pad guides and the halo behind canvas text.

### Named Rules
**The Two Worlds Rule.** The chrome is plum-black, the plates, the console text and one pink. The stage is the pastel backdrop, plum ink, pen white and the saturated inks. A stage ink enters the chrome only to name the thing it stands for: a sound's orb, a robot's dot.

**The One Lit Plate Rule.** In any group of choices exactly one item is a solid lit plate, and it is the chosen one. Hover lights an edge, never a fill.

**The Ink Is The Sound Rule.** A melody line's colour comes from its sound, never from the order it was drawn in.

## Typography

**Display Font:** Chakra Petch (with system-ui, sans-serif), set as Arc's `--font-display` and `--font-body` and on the root
**Body Font:** Chakra Petch, the same family
**Canvas Font:** M PLUS Rounded 1c (with ui-rounded, system-ui, sans-serif), for every word drawn on the stage
**Label/Mono Font:** none. Numbers that change (tempo) use tabular figures.

**Character:** A squared, slightly technical face for the console, loaded locally at 500, 600 and 700, against a soft rounded gothic on the stage whose terminals match the round pen caps. `font-synthesis: none` on the root; `--tracking-body` is 0.01em; Arc's `--text-sm` and `--text-field` are 15px.

### Hierarchy
- **Heading** (Chakra Petch 700, 15px, neon): the hand name at the top of each panel ("Left hand"), the How to play section headings, and the tempo readout ("160 bpm") in console text.
- **Control** (Chakra Petch 600, 15px): every button, select trigger, menu item and option, and messages over the stage.
- **Body** (Chakra Petch 500, 15px, soft): the panel subtitle under each hand name, field labels, the dialog body and table, the camera alert band.
- **Canvas label** (M PLUS Rounded 1c 700, 15px or scaled by stage size): fingertip pills, the palm pill, note names down the right gutter (4px white halo), the pedal readout (5px white halo) and the "Open to drop Singer" label over a carried robot.

### Named Rules
**The One Size Rule.** Every piece of text is 15px. Rank comes from weight (500, 600, 700) and colour (neon, console text, soft), never from a larger size.

**The Sentence Case Rule.** Console references set their labels in capitals; this build does not. Every label, heading and control is in sentence case.

**The Upright Rule.** No italic or oblique text anywhere, including canvas text.

## Layout

At 1024px and wider the screen is three columns: a 15rem (240px) panel column for each hand, and the stage between them. The column on each side belongs to the hand on that side: the hand that writes gets the sound panel (four sounds, one per finger, Quantize drums, Chords and arp, Add a robot, A fist drops), the hand that plays pedals gets the pedal panel (five pedals, Hold pedals on, Release all pedals). With both hands on pedals, the right column stacks the right pedal panel over a mouse sound panel. Each side column pads 12px and scrolls on its own; panels pad 16px with 12px gaps.

The middle column is a top bar, the stage, and a bottom bar. Bars wrap and centre their controls with 8px gaps and 8px by 12px padding, and carry no fill of their own; the web shows through. The top bar holds the music: Play or Stop, tempo with its value beside it, Key, Scale, Camera, How to play. The bottom bar holds the canvas: Draw, Erase and Effects, the mouse pedal while in Effects, Undo, Clear, and the pedal hand.

In the bars every field names itself by its value ("Key A", "Pedals: left hand"), so their field labels are for screen readers only. Inside panels labels are visible.

Below 1024px the layout becomes one column and the stage leads: the stage takes at least 55dvh, both bars sit under it, then the right hand's panel and the left hand's panel, each turned into one 1px-edged strip that scrolls sideways. Panel headings and field labels in the strips are for screen readers only.

The stage draws its grid inset 12px top and bottom with a 52px left gutter for drum stickers and a 52px right gutter for note names (34px and 42px below 640px). Messages over the stage are centred and capped at the stage width minus 32px; the in-play hint sits 20px above the bottom edge.

**The Edges Rule.** Controls live in the bars and the side panels. The grid carries no chrome; the pedal ring, its guides, the fingertip pills and a carried robot are instrument readouts that exist only while a hand or pedal is in play.

## Elevation & Depth

Two systems that never mix. The console uses light, not shadow: plates sit on the web with a 1px pink edge and an 18px pink halo, the lit plate glows brighter, and floating layers add one deep plum shade beneath. The stage uses stickers: one soft plum shadow that falls straight down under everything placed on it.

Stage order, bottom to top: grid and gutters, Singer ribbons, walking robots, melody lines, drum stickers, note names, strokes in progress, playhead, glints, pedal rings, robot hands, a carried robot, fingertip pills, cursors.

### Shadow Vocabulary
- **Glow** (`--glow`, also Arc `--shadow-raised`): a 1px neon-dim edge and an 18px pink halo. Hand panels and messages over the stage.
- **Glow strong** (`--glow-strong`): a 1px neon edge and a 22px brighter halo, for a plate that needs to read as active.
- **Lit plate** (`box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.45), 0 0 18px oklch(0.78 0.21 352 / 0.55)`): the chosen item. Secondary plates and triggers carry only the faint top sheen (`inset 0 1px 0 oklch(0.95 0.05 350 / 0.12)`).
- **Floating** (Arc `--shadow-floating`: the glow plus `0 24px 48px oklch(0.08 0.03 340 / 0.6)`): open lists, menus, popovers and the dialog.
- **Orb light** (`0 0 10px` in the orb's own ink): a lit orb.
- **Sticker shadow** (canvas: plum at 35%, blur 8, offset y 3): lines, drum stickers, walking robots, the pedal ring. Robot hand blur 5, offset 2; cursor and fingertip pills blur 6, offset 2.

### Named Rules
**The Console Light Rule.** Glow is allowed only in the console chrome, because the owner pinned the Xbox dashboard direction there. It is always pink, always centred (no offset), and never on the stage, where depth is the sticker shadow.

## Shapes

The console is cut, the stage is round. Every console plate (Arc buttons, select and menu triggers, the segmented control, hand panels, popovers, menus, lists, the dialog and messages over the stage) is clipped to a notched silhouette: the top-left and bottom-right corners cut at 45 degrees by `--cut` (9px), the other two square. Arc's radius tokens are retuned small (controls 3px, panels 4px, surfaces 6px) so nothing rounds against the cut. Orbs, tracks and thumbs stay full round.

On the stage everything is round: round caps and joins on lines and ribbons, full-round fingertip pills, and one drawn shape per drum (disc kick, five-point star snare, heart clap, ring pop, lightning zap, four-point sparkle hat; the sparkle doubles as the glint). The grid is not ruled: registration crosses at every beat (4px arms, 6px and heavier at the bar line) and 1px dots between.

**The Cut Edge Rule.** Anything placed on the stage gets a white edge roughly as thick as its colour core (lines and ribbons 2.1 times the core; stickers 0.62 of the radius; robot sprites 8px; robot hand parts 5px; the pedal ring 12px under a 6px core).

**The Inside Focus Rule.** A notched plate clips any outline drawn outside it, so its keyboard focus is a 2px inset ring in console text. Everything else keeps the global 2px console-text outline at 2px offset.

## Components

Controls are Arc UI components (`src/components/arc/<name>`) with their modules untouched; the console comes from retuned tokens and shape rules in `src/index.css`. Arc's motion tokens govern chrome motion: 100 to 200ms state changes and panels that settle on a 440ms spring without overshoot, dropped under reduced motion.

### Buttons
- **Shape:** notched plate, 40px tall; `lg` (44px) for the two start buttons over the stage.
- **Primary (the lit plate):** solid lit pink, plum-black text, a pale top sheen and a pink halo. Play or Stop, the chosen pedal and sound in each panel, Start with camera.
- **Secondary:** translucent plate, neon-dim edge, console text, faint top sheen. Hover lights the edge neon and steps the fill to plate-hover. The unchosen pedals and sounds, Chords and arp, Start with mouse.
- **Ghost:** no plate, soft text. How to play, Undo, Clear, Release all pedals.
- **Focus:** 2px inset ring in console text (The Inside Focus Rule).
- **Disabled:** stays in place. Undo and Clear disable when there is nothing to undo or clear.

### Select and dropdown menu
- **Trigger:** a secondary-style notched plate naming its value, with a soft chevron.
- **List or menu:** notched raised plate with the floating shadow, options highlighted in plate-hover. Each robot in Add a robot leads with its 14px tint dot; the A fist drops select picks which robot a fist carries.

### Segmented control
- **Style:** a notched plate-hover well with a neon-dim edge; the selected item sits on a plate tile that slides between items. Draw, Erase and Effects.

### Switch and slider
- **Switch:** 42 by 24px track, neon when on, pearl thumb. Camera, Hold pedals on, Face controls, Swap winks.
- **Slider:** track with a lit pink fill and a pearl thumb; tempo shows its value beside it in tabular figures.

### Hand panel (signature)
- **Plate:** translucent plate, notched, with the glow; padding 16px, gaps 12px.
- **Head:** the hand name in neon heading weight with a one-sentence subtitle under it in soft body ("Pedals. A fist moves to the next one.").
- **Choices:** one full-width button per pedal or sound, the chosen one lit. Each leads with an orb; on the writing hand each sound names its finger in soft text at the right.
- **Narrow screens:** a single sideways strip with the heading and labels kept for screen readers.

### Orb
A 14px round light before each pedal or sound. Off: plum core with a neon-dim rim. Lit: a pale rim, a highlight at the upper left fading into the orb's ink, and a 10px halo of the same ink. A pedal's orb lights in neon while that pedal sounds; a sound's orb is always lit in its own pen ink.

### Popover and dialog
- **Popover:** the Chords and arp panel opening beside its trigger: notched raised plate with the floating shadow.
- **Dialog:** How to play, notched raised plate at most 440px wide over Arc's blurred scrim; neon section headings, square neon list markers, a table ruled in neon hairline.

### Messages and alert band
- **Message plate:** a notched raised plate with the glow, control weight, centred over the stage. The sentence before the first play, toasts, and the hint while the stage is nearly empty or in Effects mode.
- **Alert band:** a full-width lit pink strip under the top bar, shown only when the camera is blocked or tracking failed.

### Stage ink (signature)
Everything on the canvas wears the booth pen treatment.

- **Melody lines:** a 5 to 9px core in the pen of the line's sound over a white edge 2.1 times as wide.
- **Robots:** the AnyMachine Stilt walk cycle cut into stickers with an 8px white edge, tinted at 82%. They walk under all placed ink.
- **Carried robot:** while the writing hand makes a fist, the robot chosen under A fist drops walks with the hand at 70% opacity, labelled "Open to drop" and its name in a canvas pill above it. Opening the hand drops it there.
- **Singer ribbon:** pen mint booth pen fading to the same colour at zero alpha toward the tail, under every robot.
- **Robot hand:** AnyMachine Stilt parts laid over each tracked hand, tinted plum with a 5px white edge.
- **Fingertip pills:** full-round pills 24px above each fingertip saying what pinching that finger does; on the writing hand each wears its sound's pen, on the effects hand they are pen white, and the pressed finger's pill goes solid plum.
- **Cursor, pedal ring and playhead:** plum on white edges; the pedal ring carries a pen mint arc for its second control and a live readout above it.

On the beat, what the playhead touches jumps: lines swell to 1.45 times for the first half of each step, drum stickers to 1.35 for 90ms, a robot lifts to 1.08 for 90ms when it acts, with no easing. Under reduced motion the jumps stop and the playhead remains.

## Do's and Don'ts

### Do:
- **Do** keep the console to the plum-black field, the web, translucent plates, console text and one pink; let a stage ink into a control only as a sound's orb or a robot's dot.
- **Do** cut every console plate with the 9px notch on the top-left and bottom-right corners, and draw its keyboard focus inside the plate.
- **Do** make the chosen item the one solid lit plate in its group; light only the edge on hover.
- **Do** confine glow, translucency and the web-grid background to the console chrome, where the owner's pinned Xbox dashboard direction allows them.
- **Do** set every word at 15px: Chakra Petch (500, 600, 700) in the chrome, M PLUS Rounded 1c on the canvas.
- **Do** give each hand the panel on its side of the screen, and put the stage first on narrow screens.
- **Do** colour a melody line by its sound, and give any new robot kind an ink already in the pen or drum sets.
- **Do** give anything placed on the stage a white cut edge and the soft plum sticker shadow.
- **Do** build controls from the Arc UI components in `src/components/arc`, shaped from `src/index.css` without editing their modules.
- **Do** keep UI text to the minimum: one sentence before the first play, one hint while it helps, and canvas pills only while a hand or pedal is in play.

### Don't:
- **Don't** use italic or oblique text anywhere, including canvas text and labels.
- **Don't** set labels, headings or controls in capitals, even though the console references do; no all-caps eyebrows or kickers above anything.
- **Don't** use JetBrains Mono (or any alias of it) anywhere, including fallback stacks.
- **Don't** use em dashes in any copy, label or generated text.
- **Don't** put an accent stripe on one side of a container, by border, pseudo-element, background or shadow.
- **Don't** use gradient text, or Arc's unused brand gradient tokens.
- **Don't** carry glow, translucent plates or the web grid onto the stage or into any surface outside the console chrome.
- **Don't** add text sizes beyond 15px to create hierarchy.
- **Don't** draw ruled lines on the stage grid; mark intersections with registration ticks and dots.
- **Don't** add hard offset shadows; stage shadows fall straight down and console glows are centred.
