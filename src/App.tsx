import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EFFECTS,
  Engine,
  type BotEdit,
  type EffectName,
  type Settings,
} from "@/audio/engine";
import { Button } from "@/components/arc/button/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/arc/dialog/dialog";
import { DropdownMenu } from "@/components/arc/dropdown-menu/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/arc/popover/popover";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Select } from "@/components/arc/select/select";
import { Slider } from "@/components/arc/slider/slider";
import { Switch } from "@/components/arc/switch/switch";
import type { Draft } from "@/input/pen";
import {
  ARP_RATES,
  ARPS,
  BOTS,
  CHORDS,
  DRUM_GRIDS,
  KEYS,
  LEADS,
  MAX_WALKERS,
  SCALES,
  biteAt,
  eraseAt,
  type ArpName,
  type ArpRate,
  type BotType,
  type ChordName,
  type DrumGrid,
  type Item,
  type KeyName,
  type LeadName,
  type Point,
  type ScaleName,
} from "@/model/score";
import { BOT_INFO } from "@/robots/bots";
import { BOT_TINT, LEAD_INK } from "@/stage/draw";
import { Stage, type Mode, type PedalHands, type Side } from "@/stage/Stage";
import {
  createFaceTracker,
  createHandTracker,
  type FaceTracker,
  type HandTracker,
} from "@/tracking/handTracker";
import type { FaceState, Wink } from "@/tracking/face";
import { HowTo } from "./HowTo";

type Camera = "off" | "loading" | "on" | "blocked" | "failed";

const START: Settings = {
  bpm: 160,
  key: "A",
  scale: "Minor pentatonic",
  lead: "Supersaw",
  drumGrid: "1/16",
  chord: "Off",
  arp: "Off",
  arpRate: "1/16",
};

/** A robot that leaves things behind keeps at most this many on the grid, oldest going first. */
const MAX_DROPS = 12;

const CAMERA_NOTE: Partial<Record<Camera, string>> = {
  blocked:
    "The camera is blocked. Allow it in your browser’s site settings, or keep playing with the mouse.",
  failed:
    "Hand tracking did not load. Check your connection and switch Camera on again.",
};

/**
 * A select's list opens in its own layer outside the panel that holds it. Picking from it must not
 * count as a click outside the panel, or every change would close the panel.
 */
const keepPanelOpen = (event: Event) => {
  const target = event.target as Element | null;
  if (target?.closest('[role="listbox"], [data-radix-popper-content-wrapper]'))
    event.preventDefault();
};

const options = (values: readonly string[], label = (v: string) => v) =>
  values.map((value) => ({ value, label: label(value) }));

export default function App() {
  const [settings, setSettings] = useState<Settings>(START);
  const [items, setItems] = useState<Item[]>([]);
  const [past, setPast] = useState<Item[][]>([]);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<Mode>("draw");
  const [effectsHand, setEffectsHand] = useState<PedalHands>("left");
  const [pedalBySide, setPedalBySide] = useState<Record<Side, EffectName>>({
    left: "Filter",
    right: "Echo",
  });
  const [mousePedal, setMousePedal] = useState<EffectName>("Filter");
  const [hold, setHold] = useState(false);
  const [camera, setCamera] = useState<Camera>("off");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [tracker, setTracker] = useState<HandTracker | null>(null);
  const [faceTracker, setFaceTracker] = useState<FaceTracker | null>(null);
  const [faceOn, setFaceOn] = useState(true);
  const [deployBot, setDeployBot] = useState<BotType>("singer");
  const [swapWinks, setSwapWinks] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef(0);
  const lastChord = useRef<ChordName>("Triad");
  const lastArp = useRef<ArpName>("Up");

  const engine = useMemo(() => new Engine(START), []);
  const nextId = useRef(1);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Robots change the song as they go. Their edits skip the undo history, or one hungry robot
  // would fill it in seconds.
  useEffect(() => {
    engine.onEdit = (edit: BotEdit) => {
      const current = itemsRef.current;
      if (!current.some((i) => i.id === edit.by)) return;
      let next = current;
      if (edit.kind === "bite") {
        next = biteAt(
          current,
          edit.at,
          edit.radius,
          1.6,
          () => nextId.current++,
          engine.where,
        );
      } else if (edit.kind === "swap") {
        next = current.map((i) =>
          i.id === edit.lineId && i.kind === "line"
            ? { ...i, lead: edit.lead }
            : i,
        );
      } else {
        const id = nextId.current++;
        next = [...current, { ...edit.item, id } as Item];
        const mine = next.filter(
          (i) => i.kind !== "walker" && i.by === edit.by,
        );
        if (mine.length > MAX_DROPS) {
          const oldest = new Set(
            mine.slice(0, mine.length - MAX_DROPS).map((i) => i.id),
          );
          next = next.filter((i) => !oldest.has(i.id));
        }
      }
      itemsRef.current = next;
      setItems(next);
    };
    return () => {
      engine.onEdit = null;
    };
  }, [engine]);

  // Which pedals are sounding, so each hand's panel can show it. The pedals live in the audio
  // engine, so this checks a few times a second rather than on every frame.
  const [playingPedals, setPlayingPedals] = useState<Set<EffectName>>(
    new Set(),
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Object.keys(engine.effects).sort().join(",");
      setPlayingPedals((prev) =>
        [...prev].sort().join(",") === now
          ? prev
          : new Set(now ? (now.split(",") as EffectName[]) : []),
      );
    }, 150);
    return () => window.clearInterval(id);
  }, [engine]);

  const say = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1400);
  }, []);

  /** A left wink toggles the arpeggiator and a right wink the chords, unless swapped. */
  const wink = useCallback(
    (eye: Wink) => {
      const s = settingsRef.current;
      const arp = (eye === "left") !== swapWinks;
      if (arp) {
        if (s.arp !== "Off") lastArp.current = s.arp;
        const next = s.arp === "Off" ? lastArp.current : "Off";
        setSettings((x) => ({ ...x, arp: next }));
        say(
          next === "Off"
            ? "Arpeggiator off"
            : `Arpeggiator ${next.toLowerCase()}`,
        );
      } else {
        if (s.chord !== "Off") lastChord.current = s.chord;
        const next = s.chord === "Off" ? lastChord.current : "Off";
        setSettings((x) => ({ ...x, chord: next }));
        say(next === "Off" ? "Chords off" : `${next} chords`);
      }
    },
    [say, swapWinks],
  );

  const cyclePedal = useCallback((side: Side) => {
    setPedalBySide((p) => ({
      ...p,
      [side]: EFFECTS[(EFFECTS.indexOf(p[side]) + 1) % EFFECTS.length],
    }));
  }, []);

  const releaseAll = useCallback(() => {
    for (const name of EFFECTS) engine.setEffect(name, 0.5, 0.5, false);
  }, [engine]);

  useEffect(() => engine.setItems(items), [engine, items]);
  useEffect(() => engine.update(settings), [engine, settings]);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("debug")) {
      Object.assign(window, {
        scribble: {
          engine,
          items: () => itemsRef.current,
          robots: () =>
            itemsRef.current
              .filter((i) => i.kind === "walker")
              .map((i) => engine.botPoint(i.id)),
        },
      });
    }
  }, [engine]);

  const change = useCallback((next: Item[]) => {
    setPast((p) => [...p.slice(-49), itemsRef.current]);
    setItems(next);
  }, []);

  const place = useCallback(
    (draft: Draft, lead?: LeadName) => {
      const id = nextId.current++;
      const current = itemsRef.current;
      if (draft.kind === "line") {
        change([
          ...current,
          {
            kind: "line",
            id,
            points: draft.points,
            lead: lead ?? settingsRef.current.lead,
          },
        ]);
      } else {
        change([
          ...current,
          { kind: "blob", id, x: draft.x, y: draft.y, size: draft.size },
        ]);
      }
    },
    [change],
  );

  const erase = useCallback(
    (at: Point, radius: number, aspect: number) => {
      const next = eraseAt(itemsRef.current, at, radius, aspect, engine.where);
      if (next.length !== itemsRef.current.length) change(next);
    },
    [change, engine],
  );

  const recolor = useCallback(
    (lineId: number) => {
      const current = itemsRef.current;
      change(
        current.map((i) =>
          i.id === lineId && i.kind === "line"
            ? { ...i, lead: LEADS[(LEADS.indexOf(i.lead) + 1) % LEADS.length] }
            : i,
        ),
      );
    },
    [change],
  );

  const nextPen = useCallback(() => {
    const next =
      LEADS[(LEADS.indexOf(settingsRef.current.lead) + 1) % LEADS.length];
    setSettings((s) => ({ ...s, lead: next }));
    say(next);
  }, [say]);

  /** Tilting the head steps the robot an open mouth will drop: left goes back, right goes on. */
  const tiltBot = useCallback(
    (side: Wink) => {
      setDeployBot((current) => {
        const step = side === "right" ? 1 : BOTS.length - 1;
        const next = BOTS[(BOTS.indexOf(current) + step) % BOTS.length];
        say(`Mouth drops ${BOT_INFO[next].name}`);
        return next;
      });
    },
    [say],
  );

  // What the camera reads off the face. The stage writes into this object every frame; the
  // readout in the top bar copies it a few times a second.
  const face = useMemo<FaceState>(
    () => ({ found: false, left: 0, right: 0, mouth: 0 }),
    [],
  );
  const [faceView, setFaceView] = useState<FaceState>({ ...face });
  useEffect(() => {
    const id = window.setInterval(() => setFaceView({ ...face }), 120);
    return () => window.clearInterval(id);
  }, [face]);

  const addRobot = useCallback(
    (bot: BotType, at?: Point) => {
      const robotsNow = itemsRef.current.filter(
        (i) => i.kind === "walker",
      ).length;
      if (robotsNow >= MAX_WALKERS) {
        say(`${MAX_WALKERS} robots is the most at once`);
        return;
      }
      const id = nextId.current++;
      change([
        ...itemsRef.current,
        {
          kind: "walker",
          id,
          bot,
          x: at?.x ?? 0.1 + Math.random() * 0.8,
          y: at?.y ?? 0.2 + Math.random() * 0.6,
        },
      ]);
      if (at) say(`${BOT_INFO[bot].name} dropped`);
    },
    [change, say],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      setItems(p[p.length - 1]);
      return p.slice(0, -1);
    });
  }, []);

  const play = useCallback(async () => {
    await engine.start();
    setStarted(true);
    setPlaying(true);
  }, [engine]);

  const stop = useCallback(() => {
    engine.stop();
    setPlaying(false);
  }, [engine]);

  const cameraOff = useCallback(() => {
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setCamera("off");
  }, []);

  const cameraOn = useCallback(async () => {
    setCamera("loading");
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
    } catch {
      setCamera("blocked");
      return;
    }
    try {
      const [ready, face] = await Promise.all([
        tracker ?? createHandTracker(),
        // The face model is optional: without it the hands still play.
        faceTracker ?? createFaceTracker().catch(() => null),
      ]);
      setTracker(ready);
      setFaceTracker(face);
      setStream(media);
      setCamera("on");
    } catch {
      media.getTracks().forEach((t) => t.stop());
      setCamera("failed");
    }
  }, [tracker, faceTracker]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'input, textarea, [role="combobox"], [role="listbox"], [role="slider"]',
        )
      )
        return;
      if (e.code === "Space" && !target.closest("button")) {
        e.preventDefault();
        if (engine.running) stop();
        else void play();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [engine, play, stop, undo]);

  const lines = items.filter((i) => i.kind === "line").length;
  const drums = items.filter((i) => i.kind === "blob").length;
  const robots = items.length - lines - drums;
  const withCamera = camera === "on";
  const writingHand =
    effectsHand === "both" ? null : effectsHand === "left" ? "right" : "left";
  const hint = withCamera
    ? writingHand === null
      ? "Both hands play pedals: pinch a finger to your thumb, make a fist to change pedal. Draw with the mouse."
      : `${writingHand === "right" ? "Right" : "Left"} hand: pinch thumb and index to draw, make a fist to change sound. Open your mouth to drop a robot. ${effectsHand === "left" ? "Left" : "Right"} hand: pinch to play a pedal, make a fist to change pedal.`
    : mode === "effects"
      ? `Drag to play the ${mousePedal} pedal. Higher is stronger. Change it in Pedals.`
      : "Drag for a melody. Press and hold for a drum. Alt-click a line to change its sound.";

  const chordsPanel = (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary">Chords and arp</Button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        className="grid w-64 gap-3"
        onInteractOutside={keepPanelOpen}
        onFocusOutside={keepPanelOpen}
      >
        <Select
          label="Chord"
          value={settings.chord}
          options={options(CHORDS)}
          onValueChange={(v) =>
            setSettings((s) => ({ ...s, chord: v as ChordName }))
          }
        />
        <Select
          label="Arpeggiator"
          value={settings.arp}
          options={options(ARPS)}
          onValueChange={(v) =>
            setSettings((s) => ({ ...s, arp: v as ArpName }))
          }
        />
        <Select
          label="Arpeggio speed"
          value={settings.arpRate}
          options={options(Object.keys(ARP_RATES))}
          onValueChange={(v) =>
            setSettings((s) => ({ ...s, arpRate: v as ArpRate }))
          }
        />
        <Switch
          label="Face controls"
          checked={faceOn}
          onCheckedChange={setFaceOn}
        />
        <p className="text-[15px] font-medium text-[var(--text-secondary)]">
          Wink your {swapWinks ? "right" : "left"} eye for the arpeggiator, your{" "}
          {swapWinks ? "left" : "right"} for chords. The eye orbs in the top bar
          light as each eye closes.
        </p>
        <Switch
          label="Swap winks"
          checked={swapWinks}
          onCheckedChange={setSwapWinks}
        />
      </PopoverContent>
    </Popover>
  );

  /** The panel for a hand that plays pedals: its pedals, lit where the fist has moved it. */
  const pedalPanel = (side: Side) => (
    <section
      className="panel"
      aria-label={`${side === "left" ? "Left" : "Right"} hand pedals`}
    >
      <h2>
        {side === "left" ? "Left" : "Right"} hand
        <span>Pedals. A fist moves to the next one.</span>
      </h2>
      <div className="grid gap-1.5">
        <span className="text-[15px] font-medium text-[var(--text-secondary)]">
          Pedal hands
        </span>
        <SegmentedControl
          label="Pedal hands"
          fullWidth
          value={effectsHand}
          onValueChange={(v) => {
            releaseAll();
            setEffectsHand(v as PedalHands);
          }}
          options={[
            { value: "left", label: "Left" },
            { value: "both", label: "Both" },
            { value: "right", label: "Right" },
          ]}
        />
      </div>
      <div className="grid gap-1.5">
        {EFFECTS.map((name) => {
          const on = pedalBySide[side] === name;
          const live = playingPedals.has(name);
          return (
            <Button
              key={name}
              variant={on ? "primary" : "secondary"}
              aria-pressed={on}
              className="justify-start gap-3"
              onClick={() => {
                releaseAll();
                setPedalBySide((p) => ({ ...p, [side]: name }));
              }}
            >
              <span
                className="orb"
                data-on={live || undefined}
                aria-hidden="true"
              />
              <span>{name}</span>
              {live && <span className="sr-only">, playing</span>}
            </Button>
          );
        })}
      </div>
      <Switch
        label="Hold pedals on"
        checked={hold}
        onCheckedChange={(on) => {
          setHold(on);
          if (!on) releaseAll();
        }}
      />
      <Button variant="ghost" onClick={releaseAll}>
        Release all pedals
      </Button>
    </section>
  );

  /** The panel for the writing hand: one sound per finger, then timing, chords and robots. */
  const soundPanel = (side: Side | null) => (
    <section className="panel" aria-label="Sounds">
      <h2>
        {side ? `${side === "left" ? "Left" : "Right"} hand` : "Mouse"}
        <span>
          {side
            ? "Pinch thumb and index to draw. A fist changes the sound."
            : "Sound for new lines."}
        </span>
      </h2>
      <div className="grid gap-1.5">
        {LEADS.map((lead) => (
          <Button
            key={lead}
            variant={settings.lead === lead ? "primary" : "secondary"}
            aria-pressed={settings.lead === lead}
            className="justify-start gap-2.5"
            onClick={() =>
              setSettings((s) => ({ ...s, lead: lead as LeadName }))
            }
          >
            <span
              className="orb"
              data-on
              aria-hidden="true"
              style={{ "--orb": LEAD_INK[lead] } as React.CSSProperties}
            />
            <span>{lead}</span>
          </Button>
        ))}
      </div>
      <Select
        label="Quantize drums"
        value={settings.drumGrid}
        options={options(Object.keys(DRUM_GRIDS), (v) =>
          v === "Free" ? "Off" : v,
        )}
        onValueChange={(v) =>
          setSettings((s) => ({ ...s, drumGrid: v as DrumGrid }))
        }
      />
      {chordsPanel}
      <DropdownMenu
        label="Add a robot"
        items={BOTS.map((bot: BotType) => ({
          label: BOT_INFO[bot].name,
          disabled: robots >= MAX_WALKERS,
          icon: (
            <span
              className="block size-3.5 rounded-full"
              style={{ background: BOT_TINT[bot] }}
            />
          ),
          onSelect: () => addRobot(bot),
        }))}
      />
      {side && (
        <Select
          label="Mouth drops (tilt your head to change)"
          value={deployBot}
          options={BOTS.map((bot) => ({
            value: bot,
            label: BOT_INFO[bot].name,
          }))}
          onValueChange={(v) => setDeployBot(v as BotType)}
        />
      )}
    </section>
  );

  const leftPanel =
    effectsHand === "right" ? soundPanel("left") : pedalPanel("left");
  const rightPanel =
    effectsHand === "both" ? (
      <div className="grid content-start gap-3">
        {pedalPanel("right")}
        {soundPanel(null)}
      </div>
    ) : effectsHand === "right" ? (
      pedalPanel("right")
    ) : (
      soundPanel("right")
    );

  return (
    <div className="booth grid h-dvh grid-cols-[15rem_minmax(0,1fr)_15rem] bg-bar max-lg:grid-cols-[minmax(0,1fr)] max-lg:grid-rows-[minmax(0,1fr)_auto_auto]">
      <h1 className="sr-only">Scribble Loop</h1>

      <aside className="side max-lg:order-3">{leftPanel}</aside>

      <main className="flex min-h-0 min-w-0 flex-col max-lg:order-1">
        <div className="bar flex flex-wrap items-center justify-center gap-2 px-3 py-2">
          <Button
            variant="primary"
            className="min-w-20"
            onClick={() => (playing ? stop() : void play())}
            aria-keyshortcuts="Space"
          >
            {playing ? "Stop" : "Play"}
          </Button>
          <div className="flex shrink-0 items-center gap-2">
            <div className="w-28">
              <Slider
                label="Tempo"
                min={90}
                max={200}
                value={settings.bpm}
                showValue={false}
                format={(v) => `${v} bpm`}
                onValueChange={(v) => setSettings((s) => ({ ...s, bpm: v }))}
              />
            </div>
            <span
              className="w-[4.5rem] text-[15px] font-bold tabular-nums"
              aria-hidden="true"
            >
              {settings.bpm} bpm
            </span>
          </div>
          <div className="w-24 shrink-0">
            <Select
              label="Key"
              value={settings.key}
              options={options(KEYS, (k) => `Key ${k}`)}
              onValueChange={(v) =>
                setSettings((s) => ({ ...s, key: v as KeyName }))
              }
            />
          </div>
          <div className="w-48 shrink-0">
            <Select
              label="Scale"
              value={settings.scale}
              options={options(Object.keys(SCALES))}
              onValueChange={(v) =>
                setSettings((s) => ({ ...s, scale: v as ScaleName }))
              }
            />
          </div>
          <Switch
            label={camera === "loading" ? "Starting camera" : "Camera"}
            checked={withCamera}
            disabled={camera === "loading"}
            onCheckedChange={(on) => (on ? void cameraOn() : cameraOff())}
          />
          {withCamera && faceOn && (
            <span
              className="facehud"
              title="What the camera reads off your face"
              aria-label={faceView.found ? "Face found" : "No face found"}
            >
              <span
                className="orb"
                data-on={faceView.left > 0.42 || undefined}
                aria-hidden="true"
              />
              <span
                className="orb"
                data-on={faceView.right > 0.42 || undefined}
                aria-hidden="true"
              />
              <span className="mouth" aria-hidden="true">
                <span
                  style={{ width: `${Math.round(faceView.mouth * 100)}%` }}
                />
              </span>
              {!faceView.found && (
                <span className="text-[15px] font-medium">No face</span>
              )}
            </span>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost">How to play</Button>
            </DialogTrigger>
            <DialogContent title="How to play">
              <HowTo writingHand={writingHand} />
            </DialogContent>
          </Dialog>
        </div>

        {CAMERA_NOTE[camera] && (
          <p
            role="alert"
            className="bg-primary px-4 py-2 text-[15px] font-medium text-primary-foreground"
          >
            {CAMERA_NOTE[camera]}
          </p>
        )}

        <Stage
          items={items}
          settings={settings}
          engine={engine}
          mode={mode}
          effectsHand={effectsHand}
          pedalBySide={pedalBySide}
          onCyclePedal={cyclePedal}
          mousePedal={mousePedal}
          hold={hold}
          stream={stream}
          tracker={tracker}
          faceTracker={faceTracker}
          faceOn={faceOn}
          onWink={wink}
          deployBot={deployBot}
          onDeploy={(at, bot) => addRobot(bot, at)}
          onTilt={tiltBot}
          face={face}
          onPlace={place}
          onErase={erase}
          onRecolor={recolor}
          onNextPen={nextPen}
        >
          {!started && (
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="flex flex-col items-center gap-4">
                <p className="pill">
                  {writingHand === null
                    ? "Both hands play the pedals."
                    : `${writingHand === "right" ? "Right" : "Left"} hand writes notes. ${writingHand === "right" ? "Left" : "Right"} hand plays the pedals.`}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={camera === "loading"}
                    onClick={() => {
                      void play();
                      void cameraOn();
                    }}
                  >
                    Start with camera
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => void play()}
                  >
                    Start with mouse
                  </Button>
                </div>
              </div>
            </div>
          )}
          {toast && (
            <p
              role="status"
              className="pill pointer-events-none absolute inset-x-0 top-5 mx-auto"
            >
              {toast}
            </p>
          )}
          {started && (items.length < 3 || mode === "effects") && (
            <p className="pill pointer-events-none absolute inset-x-0 bottom-5 mx-auto">
              {hint}
            </p>
          )}
        </Stage>

        <div className="bar flex flex-wrap items-center justify-center gap-2 px-3 py-2">
          <SegmentedControl
            label="What the mouse does"
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            options={[
              { value: "draw", label: "Draw" },
              { value: "erase", label: "Erase" },
              { value: "effects", label: "Effects" },
            ]}
          />
          {mode === "effects" && (
            <div className="w-36 shrink-0">
              <Select
                label="Mouse plays"
                value={mousePedal}
                options={options(EFFECTS, (v) => `Mouse: ${v}`)}
                onValueChange={(v) => setMousePedal(v as EffectName)}
              />
            </div>
          )}
          <Button variant="ghost" onClick={undo} disabled={past.length === 0}>
            Undo
          </Button>
          <Button
            variant="ghost"
            onClick={() => change([])}
            disabled={items.length === 0}
          >
            Clear
          </Button>
        </div>
      </main>

      <aside className="side max-lg:order-2">{rightPanel}</aside>

      <p className="sr-only" role="status">
        {lines} {lines === 1 ? "line" : "lines"}, {drums}{" "}
        {drums === 1 ? "drum" : "drums"}, {robots}{" "}
        {robots === 1 ? "robot" : "robots"}
      </p>
    </div>
  );
}
