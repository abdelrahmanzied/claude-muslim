// Pure story scenes and readings; nothing here touches the saved day.
import { ACCENTS, type Accent } from '../../shared/color/index.ts'
import { emptyReading, listFor, overall, timesOf, type AthkarSet, type Reading, type Sky } from './logic.ts'
import type { Style } from './look.ts'
import type { Period } from './data.ts'

export const DEMO_TICK_MS = 100
export const DEMO_PERIOD = 'morning' as const
// Sky walks the day: the morning set under the first three skies, the evening
// set from rose through the crescent finale and folded row. Frame stays
// on the morning set.
export const demoPeriod = (style: Style, scene: number): Period =>
  style === 'sky' && scene >= 3 ? 'evening' : DEMO_PERIOD
export const DEMO_SKIES: readonly Sky[] = ['dawn', 'sunrise', 'day', 'rose', 'bluehour', 'crescent']
const COLORS = Object.keys(ACCENTS) as Accent[]
export const DEMO_COLORS: readonly Accent[] = [...COLORS, COLORS[0]!, COLORS[1]!]

export type DemoSet = 'daily' | 'afterSalah'

type StoryScene = { kind: 'reading' | 'finale' | 'folded'; id: string; duration: number; countMs: number }

// The real runner supplies FINALE_MS, so the celebration stays exactly as long
// as the real band's finale. Other durations and counts belong to the story.
export const demoScenes = (style: Style, accent: Accent, finaleMs: number, set: DemoSet = 'daily', sky: Sky = 'dawn') => {
  const story: StoryScene[] = set === 'afterSalah' ? [
    { kind: 'reading', id: '66-istighfar', duration: 1200, countMs: 200 },
    { kind: 'reading', id: '69-tasbih', duration: 3600, countMs: 100 },
    { kind: 'reading', id: '70-ikhlas', duration: 1200, countMs: 200 },
    { kind: 'finale', id: '70-nas', duration: finaleMs, countMs: 0 },
    { kind: 'folded', id: '70-nas', duration: 1200, countMs: 0 },
  ] : [
    { kind: 'reading', id: '75', duration: 5000, countMs: 2500 },
    { kind: 'reading', id: '83', duration: 4000, countMs: 400 },
    { kind: 'reading', id: '84', duration: 5000, countMs: 2500 },
    ...(style === 'sky' ? [
      { kind: 'reading' as const, id: '97', duration: 4000, countMs: 800 },
      { kind: 'reading' as const, id: '77', duration: 5000, countMs: 2500 },
    ] : []),
    { kind: 'reading', id: '98', duration: 4000, countMs: 300 },
    { kind: 'finale', id: '98', duration: finaleMs, countMs: 0 },
    { kind: 'folded', id: '98', duration: 3000, countMs: 0 },
  ]
  let at = 0

  return story.map((scene, i) => {
    const startsAt = at
    at += scene.duration

    const period: AthkarSet = set === 'afterSalah' ? 'afterSalah' : demoPeriod(style, i)
    return { ...scene, startsAt, style, period, sky: set === 'afterSalah' ? sky : DEMO_SKIES[Math.min(i, DEMO_SKIES.length - 1)]!, accent: set === 'afterSalah' || style === 'sky' ? accent : DEMO_COLORS[i]! }
  })
}

export const demoDuration = (style: Style, finaleMs: number, set: DemoSet = 'daily') =>
  demoScenes(style, 'orange', finaleMs, set).reduce((total, scene) => total + scene.duration, 0)
export const demoReply = (style: Style, finaleMs: number) =>
  `**Athkar demo:** ${style} · ${demoScenes(style, 'orange', finaleMs).length} scenes · ${demoDuration(style, finaleMs) / 1000}s`

export const demoStep = (style: Style, accent: Accent, elapsed: number, finaleMs: number, set: DemoSet = 'daily', sky: Sky = 'dawn') => {
  if (elapsed < 0 || elapsed >= demoDuration(style, finaleMs, set)) return undefined
  const scene = demoScenes(style, accent, finaleMs, set, sky).find(s => elapsed < s.startsAt + s.duration)!
  const ms = elapsed - scene.startsAt
  const period = scene.period
  const context: Reading = set === 'afterSalah' ? { ...emptyReading(), pray: 'fajr', at: null } : emptyReading()
  const list = listFor(period, context)
  const index = list.findIndex(thikr => thikr.id === scene.id)
  const thikr = list[index]!
  const count = scene.kind === 'reading' ? Math.min(timesOf(thikr), Math.floor(ms / scene.countMs)) : timesOf(thikr)
  // Skip ahead through the set for filming, completing the preceding items
  // in this disposable reading only. Position and overall progress stay real.
  const counts = Object.fromEntries(list.slice(0, index).map(t => [t.id, timesOf(t)]))
  const reading: Reading = { ...context, index, counts: { ...counts, [thikr.id]: count }, isDone: scene.kind !== 'reading' }
  const previous: Reading = { ...reading, counts: { ...counts, [thikr.id]: Math.max(0, count - 1) } }
  const sinceCount = ms - count * scene.countMs

  return {
    ...scene, reading,
    isActive: scene.kind !== 'folded',
    progress: overall(period, reading),
    from: count > 0 && scene.kind === 'reading' ? overall(period, previous) : overall(period, reading),
    glowMs: scene.kind === 'reading' && count > 0 ? sinceCount : 0,
    finaleMs: scene.kind === 'finale' ? ms : undefined,
  }
}
