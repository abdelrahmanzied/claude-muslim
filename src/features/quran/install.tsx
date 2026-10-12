import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import type { QuranPlaying } from '../../../types/index.d.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type TerminalEnvironment } from '../../shared/arabic/terminal.ts'
import { audioUrl, CATALOG_MS, defaultReciter, filterReciters, isCatalog, matchReciter, matchSurah, readSurahs, type Catalog, type Reciter } from './catalog.ts'
import { contentRangeTotal, decodeBase64, durationMs } from './mp3.ts'
import { formatTime, nextSurahAfterEnd, parseCommand, progressBar, type Command } from './player.ts'
import { quranHelp } from './help.ts'

const playingRef = { plugin: 'muslim', key: 'quranPlaying' } as const
const errorRef = { plugin: 'muslim', key: 'quranError' } as const
const surahPageRef = { plugin: 'muslim', key: 'quranSurahPage' } as const
const reciterPageRef = { plugin: 'muslim', key: 'quranReciterPage' } as const
const surahRef = { plugin: 'muslim', key: 'quranSurah' } as const
// Handles cannot survive reload; only these ephemeral resources stay here.
const runtime: { controller?: AbortController; timer?: { cancel(): void }; catalog?: Promise<Catalog>; queue: Promise<unknown>; probe: number; generation: number } = { queue: Promise.resolve(), probe: 0, generation: 0 }

async function arabic($: EngineInterface, surface: string, text: string): Promise<string> {
  if (surface !== 'terminal') return text
  const env: TerminalEnvironment = {
    TERM_PROGRAM: await $.env.get('TERM_PROGRAM'),
    TERMINAL_EMULATOR: await $.env.get('TERMINAL_EMULATOR'),
    __CFBundleIdentifier: await $.env.get('__CFBundleIdentifier'),
    WT_SESSION: await $.env.get('WT_SESSION'),
    KONSOLE_VERSION: await $.env.get('KONSOLE_VERSION'),
    VTE_VERSION: await $.env.get('VTE_VERSION'),
    KITTY_WINDOW_ID: await $.env.get('KITTY_WINDOW_ID'),
    ALACRITTY_WINDOW_ID: await $.env.get('ALACRITTY_WINDOW_ID'),
    ALACRITTY_SOCKET: await $.env.get('ALACRITTY_SOCKET'),
    OS: await $.env.get('OS'),
  }
  const id = terminalIdFromEnv(env)
  const cached = (await $.state.get({ plugin: 'muslim', key: 'arabicTerminalMode' })).value
  const modes = await $.store.get('arabicTerminals') as Record<string, unknown> | undefined
  const saved = modes?.[id]
  return terminalArabic(surface, cached?.terminalId === id ? cached.mode : isArabicMode(saved) ? saved : defaultArabicMode(id), text)
}

async function catalog($: EngineInterface): Promise<Catalog> {
  if (runtime.catalog) return runtime.catalog
  runtime.catalog = loadCatalog($)
  try { return await runtime.catalog } finally { runtime.catalog = undefined }
}
async function loadCatalog($: EngineInterface): Promise<Catalog> {
  const stored = await $.store.get('quran.catalog')
  const old = isCatalog(stored) ? stored : undefined
  const now = await $.clock.now()
  if (old && now - old.fetchedAt < CATALOG_MS) return old
  try {
    const [r, s] = await Promise.all([
      $.http.fetch('https://www.mp3quran.net/api/v3/reciters?language=ar'),
      $.http.fetch('https://www.mp3quran.net/api/v3/suwar?language=ar'),
    ])
    if (!r.ok || !s.ok) throw new Error('Quran catalog unavailable')
    const reciters = filterReciters(JSON.parse(r.text))
    const surahs = readSurahs(JSON.parse(s.text))
    if (!reciters.length || surahs.length !== 114) throw new Error('Quran catalog incomplete')
    const fresh = { fetchedAt: now, reciters, surahs }
    await $.store.set('quran.catalog', fresh)
    return fresh
  } catch (error) { if (old) return old; throw error }
}
async function chosen($: EngineInterface, c: Catalog): Promise<Reciter> {
  const key = await $.store.get('quran.reciter')
  return c.reciters.find(r => r.key === key) ?? defaultReciter(c)
}
async function fail($: EngineInterface, error: unknown): Promise<string> {
  // Keep external errors short and free of multiline process output.
  const message = `Quran: ${error instanceof Error ? error.message.replace(/^.*?\$\.[\w.]+:\s*/, '').replace(/[\r\n|]/g, ' ').slice(0, 160) : 'Unable to play or load the catalog'}`
  try { await $.state.set(errorRef, message); $.ui.invalidate('ui.render') } catch { /* A refused state write must not escape a hook. */ }
  return message
}
async function stop($: EngineInterface): Promise<void> {
  ++runtime.generation
  runtime.controller?.abort()
  runtime.controller = undefined
  runtime.timer?.cancel()
  runtime.timer = undefined
  await $.state.set(playingRef, null)
  $.ui.invalidate('ui.render')
}
async function finish($: EngineInterface, controller: AbortController, token: number, reciter: Reciter, surah: number, error?: unknown): Promise<void> {
  const task = runtime.queue.then(() => complete($, controller, token, reciter, surah, error)).catch(error => fail($, error))
  runtime.queue = task
  await task
}
async function complete($: EngineInterface, controller: AbortController, token: number, reciter: Reciter, surah: number, error?: unknown): Promise<void> {
  if (runtime.controller !== controller || controller.signal.aborted || token !== runtime.generation) return
  // A reload clears tracking; an orphaned clip can never continue the sequence.
  if (!(await $.state.get(playingRef)).value) { await stop($); return }
  const nextSurah = nextSurahAfterEnd(surah, error === undefined, token, runtime.generation)
  if (nextSurah !== null) { await play($, reciter, nextSurah); return }
  await stop($)
  if (error !== undefined) {
    const text = await fail($, error)
    // Playback is asynchronous; the command output render also subscribes to errors.
    $.ui.toast(text)
  }
}
async function lookupDuration($: EngineInterface, reciter: Reciter, surah: number, controller: AbortController): Promise<void> {
  let body: string | undefined
  try {
    const key = `${reciter.key}:${surah}`
    const raw = await $.store.get('quran.durations')
    const cached = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
    let ms = typeof cached[key] === 'number' && Number.isFinite(cached[key]) && cached[key] > 0 ? cached[key] as number : null
    if (ms === null) {
      // Windows desktop has no HOME/Library or rm; use each OS's own temp folder.
      const windows = (await $.env.get('OS')) === 'Windows_NT'
      const temp = windows ? await $.env.get('TEMP') : (await $.env.get('TMPDIR')) ?? '/tmp'
      if (!temp) return
      body = `${temp.replace(/[\\/]+$/, '')}/claude-muslim-quran/${await $.clock.now()}-${++runtime.probe}.mp3`
      await $.fs.write(body, '') // creates the parent directories
      const result = await $.process.run(['curl', '-s', '-L', '--fail', '--max-time', '15', '-r', '0-131071', '-D', `${body}.headers`, '-o', body, audioUrl(reciter, surah)], { timeoutMs: 20000 })
      if (result.exitCode !== 0) return
      const total = contentRangeTotal(await $.fs.read(`${body}.headers`))
      if (total === null) return
      const bytes = decodeBase64((await $.fs.read(body, { as: 'bytes' })).base64)
      ms = durationMs(bytes, total)
      if (ms === null || ms <= 0) return
      // Re-read before saving: another probe may have completed in the meantime.
      const latest = await $.store.get('quran.durations')
      const durations = latest !== null && typeof latest === 'object' && !Array.isArray(latest) ? latest as Record<string, unknown> : {}
      await $.store.set('quran.durations', { ...durations, [key]: ms })
    }
    if (runtime.controller !== controller || controller.signal.aborted) return
    const held = await $.state.get(playingRef)
    if (held.value?.moshafKey === reciter.key && held.value.surah === surah && runtime.controller === controller) {
      await $.state.set(playingRef, { ...held.value, durationMs: ms }, { ifVersion: held.version })
    }
  } catch { /* Best effort metadata only: playback never depends on duration. */ }
  finally {
    // No audio cache: only a temporary prefix, removed even on parse failure.
    if (body) {
      const files = [body, `${body}.headers`]
      const remove = (await $.env.get('OS')) === 'Windows_NT'
        ? ['cmd', '/c', 'del', '/q', ...files.map(f => f.replace(/\//g, '\\'))]
        : ['rm', '-f', '--', ...files]
      try { await $.process.run(remove, { timeoutMs: 5000 }) } catch { /* Best effort cleanup. */ }
    }
  }
}
async function play($: EngineInterface, reciter: Reciter, surah: number): Promise<void> {
  await stop($)
  const controller = new AbortController()
  runtime.controller = controller
  const token = runtime.generation
  const playing: QuranPlaying = { moshafKey: reciter.key, surah, startedAt: await $.clock.now(), durationMs: null }
  await $.state.set(surahRef, surah)
  await $.state.set(surahPageRef, Math.floor((surah - 1) / 63))
  await $.state.set(errorRef, null)
  await $.state.set(playingRef, playing)
  // Timer-owned playback outlives the command dispatch, without holding it open.
  $.clock.after(0, () => {
    if (runtime.controller !== controller || controller.signal.aborted) return
    void $.audio.play({ url: audioUrl(reciter, surah) }, { signal: controller.signal }).then(
      () => finish($, controller, token, reciter, surah), error => finish($, controller, token, reciter, surah, error),
    ).catch(error => void fail($, error))
    void lookupDuration($, reciter, surah, controller)
  })
  runtime.timer = $.clock.every(1000, () => $.ui.invalidate('ui.render'))
  $.ui.invalidate('ui.render')
}
async function open($: EngineInterface): Promise<void> {
  const surface = await $.session.surface()
  await $.ui.open({ id: 'quran', title: await arabic($, surface ?? 'desktop', 'القرآن الكريم') })
}
async function togglePane($: EngineInterface): Promise<void> {
  try {
    if ((await $.ui.panes()).some(pane => pane.id === 'quran')) await $.ui.close({ id: 'quran' })
    else { await open($); await catalog($); $.ui.invalidate('ui.render') }
  } catch (error) { await fail($, error) }
}
async function action($: EngineInterface, command: Command): Promise<string> {
  if (command.kind === 'help' || command.kind === 'usage') return quranHelp()
  if (command.kind === 'stop') { await stop($); await $.state.set(errorRef, null); return 'Quran stopped.' }
  if (command.kind === 'open' || command.kind === 'play') await open($)
  const c = await catalog($)
  await $.state.set(errorRef, null)
  $.ui.invalidate('ui.render')
  let reciter = await chosen($, c)
  const playing = (await $.state.get(playingRef)).value
  const current = (await $.state.get(surahRef)).value ?? 1
  if (command.kind === 'open') return 'Quran player opened (desktop only).'
  if (command.kind === 'reciter') {
    if (!command.value) return '**Quran › Reciters**\n\n' + (await Promise.all(c.reciters.map(async (r, i) => `${i + 1}. ${await arabic($, await $.session.surface() ?? 'desktop', r.label)}`))).join('\n')
    const choice = matchReciter(command.value, c.reciters)
    if (!choice) return 'Reciter not found or ambiguous. Use /quran reciter and choose a number.'
    reciter = choice
    await $.store.set('quran.reciter', reciter.key)
    await $.state.set(reciterPageRef, Math.floor(c.reciters.findIndex(r => r.key === reciter.key) / 63))
    if (playing) await play($, reciter, playing.surah)
    $.ui.invalidate('ui.render')
    return `Quran reciter: ${await arabic($, await $.session.surface() ?? 'desktop', reciter.label)}.`
  }
  const surah = command.kind === 'play' ? matchSurah(command.value, c.surahs)?.id : current + (command.kind === 'next' ? 1 : -1)
  if (surah === undefined) return 'Surah not found. Use /quran play <1-114 or Arabic name>.'
  if (surah < 1 || surah > 114) return surah < 1 ? 'Already at the first surah.' : 'Already at the last surah.'
  await play($, reciter, surah)
  return `Quran playing: ${await arabic($, await $.session.surface() ?? 'desktop', c.surahs[surah - 1]!.name)}.`
}
// Serialize user actions; play completions check generation and controller identity.
async function dispatch($: EngineInterface, command: Command): Promise<string> {
  const task = runtime.queue.then(() => action($, command)).catch(error => fail($, error))
  runtime.queue = task
  return task
}
async function paneAction($: EngineInterface, command: Command): Promise<void> {
  const text = await dispatch($, command)
  $.ui.toast(text)
}

async function setPage($: EngineInterface, kind: 'reciter' | 'surah', value: string): Promise<void> {
  try {
    const page = Number(value)
    if (!Number.isInteger(page) || page < 0) return
    const raw = await $.store.get('quran.catalog')
    const max = kind === 'reciter' && isCatalog(raw) ? Math.ceil(raw.reciters.length / 63) - 1 : 1
    if (page > max) return
    if (kind === 'reciter') await $.state.set(reciterPageRef, page)
    else await $.state.set(surahPageRef, page)
  } catch (error) { await fail($, error) }
}

export const install = (on: On, _options: Options) => {
  // Registered before salah: this outer hook prepends Quran to salah's tree.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'desktop') return theirs
    const { Box, Text, Button } = $.ui.resolve(e)
    const playing = (await $.state.get(playingRef)).value
    const raw = await $.store.get('quran.catalog')
    const name = playing && isCatalog(raw) ? raw.surahs[playing.surah - 1]!.name : 'القرآن'
    const label = playing ? `${name} ${formatTime(Math.max(0, await $.clock.now() - playing.startedAt))}` : name
    return <Box gap={1}>
      <Button key="quran-footer" plain onPress={() => { void togglePane($) }}><Text color="success">{label}</Text></Button>
      {theirs}
    </Box>
  })
  on('command.run', { command: 'quran' }, async ($, e) => ({ text: await dispatch($, parseCommand(e.args)) }))
  on('ui.render', { component: 'CommandOutput', props: { command: 'quran' } }, async ($, e, next) => {
    const error = (await $.state.get(errorRef)).value
    if (!error) return next(e)
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>{error}</Text>
  })
  on('ui.render', { component: 'Pane', requestId: 'quran' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    if (e.surface !== 'desktop') return <Text dimColor>{await arabic($, e.surface, 'مشغّل القرآن متاح على تطبيق Claude للديسكتوب')}</Text>
    const { Select, Button } = $.ui.resolve(e)
    const playing = (await $.state.get(playingRef)).value
    const error = (await $.state.get(errorRef)).value
    const raw = await $.store.get('quran.catalog')
    if (!isCatalog(raw)) return <Text dimColor>{error ?? 'Loading Quran catalog…'}</Text>
    const reciter = await chosen($, raw)
    const surah = (await $.state.get(surahRef)).value ?? 1
    const savedReciterPage = (await $.state.get(reciterPageRef)).value ?? Math.floor(raw.reciters.findIndex(r => r.key === reciter.key) / 63)
    const reciterPage = Math.max(0, Math.min(Math.ceil(raw.reciters.length / 63) - 1, savedReciterPage))
    const surahPage = Math.max(0, Math.min(1, (await $.state.get(surahPageRef)).value ?? Math.floor((surah - 1) / 63)))
    const reciters = raw.reciters.slice(reciterPage * 63, (reciterPage + 1) * 63)
    const surahs = raw.surahs.slice(surahPage * 63, (surahPage + 1) * 63)
    const elapsed = playing ? Math.max(0, await $.clock.now() - playing.startedAt) : 0
    const activeReciter = playing ? raw.reciters.find(r => r.key === playing.moshafKey) ?? reciter : reciter
    return <Box flexDirection="column">
      {raw.reciters.length > 63 && <Select key="quran-reciter-page" label="صفحة القراء" options={Array.from({ length: Math.ceil(raw.reciters.length / 63) }, (_, i) => ({ value: String(i), label: `${i * 63 + 1}–${Math.min((i + 1) * 63, raw.reciters.length)}` }))} value={String(reciterPage)} onSelect={value => { void setPage($, 'reciter', value) }} />}
      <Select key="quran-reciter" label="القارئ" options={[{ value: '', label: 'اختر القارئ' }, ...reciters.map(r => ({ value: r.key, label: r.label }))]} value={reciters.some(r => r.key === reciter.key) ? reciter.key : ''} onSelect={key => { const index = raw.reciters.findIndex(r => r.key === key); if (index >= 0) void paneAction($, { kind: 'reciter', value: String(index + 1) }) }} />
      <Select key="quran-surah-page" label="صفحة السور" options={[{ value: '0', label: '1–63' }, { value: '1', label: '64–114' }]} value={String(surahPage)} onSelect={value => { void setPage($, 'surah', value) }} />
      <Select key="quran-surah" label="السورة" options={[{ value: '', label: 'اختر السورة' }, ...surahs.map(s => ({ value: String(s.id), label: `${s.id}. ${s.name}` }))]} value={surahs.some(s => s.id === surah) ? String(surah) : ''} onSelect={value => { if (value) void paneAction($, { kind: 'play', value }) }} />
      {playing ? <Text color="claude">{raw.surahs[playing.surah - 1]!.name} · {activeReciter.label}</Text> : <Text dimColor>لا يوجد تشغيل</Text>}
      <Text>{formatTime(elapsed)} / {formatTime(playing?.durationMs ?? null)}</Text>
      <Text color="claude">{progressBar(elapsed, playing?.durationMs ?? null)}</Text>
      <Box>
        <Button key="quran-prev" onPress={() => { void paneAction($, { kind: 'prev' }) }}>السابقة</Button>
        <Button key="quran-toggle" onPress={() => { void paneAction($, playing ? { kind: 'stop' } : { kind: 'play', value: String(surah) }) }}>{playing ? 'إيقاف' : 'تشغيل'}</Button>
        <Button key="quran-next" onPress={() => { void paneAction($, { kind: 'next' }) }}>التالية</Button>
      </Box>
      {error && <Text dimColor>{error}</Text>}
    </Box>
  }).catch(async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>Quran player unavailable. Use /quran again.</Text>
  })
}
