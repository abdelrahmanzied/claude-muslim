import type { QuranPlaying } from '../../types/index.d.ts'
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { ltrTime } from '../../src/features/quran/card.ts'
import { CATALOG_MS } from '../../src/features/quran/catalog.ts'
import { terminalArabic } from '../../src/shared/arabic/terminal.ts'
import { fixtureCatalog, reciters, surahs } from './fixtures/catalog.ts'

const run = (args: string) => ({ command: 'quran', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const pane = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', component: 'Pane' as const, requestId: 'quran', surface, props: { title: 'القرآن الكريم', isFocused: false, bodyColumns: 80, placement: 'inline' as const, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
function setup(on: On, entries: Record<string, unknown> = {}, env: Record<string, string> = {}, surface: 'desktop' | 'terminal' = 'desktop') {
  mock.env(on, { TERM_PROGRAM: 'WarpTerminal', ...env })
  const store: Record<string, unknown> = { 'quran.catalog': fixtureCatalog, ...entries }
  on('store.get', async (_$, e) => ({ value: store[e.key] }))
  on('store.set', async (_$, e) => { store[e.key] = e.value; return { value: undefined } })
  const state: { quranPlaying?: QuranPlaying | null; quranError?: string | null; quranSurah?: number } = {}
  on('state.set', async (_$, e, next) => {
    const result = await next(e)
    if (e.key === 'quranPlaying') state.quranPlaying = e.value as QuranPlaying | null
    if (e.key === 'quranError') state.quranError = e.value as string | null
    if (e.key === 'quranSurah') state.quranSurah = e.value as number
    return result
  })
  const clock = mock.clock(on, { now: fixtureCatalog.fetchedAt })
  on('session.surface', async () => ({ value: surface }))
  const opened: { id: string; title?: string }[] = []
  on('ui.open', async (_$, e) => { opened.push({ id: e.id, title: e.title }); return { value: { isPlaced: true } } })
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  return { ...clock, state, store, opened, toasts }
}
function audio(on: On, clock: { sleep(ms: number): Promise<void> }) {
  const played: { clip: unknown; gain: number | undefined; aborted: boolean }[] = []
  on('audio.play', async ($, e, next) => {
    const record = { clip: e.clip, gain: e.gain, aborted: false }
    played.push(record)
    await Promise.race([clock.sleep(10000), new Promise<void>(resolve => {
      if (next.signal.aborted) { record.aborted = true; resolve() }
      else next.signal.addEventListener('abort', () => { record.aborted = true; resolve() })
    })])
    return { value: undefined }
  })
  return played
}

test('desktop pane uses native selectors and buttons with authored Arabic; terminal only has fallback', async ($, on) => {
  setup(on)
  const desktop = await $.ui.mount(pane('desktop'))
  expect(await desktop.find({ type: 'Select', key: 'quran-reciter' })).toBeDefined()
  const select = await desktop.find({ type: 'Select', key: 'quran-surah' })
  expect(select?.props.options).toHaveLength(64)
  expect(await desktop.find({ type: 'Select', key: 'quran-surah-page' })).toBeDefined()
  await desktop.select({ key: 'quran-surah-page', value: '1' })
  const later = await desktop.find({ type: 'Select', key: 'quran-surah' })
  expect(later?.props.options).toHaveLength(52)
  expect(JSON.stringify(later?.props.options)).toContain('114. الناس')
  expect(await desktop.find({ type: 'Text', text: 'متوقف' })).toBeDefined()
  expect(await desktop.find({ type: 'Button', key: 'quran-toggle' })).toBeDefined()
  const terminal = await $.ui.mount(pane('terminal'))
  expect(await terminal.find({ type: 'Select' })).toBeUndefined()
  expect(await terminal.find({ type: 'Button' })).toBeUndefined()
  expect(await terminal.find({ text: terminalArabic('terminal', 'joined', 'مشغّل القرآن متاح على تطبيق Claude للديسكتوب') })).toBeDefined()
})
test('play sets whole-track state and approximate clock time; stop clears tracking', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  expect((await $.command.run(run('play كهف'))).text).toContain('الكهف')
  await clock.settle()
  expect(played).toHaveLength(1)
  expect(played[0]?.clip).toEqual({ url: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/018.mp3' })
  expect(played[0]?.gain).toBeUndefined()
  expect(clock.state.quranPlaying).toEqual({ moshafKey: '10:20', surah: 18, startedAt: fixtureCatalog.fetchedAt, durationMs: null })
  const mounted = await $.ui.mount(pane('desktop'))
  await clock.advance(1000)
  expect(await mounted.find({ type: 'Text', text: ltrTime('00:01') })).toBeDefined()
  await $.command.run(run('stop'))
  expect(clock.state.quranPlaying).toBe(null)
})
test('natural completion advances to the next surah with the same reciter', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  await $.command.run(run('play 18'))
  await clock.advance(10000)
  expect(clock.state.quranPlaying?.surah).toBe(19)
  expect(clock.state.quranPlaying?.moshafKey).toBe('10:20')
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
  expect((await $.command.run(run('reciter 2'))).text).toContain('مجود')
  await clock.settle()
  expect(played).toHaveLength(2)
  expect(played[1]?.clip).toEqual({ url: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r2/018.mp3' })
  expect(played[1]?.gain).toBeUndefined()
  expect(clock.store['quran.reciter']).toBe('10:21')
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
test('pane selects start playback and toggle stops', async ($, on) => {
  const clock = setup(on)
  audio(on, clock)
  const mounted = await $.ui.mount(pane('desktop'))
  await mounted.select({ key: 'quran-surah', value: '18' })
  await clock.settle()
  expect(clock.state.quranPlaying?.surah).toBe(18)
  await mounted.select({ key: 'quran-reciter', value: '10:21' })
  expect(clock.store['quran.reciter']).toBe('10:21')
  await mounted.press({ key: 'quran-toggle' })
  expect(clock.state.quranPlaying).toBe(null)
})
test('catalog refresh fetches JSON, saves only used fields, and keeps old catalog on failure', async ($, on) => {
  const old = { ...fixtureCatalog, fetchedAt: fixtureCatalog.fetchedAt - CATALOG_MS - 1 }
  const clock = setup(on, { 'quran.catalog': old })
  let fail = false
  const urls: string[] = []
  on('http.fetch', async (_$, e) => {
    urls.push(e.url)
    if (fail) throw new Error('Network unavailable')
    return { value: { ok: true, status: 200, headers: {}, text: JSON.stringify(e.url.includes('reciters') ? reciters : { suwar: surahs }) } }
  })
  expect((await $.command.run(run(''))).text).toContain('opened')
  expect(urls).toHaveLength(2)
  const saved = clock.store['quran.catalog']
  expect(saved).toEqual(fixtureCatalog)
  clock.store['quran.catalog'] = old
  fail = true
  expect((await $.command.run(run('reciter'))).text).toContain('محمد صديق المنشاوي')
  expect(clock.store['quran.catalog']).toEqual(old)
})
test('first catalog failure is a short reply and pane error; stop still works', async ($, on) => {
  setup(on, { 'quran.catalog': null })
  on('http.fetch', async () => ({ deny: 'Network unavailable' }))
  expect((await $.command.run(run(''))).text).toBe('Quran: Network unavailable')
  const mounted = await $.ui.mount(pane('desktop'))
  expect(await mounted.find({ text: 'Quran: Network unavailable' })).toBeDefined()
  expect((await $.command.run(run('stop'))).text).toBe('Quran stopped.')
})
test('play rejection clears playing and renders a dim pane/command-output error', async ($, on) => {
  const clock = setup(on)
  on('audio.play', async () => ({ deny: 'Playback unavailable' }))
  await $.command.run(run('play 18')); await clock.settle()
  expect(clock.state.quranPlaying).toBe(null)
  const mounted = await $.ui.mount(pane('desktop'))
  expect(await mounted.find({ text: 'Quran: Playback unavailable' })).toBeDefined()
  const output = await $.ui.mount({ plugin: 'muslim', surface: 'desktop', component: 'CommandOutput', requestId: 'quran-output', props: { command: 'quran', args: 'play 18', text: 'Quran playing: الكهف.', isErrored: false } })
  expect(await output.find({ text: 'Quran: Playback unavailable' })).toBeDefined()
})
test('cached duration skips process probing; a failed probe leaves total unknown silently', async ($, on) => {
  const clock = setup(on, { 'quran.durations': { '10:20:18': 60000 } })
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
  on('fs.write', async (_$, e) => { body = e.path; return { value: undefined } })
  on('process.run', async (_$, e) => {
    argv.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  // Two valid 128 kbps MPEG-1 frames (the remainder is zero-filled).
  const bytes = new Uint8Array(1000)
  bytes.set([255, 251, 144, 0]); bytes.set([255, 251, 144, 0], 417)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let base64 = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = bytes[i]! * 65536 + (bytes[i + 1] ?? 0) * 256 + (bytes[i + 2] ?? 0)
    base64 += alphabet[(n >>> 18) & 63]! + alphabet[(n >>> 12) & 63]! + (i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : '=') + (i + 2 < bytes.length ? alphabet[n & 63] : '=')
  }
  on('fs.read', async (_$, e) => {
    if (e.as === 'bytes') { bytesRead = true; return { value: { base64 } } }
    return { value: 'Content-Range: bytes 0-131071/1600000\r\n' }
  })
  await $.command.run(run('play 18')); await clock.settle()
  expect(bytesRead).toBe(true)
  expect(body).toContain('/fixture-tmp/claude-muslim-quran/')
  expect(argv[0]).toEqual(['curl', '-s', '-L', '--fail', '--max-time', '15', '-r', '0-131071', '-D', `${body}.headers`, '-o', body, 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/018.mp3'])
  expect(argv[1]).toEqual(['rm', '-f', '--', body, `${body}.headers`])
  expect(clock.store['quran.durations']).toEqual({ '10:20:18': 100000 })
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
  expect(argv[0]![11]).toContain('C:\\Users\\me\\AppData\\Local\\Temp/claude-muslim-quran/')
  expect(argv[1]!.slice(0, 4)).toEqual(['cmd', '/c', 'del', '/q'])
  expect(argv[1]![4]).not.toContain('/')
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
  on('state.get', { plugin: 'muslim', key: 'quranPlaying' }, async () => ({ value: { value: { moshafKey: '10:20', surah: 18, startedAt: 0, durationMs: null }, version: 1 } }))
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('ui.status', async () => ({ value: undefined }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/fixture', surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(clock.state.quranPlaying).toBe(null)
  expect(played).toEqual([])
  expect(timers).toEqual([])
})

test('reciter pagination exposes all recordings without starting or changing a selection', async ($, on) => {
  const many = Array.from({ length: 155 }, (_, i) => ({ ...fixtureCatalog.reciters[0]!, key: `${i + 1}:20`, name: `Fixture reciter ${i + 1}`, label: `Fixture reciter ${i + 1}` }))
  const clock = setup(on, { 'quran.catalog': { ...fixtureCatalog, reciters: many }, 'quran.reciter': '1:20' })
  const played = audio(on, clock)
  const mounted = await $.ui.mount(pane('desktop'))
  expect((await mounted.find({ type: 'Select', key: 'quran-reciter' }))?.props.options).toHaveLength(64)
  await mounted.select({ key: 'quran-reciter-page', value: '2' })
  const last = await mounted.find({ type: 'Select', key: 'quran-reciter' })
  expect(last?.props.options).toHaveLength(30)
  expect(JSON.stringify(last?.props.options)).toContain('Fixture reciter 155')
  expect(clock.store['quran.reciter']).toBe('1:20')
  expect(played).toEqual([])
  await mounted.select({ key: 'quran-reciter', value: '155:20' })
  expect(clock.store['quran.reciter']).toBe('155:20')
  expect(played).toEqual([])
})
test('/muslim Quran row uses this terminal mode and remembered recording', async ($, on) => {
  setup(on, { 'quran.reciter': '10:21', arabicTerminals: { WarpTerminal: 'joined' } }, {}, 'terminal')
  const ran = await $.command.run({ ...run(''), command: 'muslim' })
  expect(ran.text).toContain(terminalArabic('terminal', 'joined', fixtureCatalog.reciters[1]!.label))
})

test('after the last surah playback stops and clears tracking without wrapping', async ($, on) => {
  const clock = setup(on)
  const played = audio(on, clock)
  await $.command.run(run('play 114'))
  await clock.advance(10000)
  expect(clock.state.quranPlaying).toBe(null)
  expect(clock.state.quranSurah).toBe(114)
  expect(played).toHaveLength(1)
  await clock.advance(10000)
  expect(played).toHaveLength(1)
})
for (const replacement of ['stop', 'next', 'prev', 'play 18', 'reciter 2']) {
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
      expect(clock.state.quranPlaying?.moshafKey).toBe(replacement === 'reciter 2' ? '10:21' : '10:20')
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
test('desktop footer chip is a green Button and toggles the pane without stopping playback', async ($, on) => {
  const clock = setup(on)
  engineFooter(on)
  audio(on, clock)
  const panes: { id: string; title: string; isShown: boolean; isPlaced: boolean; isFocused: boolean }[] = []
  const closed: string[] = []
  on('ui.panes', async () => ({ value: panes }))
  on('ui.close', async (_$, e) => { closed.push(e.id); panes.length = 0; return { value: undefined } })
  const mounted = await $.ui.mount(footer('desktop'))
  expect(await mounted.find({ type: 'Button', key: 'quran-footer' })).toBeDefined()
  expect((await mounted.find({ type: 'Text', text: 'القرآن' }))?.props.color).toBe('success')
  await mounted.press({ key: 'quran-footer' })
  expect(clock.opened).toEqual([{ id: 'quran', title: 'القرآن الكريم' }])
  panes.push({ id: 'quran', title: 'القرآن الكريم', isShown: true, isPlaced: true, isFocused: false })
  await $.command.run(run('play 18')); await clock.settle()
  await clock.advance(1000)
  expect(await mounted.find({ text: 'الكهف 00:01' })).toBeDefined()
  await mounted.press({ key: 'quran-footer' })
  expect(closed).toEqual(['quran'])
  expect(clock.state.quranPlaying?.surah).toBe(18)
  await $.command.run(run('stop'))
})
test('Quran leaves terminal footer labels unchanged', async ($, on) => {
  setup(on)
  engineFooter(on)
  const mounted = await $.ui.mount(footer('terminal'))
  expect(await mounted.find({ key: 'quran-footer' })).toBeUndefined()
  expect(await mounted.find({ text: 'model' })).toBeDefined()
})
test('desktop footer order is Quran, salah, model; salah retains orange accent', { options: { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE', salahShow: 'always' } }, async ($, on) => {
  setup(on)
  engineFooter(on)
  const mounted = await $.ui.mount(footer('desktop'))
  const tree = JSON.stringify(await mounted.drawn())
  expect(tree.indexOf('quran-footer')).toBeLessThan(tree.indexOf('salah-line'))
  expect(tree.indexOf('salah-line')).toBeLessThan(tree.indexOf('model'))
  expect(tree).toContain('"color":"success"')
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
test('footer uses hour formatting for a long-running surah', async ($, on) => {
  setup(on)
  engineFooter(on)
  on('state.get', { plugin: 'muslim', key: 'quranPlaying' }, async () => ({ value: { value: { moshafKey: '10:20', surah: 18, startedAt: fixtureCatalog.fetchedAt - 3661000, durationMs: null }, version: 1 } }))
  const mounted = await $.ui.mount(footer('desktop'))
  expect(await mounted.find({ type: 'Text', text: 'الكهف 1:01:01' })).toBeDefined()
})

test('desktop card has status, title, SVG progress, three controls and automatic-next hint; presses are silent', async ($, on) => {
  const clock = setup(on)
  audio(on, clock)
  const mounted = await $.ui.mount(pane('desktop'))
  const card = await mounted.find({ type: 'Box', key: 'quran-card' })
  expect(card?.props.backgroundColor).toBe('#1f2b25')
  expect(card?.props.borderColor).toBe('#2f4a3c')
  expect(card?.props.borderStyle).toBe('round')
  expect(await mounted.find({ type: 'Text', text: 'متوقف' })).toBeDefined()
  expect((await mounted.find({ type: 'Svg' }))?.props.alt).toBe('سورة الفاتحة')
  await mounted.select({ key: 'quran-surah', value: '18' }); await clock.settle()
  expect(await mounted.find({ type: 'Text', text: 'يتلى الآن' })).toBeDefined()
  const title = await mounted.find({ type: 'Svg' })
  expect(title?.props.source).toContain('سورة الكهف')
  const tree = JSON.stringify(await mounted.drawn())
  expect(tree).toContain('"height":6')
  expect(tree).toContain('تقدم التلاوة:')
  expect(tree).toContain('<rect width=')
  expect(await mounted.find({ type: 'Text', text: 'محمد صديق المنشاوي · حفص عن عاصم' })).toBeDefined()
  expect(await mounted.find({ type: 'Text', text: 'التالي تلقائي: Fixture 19' })).toBeDefined()
  const controls = ['quran-prev', 'quran-toggle', 'quran-next']
  for (const key of controls) expect(await mounted.find({ type: 'Button', key })).toBeDefined()
  expect(JSON.stringify(card?.children).match(/"type":"Button"/g)?.length).toBe(3)
  await mounted.press({ key: 'quran-next' }); await clock.settle()
  await mounted.press({ key: 'quran-prev' }); await clock.settle()
  await mounted.press({ key: 'quran-toggle' })
  expect(await mounted.find({ type: 'Text', text: 'متوقف' })).toBeDefined()
  expect(clock.toasts).toEqual([])
})
test('pane playback rejection stays inside the pane and does not rewrite a command row or show a toast', async ($, on) => {
  const clock = setup(on)
  on('audio.play', async () => ({ deny: 'Playback unavailable' }))
  on('ui.render', { component: 'CommandOutput', props: { command: 'quran' } }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })
  const mounted = await $.ui.mount(pane('desktop'))
  await mounted.press({ key: 'quran-toggle' }); await clock.settle()
  expect(await mounted.find({ type: 'Text', text: 'Quran: Playback unavailable' })).toBeDefined()
  const output = await $.ui.mount({ plugin: 'muslim', surface: 'desktop', component: 'CommandOutput', requestId: 'earlier-command', props: { command: 'quran', args: 'help', text: 'Earlier reply', isErrored: false } })
  expect(await output.find({ text: 'Earlier reply' })).toBeDefined()
  expect(await output.find({ text: 'Quran: Playback unavailable' })).toBeUndefined()
  expect(clock.toasts).toEqual([])
})
