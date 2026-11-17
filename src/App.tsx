import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { EFFECTS, Engine, type BotEdit, type EffectName, type Settings } from '@/audio/engine'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Draft } from '@/input/pen'
import {
  BOTS,
  DRUM_GRIDS,
  KEYS,
  LEADS,
  MAX_WALKERS,
  SCALES,
  biteAt,
  eraseAt,
  type BotType,
  type DrumGrid,
  type Item,
  type KeyName,
  type LeadName,
  type Point,
  type ScaleName,
} from '@/model/score'
import { BOT_INFO } from '@/robots/bots'
import { BOT_TINT, LEAD_INK } from '@/stage/draw'
import { FX_GESTURES, Stage, type FxGesture, type GestureMap, type Mode, type Side } from '@/stage/Stage'
import { createHandTracker, type HandTracker } from '@/tracking/handTracker'

type Camera = 'off' | 'loading' | 'on' | 'blocked' | 'failed'

/** Shorter scale names for the phone control bar. The menu always shows the full names. */
const SHORT_SCALE: Partial<Record<ScaleName, string>> = {
  'Major pentatonic': 'Major pent.',
  'Minor pentatonic': 'Minor pent.',
}

const START: Settings = { bpm: 160, key: 'A', scale: 'Minor pentatonic', lead: 'Supersaw', drumGrid: '1/16' }

const GESTURE_NAME: Record<FxGesture, string> = {
  open: 'Open palm',
  fist: 'Fist',
  pinch: 'Pinch',
  point: 'Point',
  peace: 'Two fingers',
}

const START_GESTURES: GestureMap = { open: 'Filter', fist: 'Drive', pinch: 'Echo', point: 'Crush', peace: 'Reverb' }

/** A robot that leaves things behind keeps at most this many on the grid, oldest going first. */
const MAX_DROPS = 12

const CAMERA_NOTE: Partial<Record<Camera, string>> = {
  blocked: 'The camera is blocked. Allow it in your browser’s site settings, or keep playing with the mouse.',
  failed: 'Hand tracking did not load. Check your connection and press Camera again.',
}

const control = 'h-10 rounded-full px-3.5 text-[15px] font-bold max-[1600px]:px-3'
const lift = 'shadow-[0_3px_10px_oklch(0.27_0.09_340/0.25)]'
const pill = `w-fit max-w-[calc(100%-2rem)] rounded-3xl bg-secondary px-4 py-2 text-center text-[15px] font-bold text-pretty ${lift}`
const option = 'rounded-lg py-1.5 pr-9 pl-3 text-[15px]'
const menuItem = 'rounded-lg px-3 py-1.5 text-[15px] font-bold'
/** Radio and check items keep room on the right for their tick. */
const checkItem = 'rounded-lg py-1.5 pr-9 pl-3 text-[15px] font-bold'
const popup = 'min-w-44 p-1 font-bold data-closed:animate-none data-open:animate-none'
const light = 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'

export default function App() {
  const [settings, setSettings] = useState<Settings>(START)
  const [items, setItems] = useState<Item[]>([])
  const [past, setPast] = useState<Item[][]>([])
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<Mode>('draw')
  const [effectsHand, setEffectsHand] = useState<Side>('left')
  const [gestures, setGestures] = useState<GestureMap>(START_GESTURES)
  const [mousePedal, setMousePedal] = useState<EffectName>('Filter')
  const [hold, setHold] = useState(false)
  const [camera, setCamera] = useState<Camera>('off')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [tracker, setTracker] = useState<HandTracker | null>(null)

  const engine = useMemo(() => new Engine(START), [])
  const nextId = useRef(1)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Robots change the song as they go. Their edits skip the undo history, or one hungry robot
  // would fill it in seconds.
  useEffect(() => {
    engine.onEdit = (edit: BotEdit) => {
      const current = itemsRef.current
      if (!current.some((i) => i.id === edit.by)) return
      let next = current
      if (edit.kind === 'bite') {
        next = biteAt(current, edit.at, edit.radius, 1.6, () => nextId.current++, engine.where)
      } else if (edit.kind === 'swap') {
        next = current.map((i) => (i.id === edit.lineId && i.kind === 'line' ? { ...i, lead: edit.lead } : i))
      } else {
        const id = nextId.current++
        next = [...current, { ...edit.item, id } as Item]
        const mine = next.filter((i) => i.kind !== 'walker' && i.by === edit.by)
        if (mine.length > MAX_DROPS) {
          const oldest = new Set(mine.slice(0, mine.length - MAX_DROPS).map((i) => i.id))
          next = next.filter((i) => !oldest.has(i.id))
        }
      }
      itemsRef.current = next
      setItems(next)
    }
    return () => {
      engine.onEdit = null
    }
  }, [engine])

  const releaseAll = useCallback(() => {
    for (const name of EFFECTS) engine.setEffect(name, 0.5, 0.5, false)
  }, [engine])

  useEffect(() => engine.setItems(items), [engine, items])
  useEffect(() => engine.update(settings), [engine, settings])
  useEffect(() => {
    if (new URLSearchParams(location.search).has('debug')) {
      Object.assign(window, {
        scribble: {
          engine,
          items: () => itemsRef.current,
          robots: () => itemsRef.current.filter((i) => i.kind === 'walker').map((i) => engine.botPoint(i.id)),
        },
      })
    }
  }, [engine])

  const change = useCallback((next: Item[]) => {
    setPast((p) => [...p.slice(-49), itemsRef.current])
    setItems(next)
  }, [])

  const place = useCallback(
    (draft: Draft) => {
      const id = nextId.current++
      const current = itemsRef.current
      if (draft.kind === 'line') {
        change([...current, { kind: 'line', id, points: draft.points, lead: settingsRef.current.lead }])
      } else {
        change([...current, { kind: 'blob', id, x: draft.x, y: draft.y, size: draft.size }])
      }
    },
    [change],
  )

  const erase = useCallback(
    (at: Point, radius: number, aspect: number) => {
      const next = eraseAt(itemsRef.current, at, radius, aspect, engine.where)
      if (next.length !== itemsRef.current.length) change(next)
    },
    [change, engine],
  )

  const recolor = useCallback(
    (lineId: number) => {
      const current = itemsRef.current
      change(
        current.map((i) =>
          i.id === lineId && i.kind === 'line' ? { ...i, lead: LEADS[(LEADS.indexOf(i.lead) + 1) % LEADS.length] } : i,
        ),
      )
    },
    [change],
  )

  const nextPen = useCallback(() => {
    setSettings((s) => ({ ...s, lead: LEADS[(LEADS.indexOf(s.lead) + 1) % LEADS.length] }))
  }, [])

  const addRobot = useCallback(
    (bot: BotType) => {
      const id = nextId.current++
      change([...itemsRef.current, { kind: 'walker', id, bot, x: 0.1 + Math.random() * 0.8, y: 0.2 + Math.random() * 0.6 }])
    },
    [change],
  )

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p
      setItems(p[p.length - 1])
      return p.slice(0, -1)
    })
  }, [])

  const play = useCallback(async () => {
    await engine.start()
    setStarted(true)
    setPlaying(true)
  }, [engine])

  const stop = useCallback(() => {
    engine.stop()
    setPlaying(false)
  }, [engine])

  const cameraOff = useCallback(() => {
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop())
      return null
    })
    setCamera('off')
  }, [])

  const cameraOn = useCallback(async () => {
    setCamera('loading')
    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
    } catch {
      setCamera('blocked')
      return
    }
    try {
      const ready = tracker ?? (await createHandTracker())
      setTracker(ready)
      setStream(media)
      setCamera('on')
    } catch {
      media.getTracks().forEach((t) => t.stop())
      setCamera('failed')
    }
  }, [tracker])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [role="combobox"], [role="listbox"], [role="slider"]')) return
      if (e.code === 'Space' && !target.closest('button')) {
        e.preventDefault()
        if (engine.running) stop()
        else void play()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [engine, play, stop, undo])

  const lines = items.filter((i) => i.kind === 'line').length
  const drums = items.filter((i) => i.kind === 'blob').length
  const robots = items.length - lines - drums
  const withCamera = camera === 'on'
  const writingHand = effectsHand === 'left' ? 'right' : 'left'
  const hint = withCamera
    ? `${writingHand === 'right' ? 'Right' : 'Left'} hand: pinch and drag for a melody, pinch and hold for a drum, point at a line to change its sound, fist to erase. ${effectsHand === 'left' ? 'Left' : 'Right'} hand plays effects.`
    : mode === 'effects'
      ? `Drag to play the ${mousePedal} pedal. Higher is stronger.`
      : 'Drag for a melody. Press and hold for a drum. Alt-click a line to change its sound.'
  const swatch = 'size-3.5 shrink-0 rounded-full ring-2 ring-white'

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-2 bg-bar px-4 py-2 text-[15px] font-bold max-[1600px]:gap-1.5 max-sm:px-3">
        <h1 className="mr-2 text-[15px] font-extrabold max-[1700px]:sr-only">Scribble Loop</h1>

        <Button
          className={`${control} min-w-[5.25rem]`}
          onClick={() => (playing ? stop() : void play())}
          aria-keyshortcuts="Space"
        >
          {playing ? <Square data-icon="inline-start" /> : <Play data-icon="inline-start" />}
          {playing ? 'Stop' : 'Play'}
        </Button>

        <div className="flex shrink-0 items-center gap-2">
          <Slider
            aria-label="Tempo"
            className="w-28 min-w-28 shrink-0 data-horizontal:w-28 max-[1600px]:w-24 max-[1600px]:min-w-24 max-[1600px]:data-horizontal:w-24 max-sm:w-20 max-sm:min-w-20 max-sm:data-horizontal:w-20"
            min={90}
            max={200}
            step={1}
            value={settings.bpm}
            onValueChange={(v) => setSettings((s) => ({ ...s, bpm: v as number }))}
          />
          <span className="w-[4.5rem] shrink-0 whitespace-nowrap tabular-nums">{settings.bpm} bpm</span>
        </div>

        <Select value={settings.key} onValueChange={(v) => setSettings((s) => ({ ...s, key: v as KeyName }))}>
          <SelectTrigger aria-label="Key" className={`${control} ${light} data-[size=default]:h-10`}>
            Key {settings.key}
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={popup}
          >
            {KEYS.map((k) => (
              <SelectItem key={k} value={k} className={option}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={settings.scale} onValueChange={(v) => setSettings((s) => ({ ...s, scale: v as ScaleName }))}>
          <SelectTrigger aria-label="Scale" className={`${control} ${light} data-[size=default]:h-10`}>
            <span className="max-[1600px]:hidden">{settings.scale}</span>
            <span className="min-[1600px]:hidden">{SHORT_SCALE[settings.scale] ?? settings.scale}</span>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={popup}
          >
            {Object.keys(SCALES).map((name) => (
              <SelectItem key={name} value={name} className={option}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={settings.lead} onValueChange={(v) => setSettings((s) => ({ ...s, lead: v as LeadName }))}>
          <SelectTrigger aria-label="Sound for new lines" className={`${control} ${light} data-[size=default]:h-10`}>
            <span aria-hidden="true" className={swatch} style={{ background: LEAD_INK[settings.lead] }} />
            {settings.lead}
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={popup}
          >
            {LEADS.map((name) => (
              <SelectItem key={name} value={name} className={option}>
                <span aria-hidden="true" className={swatch} style={{ background: LEAD_INK[name] }} />
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={settings.drumGrid}
          onValueChange={(v) => setSettings((s) => ({ ...s, drumGrid: v as DrumGrid }))}
        >
          <SelectTrigger aria-label="Drum timing" className={`${control} ${light} data-[size=default]:h-10`}>
            Drums {settings.drumGrid === 'Free' ? 'free' : settings.drumGrid}
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className={popup}>
            {(Object.keys(DRUM_GRIDS) as DrumGrid[]).map((name) => (
              <SelectItem key={name} value={name} className={option}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          aria-label="What the mouse does"
          value={[mode]}
          onValueChange={(v) => v.length > 0 && setMode(v[v.length - 1] as Mode)}
          spacing={1}
          className="rounded-full bg-secondary p-1 max-sm:order-2"
        >
          <ToggleGroupItem value="draw" className="h-8 rounded-full px-3 text-[15px] font-bold aria-pressed:bg-primary aria-pressed:text-primary-foreground max-[1600px]:px-2.5">
            Draw
          </ToggleGroupItem>
          <ToggleGroupItem value="erase" className="h-8 rounded-full px-3 text-[15px] font-bold aria-pressed:bg-primary aria-pressed:text-primary-foreground max-[1600px]:px-2.5">
            Erase
          </ToggleGroupItem>
          <ToggleGroupItem value="effects" className="h-8 rounded-full px-3 text-[15px] font-bold aria-pressed:bg-primary aria-pressed:text-primary-foreground max-[1600px]:px-2.5">
            Effects
          </ToggleGroupItem>
        </ToggleGroup>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="secondary" className={`${control} ${light} max-sm:order-2`} />}
            disabled={robots >= MAX_WALKERS}
            aria-label="Add robot"
          >
            Robots
          </DropdownMenuTrigger>
          <DropdownMenuContent className={`${popup} w-auto`}>
            {BOTS.map((bot) => (
              <DropdownMenuItem key={bot} className={`${menuItem} gap-2.5`} onClick={() => addRobot(bot)}>
                <span aria-hidden="true" className={swatch} style={{ background: BOT_TINT[bot] }} />
                <span>{BOT_INFO[bot].name}</span>
                <span className="ml-auto pl-4 font-medium text-muted-foreground">{BOT_INFO[bot].does}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="secondary" className={`${control} ${light} max-sm:order-2`} />}>
            Pedals
          </DropdownMenuTrigger>
          <DropdownMenuContent className={`${popup} w-auto`}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 text-[15px] font-bold text-muted-foreground">Effects hand</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={effectsHand} onValueChange={(v) => setEffectsHand(v as Side)}>
                <DropdownMenuRadioItem value="left" className={checkItem}>
                  Left
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="right" className={checkItem}>
                  Right
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 text-[15px] font-bold text-muted-foreground">Gestures</DropdownMenuLabel>
              {FX_GESTURES.map((g) => (
                <DropdownMenuSub key={g}>
                  <DropdownMenuSubTrigger className={`${menuItem} gap-6`}>
                    {GESTURE_NAME[g]}
                    <span className="ml-auto font-medium text-muted-foreground">{gestures[g]}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className={popup}>
                    <DropdownMenuRadioGroup
                      value={gestures[g]}
                      onValueChange={(v) => {
                        releaseAll()
                        setGestures((m) => ({ ...m, [g]: v as EffectName }))
                      }}
                    >
                      {EFFECTS.map((name) => (
                        <DropdownMenuRadioItem key={name} value={name} className={checkItem}>
                          {name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={`${menuItem} gap-6`}>
                  Mouse
                  <span className="ml-auto font-medium text-muted-foreground">{mousePedal}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={popup}>
                  <DropdownMenuRadioGroup value={mousePedal} onValueChange={(v) => setMousePedal(v as EffectName)}>
                    {EFFECTS.map((name) => (
                      <DropdownMenuRadioItem key={name} value={name} className={checkItem}>
                        {name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={hold}
              onCheckedChange={(on) => {
                setHold(on)
                if (!on) releaseAll()
              }}
              className={menuItem}
            >
              Hold pedals on
            </DropdownMenuCheckboxItem>
            <DropdownMenuItem className={menuItem} onClick={releaseAll}>
              Release all pedals
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="secondary"
          className={`${control} ${light} max-sm:order-2`}
          onClick={undo}
          disabled={past.length === 0}
        >
          Undo
        </Button>
        <Button
          variant="secondary"
          className={`${control} ${light} max-sm:order-2`}
          onClick={() => change([])}
          disabled={items.length === 0}
        >
          Clear
        </Button>

        <Toggle
          pressed={withCamera}
          disabled={camera === 'loading'}
          onPressedChange={(on) => (on ? void cameraOn() : cameraOff())}
          className={`${control} ${light} ml-auto aria-pressed:bg-primary aria-pressed:text-primary-foreground max-sm:order-1`}
        >
          {camera === 'loading' ? 'Starting camera' : 'Camera'}
        </Toggle>
      </header>

      {CAMERA_NOTE[camera] && (
        <p role="alert" className="bg-primary px-4 py-2 text-[15px] font-medium text-primary-foreground">
          {CAMERA_NOTE[camera]}
        </p>
      )}

      <Stage
        items={items}
        settings={settings}
        engine={engine}
        mode={mode}
        effectsHand={effectsHand}
        gestures={gestures}
        mousePedal={mousePedal}
        hold={hold}
        stream={stream}
        tracker={tracker}
        onPlace={place}
        onErase={erase}
        onRecolor={recolor}
        onNextPen={nextPen}
      >
        {!started && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="flex flex-col items-center gap-4">
              <p className={pill}>Lines are melody, stickers are drums. The moving bar plays what it touches.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  className={`${control} h-12 px-6`}
                  disabled={camera === 'loading'}
                  onClick={() => {
                    void play()
                    void cameraOn()
                  }}
                >
                  Start with camera
                </Button>
                <Button variant="secondary" className={`${control} ${light} h-12 px-6 ${lift}`} onClick={() => void play()}>
                  Start with mouse
                </Button>
              </div>
            </div>
          </div>
        )}
        {started && (items.length < 3 || mode === 'effects') && (
          <p className={`pointer-events-none absolute inset-x-0 bottom-5 mx-auto ${pill}`}>
            {hint}
          </p>
        )}
      </Stage>

      <p className="sr-only" role="status">
        {lines} {lines === 1 ? 'line' : 'lines'}, {drums} {drums === 1 ? 'drum' : 'drums'}, {robots}{' '}
        {robots === 1 ? 'robot' : 'robots'}
      </p>
    </div>
  )
}
