import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Eraser, Pencil, Play, Square, Trash2, Undo2, Video, VideoOff } from 'lucide-react'
import { Engine, LEADS, type LeadName, type Settings } from '@/audio/engine'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Draft } from '@/input/pen'
import {
  KEYS,
  MAX_WALKERS,
  SCALES,
  eraseAt,
  type Item,
  type KeyName,
  type Point,
  type ScaleName,
} from '@/model/score'
import { Stage, type Tool } from '@/stage/Stage'
import { createHandTracker, type HandTracker } from '@/tracking/handTracker'

type Camera = 'off' | 'loading' | 'on' | 'blocked' | 'failed'

const START: Settings = { bpm: 160, key: 'A', scale: 'Minor pentatonic', lead: 'Supersaw' }

const CAMERA_NOTE: Partial<Record<Camera, string>> = {
  blocked: 'The camera is blocked. Allow it in your browser’s site settings, or keep playing with the mouse.',
  failed: 'Hand tracking did not load. Check your connection and press Camera again.',
}

const control = 'h-10 rounded-full px-3.5 text-[15px] font-bold'
const option = 'rounded-lg py-1.5 pr-9 pl-3 text-[15px]'
const light = 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'

export default function App() {
  const [settings, setSettings] = useState<Settings>(START)
  const [items, setItems] = useState<Item[]>([])
  const [past, setPast] = useState<Item[][]>([])
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [tool, setTool] = useState<Tool>('draw')
  const [camera, setCamera] = useState<Camera>('off')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [tracker, setTracker] = useState<HandTracker | null>(null)

  const engine = useMemo(() => new Engine(START), [])
  const nextId = useRef(1)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => engine.setItems(items), [engine, items])
  useEffect(() => engine.update(settings), [engine, settings])
  useEffect(() => {
    if (new URLSearchParams(location.search).has('debug')) {
      Object.assign(window, {
        scribble: {
          engine,
          items: () => itemsRef.current,
          robots: () => itemsRef.current.filter((i) => i.kind === 'walker').map((i) => engine.walker(i.id)),
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
        const ink = current.filter((i) => i.kind === 'line').length
        change([...current, { kind: 'line', id, points: draft.points, ink }])
      } else {
        change([...current, { kind: 'blob', id, x: draft.x, y: draft.y, size: draft.size }])
      }
    },
    [change],
  )

  const erase = useCallback(
    (at: Point, radius: number, aspect: number) => {
      const next = eraseAt(itemsRef.current, at, radius, aspect, (id) => engine.walkerPoint(id))
      if (next.length !== itemsRef.current.length) change(next)
    },
    [change, engine],
  )

  const addRobot = useCallback(() => {
    const id = nextId.current++
    change([...itemsRef.current, { kind: 'walker', id, x: Math.random(), y: 0.15 + Math.random() * 0.7 }])
  }, [change])

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
  const hint = withCamera
    ? 'Pinch and drag for a melody. Pinch and hold for a drum. Make a fist to rub out.'
    : 'Drag for a melody. Press and hold for a drum.'

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-2 bg-bar px-4 py-2 text-[15px] font-bold">
        <h1 className="mr-2 text-[15px] font-extrabold">Scribble Loop</h1>

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
            className="w-20 min-w-20 shrink-0 data-horizontal:w-20"
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
          <SelectContent alignItemWithTrigger={false} className="min-w-44 p-1 font-bold">
            {KEYS.map((k) => (
              <SelectItem key={k} value={k} className={option}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={settings.scale} onValueChange={(v) => setSettings((s) => ({ ...s, scale: v as ScaleName }))}>
          <SelectTrigger aria-label="Scale" className={`${control} ${light} data-[size=default]:h-10`}>
            {settings.scale}
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-44 p-1 font-bold">
            {Object.keys(SCALES).map((name) => (
              <SelectItem key={name} value={name} className={option}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={settings.lead} onValueChange={(v) => setSettings((s) => ({ ...s, lead: v as LeadName }))}>
          <SelectTrigger aria-label="Lead sound" className={`${control} ${light} data-[size=default]:h-10`}>
            {settings.lead}
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-44 p-1 font-bold">
            {LEADS.map((name) => (
              <SelectItem key={name} value={name} className={option}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          aria-label="Mouse tool"
          value={[tool]}
          onValueChange={(v) => v.length > 0 && setTool(v[v.length - 1] as Tool)}
          spacing={1}
          className="rounded-full bg-secondary p-1"
        >
          <ToggleGroupItem value="draw" className="h-8 rounded-full px-3 text-[15px] font-bold aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            <Pencil data-icon="inline-start" />
            Draw
          </ToggleGroupItem>
          <ToggleGroupItem value="erase" className="h-8 rounded-full px-3 text-[15px] font-bold aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            <Eraser data-icon="inline-start" />
            Rub out
          </ToggleGroupItem>
        </ToggleGroup>

        <Button
          variant="secondary"
          aria-label="Add a walking robot"
          className={`${control} ${light}`}
          onClick={addRobot}
          disabled={robots >= MAX_WALKERS}
        >
          <Bot data-icon="inline-start" />
          Robot
        </Button>

        <Button variant="secondary" className={`${control} ${light}`} onClick={undo} disabled={past.length === 0}>
          <Undo2 data-icon="inline-start" />
          Undo
        </Button>
        <Button
          variant="secondary"
          className={`${control} ${light}`}
          onClick={() => change([])}
          disabled={items.length === 0}
        >
          <Trash2 data-icon="inline-start" />
          Clear
        </Button>

        <Toggle
          pressed={withCamera}
          disabled={camera === 'loading'}
          onPressedChange={(on) => (on ? void cameraOn() : cameraOff())}
          className={`${control} ${light} ml-auto aria-pressed:bg-primary aria-pressed:text-primary-foreground`}
        >
          {withCamera ? <Video data-icon="inline-start" /> : <VideoOff data-icon="inline-start" />}
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
        tool={tool}
        stream={stream}
        tracker={tracker}
        nextInk={lines}
        onPlace={place}
        onErase={erase}
      >
        {!started && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 p-6">
            <div className="flex max-w-md flex-col items-center gap-5 text-center">
              <p className="text-[clamp(2rem,6vw,3.5rem)] leading-none font-extrabold tracking-tight text-balance">
                Draw a loop in the air
              </p>
              <p className="text-[15px] font-medium text-pretty">
                Lines are melody, stickers are drums. The bar sweeping across plays whatever it touches.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  className={`${control} h-12 px-6`}
                  disabled={camera === 'loading'}
                  onClick={() => {
                    void play()
                    void cameraOn()
                  }}
                >
                  <Video data-icon="inline-start" />
                  Start with camera
                </Button>
                <Button variant="secondary" className={`${control} ${light} h-12 px-6`} onClick={() => void play()}>
                  Start with mouse
                </Button>
              </div>
            </div>
          </div>
        )}
        {started && items.length < 3 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-5 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-secondary px-4 py-2 text-center text-[15px] font-bold shadow-[0_3px_10px_oklch(0.27_0.09_340/0.25)]">
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
