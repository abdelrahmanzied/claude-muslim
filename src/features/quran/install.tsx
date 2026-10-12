import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import type { QuranPlaying } from '../../../types/index.d.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type TerminalEnvironment } from '../../shared/arabic/terminal.ts'
import { audioUrl, CATALOG_MS, defaultReciter, filterReciters, isCatalog, matchReciter, matchSurah, readSurahs, type Catalog, type Reciter } from './catalog.ts'
import { contentRangeTotal, decodeBase64, durationMs } from './mp3.ts'
import { formatTime, nextSurahAfterEnd, parseCommand, type Command } from './player.ts'
import { quranHelp } from './help.ts'
import { isCardMessage, pointerPixels } from './card.ts'
import { PANE_HEIGHT, isPickMessage, paneHit, paneModel, pickerInitial } from './pane.ts'

const QURAN_DEBUG = true
type PlayPath = 'command' | 'pane' | 'auto-advance'
const playingRef = { plugin: 'muslim', key: 'quranPlaying' } as const
const commandErrorRef = { plugin: 'muslim', key: 'quranCommandError' } as const
const errorRef = { plugin: 'muslim', key: 'quranError' } as const
const surahRef = { plugin: 'muslim', key: 'quranSurah' } as const
// Handles cannot survive reload; only these ephemeral resources stay here.
const runtime: { controller?: AbortController; timer?: { cancel(): void }; catalog?: Promise<Catalog>; queue: Promise<unknown>; probe: number; generation: number; stopEpoch: number; debugQueue: Promise<unknown>; clip?: { generation: number; surah: number } } = { queue: Promise.resolve(), probe: 0, generation: 0, stopEpoch: 0, debugQueue: Promise.resolve() }

const view = { focusRevision: 0 }

async function writeDebug($: EngineInterface, message: string): Promise<void> {
  try {
    const windows = (await $.env.get('OS')) === 'Windows_NT'
    const temp = windows ? await $.env.get('TEMP') : await $.env.get('TMPDIR') ?? '/tmp'
    if (!temp) return
    const path = `${temp.replace(/[\\/]+$/, '')}/claude-muslim-quran/debug.log`
    let old = ''
    try { old = await $.fs.read(path) } catch { /* First diagnostic line creates the file. */ }
    const line = `${await $.clock.now()} ${message.replace(/[\r\n]/g, ' ').slice(0, 400)}`
    await $.fs.write(path, [...old.split('\n').filter(Boolean), line].slice(-200).join('\n') + '\n')
  } catch { /* Diagnostics must never affect playback. */ }
}
function debug($: EngineInterface, message: string): void {
  if (!QURAN_DEBUG) return
  runtime.debugQueue = runtime.debugQueue.then(() => writeDebug($, message)).catch(() => undefined)
}
async function settled($: EngineInterface, controller: AbortController, token: number, surah: number, startedAt: number, result: string): Promise<void> {
  debug($, `settle generation=${token} surah=${surah} result=${result} aborted=${controller.signal.aborted} elapsedMs=${Math.max(0, await $.clock.now() - startedAt)}`)
}

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
async function fail($: EngineInterface, error: unknown, fromCommand = false): Promise<string> {
  // Keep external errors short and free of multiline process output.
  const message = `Quran: ${error instanceof Error ? error.message.replace(/^.*?\$\.[\w.]+:\s*/, '').replace(/[\r\n|]/g, ' ').slice(0, 160) : 'Unable to play or load the catalog'}`
  try { await $.state.set(commandErrorRef, fromCommand ? message : null); await $.state.set(errorRef, message); $.ui.invalidate('ui.render') } catch { /* A refused state write must not escape a hook. */ }
  return message
}
async function stop($: EngineInterface, from = 'stop'): Promise<void> {
  ++runtime.generation
  if (runtime.controller) {
    debug($, `abort from=${from} generation=${runtime.clip?.generation} surah=${runtime.clip?.surah}`)
    runtime.controller.abort()
  }
  runtime.controller = undefined
  runtime.timer?.cancel()
  runtime.timer = undefined
  await $.state.set(playingRef, null)
  $.ui.invalidate('ui.render')
}
async function finish($: EngineInterface, controller: AbortController, token: number, reciter: Reciter, surah: number, fromCommand: boolean, error?: unknown): Promise<void> {
  const task = runtime.queue.then(() => complete($, controller, token, reciter, surah, fromCommand, error)).catch(error => fail($, error, fromCommand))
  runtime.queue = task
  await task
}
async function complete($: EngineInterface, controller: AbortController, token: number, reciter: Reciter, surah: number, fromCommand: boolean, error?: unknown): Promise<void> {
  if (runtime.controller !== controller || controller.signal.aborted || token !== runtime.generation) return
  // A reload clears tracking; an orphaned clip can never continue the sequence.
  if (!(await $.state.get(playingRef)).value) { await stop($); return }
  const nextSurah = nextSurahAfterEnd(surah, error === undefined, token, runtime.generation)
  if (nextSurah !== null) { await play($, reciter, nextSurah, fromCommand, 'auto-advance'); return }
  await stop($, 'completion')
  if (error !== undefined) await fail($, error, fromCommand)
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
async function play($: EngineInterface, reciter: Reciter, surah: number, fromCommand: boolean, path: PlayPath = fromCommand ? 'command' : 'pane'): Promise<void> {
  const generation = runtime.generation
  await stop($, `replace:${path}`)
  if (runtime.generation !== generation + 1) return
  const controller = new AbortController()
  runtime.controller = controller
  const token = runtime.generation
  runtime.clip = { generation: token, surah }
  const playing: QuranPlaying = { moshafKey: reciter.key, surah, startedAt: await $.clock.now(), durationMs: null }
  await $.state.set(surahRef, surah)
  await $.state.set(errorRef, null)
  await $.state.set(commandErrorRef, null)
  await $.state.set(playingRef, playing)
  // Start in the hook flow, as verified on Desktop; do not await the clip.
  if (runtime.controller !== controller || controller.signal.aborted) {
    await $.state.set(playingRef, null)
    return
  }
  debug($, `play generation=${token} surah=${surah} path=${path}`)
  // Created beside play in its invocation: abort from this timer's context too.
  let watchdogAborted = false
  const watchdog = $.clock.every(200, () => {
    if (token === runtime.generation || watchdogAborted) return
    watchdogAborted = true
    debug($, `watchdog abort generation=${token} surah=${surah} currentGeneration=${runtime.generation}`)
    controller.abort()
  })
  void $.audio.play({ url: audioUrl(reciter, surah) }, { signal: controller.signal }).then(
    () => { watchdog.cancel(); void settled($, controller, token, surah, playing.startedAt, 'resolved'); return finish($, controller, token, reciter, surah, fromCommand) },
    error => { watchdog.cancel(); void settled($, controller, token, surah, playing.startedAt, 'rejected'); return finish($, controller, token, reciter, surah, fromCommand, error) },
  ).catch(error => { watchdog.cancel(); void fail($, error, fromCommand) })
  void lookupDuration($, reciter, surah, controller)
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
async function action($: EngineInterface, command: Command, fromCommand: boolean): Promise<string> {
  const generation = runtime.generation
  if (command.kind === 'help' || command.kind === 'usage') return quranHelp()
  if (command.kind === 'stop') { await stop($, fromCommand ? 'command:stop' : 'pane:stop'); await $.state.set(errorRef, null); return 'Quran stopped.' }
  if (command.kind === 'open' || command.kind === 'play') await open($)
  const c = await catalog($)
  await $.state.set(errorRef, null)
  $.ui.invalidate('ui.render')
  let reciter = await chosen($, c)
  const playing = (await $.state.get(playingRef)).value
  const current = (await $.state.get(surahRef)).value ?? 1
  if (generation !== runtime.generation) return 'Quran stopped.'
  if (command.kind === 'open') return 'Quran player opened (desktop only).'
  if (command.kind === 'reciter') {
    if (!command.value) return '**Quran › Reciters**\n\n' + (await Promise.all(c.reciters.map(async (r, i) => `${i + 1}. ${await arabic($, await $.session.surface() ?? 'desktop', r.label)}`))).join('\n')
    const choice = matchReciter(command.value, c.reciters)
    if (!choice) return 'Reciter not found or ambiguous. Use /quran reciter and choose a number.'
    reciter = choice
    await $.store.set('quran.reciter', reciter.key)
    if (generation !== runtime.generation) return 'Quran stopped.'
    if (playing) await play($, reciter, playing.surah, fromCommand)
    $.ui.invalidate('ui.render')
    return `Quran reciter: ${await arabic($, await $.session.surface() ?? 'desktop', reciter.label)}.`
  }
  const surah = command.kind === 'play' ? matchSurah(command.value, c.surahs)?.id : current + (command.kind === 'next' ? 1 : -1)
  if (surah === undefined) return 'Surah not found. Use /quran play <1-114 or Arabic name>.'
  if (surah < 1 || surah > 114) return surah < 1 ? 'Already at the first surah.' : 'Already at the last surah.'
  await play($, reciter, surah, fromCommand)
  return `Quran playing: ${await arabic($, await $.session.surface() ?? 'desktop', c.surahs[surah - 1]!.name)}.`
}
// Serialize user actions; play completions check generation and controller identity.
async function dispatch($: EngineInterface, command: Command, fromCommand = true): Promise<string> {
  // Stop must abort now, even if a catalog refresh is holding the action queue.
  if (command.kind === 'stop') {
    ++runtime.stopEpoch
    return action($, command, fromCommand).catch(error => fail($, error, fromCommand))
  }
  const epoch = runtime.stopEpoch
  const task = runtime.queue.then(() => epoch === runtime.stopEpoch ? action($, command, fromCommand) : 'Quran stopped.').catch(error => fail($, error, fromCommand))
  runtime.queue = task
  return task
}
async function paneAction($: EngineInterface, command: Command): Promise<void> {
  await dispatch($, command, false)
}

async function togglePlayback($: EngineInterface): Promise<void> {
  try {
    const playing = (await $.state.get(playingRef)).value
    const surah = (await $.state.get(surahRef)).value ?? 1
    await paneAction($, playing ? { kind: 'stop' } : { kind: 'play', value: String(surah) })
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
      <Button key="quran-footer" plain onPress={() => { void togglePane($) }}><Text color="success">۞ {label}</Text></Button>
      {theirs}
    </Box>
  })
  on('command.run', { command: 'quran' }, async ($, e) => ({ text: await dispatch($, parseCommand(e.args)) }))
  on('ui.render', { component: 'CommandOutput', props: { command: 'quran' } }, async ($, e, next) => {
    const error = (await $.state.get(commandErrorRef)).value
    if (!error) return next(e)
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>{error}</Text>
  })
  on('ui.message', { element: 'quran-card' }, async ($, e) => {
    if (e.surface !== 'desktop') return {}
    if (isPickMessage(e.data)) {
      const pickMessage = e.data
      const c = await catalog($)
      if (pickMessage.list === 'reciter') {
        const index = c.reciters.findIndex(r => r.key === pickMessage.value)
        if (index >= 0) await paneAction($, { kind: 'reciter', value: String(index + 1) })
      } else if (c.surahs.some(s => String(s.id) === pickMessage.value)) await paneAction($, { kind: 'play', value: pickMessage.value })
      return {}
    }
    if (!isCardMessage(e.data)) return {}
    const message = e.data
    if (message.act === 'size') return {}
    let buttonAction: 'prev' | 'toggle' | 'next' | null = null
    if (message.act === 'pointer') {
      if (message.button !== 'left' || message.generation !== runtime.generation) return {}
      const raw = await $.store.get('quran.catalog')
      if (!isCatalog(raw)) return {}
      const c = await chosen($, raw)
      const playing = (await $.state.get(playingRef)).value
      const selected = (await $.state.get(surahRef)).value ?? 1
      const model = paneModel(raw, c, selected, playing, await $.clock.now(), message.width, runtime.generation, view.focusRevision, true, null)
      const pixels = pointerPixels(message.width, message.x, message.y, message.columns, message.rows, PANE_HEIGHT)
      const hit = paneHit(model, pickerInitial(model), pixels.x, pixels.y)
      buttonAction = hit?.act === 'control' ? hit.action : null
    } else buttonAction = message.key === 'left' ? 'prev' : message.key === 'right' ? 'next' : message.key === 'return' || message.key === ' ' ? 'toggle' : null
    if (buttonAction === 'toggle') await togglePlayback($)
    else if (buttonAction) await paneAction($, { kind: buttonAction })
    return {}
  }).catch(async ($) => { await fail($, new Error('Quran control unavailable')); return {} })
  on('ui.focus', { requestId: 'quran' }, async ($, e, next) => {
    if (e.element !== 'quran-card') { ++view.focusRevision; $.ui.invalidate('ui.render') }
    return next(e)
  })
  on('ui.render', { component: 'Pane', requestId: 'quran' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    if (e.surface !== 'desktop') return <Text dimColor>{await arabic($, e.surface, 'مشغّل القرآن متاح على تطبيق Claude للديسكتوب')}</Text>
    const { Client } = $.ui.resolve(e)
    const playing = (await $.state.get(playingRef)).value
    const error = (await $.state.get(errorRef)).value
    const raw = await $.store.get('quran.catalog')
    if (!isCatalog(raw)) return <Text dimColor>{error ?? 'Loading Quran catalog…'}</Text>
    const reciter = await chosen($, raw)
    const surah = (await $.state.get(surahRef)).value ?? 1
    const model = paneModel(raw, reciter, surah, playing, await $.clock.now(), e.props.bodyColumns * 8.4, runtime.generation, view.focusRevision, e.props.isFocused, error)
    return <Client key="quran-card" module="./client.tsx" width="100%" props={model} />
  }).catch(async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>Quran player unavailable. Use /quran again.</Text>
  })
}
