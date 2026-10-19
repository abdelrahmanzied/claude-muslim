import { configRows } from '../fixtures/config.ts'
import type { QuranPlaying, QuranRepeat } from '../../types/index.d.ts'
import type { On, HttpResponse } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Mounted } from 'claude-code/testing'
import type { PanelAction, PanelQuran } from '../../src/shared/panel/signal.ts'
import type { PaneModel } from '../../src/features/muslim-pane/model.ts'
import { quranLayout } from '../../src/features/muslim-pane/model.ts'
import { CONTROL_SPECS, Q_CONTROLS_BASE, Q_CONTROLS_H, Q_RETRY_TOP, Q_RETRY_H, settingsBoxes, Q_RECITER_BASE, Q_SEG_TOP, Q_TITLE_TOP, cardRects, controlScale, quranOffset } from '../../src/features/muslim-pane/layout.ts'
import { defaultReciter } from '../../src/features/quran/catalog.ts'
import { QURAN_CATALOG } from '../../src/features/quran/catalog-data.ts'
import { QURAN_SUPPORT } from '../../src/features/quran/reciter-support.ts'
import { AUDIO_LIMIT_BYTES, CLIP_ERROR, SIZE_ERROR, TIMING_ERROR, makePlan, timedSegments, type RecordingPlan } from '../../src/features/quran/segments.ts'
import { QURAN_QUARTER_BOUNDARIES } from '../../src/features/quran/quarter-boundaries.ts'
import { encodeBase64 } from '../../src/features/quran/segment-mp3.ts'

const NOW = 100000
const primary = defaultReciter(QURAN_CATALOG)
// Pick a second real recording with no known gaps, independent of catalog order.
const secondary = QURAN_CATALOG.reciters.find(r => r.key !== primary.key && QURAN_SUPPORT[r.key] && !Object.keys(QURAN_SUPPORT[r.key]!.unavailable).length)!
const alternateCommand = `reciter ${QURAN_CATALOG.reciters.indexOf(secondary) + 1}`

const run = (args: string) => ({ command: 'quran', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const muslimPane = { plugin: 'muslim', component: 'Pane' as const, requestId: 'muslim', surface: 'desktop' as const, props: { title: 'Muslim', isFocused: true, bodyColumns: 50, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} } }
type Panel = { svg(): Promise<string>; post(message: { act: string; list?: string; value?: string; key?: string }, _target?: unknown): Promise<void>; press(action: PanelAction): Promise<void>; read(): Promise<PanelQuran | null>; count(list: 'reciter' | 'surah'): Promise<number> }
// The Muslim card's side of the player, driven the way a person does: its keys, its buttons and its pickers.
async function panel($: { ui: { mount(args: typeof muslimPane): Promise<Mounted<'desktop', 'Pane'>> } }): Promise<Panel> {
  const ui = await $.ui.mount(muslimPane)
  await ui.resize({ columns: 50, rows: 100, in: 'muslim-pane' })
  const model = async () => (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  const layout = async () => { const m = await model(); const q = quranLayout(m); return { m, q, r: cardRects(m.folds, m.settings.state, m.settings.options, q, m.athkarMenu) } }
  const click = async (x: number, y: number) => {
    const { r } = await layout()
    const fine = { x: x * 50 / 420, y: y * 100 / r.height }
    await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  }
  const key = (name: string) => ui.key({ in: 'muslim-pane', key: name })
  const open = async (list: 'reciter' | 'surah' | 'segment') => {
    const { r, q } = await layout()
    const top = list === 'reciter' ? Q_RECITER_BASE + quranOffset(q.segmented) : list === 'surah' ? Q_TITLE_TOP : Q_SEG_TOP
    await click(list === 'segment' ? 300 : 300, r.quranY + top + 8)
  }
  const pickList = async (list: 'reciter' | 'surah' | 'segment', value: string) => {
    await open(list)
    if (list === 'segment') {
      for (let i = 0; i < 40; i++) await key('up')
      for (let i = 0; i < Number(value); i++) await key('down')
    } else {
      const query = list === 'surah' ? value : String(QURAN_CATALOG.reciters.findIndex(r => r.key === value) + 1)
      for (const c of query) await key(c)
    }
    await key('return')
  }
  return {
    svg: async () => String((await ui.find({ in: 'muslim-pane', type: 'Svg' }))?.props.source ?? ''),
    async post(m) {
      if (m.act === 'pick') await pickList(m.list as 'reciter' | 'surah' | 'segment', m.value ?? '')
      else if (m.act === 'key') await key(m.key ?? '')
    },
    async press(action) {
      if (action === 'quran-toggle') return key('return')
      if (action === 'quran-prev') return key('left')
      if (action === 'quran-next') return key('right')
      const { r, q } = await layout()
      if (action === 'quran-retry') return click(210, r.quranY + Q_RETRY_TOP + quranOffset(q.segmented) + Q_RETRY_H / 2)
      const spec = CONTROL_SPECS.find(c => c.act === action)!
      await click(420 / 2 + spec.dx * controlScale(420), r.quranY + Q_CONTROLS_BASE + quranOffset(q.segmented) + Q_CONTROLS_H / 2 + spec.dy)
    },
    async count(list) {
      await open(list)
      const count = (await model()).picker?.count ?? 0
      await key('tab')
      return count
    },
    read: async () => { const m = await model(); return m.quran.isAvailable ? m.quran : null },
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function setup(on: On, entries: Record<string, unknown> = {}, env: Record<string, string> = {}, surface: 'desktop' | 'terminal' = 'desktop', mockSize = true) {
  mock.env(on, { TERM_PROGRAM: 'WarpTerminal', ...env })
  const store: Record<string, unknown> = Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, deepFreeze(value)]))
  on('store.get', async (_$, e) => ({ value: store[e.key] }))
  on('store.set', async (_$, e) => { store[e.key] = deepFreeze(e.value); return { value: undefined } })
  const state: { quranPlaying?: QuranPlaying | null; quranError?: string | null; quranSurah?: number; quranRepeat?: QuranRepeat } = {}
  on('state.set', async (_$, e, next) => {
    deepFreeze(e.value)
    const result = await next(e)
    if (e.key === 'quranPlaying') state.quranPlaying = e.value as QuranPlaying | null
    if (e.key === 'quranError') state.quranError = e.value as string | null
    if (e.key === 'quranSurah') state.quranSurah = e.value as number
    if (e.key === 'quranRepeat') state.quranRepeat = e.value as QuranRepeat
    return result
  })
  if (mockSize) on('http.fetch', { init: { method: 'HEAD' } }, async () => ({ value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } }))
  const clock = mock.clock(on, { now: NOW })
  on('session.surface', async () => ({ value: surface }))
  const opened: { id: string; title?: string }[] = []
  on('ui.open', async (_$, e) => { opened.push({ id: e.id, title: e.title }); return { value: { isPlaced: true } } })
  const logs: Record<string, string> = {}
  const temp = env.OS === 'Windows_NT' ? env.TEMP : env.TMPDIR ?? '/tmp'
  const debugPath = `${temp?.replace(/[\\/]+$/, '')}/claude-muslim-quran/debug.log`
  on('fs.read', { path: debugPath }, async (_$, e) => ({ value: logs[e.path] ?? '' }))
  on('fs.write', { path: debugPath }, async (_$, e) => {
    logs[e.path] = e.text
    return { value: undefined }
  })
  const config = { theme: 'auto' as string, rows: configRows }
  on('config.list', async () => ({ value: [...config.rows, { key: 'theme', label: 'Theme', kind: 'choice' as const, value: config.theme, provider: { plugin: 'engine', tier: 'core' as const }, isLocked: false }] }))
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  return { ...clock, state, store, opened, toasts, logs, config }
}
function audio(on: On, clock: { sleep(ms: number): Promise<void> }) {
  const played: { clip: unknown; gain: number | undefined; signal: AbortSignal; aborted: boolean }[] = []
  on('audio.play', async ($, e, next) => {
    const record = { clip: e.clip, gain: e.gain, signal: next.signal, aborted: false }
    played.push(record)
    await Promise.race([clock.sleep(10000), new Promise<void>(resolve => {
      if (next.signal.aborted) { record.aborted = true; resolve() }
      else next.signal.addEventListener('abort', () => { record.aborted = true; resolve() })
    })])
    return { value: undefined }
  })
  return played
}

function quarterPlan(surah = 2): RecordingPlan {
  const reciter = primary
  const timing = Array.from({ length: QURAN_QUARTER_BOUNDARIES[surah]!.at(-1)![2] }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 }))
  const size = AUDIO_LIMIT_BYTES * 2
  const segments = timedSegments(timing, surah, size).map(s => ({ ...s, startByte: s.id * 41700, endByte: (s.id + 1) * 41700, decodedDurationMs: 2612 }))
  return makePlan(reciter, QURAN_CATALOG.surahs[surah - 1]!, reciter.server + String(surah).padStart(3, '0') + '.mp3', size, NOW, { etag: 'fixture' }, timing.length * 1000, 112, segments)
}
function mockRanges(on: On, plan: RecordingPlan, etag = 'fixture', windows = false, beforeRange?: (range: string) => Promise<void>) {
  const ranges: string[] = [], cleanup: string[][] = []
  const files: Record<string, { bytes: Uint8Array; headers: string }> = {}
  on('fs.write', async () => ({ value: undefined }))
  on('process.run', async (_$, e) => {
    const argv = [...e.argv]
    if (argv[0] === 'curl') {
      const range = argv[argv.indexOf('-r') + 1]!, path = argv[argv.indexOf('-o') + 1]!
      ranges.push(range)
      await beforeRange?.(range)
      const [start, end] = range.split('-').map(Number)
      const bytes = new Uint8Array(end! - start! + 1)
      for (let at = (417 - start! % 417) % 417; at + 4 <= bytes.length; at += 417) bytes.set([255, 251, 144, 0], at)
      files[path] = { bytes, headers: `HTTP/2 206\r\nContent-Range: bytes ${start}-${end}/${plan.sizeBytes}\r\nETag: ${etag}\r\n\r\n` }
    } else cleanup.push(argv)
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('fs.stat', async (_$, e) => ({ value: { size: files[e.path]?.bytes.length ?? 0, mtimeMs: 0, kind: 'file', isFile: true, isDirectory: false, isLink: false } }))
  on('fs.read', async (_$, e) => ({ value: e.as === 'bytes' ? { base64: encodeBase64(files[e.path]!.bytes) } : files[e.path.replace(/\.headers$/, '')]?.headers ?? '' }))
  return { ranges, cleanup, windows }
}

test('frozen pane props and frozen store/state values cannot prevent uncached quarter extraction', async ($, on) => {
  const plan = quarterPlan()
  plan.segments = plan.segments.map(({ startByte, endByte, decodedDurationMs, ...s }) => s)
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: plan } })
  const played = audio(on, clock)
  let release!: () => void, scanning!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const began = new Promise<void>(resolve => { scanning = resolve })
  let blocked = false
  mockRanges(on, plan, 'fixture', false, async range => {
    if (range === '0-2097151' && !blocked) { blocked = true; scanning(); await gate }
  })
  const running = $.command.run(run('play 2'))
  await began
  const mounted = await panel($)
  deepFreeze(await mounted.read())
  release()
  await running; await clock.settle()
  expect(clock.state.quranError).toBe(null)
  expect(played).toHaveLength(1)
  const saved = (clock.store['quran.segmentCache'] as Record<string, RecordingPlan>)[`${primary.key}:2`]!
  expect(saved.segments[0]!.startByte).toBe(0)
  expect(saved.segments[0]!.endByte! > 0).toBe(true)
  expect(saved.segments[1]!.startByte).toBeDefined()
  expect(saved.checkpoints).toHaveLength(2)
  await $.command.run(run('stop')); await clock.settle()
})
test('large cached recording plays a bounded clip from the original source and continues with the next quarter', async ($, on) => {
  const plan = quarterPlan()
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: plan } })
  const played = audio(on, clock), ranges = mockRanges(on, plan)
  await $.command.run(run('play 2')); await clock.settle()
  // The next quarter is fetched while the first one plays.
  expect(ranges.ranges).toEqual(['0-41699', '41700-83399'])
  expect(played).toHaveLength(1)
  expect((played[0]!.clip as { mime: string }).mime).toBe('audio/mpeg')
  expect((played[0]!.clip as { base64: string }).base64).toHaveLength(55600)
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  expect(clock.state.quranPlaying?.segmentCount).toBe(20)
  const mounted = await panel($)
  const shown = await mounted.read()
  expect(shown?.segmented).toBe(true)
  expect(shown?.isLive).toBe(true)
  expect(shown?.part).toContain('الربع')
  await clock.advance(10000); await clock.settle()
  expect(clock.state.quranSurah).toBe(2)
  expect(clock.state.quranPlaying?.segmentIndex).toBe(1)
  expect(played).toHaveLength(2)
  // Quarter 2 played from the prefetch with no second download; quarter 3 is now prefetching.
  expect(ranges.ranges).toEqual(['0-41699', '41700-83399', '83400-125099'])
  expect(ranges.cleanup[0]!.slice(0, 3)).toEqual(['rm', '-f', '--'])
  await $.command.run(run('stop'))
})
test('quarter selection, next and previous move between quarters, then across surahs, and abort the replaced clip', { timeoutMs: 20000 }, async ($, on) => {
  const plan = quarterPlan()
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: plan } })
  const played = audio(on, clock)
  mockRanges(on, plan)
  await $.command.run(run('play 2')); await clock.settle()
  await $.command.run(run('next')); await clock.settle()
  expect(clock.state.quranPlaying?.segmentIndex).toBe(1)
  expect(played[0]!.signal.aborted).toBe(true)
  const mounted = await panel($)
  await mounted.post({ act: 'pick', list: 'segment', value: '19' }, { in: 'quran-card' })
  await clock.settle()
  expect(clock.state.quranPlaying?.segmentIndex).toBe(19)
  await $.command.run(run('next')); await clock.settle()
  expect(clock.state.quranSurah).toBe(3)
  await $.command.run(run('play 2')); await clock.settle()
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  await $.command.run(run('prev')); await clock.settle()
  expect(clock.state.quranSurah).toBe(1)
  await $.command.run(run('stop'))
  expect(played.every(p => p.signal.aborted)).toBe(true)
})
test('nearCheckpoint reuses a saved lead-in less than 60s away before probing a CBR jump', { timeoutMs: 20000 }, async ($, on) => {
  const plan = quarterPlan()
  const index = plan.segments.findIndex(s => s.startMs >= 100000 && s.startMs < 120000)
  plan.segments = plan.segments.map((s, i) => i === index ? (({ startByte, endByte, decodedDurationMs, ...rest }) => rest)(s) : s)
  const checkpoint = { byte: 2296 * 417, timeMs: 2296 * 1152 / 44100 * 1000 }
  plan.checkpoints = [checkpoint]
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: plan } })
  const played = audio(on, clock)
  const { ranges } = mockRanges(on, plan)
  on('state.get', { plugin: 'muslim', key: 'quranSurah' }, async () => ({ value: { value: 2, version: 1 } }))
  await $.command.run(run(''))
  const mounted = await panel($)
  await mounted.post({ act: 'pick', list: 'segment', value: String(index) }, { in: 'quran-card' })
  await clock.settle()
  expect(clock.state.quranError).toBe(null)
  expect(played).toHaveLength(1)
  expect(clock.state.quranPlaying?.segmentIndex).toBe(index)
  expect(ranges[0]).toBe(`${checkpoint.byte}-${checkpoint.byte + 2097151}`)
  expect(ranges).not.toContain('0-131071')
  await $.command.run(run('stop')); await clock.settle()
})
test('surah picks start at quarter one; the optional quarter picker alone starts later', async ($, on) => {
  const plan = quarterPlan()
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: plan } })
  const played = audio(on, clock)
  mockRanges(on, plan)
  const mounted = await panel($)
  await mounted.post({ act: 'pick', list: 'surah', value: '2' })
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  await mounted.post({ act: 'pick', list: 'segment', value: '5' }, { in: 'quran-card' })
  expect(clock.state.quranPlaying?.segmentIndex).toBe(5)
  await mounted.post({ act: 'pick', list: 'surah', value: '2' }, { in: 'quran-card' })
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  expect(played[1]!.signal.aborted).toBe(true)
  await $.command.run(run('stop')); await clock.settle()
})
test('natural end of the last quarter starts the next surah at its first quarter; 114 stops', { timeoutMs: 20000 }, async ($, on) => {
  const second = quarterPlan(), third = quarterPlan(3), final = quarterPlan(114)
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: second, [`${primary.key}:3`]: third, [`${primary.key}:114`]: final } })
  const played = audio(on, clock)
  mockRanges(on, second)
  const mounted = await panel($)
  await $.command.run(run('play 2'))
  await mounted.post({ act: 'pick', list: 'segment', value: String(second.segments.length - 1) }, { in: 'quran-card' })
  await clock.advance(10000)
  expect(clock.state.quranPlaying?.surah).toBe(3)
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  await $.command.run(run('prev'))
  expect(clock.state.quranPlaying?.surah).toBe(2)
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  await $.command.run(run('play 114'))
  await mounted.post({ act: 'pick', list: 'segment', value: String(final.segments.length - 1) }, { in: 'quran-card' })
  const count = played.length
  await clock.advance(10000)
  expect(clock.state.quranPlaying).toBe(null)
  expect(clock.state.quranSurah).toBe(114)
  expect(played).toHaveLength(count)
})
test('unfinished next-quarter prefetch survives natural advancement and is downloaded only once', async ($, on) => {
  const plan = quarterPlan()
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: plan } })
  const played = audio(on, clock)
  let release!: () => void, fetching!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const began = new Promise<void>(resolve => { fetching = resolve })
  const { ranges } = mockRanges(on, plan, 'fixture', false, async range => {
    if (range === '41700-83399') { fetching(); await gate }
  })
  await $.command.run(run('play 2')); await began
  const advancing = clock.advance(10000)
  await clock.settle()
  expect(ranges.filter(r => r === '41700-83399')).toHaveLength(1)
  release(); await advancing; await clock.settle()
  expect(clock.state.quranError).toBe(null)
  expect(clock.state.quranPlaying?.segmentIndex).toBe(1)
  expect(played).toHaveLength(2)
  expect(ranges).toEqual(['0-41699', '41700-83399', '83400-125099'])
  await $.command.run(run('stop')); await clock.settle()
})
test('repeat command replays a whole surah, toggles without restarting and Stop leaves repeat on', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  expect((await $.command.run(run('repeat'))).text).toBe('Quran repeat on.')
  await $.command.run(run('play 18'))
  await clock.advance(10000)
  expect(played).toHaveLength(2)
  expect(clock.state.quranPlaying?.surah).toBe(18)
  expect(clock.state.quranRepeat).toBe('surah')
  expect((await $.command.run(run('repeat'))).text).toBe('Quran repeat off.')
  expect(played).toHaveLength(2)
  expect(played[1]!.signal.aborted).toBe(false)
  await clock.advance(10000)
  expect(clock.state.quranPlaying?.surah).toBe(19)
  await $.command.run(run('repeat'))
  await $.command.run(run('stop')); await clock.settle()
  expect(clock.state.quranRepeat).toBe('surah')
  expect(clock.state.quranPlaying).toBe(null)
  const count = played.length
  await clock.advance(10000)
  expect(played).toHaveLength(count)
  expect(Object.keys(clock.store).some(key => key.includes('repeat'))).toBe(false)
})
test('repeat plays every quarter of a split surah, then starts it over', async ($, on) => {
  const plan = quarterPlan(36)
  expect(plan.segments.length > 1).toBe(true)
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:36`]: plan } })
  const played = audio(on, clock)
  mockRanges(on, plan)
  await $.command.run(run('repeat'))
  await $.command.run(run('play 36')); await clock.settle()
  const mounted = await panel($)
  expect(await mounted.read()).toMatchObject({ repeat: 'surah' })
  const seen = [clock.state.quranPlaying?.segmentIndex]
  for (let i = 0; i < plan.segments.length; i++) { await clock.advance(10000); seen.push(clock.state.quranPlaying?.segmentIndex) }
  expect(seen).toEqual([...plan.segments.keys(), 0])
  expect(clock.state.quranPlaying?.surah).toBe(36)
  expect(played).toHaveLength(plan.segments.length + 1)
  await $.command.run(run('stop')); await clock.settle()
})
test('segment repeat replays the same quarter forever and never reads the next one', async ($, on) => {
  const plan = quarterPlan(36)
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:36`]: plan } })
  const played = audio(on, clock)
  const ranges = mockRanges(on, plan)
  expect((await $.command.run(run('repeat segment'))).text).toBe('Quarter repeat works only while a split surah is selected.')
  expect(clock.state.quranRepeat).not.toBe('segment')
  await $.command.run(run('play 36')); await clock.settle()
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  expect((await $.command.run(run('repeat segment'))).text).toBe('Quran repeat on: current quarter.')
  expect(clock.state.quranRepeat).toBe('segment')
  await $.command.run(run('next')); await clock.settle()
  expect(clock.state.quranPlaying?.segmentIndex).toBe(1)
  const start = ranges.ranges.length
  const seen: (number | undefined)[] = []
  for (let i = 0; i < 4; i++) { await clock.advance(10000); await clock.settle(); seen.push(clock.state.quranPlaying?.segmentIndex) }
  expect(seen).toEqual([1, 1, 1, 1])
  expect(clock.state.quranPlaying?.surah).toBe(36)
  const third = String(plan.segments[2]!.startByte)
  expect(ranges.ranges.slice(start).some(r => r.startsWith(`${third}-`))).toBe(false)
  const mounted = await panel($)
  expect(await mounted.read()).toMatchObject({ repeat: 'segment' })
  // Quarter repeat off again: the quarters advance.
  await $.command.run(run('repeat segment'))
  expect(clock.state.quranRepeat).toBe('off')
  await clock.advance(10000); await clock.settle()
  expect(clock.state.quranPlaying?.segmentIndex).toBe(2)
  expect(played.length).toBeGreaterThan(5)
  await $.command.run(run('stop')); await clock.settle()
})
test('the two repeat commands exclude each other and quarter repeat falls back to off on a whole surah', async ($, on) => {
  const plan = quarterPlan(36)
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:36`]: plan } })
  audio(on, clock)
  mockRanges(on, plan)
  await $.command.run(run('play 36')); await clock.settle()
  await $.command.run(run('repeat segment'))
  expect(clock.state.quranRepeat).toBe('segment')
  await $.command.run(run('repeat'))
  expect(clock.state.quranRepeat).toBe('surah')
  await $.command.run(run('repeat segment'))
  expect(clock.state.quranRepeat).toBe('segment')
  await $.command.run(run('play 18')); await clock.settle()
  expect(clock.state.quranRepeat).toBe('off')
  await $.command.run(run('repeat'))
  expect(clock.state.quranRepeat).toBe('surah')
  await $.command.run(run('stop')); await clock.settle()
})
test('pane repeat is a silent toggle and persists through manual navigation and picks', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  await $.command.run(run('play 18'))
  const mounted = await panel($)
  await mounted.press('quran-repeat-surah')
  expect(clock.state.quranRepeat).toBe('surah')
  expect(played).toHaveLength(1)
  expect(await mounted.read()).toMatchObject({ repeat: 'surah' })
  await $.command.run(run('next'))
  expect(clock.state.quranPlaying?.surah).toBe(19)
  await $.command.run(run('prev'))
  expect(clock.state.quranPlaying?.surah).toBe(18)
  await mounted.post({ act: 'pick', list: 'surah', value: '114' }, { in: 'quran-card' })
  expect(clock.state.quranRepeat).toBe('surah')
  await $.command.run(run(alternateCommand))
  expect(clock.state.quranRepeat).toBe('surah')
  expect(clock.state.quranPlaying?.moshafKey).toBe(secondary.key)
  await clock.advance(10000)
  expect(clock.state.quranPlaying?.surah).toBe(114)
  expect(clock.state.quranPlaying).not.toBe(null)
  expect(clock.toasts).toEqual([])
  await $.command.run(run('stop')); await clock.settle()
})
for (const replacement of ['stop', 'prev', 'next', 'play 2', alternateCommand]) test(`${replacement} cancels an unfinished quarter prefetch`, async ($, on) => {
  const plan = quarterPlan()
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: plan } })
  const played = audio(on, clock)
  let release!: () => void, fetching!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const began = new Promise<void>(resolve => { fetching = resolve })
  let blocked = false
  const { ranges } = mockRanges(on, plan, 'fixture', false, async range => {
    if (range === '41700-83399' && !blocked) { blocked = true; fetching(); await gate }
  })
  await $.command.run(run('play 2')); await began
  const replacing = $.command.run(run(replacement))
  await clock.settle()
  expect(played[0]!.signal.aborted).toBe(true)
  release(); await replacing; await clock.settle()
  expect(clock.state.quranError).toBe(null)
  // Explicit Next downloads the next quarter anew; it cannot adopt the aborted prefetch.
  expect(ranges.filter(r => r === '41700-83399')).toHaveLength(['next', 'play 2'].includes(replacement) ? 2 : 1)
  expect(played).toHaveLength(replacement === 'stop' ? 1 : 2)
  await $.command.run(run('stop')); await clock.settle()
})
test('a newly picked large surah fetches exact timing metadata and immediately plays its first quarter', async ($, on) => {
  const clock = setup(on, {}, {}, 'desktop', false)
  const played = audio(on, clock), urls: string[] = []
  on('http.fetch', async (_$, e) => {
    urls.push(e.url)
    const value: HttpResponse = e.init?.method === 'HEAD' ? { ok: true, status: 200, headers: { 'content-length': String(AUDIO_LIMIT_BYTES + 1), etag: 'fixture' }, text: '' }
      : { ok: true, status: 200, headers: {}, text: JSON.stringify(e.url.endsWith('/reads') ? [{ id: 112, folder_url: primary.server }] : Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 }))) }
    return { value }
  })
  mockRanges(on, { ...quarterPlan(), sizeBytes: AUDIO_LIMIT_BYTES + 1 })
  const mounted = await panel($)
  await mounted.post({ act: 'pick', list: 'surah', value: '2' }, { in: 'quran-card' }); await clock.settle()
  expect(clock.state.quranError).toBe(null)
  expect(played).toHaveLength(1)
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  expect(urls).toContain('https://www.mp3quran.net/api/v3/ayat_timing?surah=2&read=112')
  const saved = (clock.store['quran.segmentCache'] as Record<string, RecordingPlan>)[`${primary.key}:2`]!
  expect(saved.reciterName).toBe(primary.name)
  expect(saved.surahName).toBe('البقرة')
  expect(saved.computedAt).toBe(NOW)
  expect(saved.sourceCheckedAt).toBe(NOW)
  expect(saved.segments).toHaveLength(20)
  expect((await mounted.read())?.segmented).toBe(true)
  await $.command.run(run('stop')); await clock.settle()
})
test('a fresh large recording computes, saves and plays its first quarter', async ($, on) => {
  const clock = setup(on, {}, {}, 'desktop', false)
  const played = audio(on, clock)
  const size = AUDIO_LIMIT_BYTES + 1
  on('http.fetch', async (_$, e) => ({ value: (e.init?.method === 'HEAD' ? { ok: true, status: 200, headers: { 'content-length': String(size), etag: 'fixture' }, text: '' }
    : { ok: true, status: 200, headers: {}, text: JSON.stringify(e.url.endsWith('/reads') ? [{ id: 112, folder_url: primary.server }] : Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 }))) }) as HttpResponse }))
  mockRanges(on, { ...quarterPlan(), sizeBytes: size })
  await $.command.run(run('play 2')); await clock.settle()
  expect(clock.state.quranError ?? null).toBe(null)
  expect(played).toHaveLength(1)
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  await $.command.run(run('stop'))
})
test('small whole surahs bypass timing data even when crossing many quarters', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  await $.command.run(run('play 2')); await clock.settle()
  expect(played[0]!.clip).toEqual({ url: primary.server + '002.mp3' })
  expect(clock.state.quranPlaying?.segmentIndex).toBeUndefined()
  const mounted = await panel($)
  expect((await mounted.read())?.segmented).toBe(false)
  await $.command.run(run('stop'))
})
test('unknown size or missing timing shows the Claude limit with retry and never calls audio', async ($, on) => {
  const clock = setup(on, {}, {}, 'desktop', false)
  const played = audio(on, clock)
  let large = false
  on('http.fetch', async (_$, e) => ({ value: { ok: true, status: 200, headers: (e.init?.method === 'HEAD' ? large ? { 'content-length': String(AUDIO_LIMIT_BYTES) } : {} : {}) as Record<string, string>, text: '[]' } }))
  on('process.run', async () => ({ deny: 'curl unavailable' }))
  on('fs.write', async () => ({ value: undefined }))
  expect((await $.command.run(run('play 2'))).text).toBe(SIZE_ERROR)
  expect(clock.state.quranError).toBe(SIZE_ERROR)
  large = true
  expect((await $.command.run(run('retry'))).text).toBe(TIMING_ERROR)
  expect(played).toEqual([])
  expect(clock.state.quranPlaying).toBe(null)
})
test('a changed recording validator rejects cached byte cuts and cleans Windows range files', async ($, on) => {
  const plan = quarterPlan()
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: plan } }, { OS: 'Windows_NT', TEMP: 'C:\\fixture' })
  const played = audio(on, clock), ranges = mockRanges(on, plan, 'changed', true)
  expect((await $.command.run(run('play 2'))).text).toBe(CLIP_ERROR)
  expect(played).toEqual([])
  expect(clock.state.quranPlaying).toBe(null)
  expect(ranges.cleanup[0]!.slice(0, 5)).toEqual(['cmd', '/d', '/c', 'del', '/q'])
  expect(ranges.cleanup[0]![5]).toContain('C:\\fixture\\claude-muslim-quran\\range-')
})
test('Stop during a blocked size check clears preparation and prevents late audio or cache writes', async ($, on) => {
  const clock = setup(on, {}, {}, 'desktop', false)
  const played = audio(on, clock)
  let finish: (() => void) | undefined
  on('http.fetch', { init: { method: 'HEAD' } }, async () => {
    await new Promise<void>(resolve => { finish = resolve })
    return { value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } }
  })
  const running = $.command.run(run('play 2'))
  await clock.settle()
  expect(finish).toBeDefined()
  await $.command.run(run('stop'))
  finish!(); await running; await clock.settle()
  expect(played).toEqual([])
  expect(clock.state.quranPlaying).toBe(null)
  expect(clock.store['quran.segmentCache']).toBeUndefined()
})

test('play sets whole-track state and approximate clock time; stop clears tracking', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  expect((await $.command.run(run('play كهف'))).text).toContain('الكهف')
  await clock.settle()
  expect(played).toHaveLength(1)
  expect(played[0]?.clip).toEqual({ url: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/018.mp3' })
  expect(played[0]?.gain).toBeUndefined()
  expect(clock.state.quranPlaying).toEqual({ moshafKey: primary.key, surah: 18, startedAt: NOW, durationMs: null })
  const mounted = await panel($)
  await clock.advance(1000)
  expect((await mounted.read())?.elapsed).toBe('00:01')
  expect((await mounted.read())?.isLive).toBe(true)
  await $.command.run(run('stop'))
  expect(clock.state.quranPlaying).toBe(null)
  expect((await mounted.read())?.isLive).toBe(false)
})
test('natural completion advances to the next surah with the same reciter', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  await $.command.run(run('play 18'))
  await clock.advance(10000)
  expect(clock.state.quranPlaying?.surah).toBe(19)
  expect(clock.state.quranPlaying?.moshafKey).toBe(primary.key)
  expect(clock.state.quranSurah).toBe(19)
  expect(played).toHaveLength(2)
  expect(played[1]?.clip).toEqual({ url: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/019.mp3' })
  await $.command.run(run('stop'))
})
test('reciter switch restarts current surah without config writes', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  const config: unknown[] = []
  on('config.set', async (_$, e) => (config.push(e), { value: e.value }))
  await $.command.run(run('play 18')); await clock.settle()
  expect(played).toHaveLength(1)
  expect((await $.command.run(run(alternateCommand))).text).toContain(secondary.label)
  await clock.settle()
  expect(played).toHaveLength(2)
  expect(played[1]?.clip).toEqual({ url: secondary.server + '018.mp3' })
  expect(played[1]?.gain).toBeUndefined()
  expect(clock.store['quran.reciter']).toBe(secondary.key)
  expect(config).toEqual([])
  await $.command.run(run('stop'))
})
test('next/prev stop at the ends; malformed arguments give usage without playing', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  expect((await $.command.run(run('prev'))).text).toBe('Already at the first surah.')
  await $.command.run(run('play 114')); await clock.settle()
  expect((await $.command.run(run('next'))).text).toBe('Already at the last surah.')
  expect((await $.command.run(run('play 115'))).text).toContain('Surah not found')
  expect((await $.command.run(run('pause'))).text).toContain('/quran help')
  expect(played).toHaveLength(1)
  await $.command.run(run('prev')); await clock.settle()
  expect(clock.state.quranPlaying?.surah).toBe(113)
  await $.command.run(run('stop'))
})
test('pane search picks start playback and toggle aborts the exact audio signal', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  const mounted = await panel($)
  await mounted.post({ act: 'pick', list: 'surah', value: '18' })
  await clock.settle()
  expect(clock.state.quranPlaying?.surah).toBe(18)
  await mounted.post({ act: 'pick', list: 'reciter', value: secondary.key })
  expect(clock.store['quran.reciter']).toBe(secondary.key)
  await mounted.post({ act: 'key', key: 'return' }, { in: 'quran-card' })
  expect(clock.state.quranPlaying).toBe(null)
  expect(played).toHaveLength(2)
  expect(played[0]?.signal.aborted).toBe(true)
  expect(played[1]?.signal.aborted).toBe(true)
  expect(played[1]?.aborted).toBe(true)
})
test('an empty store fills the Quran card and both lists without any network request', async ($, on) => {
  const clock = setup(on, {}, {}, 'desktop', false)
  const requests: string[] = [], catalogReads: string[] = []
  on('http.fetch', async (_$, e) => { requests.push(e.url); throw new Error('unexpected network') })
  on('store.get', { key: 'quran.catalog' }, async (_$, e) => { catalogReads.push(e.key); return { value: undefined } })
  expect(clock.store).toEqual({})
  const mounted = await panel($)
  const shown = await mounted.read()
  expect(shown).not.toBe(null)
  expect(shown?.reciter).toBe(primary.label.replace(' — ', ' · '))
  expect(shown?.surah).toBe(`سورة ${QURAN_CATALOG.surahs[0]!.name}`)
  expect(await mounted.count('reciter')).toBe(QURAN_CATALOG.reciters.length)
  expect(await mounted.count('surah')).toBe(114)
  expect(requests).toEqual([])
  expect(catalogReads).toEqual([])
  expect(clock.store).toEqual({})
})
test('an obsolete store catalog is ignored and the remembered recording is kept', async ($, on) => {
  const old = { fetchedAt: -1, reciters: [], surahs: [] }
  const clock = setup(on, { 'quran.catalog': old, 'quran.reciter': secondary.key }, {}, 'desktop', false)
  const catalogReads: string[] = [], requests: string[] = []
  on('store.get', { key: 'quran.catalog' }, async (_$, e) => { catalogReads.push(e.key); return { value: old } })
  on('http.fetch', async (_$, e) => { requests.push(e.url); throw new Error('unexpected network') })
  expect((await (await panel($)).read())?.reciter).toBe(secondary.label.replace(' — ', ' · '))
  const listed = (await $.command.run(run('reciter'))).text ?? ''
  expect(listed).toContain(primary.label)
  expect(listed).toContain(secondary.label)
  expect(clock.store['quran.catalog']).toEqual(old)
  expect(clock.store['quran.reciter']).toBe(secondary.key)
  expect(catalogReads).toEqual([])
  expect(requests).toEqual([])
})
test('play rejection clears playing and renders a dim pane/command-output error', async ($, on) => {
  const clock = setup(on)
  on('audio.play', async () => ({ deny: 'Playback unavailable' }))
  const reply = await $.command.run(run('play 18')); await clock.settle()
  expect(clock.state.quranPlaying).toBe(null)
  expect((await (await panel($)).read())?.isLive).toBe(false)
  const output = await $.ui.mount({ plugin: 'muslim', surface: 'desktop', component: 'CommandOutput', requestId: 'quran-output', props: { command: 'quran', args: 'play 18', text: reply.text!, isErrored: false } })
  expect(await output.find({ text: 'Quran: Playback unavailable' })).toBeDefined()
})
test('cached duration skips process probing; a failed probe leaves total unknown silently', async ($, on) => {
  const clock = setup(on, { 'quran.durations': { [`${primary.key}:18`]: 60000 } })
  audio(on, clock)
  const processes: unknown[] = []
  on('process.run', async (_$, e) => (processes.push(e), { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  await $.command.run(run('play 18')); await clock.settle()
  expect(clock.state.quranPlaying?.durationMs).toBe(60000)
  expect(processes).toEqual([])
  await $.command.run(run('play 1')); await clock.settle()
  expect(clock.state.quranPlaying?.durationMs).toBe(null)
  expect(clock.state.quranError).toBe(null)
  await $.command.run(run('stop'))
})

test('duration probe uses curl Range, reads base64 bytes, caches a number and cleans its temporary files', async ($, on) => {
  const clock = setup(on, {}, { TMPDIR: '/fixture-tmp/' })
  audio(on, clock)
  const argv: string[][] = []
  let body = ''
  let bytesRead = false
  on('fs.write', async (_$, e) => { if (!e.path.endsWith('debug.log')) body = e.path; return { value: undefined } })
  on('process.run', async (_$, e) => {
    argv.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  // Two valid 128 kbps MPEG-1 frames (the remainder is zero-filled).
  const bytes = new Uint8Array(131072)
  bytes.set([255, 251, 144, 0]); bytes.set([255, 251, 144, 0], 417)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let base64 = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = bytes[i]! * 65536 + (bytes[i + 1] ?? 0) * 256 + (bytes[i + 2] ?? 0)
    base64 += alphabet[(n >>> 18) & 63]! + alphabet[(n >>> 12) & 63]! + (i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : '=') + (i + 2 < bytes.length ? alphabet[n & 63] : '=')
  }
  on('fs.read', async (_$, e) => {
    if (e.as === 'bytes') { bytesRead = true; return { value: { base64 } } }
    return { value: 'HTTP/1.1 206 Partial Content\r\nContent-Range: bytes 0-131071/1600000\r\n' }
  })
  on('fs.stat', async () => ({ value: { size: 131072, mtimeMs: 0, kind: 'file', isFile: true, isDirectory: false, isLink: false } }))
  await $.command.run(run('play 18')); await clock.settle()
  expect(bytesRead).toBe(true)
  expect(body).toContain('/fixture-tmp/claude-muslim-quran/')
  expect(argv[0]).toEqual(['curl', '-s', '-L', '--fail', '--connect-timeout', '8', '--max-time', '15', '--max-filesize', '131072', '-r', '0-131071', '-D', `${body}.headers`, '-o', body, 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/018.mp3'])
  expect(argv[1]).toEqual(['rm', '-f', '--', body, `${body}.headers`])
  expect(clock.store['quran.durations']).toEqual({ [`${primary.key}:18`]: 100000 })
  expect(clock.state.quranPlaying?.durationMs).toBe(100000)
  await $.command.run(run('stop'))
})
test('on Windows the probe uses TEMP and del for cleanup', async ($, on) => {
  const clock = setup(on, {}, { OS: 'Windows_NT', TEMP: 'C:\\Users\\me\\AppData\\Local\\Temp' })
  audio(on, clock)
  const argv: string[][] = []
  on('fs.write', async () => ({ value: undefined }))
  on('process.run', async (_$, e) => (argv.push([...e.argv]), { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  await $.command.run(run('play 18')); await clock.settle()
  expect(argv[0]![argv[0]!.indexOf('-o') + 1]!).toContain('C:\\Users\\me\\AppData\\Local\\Temp/claude-muslim-quran/')
  expect(argv[1]!.slice(0, 5)).toEqual(['cmd', '/d', '/c', 'del', '/q'])
  expect(argv[1]![5]).not.toContain('/')
  await $.command.run(run('stop'))
})
test('missing curl silently leaves duration unknown and attempts prefix cleanup', async ($, on) => {
  const clock = setup(on, {}, { TMPDIR: '/fixture-tmp/' })
  audio(on, clock)
  const argv: string[][] = []
  on('fs.write', async () => ({ value: undefined }))
  on('process.run', async (_$, e) => {
    argv.push([...e.argv])
    return { deny: 'curl unavailable' }
  })
  await $.command.run(run('play 18')); await clock.settle()
  expect(clock.state.quranPlaying?.durationMs).toBe(null)
  expect(clock.state.quranError).toBe(null)
  expect(argv.map(a => a[0])).toEqual(['curl', 'rm'])
  await $.command.run(run('stop'))
})
test('session start discards stale playing state and does not resume or start a Quran timer', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  const timers: number[] = []
  on('clock.every', { ms: 1000 }, async (_$, e, next) => { timers.push(e.ms); return next(e) })
  on('state.get', { plugin: 'muslim', key: 'quranPlaying' }, async () => ({ value: { value: { moshafKey: primary.key, surah: 18, startedAt: 0, durationMs: null }, version: 1 } }))
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('ui.status', async () => ({ value: undefined }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  await $.command.run(run('repeat'))
  expect(clock.state.quranRepeat).toBe('surah')
  await $.session.start({ cwd: '/fixture', surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(clock.state.quranPlaying).toBe(null)
  expect(clock.state.quranRepeat).toBe('off')
  expect(played).toEqual([])
  expect(timers).toEqual([])
})

test('/muslim Quran row shows desktop only regardless of the remembered recording', async ($, on) => {
  setup(on, { 'quran.reciter': secondary.key, arabicTerminals: { WarpTerminal: 'joined' } }, {}, 'terminal')
  on('session.surfaces', async () => ({value:['terminal']}))
  const ran = await $.command.run({ ...run(''), command: 'muslim' })
  expect(ran.text).toContain('| Quran | Desktop recitation player | desktop only |')
})

test('after the last surah playback stops and clears tracking without wrapping', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  await $.command.run(run('play 114'))
  await clock.advance(10000)
  expect(clock.state.quranPlaying).toBe(null)
  expect(clock.state.quranSurah).toBe(114)
  expect(played).toHaveLength(1)
  expect((await (await panel($)).read())?.isLive).toBe(false)
  await clock.advance(10000)
  expect(played).toHaveLength(1)
})
for (const replacement of ['stop', 'next', 'prev', 'play 18', alternateCommand]) {
  test(`${replacement}: an aborted or replaced generation cannot auto-advance`, async ($, on) => {
    const clock = setup(on)
    const played = audio(on, clock)
    await $.command.run(run('play 18')); await clock.settle()
    await clock.advance(1000)
    await $.command.run(run(replacement)); await clock.settle()
    // The old clip's ten-second completion falls before its replacement's end.
    await clock.advance(9000)
    expect(played).toHaveLength(replacement === 'stop' ? 1 : 2)
    if (replacement === 'stop') expect(clock.state.quranPlaying).toBe(null)
    else {
      expect(clock.state.quranPlaying?.surah).toBe(replacement === 'next' ? 19 : replacement === 'prev' ? 17 : 18)
      expect(clock.state.quranPlaying?.moshafKey).toBe(replacement === alternateCommand ? secondary.key : primary.key)
    }
    await $.command.run(run('stop'))
  })
}

const footer = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', component: 'SessionMode' as const, requestId: 'modes', surface, props: { modes: [] as readonly string[] } })
function engineFooter(on: On) {
  on('ui.render', { component: 'SessionMode' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>model</Text>
  })
}
for (const surface of ['desktop', 'terminal'] as const) test(`Quran adds nothing to the ${surface} footer, even while playing`, async ($, on) => {
  const clock = setup(on)
  engineFooter(on)
  audio(on, clock)
  await $.command.run(run('play 18')); await clock.settle()
  const mounted = await $.ui.mount(footer(surface))
  expect(await mounted.find({ key: 'quran-footer' })).toBeUndefined()
  expect(JSON.stringify(await mounted.drawn())).not.toContain('۞')
  expect(await mounted.find({ text: 'model' })).toBeDefined()
  await $.command.run(run('stop'))
})
test('desktop footer order is salah, then model', { options: { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE', salahShow: 'always' } }, async ($, on) => {
  setup(on)
  engineFooter(on)
  const mounted = await $.ui.mount(footer('desktop'))
  const tree = JSON.stringify(await mounted.drawn())
  expect(tree).not.toContain('quran-footer')
  expect(tree.indexOf('salah-line')).toBeLessThan(tree.indexOf('model'))
  expect(tree).toContain('"color":"claude"')
})

test('a late clip completion cannot advance after reload has cleared tracking', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('ui.status', async () => ({ value: undefined }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  await $.command.run(run('play 18')); await clock.settle()
  await clock.advance(1000)
  // Simulate the surviving host state being cleared by the fresh session.start.
  // Keep the old completion alive deliberately to test the conservative guard.
  await $.session.start({ cwd: '/fixture', surface: 'desktop', isInteractive: true })
  expect(clock.state.quranPlaying).toBe(null)
  await clock.advance(10000)
  expect(played).toHaveLength(1)
  expect(clock.state.quranPlaying).toBe(null)
})

test('pane playback rejection stays inside the pane and does not rewrite a command row or show a toast', async ($, on) => {
  const clock = setup(on)
  on('audio.play', async () => ({ deny: 'Playback unavailable' }))
  on('ui.render', { component: 'CommandOutput', props: { command: 'quran' } }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })
  const mounted = await panel($)
  await mounted.post({ act: 'key', key: 'return' }, { in: 'quran-card' }); await clock.settle()
  expect(clock.state.quranError).toBe('Quran: Playback unavailable')
  const output = await $.ui.mount({ plugin: 'muslim', surface: 'desktop', component: 'CommandOutput', requestId: 'earlier-command', props: { command: 'quran', args: 'help', text: 'Earlier reply', isErrored: false } })
  expect(await output.find({ text: 'Earlier reply' })).toBeDefined()
  expect(await output.find({ text: 'Quran: Playback unavailable' })).toBeUndefined()
  expect(clock.toasts).toEqual([])
})

test('pane Stop aborts immediately during blocked recording preparation and cancels waiting actions', async ($, on) => {
  const clock = setup(on, {}, {}, 'desktop', false)
  const played = audio(on, clock)
  let began!: () => void
  const fetching = new Promise<void>(resolve => { began = resolve })
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  on('http.fetch', async (_$, e) => {
    if (e.url.endsWith('/019.mp3')) { began(); await gate }
    return { value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } }
  })
  const mounted = await panel($)
  await $.command.run(run('play 18'))
  expect(played).toHaveLength(1)
  const pending = $.command.run(run('play 19'))
  await fetching
  const queued = $.command.run(run(''))
  await mounted.post({ act: 'key', key: 'return' }, { in: 'quran-card' })
  expect(played[0]?.signal.aborted).toBe(true)
  expect(clock.state.quranPlaying).toBe(null)
  release()
  await pending
  expect((await queued).text).toBe('Quran stopped.')
  expect(played).toHaveLength(1)
  expect(clock.state.quranPlaying).toBe(null)
})

test('pane Stop aborts while watchdog ticks and settlement leave diagnostics disabled', async ($, on) => {
  const clock = setup(on, {}, { TMPDIR: '/fixture-debug/' })
  const path = '/fixture-debug/claude-muslim-quran/debug.log'
  const oldLog = 'existing diagnostic\n'
  clock.logs[path] = oldLog
  const signals: AbortSignal[] = []
  // Keep the play promise pending after direct abort, as a remote clip may do.
  on('audio.play', async (_$, _e, next) => {
    signals.push(next.signal)
    await clock.sleep(1000)
    return { value: undefined }
  })
  const mounted = await panel($)
  await mounted.post({ act: 'pick', list: 'surah', value: '18' })
  await mounted.post({ act: 'key', key: 'return' }, { in: 'quran-card' })
  expect(signals[0]?.aborted).toBe(true)
  await clock.advance(199)
  expect(clock.logs[path]).toBe(oldLog)
  await clock.advance(1)
  expect(signals[0]?.aborted).toBe(true)
  expect(clock.logs[path]).toBe(oldLog)
  await clock.advance(800)
  expect(clock.logs[path]).toBe(oldLog)
  const log = clock.logs[path]
  await clock.advance(1000)
  expect(clock.logs[path]).toBe(log)
})
for (const key of ['right', 'left']) test(`Client ${key} aborts the old signal before starting a replacement with diagnostics disabled`, async ($, on) => {
  const clock = setup(on, {}, { TMPDIR: '/fixture-debug/' })
  const signals: AbortSignal[] = []
  const priorAborted: boolean[] = []
  on('audio.play', async (_$, _e, next) => {
    if (signals.length) priorAborted.push(signals[signals.length - 1]!.aborted)
    signals.push(next.signal)
    await clock.sleep(1000)
    return { value: undefined }
  })
  await $.command.run(run('play 18'))
  const mounted = await panel($)
  await mounted.post({ act: 'key', key }, { in: 'quran-card' })
  expect(signals).toHaveLength(2)
  expect(priorAborted).toEqual([true])
  await clock.advance(200)
  expect(signals[0]?.aborted).toBe(true)
  expect(clock.logs).toEqual({})
  expect(clock.state.quranPlaying?.surah).toBe(key === 'right' ? 19 : 17)
  await mounted.post({ act: 'key', key: 'return' }, { in: 'quran-card' })
})





// Real shipped recording with unavailable 2, 3, 4, 5 and 7.
const limitedRecording = QURAN_CATALOG.reciters.find(r => r.key === '102:102')!
for (const value of ['2', '٢', 'البقرة']) test(`unavailable command ${value} refuses before any network work`, async ($, on) => {
  const clock = setup(on, { 'quran.reciter': limitedRecording.key }, {}, 'desktop', false)
  const requests: string[] = [], processes: string[][] = [], played = audio(on, clock)
  on('http.fetch', async (_$, e) => { requests.push(e.url); throw new Error('unexpected network') })
  on('process.run', async (_$, e) => { processes.push([...e.argv]); throw new Error('unexpected process') })
  const reply = await $.command.run(run(`play ${value}`))
  expect(reply.text).toBe('هذه السورة غير متاحة لهذا القارئ. اختر سورة أخرى أو قارئًا آخر.')
  expect(clock.state.quranError).toBe(reply.text)
  expect(requests).toEqual([])
  expect(processes).toEqual([])
  expect(played).toEqual([])
  expect(clock.toasts).toEqual([])
})
for (const playing of [false, true]) test(`reciter switch chooses next available surah while ${playing ? 'playing' : 'stopped'}`, async ($, on) => {
  const clock = setup(on, {})
  const played = audio(on, clock)
  await $.command.run(run('play 2'))
  if (!playing) await $.command.run(run('stop'))
  const mounted = await panel($)
  await mounted.post({ act: 'pick', list: 'reciter', value: limitedRecording.key }, { in: 'quran-card' })
  expect(clock.state.quranSurah).toBe(6)
  expect(clock.store['quran.reciter']).toBe(limitedRecording.key)
  expect(clock.state.quranPlaying?.surah ?? null).toBe(playing ? 6 : null)
  expect(played).toHaveLength(playing ? 2 : 1)
  expect(played[0]!.signal.aborted).toBe(true)
  expect(clock.toasts).toEqual([])
  await $.command.run(run('stop'))
})
test('next, previous and natural ends skip unsupported surahs without probing them', async ($, on) => {
  const clock = setup(on, { 'quran.reciter': limitedRecording.key }, {}, 'desktop', false)
  const heads: string[] = [], played = audio(on, clock)
  on('http.fetch', async (_$, e) => { heads.push(e.url); return { value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } } })
  await $.command.run(run('play 1'))
  await $.command.run(run('next'))
  expect(clock.state.quranSurah).toBe(6)
  await $.command.run(run('next'))
  expect(clock.state.quranSurah).toBe(8)
  await $.command.run(run('prev'))
  expect(clock.state.quranSurah).toBe(6)
  await $.command.run(run('prev'))
  expect(clock.state.quranSurah).toBe(1)
  await clock.advance(10000); await clock.settle()
  expect(clock.state.quranPlaying?.surah).toBe(6)
  expect(played).toHaveLength(6)
  expect(heads.every(url => /\/(001|006|008)\.mp3$/.test(url))).toBe(true)
  await $.command.run(run('stop'))
})
test('restored unsupported selection moves at startup and renders without any network work', async ($, on) => {
  const clock = setup(on, { 'quran.reciter': limitedRecording.key }, {}, 'desktop', false)
  const requests: string[] = [], played = audio(on, clock)
  on('http.fetch', async (_$, e) => { requests.push(e.url); throw new Error('unexpected network') })
  on('state.get', { plugin: 'muslim', key: 'quranSurah' }, async () => ({ value: { value: clock.state.quranSurah ?? 2, version: 1 } }))
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('ui.status', async () => ({ value: undefined }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/fixture', surface: 'desktop', isInteractive: true })
  const mounted = await panel($)
  const shown = await mounted.read()
  expect(clock.state.quranSurah).toBe(6)
  expect(shown?.surah).toBe(`سورة ${QURAN_CATALOG.surahs[5]!.name}`)
  expect(requests).toEqual([])
  expect(played).toEqual([])
  expect(clock.toasts).toEqual([])
})

test('/quran on the desktop opens the Muslim pane, unfolds the Quran card and has no pane of its own', async ($, on) => {
  const clock = setup(on)
  const saved: { folds?: unknown } = { folds: { prayer: true, quran: true, athkar: false } }
  on('state.get', { plugin: 'muslim', key: 'paneFolds' }, async () => ({ value: { value: saved.folds as never, version: 1 } }))
  on('state.set', { plugin: 'muslim', key: 'paneFolds' }, async (_$, e, next) => { saved.folds = e.value; return next(e) })
  const reply = await $.command.run(run(''))
  expect(clock.opened.map(o => o.id)).toEqual(['muslim'])
  expect(clock.opened[0]!.title).toBe('☾ Muslim')
  expect(saved.folds).toEqual({ prayer: true, quran: false, athkar: false })
  expect(reply.text).toBe('Muslim pane opened at القرآن الكريم (desktop only).')
})
test('/quran in a terminal replies with the player status and opens nothing', async ($, on) => {
  const clock = setup(on, {}, {}, 'terminal')
  const played = audio(on, clock)
  const stopped = (await $.command.run(run(''))).text ?? ''
  expect(clock.opened).toEqual([])
  expect(stopped).toContain('Reciter:')
  expect(stopped).toContain('Surah:')
  expect(stopped).toContain('Time: 00:00 / --:--')
  expect(stopped).toContain('Status: stopped')
  expect(stopped.endsWith('Playback runs in the Claude desktop app.')).toBe(true)
  await $.command.run(run('play 18')); await clock.settle()
  expect(played).toHaveLength(1)
  expect((await $.command.run(run(''))).text).toContain('Status: playing')
  expect(clock.opened).toEqual([])
  await $.command.run(run('stop'))
})

test('pane failure draws a dim error and a hit-tested Retry replays and clears it', async ($, on) => {
  const clock = setup(on)
  let attempts = 0
  on('audio.play', async () => {
    if (++attempts === 1) return { deny: 'Playback unavailable' }
    await clock.sleep(10000)
    return { value: undefined }
  })
  const ui = await panel($)
  await ui.press('quran-toggle'); await clock.settle()
  expect((await ui.read())?.error).toBe('Quran: Playback unavailable')
  expect(await ui.svg()).toContain('class="quiet"')
  expect(await ui.svg()).toContain('Quran: Playback unavailable')
  expect(await ui.svg()).toContain('aria-label="إعادة المحاولة"')
  await ui.press('quran-retry'); await clock.settle()
  expect(attempts).toBe(2)
  expect((await ui.read())?.isPlaying).toBe(true)
  expect((await ui.read())?.error).toBe('')
  expect(await ui.svg()).not.toContain('aria-label="إعادة المحاولة"')
  expect(clock.toasts).toEqual([])
  await $.command.run(run('stop'))
})

test('a command playback error only replaces the originating args and reply text', async ($, on) => {
  const clock = setup(on)
  on('audio.play', async () => ({ deny: 'Playback unavailable' }))
  on('ui.render', { component: 'CommandOutput' }, async ($, e) => { const { Text } = $.ui.resolve(e); return <Text>{e.props.text}</Text> })
  const reply = await $.command.run(run('play 18')); await clock.settle()
  const stopped = await $.command.run(run('stop'))
  const help = await $.command.run(run('help'))
  for (const [args, text, expected] of [
    ['play 18', reply.text!, 'Quran: Playback unavailable'],
    ['stop', stopped.text!, 'Quran stopped.'],
    ['help', help.text!, help.text!],
    ['play 18', 'Another reply', 'Another reply'],
    ['play 1', reply.text!, reply.text!],
  ]) {
    const ui = await $.ui.mount({ plugin: 'muslim', surface: 'desktop', component: 'CommandOutput', requestId: `row-${args}-${text}`, props: { command: 'quran', args: args!, text: text!, isErrored: false } })
    expect(await ui.find({ text: expected! })).toBeDefined()
    await ui.unmount()
  }
})

for (const playing of [true, false]) test(`pane colour change stops before config and toasts once: playing=${playing}`, async ($, on) => {
  const clock = setup(on)
  const clips = audio(on, clock)
  on('state.get', { plugin: 'muslim', key: 'paneSettings' }, async () => ({ value: { value: { open: true, category: 'general', face: 'main', page: 0 }, version: 1 } }))
  const writes: string[] = []
  on('config.set', async (_$, e) => {
    writes.push(e.key)
    if (playing) expect(clips[0]!.signal.aborted).toBe(true)
    expect(clock.state.quranPlaying ?? null).toBe(null)
    expect(clock.toasts).toEqual(playing ? ['Quran stopped: changing a setting reloads the player.'] : [])
    return { value: e.value }
  })
  if (playing) { await $.command.run(run('play 1')); await clock.settle() }
  const ui = await $.ui.mount(muslimPane)
  await ui.resize({ columns: 50, rows: 100, in: 'muslim-pane' })
  const model = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  const q = quranLayout(model)
  const r = cardRects(model.folds, model.settings.state, model.settings.options, q, model.athkarMenu)
  const target = settingsBoxes(420, model.folds, model.settings, q).find(t => t.act === 'settings:color:blue')!
  const fine = { x: (target.x0 + target.x1) / 2 * 50 / 420, y: (target.y0 + target.y1) / 2 * 100 / r.height }
  await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  await clock.settle()
  expect(writes).toEqual(['muslim.color'])
  expect(clips).toHaveLength(playing ? 1 : 0)
  await ui.unmount()
})

test('Retry after a split pane Play retries playback rather than leaving the recording merely prepared', async ($, on) => {
  const plan = quarterPlan()
  const clock = setup(on, { 'quran.segmentCache': { [`${primary.key}:2`]: plan } }, {}, 'desktop', false)
  // Refresh after failure must still see a large, timed recording.
  on('http.fetch', async (_$, e) => ({ value: (e.init?.method === 'HEAD'
    ? { ok: true, status: 200, headers: { 'content-length': String(plan.sizeBytes), etag: 'fixture' }, text: '' }
    : { ok: true, status: 200, headers: {}, text: JSON.stringify(e.url.endsWith('/reads') ? [{ id: 112, folder_url: primary.server }] : Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 }))) }) as HttpResponse }))
  mockRanges(on, plan)
  let attempts = 0
  on('audio.play', async () => {
    if (++attempts === 1) return { deny: 'Playback unavailable' }
    await clock.sleep(10000)
    return { value: undefined }
  })
  const ui = await panel($)
  await ui.post({ act: 'pick', list: 'surah', value: '2' }); await clock.settle()
  expect((await ui.read())?.error).toBe('Quran: Playback unavailable')
  await ui.press('quran-retry'); await clock.settle()
  expect(attempts).toBe(2)
  expect(clock.state.quranPlaying?.surah).toBe(2)
  expect(clock.state.quranPlaying?.segmentIndex).toBe(0)
  expect((await ui.read())?.error).toBe('')
  await $.command.run(run('stop'))
})

for (const origin of ['pane', 'command'] as const) test(`missing colour row from ${origin} leaves Quran playing and reports reload-plugins`, async ($, on) => {
  const clock = setup(on)
  clock.config.rows = []
  const clips = audio(on, clock)
  const settings = { open: true, category: 'general' as const, face: 'main' as const, page: 0 }
  on('state.get', { plugin: 'muslim', key: 'paneSettings' }, async () => ({ value: { value: settings, version: 1 } }))
  const writes: string[] = []
  on('config.set', async (_$, e) => { writes.push(e.key); return { value: e.value } })
  await $.command.run(run('play 1')); await clock.settle()
  const note = 'Not changed: run /reload-plugins, then try again.'
  if (origin === 'command') {
    const reply = await $.command.run({ ...run('color blue'), command: 'muslim' })
    expect(reply.text).toBe(note)
    expect(clock.toasts).toEqual([])
  } else {
    const ui = await $.ui.mount(muslimPane)
    await ui.resize({ columns: 50, rows: 100, in: 'muslim-pane' })
    const model = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
    const q = quranLayout(model), r = cardRects(model.folds, model.settings.state, model.settings.options, q, model.athkarMenu)
    const target = settingsBoxes(420, model.folds, model.settings, q).find(t => t.act === 'settings:color:blue')!
    const fine = { x: (target.x0 + target.x1) / 2 * 50 / 420, y: (target.y0 + target.y1) / 2 * 100 / r.height }
    await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
    await clock.settle()
    expect(clock.toasts).toEqual([note])
    await ui.unmount()
  }
  expect(writes).toEqual([])
  expect(clips).toHaveLength(1)
  expect(clips[0]!.signal.aborted).toBe(false)
  expect(clock.state.quranPlaying).not.toBeNull()
  await $.command.run(run('stop'))
})

test('Arabic-Indic play ١٨ selects and plays Al-Kahf', async ($, on) => {
  const clock = setup(on); const played = audio(on, clock)
  const reply = await $.command.run(run('play ١٨')); await clock.settle()
  expect(clock.state.quranPlaying?.surah).toBe(18)
  expect(reply.text).toContain('الكهف')
  expect(played).toHaveLength(1)
  await $.command.run(run('stop'))
})
for (const phase of ['HEAD', 'reads', 'timing'] as const) test(`never-resolving ${phase} metadata times out with one quiet error and working Retry`, async ($, on) => {
  const clock = setup(on, {}, {}, 'desktop', false)
  const played = audio(on, clock)
  let blocked = true
  on('http.fetch', async (_$, e) => {
    const targeted = phase === 'HEAD' ? e.init?.method === 'HEAD' : phase === 'reads' ? e.url.endsWith('/reads') : e.url.includes('ayat_timing?')
    if (blocked && targeted) return await new Promise<never>(() => {})
    if (e.init?.method === 'HEAD') return { value: { ok: true, status: 200, headers: { 'content-length': String(blocked ? AUDIO_LIMIT_BYTES + 1000 : 1000000) }, text: '' } }
    return { value: { ok: true, status: 200, headers: {} as Record<string, string>, text: JSON.stringify([{ id: 1, folder_url: primary.server }]) } }
  })
  const request = $.command.run(run('play 18'))
  await clock.settle(); await clock.advance(15000)
  const reply = await request
  expect(reply.text).toContain('timed out')
  expect(clock.state.quranError).toBe(reply.text)
  expect(clock.state.quranPlaying).toBe(null)
  expect(clock.toasts).toEqual([])
  expect(played).toHaveLength(0)
  blocked = false
  await $.command.run(run('retry')); await clock.settle()
  expect(clock.state.quranPlaying?.surah).toBe(18)
  expect(clock.state.quranError).toBe(null)
  await $.command.run(run('stop'))
})
