import { accentText, type Accent } from '../../shared/color/index.ts'
import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import type { QuranPlaying } from '../../../types/index.d.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type TerminalEnvironment } from '../../shared/arabic/terminal.ts'
import { audioUrl, CATALOG_MS, defaultReciter, filterReciters, isCatalog, matchReciter, matchSurah, readSurahs, type Catalog, type Reciter } from './catalog.ts'
import { contentRangeTotal, decodeBase64, durationMs } from './mp3.ts'
import { AUDIO_LIMIT_BYTES, CLIP_ERROR, SIZE_ERROR, TIMING_ERROR, cachedPlan, fileSize, lowerHeaders, makePlan, planKey, rangeHeader, readCache, timedSegments, timingRead, trimCache, sameRecording, withSegmentCut, type Checkpoint, type RecordingPlan, type Segment } from './segments.ts'
import { SegmentScanner, SEGMENT_LEAD_MS, cbrByte, cbrCheckpoint, cbrStream, encodeBase64, seekCheckpoint } from './segment-mp3.ts'
import { chipSize, chipText } from './footer.ts'
import { formatTime, nextPlaybackItem, parseCommand, repeatMode, toggleRepeat, type Command } from './player.ts'
import { isAvailable, nearestAvailable, nextAvailable, UNAVAILABLE_ERROR } from './availability.ts'
import { quranHelp } from './help.ts'
import { isCardMessage, pointerPixels, pointerSlack } from './card.ts'
import { PANE_HEIGHT, columnsWidth, isPickMessage, isPickerMessage, pickerWheelDelta, paneHit, paneModel, pickerInitial, paneHeight, type PickerMessage } from './pane.ts'

const QURAN_DEBUG = false
type Preparing = { moshafKey: string; surah: number; stage: 'checking' | 'preparing' }
type PreparedSegment = { plan: RecordingPlan; source: { base64: string; mime: string } }
type PrefetchTarget = { key: string; index: number }
type PlayPath = 'command' | 'pane' | 'auto-advance'
const repeatRef = { plugin: 'muslim', key: 'quranRepeat' } as const
const playingRef = { plugin: 'muslim', key: 'quranPlaying' } as const
const commandErrorRef = { plugin: 'muslim', key: 'quranCommandError' } as const
const errorRef = { plugin: 'muslim', key: 'quranError' } as const
const surahRef = { plugin: 'muslim', key: 'quranSurah' } as const
// Handles cannot survive reload; only these ephemeral resources stay here.
const runtime: { controller?: AbortController; prefetch?: PrefetchTarget & { controller: AbortController; source: Promise<PreparedSegment> }; plan?: RecordingPlan; preparing?: Preparing; selectedSegment: number; reads?: unknown; timer?: { cancel(): void }; catalog?: Promise<Catalog>; queue: Promise<unknown>; probe: number; generation: number; stopEpoch: number; debugQueue: Promise<unknown>; cacheQueue: Promise<unknown>; clip?: { generation: number; surah: number } } = { selectedSegment: 0, queue: Promise.resolve(), probe: 0, generation: 0, stopEpoch: 0, debugQueue: Promise.resolve(), cacheQueue: Promise.resolve() }

const view: { focusRevision: number; picker: PickerMessage | null; wheel: number; offset: number; wheelAt: number } = { focusRevision: 0, picker: null, wheel: 0, offset: 0, wheelAt: -Infinity }

async function writeDebug($: EngineInterface, message: string): Promise<void> {
  try {
    const windows = (await $.env.get('OS')) === 'Windows_NT'
    const temp = windows ? await $.env.get('TEMP') : await $.env.get('TMPDIR') ?? '/tmp'
    if (!temp) return
    const path = `${temp.replace(/[\\/]+$/, '')}/claude-muslim-quran/debug.log`
    let old = ''
    try { old = await $.fs.read(path) } catch { /* First diagnostic line creates the file. */ }
    const line = `${await $.clock.now()} ${message.replace(/[\r\n]/g, ' ').slice(0, 2000)}`
    await $.fs.write(path, [...old.split('\n').filter(Boolean), line].slice(-200).join('\n') + '\n')
  } catch { /* Diagnostics must never affect playback. */ }
}
function debug($: EngineInterface, message: string): void {
  if (!QURAN_DEBUG) return
  runtime.debugQueue = runtime.debugQueue.then(() => writeDebug($, message)).catch(() => undefined)
}
async function settled($: EngineInterface, controller: AbortController, token: number, surah: number, startedAt: number, result: string): Promise<void> {
  try {
    debug($, `settle generation=${token} surah=${surah} result=${result} aborted=${controller.signal.aborted} elapsedMs=${Math.max(0, await $.clock.now() - startedAt)}`)
  } catch { /* A late audio settlement can outlive the hooks environment. */ }
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

// Claude Code's own theme row decides only when it names light or dark; otherwise the pane follows the app's color scheme.
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
// Restore a catalog-valid selection without fetching metadata or starting playback.
async function selectedSurah($: EngineInterface, reciter: Reciter): Promise<number> {
  const stored = (await $.state.get(surahRef)).value ?? 1
  const selected = nearestAvailable(reciter.key, stored) ?? stored
  if (selected !== stored) await $.state.set(surahRef, selected)
  return selected
}
async function fail($: EngineInterface, error: unknown, fromCommand = false): Promise<string> {
  // Keep external errors short and free of multiline process output.
  const known = error instanceof Error && [SIZE_ERROR, TIMING_ERROR, CLIP_ERROR, UNAVAILABLE_ERROR].includes(error.message)
  const rawMessage = known ? (error as Error).message : `Quran: ${error instanceof Error ? error.message.replace(/^.*?\$\.[\w.]+:\s*/, '').replace(/[\r\n|]/g, ' ').slice(0, 160) : 'Unable to play or load the catalog'}`
  const message = rawMessage === UNAVAILABLE_ERROR ? await arabic($, await $.session.surface() ?? 'desktop', rawMessage) : rawMessage
  try { await $.state.set(commandErrorRef, fromCommand ? message : null); await $.state.set(errorRef, message); $.ui.invalidate('ui.render') } catch { /* A refused state write must not escape a hook. */ }
  return message
}
async function stop($: EngineInterface, from = 'stop', preserve?: PrefetchTarget): Promise<void> {
  ++runtime.generation
  if (runtime.controller) {
    debug($, `abort from=${from} generation=${runtime.clip?.generation} surah=${runtime.clip?.surah}`)
    runtime.controller.abort()
  }
  if (runtime.prefetch && (!preserve || runtime.prefetch.key !== preserve.key || runtime.prefetch.index !== preserve.index)) {
    debug($, `abort from=prefetch:${from} key=${runtime.prefetch.key} segment=${runtime.prefetch.index}`)
    runtime.prefetch.controller.abort()
    runtime.prefetch = undefined
  }
  runtime.controller = undefined
  runtime.preparing = undefined
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
  const active = (await $.state.get(playingRef)).value
  if (runtime.controller !== controller || controller.signal.aborted || token !== runtime.generation) return
  if (!active) { await stop($); return }
  const repeat = repeatMode((await $.state.get(repeatRef)).value)
  if (runtime.controller !== controller || controller.signal.aborted || token !== runtime.generation) return
  const count = runtime.plan?.moshafKey === reciter.key && runtime.plan.surah === surah ? runtime.plan.segments.length : 0
  const item = nextPlaybackItem(surah, active.segmentIndex ?? null, count, repeat, error === undefined, token, runtime.generation, reciter.key)
  if (item) { await play($, reciter, item.surah, fromCommand, 'auto-advance', item.index); return }
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
      try {
        const remove = (await $.env.get('OS')) === 'Windows_NT'
          ? ['cmd', '/c', 'del', '/q', ...files.map(f => f.replace(/\//g, '\\'))]
          : ['rm', '-f', '--', ...files]
        await $.process.run(remove, { timeoutMs: 5000 })
      } catch { /* Best effort cleanup, including a disposed hooks environment. */ }
    }
  }
}
async function readRange($: EngineInterface, url: string, start: number, end: number, controller: AbortController, plan?: RecordingPlan): Promise<{ bytes: Uint8Array; range: NonNullable<ReturnType<typeof rangeHeader>> }> {
  if (controller.signal.aborted) throw new Error('Quran stopped.')
  const windows = (await $.env.get('OS')) === 'Windows_NT'
  const temp = windows ? await $.env.get('TEMP') : await $.env.get('TMPDIR') ?? '/tmp'
  if (!temp || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end - start + 1 > 2097152) throw new Error(CLIP_ERROR)
  const body = `${temp.replace(/[\\/]+$/, '')}/claude-muslim-quran/range-${await $.clock.now()}-${++runtime.probe}.mp3`
  const files = [body, `${body}.headers`]
  try {
    await $.fs.write(body, '')
    const result = await $.process.run(['curl', '-s', '-L', '--fail', '--connect-timeout', '8', '--max-time', '15', '--max-filesize', String(end - start + 1), '-r', `${start}-${end}`, '-D', files[1]!, '-o', body, url], { timeoutMs: 20000 })
    if (controller.signal.aborted) throw new Error('Quran stopped.')
    if (result.exitCode !== 0) throw new Error(CLIP_ERROR)
    const range = rangeHeader(await $.fs.read(files[1]!))
    if (!range || range.start !== start || range.end !== Math.min(end, range.total - 1) || plan && (range.total !== plan.sizeBytes || plan.etag && range.etag && plan.etag !== range.etag || !plan.etag && plan.lastModified && range.lastModified && plan.lastModified !== range.lastModified)) throw new Error(CLIP_ERROR)
    if ((await $.fs.stat(body)).size !== range.end - range.start + 1) throw new Error(CLIP_ERROR)
    const bytes = decodeBase64((await $.fs.read(body, { as: 'bytes' })).base64)
    if (bytes.length !== range.end - range.start + 1) throw new Error(CLIP_ERROR)
    return { bytes, range }
  } finally {
    const remove = windows ? ['cmd', '/d', '/c', 'del', '/q', ...files.map(f => f.replace(/\//g, '\\'))] : ['rm', '-f', '--', ...files]
    try { await $.process.run(remove, { timeoutMs: 5000 }) } catch {}
  }
}
async function savePlan($: EngineInterface, plan: RecordingPlan): Promise<void> {
  // Serialize read/merge/write so concurrent extraction cannot lose a cut.
  const copy = JSON.parse(JSON.stringify(plan)) as RecordingPlan
  const task = runtime.cacheQueue.then(async () => {
    const latest = readCache(await $.store.get('quran.segmentCache'))
    await $.store.set('quran.segmentCache', trimCache(latest, copy))
  })
  runtime.cacheQueue = task.catch(() => undefined)
  await task
}
// A CBR recording's length from its size and bitrate; null when it is not CBR or the start of the file cannot be read.
async function cbrDuration($: EngineInterface, url: string, size: number, controller: AbortController): Promise<number | null> {
  try {
    const stream = cbrStream((await readRange($, url, 0, 131071, controller)).bytes)
    return stream && size > stream.audioStart ? Math.round((size - stream.audioStart) * 8000 / stream.bitrate) : null
  } catch { if (controller.signal.aborted) throw new Error('Quran stopped.'); return null }
}
async function loadPlan($: EngineInterface, c: Catalog, reciter: Reciter, surah: number, controller: AbortController, refresh = false): Promise<RecordingPlan> {
  const url = audioUrl(reciter, surah), now = await $.clock.now()
  const raw = await $.store.get('quran.segmentCache')
  const cached = refresh ? undefined : cachedPlan(raw, reciter, surah, url, now)
  if (cached) return cached
  let headers: Record<string, string> = {}, size: number | null = null, duration: number | null = null
  const oldDurations = await $.store.get('quran.durations') as Record<string, unknown> | undefined
  const oldDuration = oldDurations?.[planKey(reciter.key, surah)]
  if (typeof oldDuration === 'number' && Number.isFinite(oldDuration) && oldDuration > 0) duration = oldDuration
  try {
    const response = await $.http.fetch(url, { method: 'HEAD' })
    if (response.ok) { headers = lowerHeaders(response.headers); size = fileSize(headers) }
  } catch {}
  if (controller.signal.aborted) throw new Error('Quran stopped.')
  if (size === null) {
    try {
      const prefix = await readRange($, url, 0, 131071, controller)
      size = prefix.range.total
      headers = { etag: prefix.range.etag ?? '', 'last-modified': prefix.range.lastModified ?? '' }
      duration = durationMs(prefix.bytes, size)
    } catch { if (controller.signal.aborted) throw new Error('Quran stopped.'); throw new Error(SIZE_ERROR) }
  }
  let readId: number | null = null, segments: Segment[] = []
  if (size >= AUDIO_LIMIT_BYTES) {
    try {
      if (!runtime.reads) {
        const response = await $.http.fetch('https://www.mp3quran.net/api/v3/ayat_timing/reads')
        if (!response.ok) { debug($, `timing reads status=${response.status}`); throw new Error(TIMING_ERROR) }
        runtime.reads = JSON.parse(response.text)
      }
      readId = timingRead(runtime.reads, reciter.server)
      if (readId === null) { debug($, `timing no read for reciter=${reciter.key} server=${reciter.server}`); throw new Error(TIMING_ERROR) }
      const response = await $.http.fetch(`https://www.mp3quran.net/api/v3/ayat_timing?surah=${surah}&read=${readId}`)
      if (!response.ok) { debug($, `timing surah=${surah} read=${readId} status=${response.status}`); throw new Error(TIMING_ERROR) }
      segments = timedSegments(JSON.parse(response.text), surah, size, await cbrDuration($, url, size, controller))
      duration = segments.at(-1)!.endMs
    } catch (error) {
      debug($, `timing error ${error instanceof Error ? `${error.message} ${error.stack ?? ''}` : String(error)}`.slice(0, 2000))
      if (controller.signal.aborted) throw new Error('Quran stopped.'); throw error instanceof Error && error.message === CLIP_ERROR ? error : new Error(TIMING_ERROR)
    }
  }
  if (controller.signal.aborted) throw new Error('Quran stopped.')
  const previous = readCache(raw)[planKey(reciter.key, surah)]
  const plan = makePlan(reciter, c.surahs[surah - 1]!, url, size, now, headers, duration, readId, segments, previous)
  try { await savePlan($, plan) } catch {}
  return plan
}
// A saved checkpoint close enough is used as is; otherwise a CBR recording jumps straight to a few seconds before the quarter.
async function nearCheckpoint($: EngineInterface, plan: RecordingPlan, startMs: number, controller: AbortController): Promise<Checkpoint | undefined> {
  const saved = seekCheckpoint(plan.checkpoints, startMs)
  if (startMs <= SEGMENT_LEAD_MS || saved && startMs - saved.timeMs < 60000) return saved
  try {
    const prefix = await readRange($, plan.audioUrl, 0, 131071, controller, plan)
    const stream = cbrStream(prefix.bytes)
    if (!stream) return saved
    const at = cbrByte(stream, startMs - SEGMENT_LEAD_MS)
    const window = await readRange($, plan.audioUrl, at, Math.min(plan.sizeBytes - 1, at + 8191), controller, plan)
    return cbrCheckpoint(stream, at, window.bytes) ?? saved
  } catch (error) { if (controller.signal.aborted) throw error; return saved }
}
async function segmentSource($: EngineInterface, plan: RecordingPlan, index: number, controller: AbortController): Promise<PreparedSegment> {
  let segment = plan.segments[index]
  if (!segment) throw new Error(CLIP_ERROR)
  if (segment.startByte === undefined || segment.endByte === undefined) {
    const checkpoint = await nearCheckpoint($, plan, segment.startMs, controller)
    const scanner = new SegmentScanner(segment, plan.sizeBytes, index === plan.segments.length - 1, checkpoint)
    for (let byte = checkpoint?.byte ?? 0; byte < plan.sizeBytes && !scanner.result; byte += 2097152) {
      const range = await readRange($, plan.audioUrl, byte, Math.min(plan.sizeBytes - 1, byte + 2097151), controller, plan)
      scanner.feed(range.bytes, byte)
    }
    if (!scanner.result) throw new Error(CLIP_ERROR)
    const now = await $.clock.now()
    if (controller.signal.aborted) throw new Error('Quran stopped.')
    // Another extraction may already have updated the active plan while we scanned.
    const active = sameRecording(runtime.plan, plan)
    plan = withSegmentCut(active ? runtime.plan! : plan, index, scanner.result, now)
    segment = plan.segments[index]!
    if (active) runtime.plan = plan
    try { await savePlan($, plan) } catch {}
  }
  const startByte = segment.startByte!, endByte = segment.endByte!
  const length = endByte - startByte
  if (!Number.isSafeInteger(length) || length <= 0 || length >= AUDIO_LIMIT_BYTES || startByte < 0 || endByte > plan.sizeBytes) throw new Error(CLIP_ERROR)
  const bytes = new Uint8Array(length)
  for (let byte = startByte; byte < endByte; byte += 2097152) {
    const part = await readRange($, plan.audioUrl, byte, Math.min(endByte - 1, byte + 2097151), controller, plan)
    bytes.set(part.bytes, byte - startByte)
  }
  if (controller.signal.aborted) throw new Error('Quran stopped.')
  return { plan: sameRecording(runtime.plan, plan) ? runtime.plan! : plan, source: { base64: encodeBase64(bytes), mime: 'audio/mpeg' } }
}

function prefetchSegment($: EngineInterface, plan: RecordingPlan, index: number): void {
  const key = planKey(plan.moshafKey, plan.surah)
  if (runtime.prefetch?.key === key && runtime.prefetch.index === index) return
  runtime.prefetch?.controller.abort()
  const controller = new AbortController()
  const source = segmentSource($, plan, index, controller)
  source.catch(() => undefined)
  runtime.prefetch = { key, index, controller, source }
}

async function play($: EngineInterface, reciter: Reciter, surah: number, fromCommand: boolean, path: PlayPath = fromCommand ? 'command' : 'pane', index = 0, intent: 'play' | 'select' | 'inspect' = 'play', refresh = false): Promise<void> {
  if (!isAvailable(reciter.key, surah)) { await fail($, new Error(UNAVAILABLE_ERROR), fromCommand); return }
  const generation = runtime.generation
  await stop($, `replace:${path}`, path === 'auto-advance' ? { key: planKey(reciter.key, surah), index } : undefined)
  if (runtime.generation !== generation + 1) return
  const controller = new AbortController()
  runtime.controller = controller
  const token = runtime.generation
  runtime.clip = { generation: token, surah }
  runtime.preparing = { moshafKey: reciter.key, surah, stage: 'checking' }
  runtime.selectedSegment = index
  view.picker = null
  ++view.focusRevision
  if (runtime.plan?.moshafKey !== reciter.key || runtime.plan.surah !== surah || refresh) runtime.plan = undefined
  await $.state.set(surahRef, surah)
  await $.state.set(errorRef, null)
  await $.state.set(commandErrorRef, null)
  $.ui.invalidate('ui.render')
  try {
    const c = await catalog($)
    let plan = await loadPlan($, c, reciter, surah, controller, refresh)
    if (controller.signal.aborted || token !== runtime.generation) return
    if (!refresh && sameRecording(runtime.plan, plan)) plan = runtime.plan!
    runtime.plan = plan
    runtime.selectedSegment = Math.min(index, Math.max(0, plan.segments.length - 1))
    // A whole surah has no quarters: quarter repeat falls back to off.
    if (!plan.segments.length && repeatMode((await $.state.get(repeatRef)).value) === 'segment') await $.state.set(repeatRef, 'off')
    if (intent === 'inspect' || intent === 'select' && plan.segments.length) { runtime.preparing = undefined; runtime.controller = undefined; $.ui.invalidate('ui.render'); return }
    let segment = plan.segments[runtime.selectedSegment]
    runtime.preparing = { moshafKey: reciter.key, surah, stage: 'preparing' }
    $.ui.invalidate('ui.render')
    const ready = runtime.prefetch?.key === planKey(plan.moshafKey, plan.surah) && runtime.prefetch.index === runtime.selectedSegment ? runtime.prefetch : undefined
    let source: { base64: string; mime: string } | { url: string }
    if (segment) {
      const prepared = ready ? await ready.source.catch(error => {
        if (controller.signal.aborted) throw error
        return segmentSource($, plan, runtime.selectedSegment, controller)
      }) : await segmentSource($, plan, runtime.selectedSegment, controller)
      if (controller.signal.aborted || token !== runtime.generation) return
      plan = prepared.plan
      segment = plan.segments[runtime.selectedSegment]!
      source = prepared.source
      if (runtime.prefetch === ready) runtime.prefetch = undefined
    } else source = { url: plan.audioUrl }
    if (controller.signal.aborted || token !== runtime.generation) return
    const playing: QuranPlaying = { moshafKey: reciter.key, surah, startedAt: await $.clock.now(), durationMs: segment?.decodedDurationMs ?? segment?.durationMs ?? plan.durationMs, ...(segment ? { segmentIndex: runtime.selectedSegment, segmentCount: plan.segments.length } : {}) }
    runtime.preparing = undefined
    await $.state.set(playingRef, playing)
    if (controller.signal.aborted || token !== runtime.generation) return
    debug($, `play generation=${token} surah=${surah} path=${path} segment=${segment?.id ?? 'whole'}`)
    let watchdogAborted = false
    const watchdog = $.clock.every(200, () => {
      if (token === runtime.generation || watchdogAborted) return
      watchdogAborted = true
      debug($, `watchdog abort generation=${token} surah=${surah} currentGeneration=${runtime.generation}`)
      controller.abort()
    })
    void $.audio.play(source, { signal: controller.signal }).then(
      () => { watchdog.cancel(); void settled($, controller, token, surah, playing.startedAt, 'resolved'); return finish($, controller, token, reciter, surah, fromCommand) },
      error => { watchdog.cancel(); void settled($, controller, token, surah, playing.startedAt, 'rejected'); return finish($, controller, token, reciter, surah, fromCommand, error) },
    ).catch(error => { watchdog.cancel(); void fail($, error, fromCommand) })
    if (!segment && plan.durationMs === null) void lookupDuration($, reciter, surah, controller)
    // An independent handle survives only natural advancement into this exact
    // quarter. Quarter repeat keeps the same quarter ready; it never reads the next one.
    if (controller.signal.aborted || token !== runtime.generation) return
    if (segment) {
      if (repeatMode((await $.state.get(repeatRef)).value) === 'segment') prefetchSegment($, plan, runtime.selectedSegment)
      else if (runtime.selectedSegment + 1 < plan.segments.length) prefetchSegment($, plan, runtime.selectedSegment + 1)
    }
    runtime.timer = $.clock.every(1000, () => $.ui.invalidate('ui.render'))
    $.ui.invalidate('ui.render')
  } catch (error) {
    debug($, `prepare error ${error instanceof Error ? `${error.message} ${error.stack ?? ''}` : String(error)}`.slice(0, 2000))
    if (controller.signal.aborted || token !== runtime.generation) return
    await stop($, 'prepare:failed')
    await fail($, error, fromCommand)
  }
}
async function splitSelected($: EngineInterface): Promise<boolean> {
  const raw = await $.store.get('quran.catalog')
  return isCatalog(raw) && trackSelection(await chosen($, raw), (await $.state.get(surahRef)).value ?? 1).segments.length > 0
}
function trackSelection(reciter: Reciter, surah: number) {
  const plan = runtime.plan?.moshafKey === reciter.key && runtime.plan.surah === surah ? runtime.plan : undefined
  const preparing = runtime.preparing?.moshafKey === reciter.key && runtime.preparing.surah === surah ? runtime.preparing : undefined
  return { segments: plan?.segments.map(segment => ({ ...segment })) ?? [], selectedSegment: runtime.selectedSegment, durationMs: plan?.durationMs ?? null, loading: preparing?.stage ?? null }
}
async function open($: EngineInterface): Promise<void> {
  const surface = await $.session.surface()
  await $.ui.open({ id: 'quran', title: await arabic($, surface ?? 'desktop', 'القرآن الكريم') })
  $.ui.invalidate('ui.render')
}
// The docked pane narrows the chat column and already shows the title and time, so the footer chip shrinks to its glyph while it is open.
async function isPaneOpen($: EngineInterface): Promise<boolean> {
  try { return (await $.ui.panes()).some(pane => pane.id === 'quran') } catch { return false }
}
async function togglePane($: EngineInterface): Promise<void> {
  try {
    if ((await $.ui.panes()).some(pane => pane.id === 'quran')) await $.ui.close({ id: 'quran' })
    else { await dispatch($, { kind: 'open' }, false); $.ui.invalidate('ui.render') }
  } catch (error) { await fail($, error) }
}
async function action($: EngineInterface, command: Command, fromCommand: boolean): Promise<string> {
  const generation = runtime.generation
  if (command.kind === 'help' || command.kind === 'usage') return quranHelp()
  if (command.kind === 'stop') { await stop($, fromCommand ? 'command:stop' : 'pane:stop'); await $.state.set(errorRef, null); return 'Quran stopped.' }
  if (command.kind === 'repeat' || command.kind === 'repeat-segment') {
    const target = command.kind === 'repeat' ? 'surah' : 'segment'
    if (target === 'segment' && !(await splitSelected($))) return 'Quarter repeat works only while a split surah is selected.'
    const repeat = toggleRepeat(repeatMode((await $.state.get(repeatRef)).value), target)
    await $.state.set(repeatRef, repeat)
    $.ui.invalidate('ui.render')
    return `Quran repeat ${repeat === 'off' ? 'off' : repeat === 'surah' ? 'on' : 'on: current quarter'}.`
  }
  if (command.kind === 'open' || command.kind === 'play') await open($)
  const c = await catalog($)
  await $.state.set(errorRef, null)
  $.ui.invalidate('ui.render')
  let reciter = await chosen($, c)
  const playing = (await $.state.get(playingRef)).value
  const current = await selectedSurah($, reciter)
  if (generation !== runtime.generation) return 'Quran stopped.'
  if (command.kind === 'open' && (playing || runtime.plan?.moshafKey === reciter.key && runtime.plan.surah === current)) return 'Quran player opened (desktop only).'
  if (command.kind === 'open') { await play($, reciter, current, fromCommand, 'command', 0, 'inspect'); return 'Quran player opened (desktop only).' }
  if (command.kind === 'reciter') {
    if (!command.value) return '**Quran › Reciters**\n\n' + (await Promise.all(c.reciters.map(async (r, i) => `${i + 1}. ${await arabic($, await $.session.surface() ?? 'desktop', r.label)}`))).join('\n')
    const choice = matchReciter(command.value, c.reciters)
    if (!choice) return 'Reciter not found or ambiguous. Use /quran reciter and choose a number.'
    reciter = choice
    await $.store.set('quran.reciter', reciter.key)
    if (generation !== runtime.generation) return 'Quran stopped.'
    const surah = nearestAvailable(reciter.key, playing?.surah ?? current)
    if (surah === null) return fail($, new Error(UNAVAILABLE_ERROR), fromCommand)
    await play($, reciter, surah, fromCommand, fromCommand ? 'command' : 'pane', 0, playing ? 'play' : 'inspect')
    $.ui.invalidate('ui.render')
    return `Quran reciter: ${await arabic($, await $.session.surface() ?? 'desktop', reciter.label)}.`
  }
  if (command.kind === 'retry') {
    await play($, reciter, current, fromCommand, fromCommand ? 'command' : 'pane', runtime.selectedSegment, 'select', true)
    return (await $.state.get(errorRef)).value ?? 'Quran recording checked again.'
  }
  if ((command.kind === 'next' || command.kind === 'prev') && runtime.plan?.moshafKey === reciter.key && runtime.plan.surah === current && runtime.plan.segments.length) {
    const index = runtime.selectedSegment + (command.kind === 'next' ? 1 : -1)
    // Past the first or last quarter, prev and next move to the neighbouring surah.
    if (index >= 0 && index < runtime.plan.segments.length) {
      await play($, reciter, current, fromCommand, fromCommand ? 'command' : 'pane', index)
      return (await $.state.get(errorRef)).value ?? 'Quran segment selected.'
    }
  }
  const surah = command.kind === 'play' || command.kind === 'select' ? matchSurah(command.value, c.surahs)?.id : nextAvailable(reciter.key, current, command.kind === 'next' ? 1 : -1)
  if (surah === undefined) return 'Surah not found. Use /quran play <1-114 or Arabic name>.'
  if (surah === null) return command.kind === 'prev' ? 'Already at the first surah.' : 'Already at the last surah.'
  if (!isAvailable(reciter.key, surah)) return fail($, new Error(UNAVAILABLE_ERROR), fromCommand)
  if (surah < 1 || surah > 114) return surah < 1 ? 'Already at the first surah.' : 'Already at the last surah.'
  await play($, reciter, surah, fromCommand, fromCommand ? 'command' : 'pane', command.kind === 'play' ? command.segmentIndex ?? 0 : 0, command.kind === 'select' ? 'select' : 'play')
  const error = (await $.state.get(errorRef)).value
  if (error) return error
  if (runtime.controller?.signal.aborted || runtime.generation !== generation + 1) return 'Quran stopped.'
  if (command.kind === 'select' && runtime.plan?.segments.length) return 'Quran recording ready. Choose a segment.'
  return `Quran playing: ${await arabic($, await $.session.surface() ?? 'desktop', c.surahs[surah - 1]!.name)}.`
}
// Serialize user actions; play completions check generation and controller identity.
async function dispatch($: EngineInterface, command: Command, fromCommand = true): Promise<string> {
  // Stop must abort now, even if a catalog refresh is holding the action queue.
  if (command.kind === 'stop') {
    ++runtime.stopEpoch
    return action($, command, fromCommand).catch(error => fail($, error, fromCommand))
  }
  const requestedEpoch = runtime.stopEpoch
  // Refuse known picks before a catalog refresh, replacement or any track work.
  if (command.kind === 'play' || command.kind === 'select') {
    const raw = await $.store.get('quran.catalog')
    const saved = await $.store.get('quran.reciter')
    const key = isCatalog(raw) ? (await chosen($, raw)).key : typeof saved === 'string' ? saved : ''
    const value = command.value.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    const surah = isCatalog(raw) ? matchSurah(value, raw.surahs)?.id : Number(value)
    if (surah !== undefined && Number.isInteger(surah) && surah >= 1 && surah <= 114 && !isAvailable(key, surah)) return fail($, new Error(UNAVAILABLE_ERROR), fromCommand)
  }
  if (requestedEpoch !== runtime.stopEpoch) return 'Quran stopped.'
  if (runtime.preparing && command.kind !== 'open' && command.kind !== 'help' && command.kind !== 'usage' && command.kind !== 'repeat' && command.kind !== 'repeat-segment' && !(command.kind === 'reciter' && !command.value)) { ++runtime.stopEpoch; await stop($, 'prepare:replace') }
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
    const raw = await $.store.get('quran.catalog')
    const surah = isCatalog(raw) ? await selectedSurah($, await chosen($, raw)) : (await $.state.get(surahRef)).value ?? 1
    await paneAction($, playing || runtime.preparing ? { kind: 'stop' } : { kind: 'play', value: String(surah), segmentIndex: runtime.selectedSegment })
  } catch (error) { await fail($, error) }
}

async function mainColor($: EngineInterface, color: Accent): Promise<string> {
  if (color === 'orange') return accentText(color, undefined)
  const theme = (await $.config.list()).find(row => row.key === 'theme')
  return accentText(color, theme?.value)
}

export const install = (on: On, options: Options) => {
  // Registered before salah: this outer hook prepends Quran to salah's tree.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'desktop') return theirs
    const { Box, Text, Button } = $.ui.resolve(e)
    const playing = (await $.state.get(playingRef)).value
    const raw = await $.store.get('quran.catalog')
    const name = playing && isCatalog(raw) ? raw.surahs[playing.surah - 1]!.name : 'القرآن'
    const time = playing ? formatTime(Math.max(0, await $.clock.now() - playing.startedAt)) : null
    // Desktop draws a Button from its label alone and ignores the Text inside, so the label is the visible chip text.
    // The Text repeats it, in the main color, for a Desktop that draws the children.
    const chip = chipText(chipSize(e.viewport?.columns, await isPaneOpen($)), name, time)
    return <Box gap={1}>
      <Button key="quran-footer" label={chip} plain onPress={() => { void togglePane($) }}><Text color={await mainColor($, options.color)}>{chip}</Text></Button>
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
    if (isPickerMessage(e.data)) {
      if (e.data.focusRevision === view.focusRevision) view.picker = e.data
      return {}
    }
    if (isPickMessage(e.data)) {
      view.picker = null
      const pickMessage = e.data
      // Dispatch surah picks before catalog refresh so known gaps do no network work.
      if (pickMessage.list === 'surah') {
        const surah = Number(pickMessage.value)
        if (Number.isInteger(surah) && surah >= 1 && surah <= 114 && String(surah) === pickMessage.value) await paneAction($, { kind: 'play', value: pickMessage.value })
        return {}
      }
      const c = await catalog($)
      if (pickMessage.list === 'reciter') {
        const index = c.reciters.findIndex(r => r.key === pickMessage.value)
        if (index >= 0) await paneAction($, { kind: 'reciter', value: String(index + 1) })
      } else if (pickMessage.list === 'segment') {
        const reciter = await chosen($, c)
        const current = (await $.state.get(surahRef)).value ?? 1
        const index = Number(pickMessage.value)
        if (runtime.plan?.moshafKey === reciter.key && runtime.plan.surah === current && Number.isInteger(index) && runtime.plan.segments[index]) {
          await paneAction($, { kind: 'play', value: String(current), segmentIndex: index })
        }
      }
      return {}
    }
    if (!isCardMessage(e.data)) return {}
    const message = e.data
    if (message.act === 'size') return {}
    let buttonAction: 'prev' | 'toggle' | 'next' | 'repeat' | 'repeat-segment' | 'retry' | null = null
    if (message.act === 'pointer') {
      if (message.button !== 'left' || message.generation !== runtime.generation) return {}
      const raw = await $.store.get('quran.catalog')
      if (!isCatalog(raw)) return {}
      const c = await chosen($, raw)
      const playing = (await $.state.get(playingRef)).value
      const selected = (await $.state.get(surahRef)).value ?? 1
      const model = paneModel(raw, c, selected, playing, await $.clock.now(), message.width, runtime.generation, view.focusRevision, true, (await $.state.get(errorRef)).value, view.wheel, trackSelection(c, selected), repeatMode((await $.state.get(repeatRef)).value))
      const pixels = pointerPixels(message.width, message.x, message.y, message.columns, message.rows, paneHeight(model))
      const hit = paneHit(model, pickerInitial(model), pixels.x, pixels.y, pointerSlack(message.width, message.columns, message.rows, paneHeight(model), message.coarse === true))
      buttonAction = hit?.act === 'control' ? hit.action : null
    } else buttonAction = message.key === 'left' ? 'prev' : message.key === 'right' ? 'next' : message.key === 'return' || message.key === ' ' ? 'toggle' : null
    if (buttonAction === 'toggle') await togglePlayback($)
    else if (buttonAction) await paneAction($, { kind: buttonAction })
    return {}
  }).catch(async ($) => { await fail($, new Error('Quran control unavailable')); return {} })
  on('ui.focus', { requestId: 'quran' }, async ($, e, next) => {
    if (e.element !== 'quran-card') { view.picker = null; ++view.focusRevision; $.ui.invalidate('ui.render') }
    return next(e)
  })
  on('ui.close', { id: 'quran' }, async ($, e, next) => {
    view.picker = null
    ++view.focusRevision
    const closed = await next(e)
    $.ui.invalidate('ui.render')
    return closed
  })
  on('ui.scroll', { component: 'Pane', requestId: 'quran' }, async ($, e, next) => {
    const delta = pickerWheelDelta(view.picker, e, view.focusRevision, view.offset)
    if (!delta) return next(e)
    const now = await $.clock.now()
    if (now - view.wheelAt < 120) return {}
    view.wheelAt = now
    view.wheel += delta
    $.ui.invalidate('ui.render')
    return {}
  })
  on('ui.render', { component: 'Pane', requestId: 'quran' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    if (e.surface !== 'desktop') return <Text dimColor>{await arabic($, e.surface, 'مشغّل القرآن متاح على تطبيق Claude للديسكتوب')}</Text>
    const { Client } = $.ui.resolve(e)
    view.offset = e.props.scroll?.offset ?? 0
    const playing = (await $.state.get(playingRef)).value
    const error = (await $.state.get(errorRef)).value
    const raw = await $.store.get('quran.catalog')
    if (!isCatalog(raw)) return <Text dimColor>{error ?? 'Loading Quran catalog…'}</Text>
    const reciter = await chosen($, raw)
    const stored = (await $.state.get(surahRef)).value ?? 1
    const surah = nearestAvailable(reciter.key, stored) ?? stored
    const model = paneModel(raw, reciter, surah, playing, await $.clock.now(), columnsWidth(e.props.bodyColumns), runtime.generation, view.focusRevision, e.props.isFocused, error, view.wheel, trackSelection(reciter, surah), repeatMode((await $.state.get(repeatRef)).value))
    model.color = options.color
    return <Client key="quran-card" module="./client.tsx" width="100%" props={model} />
  }).catch(async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>Quran player unavailable. Use /quran again.</Text>
  })
}
