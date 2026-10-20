import { commandFailure } from '../../shared/command/failure.ts'
import { readDurations, trimDurations } from './durations.ts'
import { MODES_KEY } from '../../shared/arabic/terminal.ts'
import { latinDigits } from '../../shared/digits/index.ts'
import { connectBeforeReload } from '../../shared/reload/signal.ts'
import type { EngineInterface, HttpInit, HttpResponse, On } from 'claude-code'
import type { Options } from '../../config.ts'
import type { QuranPlaying } from '../../../types/index.d.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type TerminalEnvironment } from '../../shared/arabic/terminal.ts'
import { audioUrl, defaultReciter, matchReciter, matchSurah, type Reciter } from './catalog.ts'
import { QURAN_CATALOG } from './catalog-data.ts'
import { decodeBase64, durationMs } from './mp3.ts'
import { AUDIO_LIMIT_BYTES, CLIP_ERROR, SIZE_ERROR, TIMING_ERROR, cachedPlan, fileSize, lowerHeaders, makePlan, planKey, rangeHeader, readCache, timedSegments, timingRead, trimCache, sameRecording, withSegmentCut, type Checkpoint, type RecordingPlan, type Segment } from './segments.ts'
import { SegmentScanner, SEGMENT_LEAD_MS, cbrByte, cbrCheckpoint, cbrStream, encodeBase64, seekCheckpoint } from './segment-mp3.ts'
import { formatTime, nextPlaybackItem, repeatMode, toggleRepeat, type Command } from './player.ts'
import { isAvailable, nearestAvailable, nextAvailable, UNAVAILABLE_ERROR } from './availability.ts'
import { connectPanelAction, connectQuran, connectQuranOptions, type PanelList, type PanelOption, type PanelQuran } from '../../shared/panel/signal.ts'
import { isPickMessage, options as listOptions, paneModel, type List } from './pane.ts'
import { segmentLabel } from './label.ts'
import { avatarSvg } from '../../shared/quran-avatar/index.ts'

type Preparing = { moshafKey: string; surah: number; stage: 'checking' | 'preparing' }
type PreparedSegment = { plan: RecordingPlan; source: { base64: string; mime: string } }
type PrefetchTarget = { key: string; index: number }
type CommandRow = { args: string; text: string; error?: string }
type Retry = { reciter: Reciter; surah: number; index: number; intent: 'play' | 'select' | 'inspect' }
type PlayPath = 'command' | 'pane' | 'auto-advance'
const repeatRef = { plugin: 'muslim', key: 'quranRepeat' } as const
const playingRef = { plugin: 'muslim', key: 'quranPlaying' } as const
const commandErrorRef = { plugin: 'muslim', key: 'quranCommandError' } as const
const errorRef = { plugin: 'muslim', key: 'quranError' } as const
const surahRef = { plugin: 'muslim', key: 'quranSurah' } as const
// Handles cannot survive reload; only these ephemeral resources stay here.
const runtime: { controller?: AbortController; retry?: Retry; prefetch?: PrefetchTarget & { controller: AbortController; source: Promise<PreparedSegment> }; plan?: RecordingPlan; preparing?: Preparing; selectedSegment: number; reads?: unknown; timer?: { cancel(): void }; queue: Promise<unknown>; probe: number; generation: number; stopEpoch: number; cacheQueue: Promise<unknown>; timedOut?: AbortController } = { selectedSegment: 0, queue: Promise.resolve(), probe: 0, generation: 0, stopEpoch: 0, cacheQueue: Promise.resolve() }


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
  const modes = await $.store.get(MODES_KEY) as Record<string, unknown> | undefined
  const saved = modes?.[id]
  return terminalArabic(surface, cached?.terminalId === id ? cached.mode : isArabicMode(saved) ? saved : defaultArabicMode(id), text)
}

async function chosen($: EngineInterface): Promise<Reciter> {
  const key = await $.store.get('quran.reciter')
  return QURAN_CATALOG.reciters.find(r => r.key === key) ?? defaultReciter(QURAN_CATALOG)
}
// Restore a catalog-valid selection without fetching metadata or starting playback.
async function selectedSurah($: EngineInterface, reciter: Reciter): Promise<number> {
  const stored = (await $.state.get(surahRef)).value ?? 1
  const selected = nearestAvailable(reciter.key, stored) ?? stored
  if (selected !== stored) await $.state.set(surahRef, selected)
  return selected
}
async function fail($: EngineInterface, error: unknown, fromCommand: CommandRow | false = false): Promise<string> {
  // Keep external errors short and free of multiline process output.
  const known = error instanceof Error && [SIZE_ERROR, TIMING_ERROR, CLIP_ERROR, UNAVAILABLE_ERROR].includes(error.message)
  const rawMessage = known ? (error as Error).message : `Quran: ${error instanceof Error ? error.message.replace(/^.*?\$\.[\w.]+:\s*/, '').replace(/[\r\n|]/g, ' ').slice(0, 160) : 'Unable to play the recording'}`
  const message = rawMessage === UNAVAILABLE_ERROR ? await arabic($, await $.session.surface() ?? 'desktop', rawMessage) : rawMessage
  if (fromCommand) fromCommand.error = message
  try { await $.state.set(commandErrorRef, fromCommand ? { args: fromCommand.args, text: fromCommand.text, message } : null); await $.state.set(errorRef, message); $.ui.invalidate('ui.render') } catch { /* A refused state write must not escape a hook. */ }
  return message
}
async function stop($: EngineInterface, from = 'stop', preserve?: PrefetchTarget): Promise<void> {
  ++runtime.generation
  if (runtime.controller) {
    runtime.controller.abort()
  }
  if (runtime.prefetch && (!preserve || runtime.prefetch.key !== preserve.key || runtime.prefetch.index !== preserve.index)) {
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
async function finish($: EngineInterface, controller: AbortController, token: number, reciter: Reciter, surah: number, fromCommand: CommandRow | false, error?: unknown): Promise<void> {
  const task = runtime.queue.then(() => complete($, controller, token, reciter, surah, fromCommand, error)).catch(error => fail($, error, fromCommand))
  runtime.queue = task
  await task
}
async function complete($: EngineInterface, controller: AbortController, token: number, reciter: Reciter, surah: number, fromCommand: CommandRow | false, error?: unknown): Promise<void> {
  if (isStale(controller, token)) return
  // A reload clears tracking; an orphaned clip can never continue the sequence.
  const active = (await $.state.get(playingRef)).value
  if (isStale(controller, token)) return
  if (!active) { await stop($); return }
  const repeat = repeatMode((await $.state.get(repeatRef)).value)
  if (isStale(controller, token)) return
  const count = planFor(reciter, surah)?.segments.length ?? 0
  const item = nextPlaybackItem(surah, active.segmentIndex ?? null, count, repeat, error === undefined, token, runtime.generation, reciter.key)
  if (item) { await play($, reciter, item.surah, fromCommand, 'auto-advance', item.index); return }
  await stop($, 'completion')
  if (error !== undefined) await fail($, error, fromCommand)
}
async function lookupDuration($: EngineInterface, reciter: Reciter, surah: number, controller: AbortController): Promise<void> {
  try {
    const key = planKey(reciter.key, surah)
    const cached = readDurations(await $.store.get('quran.durations'))
    let ms = cached[key] ?? null
    if (ms === null) {
      const prefix = await readRange($, audioUrl(reciter, surah), 0, 131071, controller)
      ms = durationMs(prefix.bytes, prefix.range.total)
      if (ms === null || ms <= 0) return
      const latest = await $.store.get('quran.durations')
      await $.store.set('quran.durations', trimDurations(latest, key, ms))
    }
    if (runtime.controller !== controller || controller.signal.aborted) return
    const held = await $.state.get(playingRef)
    if (held.value?.moshafKey === reciter.key && held.value.surah === surah && runtime.controller === controller) {
      await $.state.set(playingRef, { ...held.value, durationMs: ms }, { ifVersion: held.version })
    }
  } catch { /* Best effort metadata only: playback never depends on duration. */ }
}
async function tempFolder($: EngineInterface): Promise<{ windows: boolean; temp: string | undefined }> {
  const windows = await $.env.get('OS') === 'Windows_NT'
  const temp = windows ? await $.env.get('TEMP') : await $.env.get('TMPDIR') ?? '/tmp'
  return { windows, temp: temp?.replace(/[\\/]+$/, '') }
}
// The API has no fetch timeout/signal. End our wait and abort pending playback work.
async function fetchTimed($: EngineInterface, url: string, controller: AbortController, init?: HttpInit): Promise<HttpResponse> {
  const timer = new AbortController()
  try {
    return await Promise.race([
      $.http.fetch(url, init),
      $.clock.sleep(15000, { signal: timer.signal }).then(() => {
        runtime.timedOut = controller
        controller.abort()
        throw new Error('Quran request timed out. Retry.')
      }),
    ])
  } finally { timer.abort() }
}
function planFor(reciter: Reciter, surah: number): RecordingPlan | undefined {
  return runtime.plan?.moshafKey === reciter.key && runtime.plan.surah === surah ? runtime.plan : undefined
}
const isStale = (controller: AbortController, token: number): boolean =>
  runtime.controller !== controller || controller.signal.aborted || token !== runtime.generation

async function readRange($: EngineInterface, url: string, start: number, end: number, controller: AbortController, plan?: RecordingPlan): Promise<{ bytes: Uint8Array; range: NonNullable<ReturnType<typeof rangeHeader>> }> {
  if (controller.signal.aborted) throw new Error('Quran stopped.')
  const { windows, temp } = await tempFolder($)
  if (!temp || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end - start + 1 > 2097152) throw new Error(CLIP_ERROR)
  const body = `${temp}/claude-muslim-quran/range-${await $.clock.now()}-${++runtime.probe}.mp3`
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
async function loadPlan($: EngineInterface, reciter: Reciter, surah: number, controller: AbortController, refresh = false): Promise<RecordingPlan> {
  const url = audioUrl(reciter, surah), now = await $.clock.now()
  const raw = await $.store.get('quran.segmentCache')
  const cached = refresh ? undefined : cachedPlan(raw, reciter, surah, url, now)
  if (cached) return cached
  let headers: Record<string, string> = {}, size: number | null = null, duration: number | null = null
  const oldDurations = await $.store.get('quran.durations') as Record<string, unknown> | undefined
  const oldDuration = oldDurations?.[planKey(reciter.key, surah)]
  if (typeof oldDuration === 'number' && Number.isFinite(oldDuration) && oldDuration > 0) duration = oldDuration
  try {
    const response = await fetchTimed($, url, controller, { method: 'HEAD' })
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
        const response = await fetchTimed($, 'https://www.mp3quran.net/api/v3/ayat_timing/reads', controller)
        if (!response.ok) { throw new Error(TIMING_ERROR) }
        runtime.reads = JSON.parse(response.text)
      }
      readId = timingRead(runtime.reads, reciter.server)
      if (readId === null) { throw new Error(TIMING_ERROR) }
      const response = await fetchTimed($, `https://www.mp3quran.net/api/v3/ayat_timing?surah=${surah}&read=${readId}`, controller)
      if (!response.ok) { throw new Error(TIMING_ERROR) }
      segments = timedSegments(JSON.parse(response.text), surah, size, await cbrDuration($, url, size, controller))
      duration = segments.at(-1)!.endMs
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Quran stopped.'); throw error instanceof Error && error.message === CLIP_ERROR ? error : new Error(TIMING_ERROR)
    }
  }
  if (controller.signal.aborted) throw new Error('Quran stopped.')
  const previous = readCache(raw)[planKey(reciter.key, surah)]
  const plan = makePlan(reciter, QURAN_CATALOG.surahs[surah - 1]!, url, size, now, headers, duration, readId, segments, previous)
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

async function play($: EngineInterface, reciter: Reciter, surah: number, fromCommand: CommandRow | false, path: PlayPath = fromCommand ? 'command' : 'pane', index = 0, intent: 'play' | 'select' | 'inspect' = 'play', refresh = false): Promise<void> {
  runtime.retry = { reciter, surah, index, intent }
  if (!isAvailable(reciter.key, surah)) { await fail($, new Error(UNAVAILABLE_ERROR), fromCommand); return }
  const generation = runtime.generation
  await stop($, `replace:${path}`, path === 'auto-advance' ? { key: planKey(reciter.key, surah), index } : undefined)
  if (runtime.generation !== generation + 1) return
  const controller = new AbortController()
  runtime.controller = controller
  const token = runtime.generation
  runtime.preparing = { moshafKey: reciter.key, surah, stage: 'checking' }
  runtime.selectedSegment = index
  if (!planFor(reciter, surah) || refresh) runtime.plan = undefined
  await $.state.set(surahRef, surah)
  await $.state.set(errorRef, null)
  await $.state.set(commandErrorRef, null)
  $.ui.invalidate('ui.render')
  try {
    let plan = await loadPlan($, reciter, surah, controller, refresh)
    if (isStale(controller, token)) return
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
      if (isStale(controller, token)) return
      plan = prepared.plan
      segment = plan.segments[runtime.selectedSegment]!
      source = prepared.source
      if (runtime.prefetch === ready) runtime.prefetch = undefined
    } else source = { url: plan.audioUrl }
    if (isStale(controller, token)) return
    const playing: QuranPlaying = { moshafKey: reciter.key, surah, startedAt: await $.clock.now(), durationMs: segment?.decodedDurationMs ?? segment?.durationMs ?? plan.durationMs, ...(segment ? { segmentIndex: runtime.selectedSegment, segmentCount: plan.segments.length } : {}) }
    runtime.preparing = undefined
    await $.state.set(playingRef, playing)
    if (isStale(controller, token)) return
    let watchdogAborted = false
    const watchdog = $.clock.every(200, () => {
      if (token === runtime.generation || watchdogAborted) return
      watchdogAborted = true
      controller.abort()
    })
    void $.audio.play(source, { signal: controller.signal }).then(
      () => { watchdog.cancel(); return finish($, controller, token, reciter, surah, fromCommand) },
      error => { watchdog.cancel(); return finish($, controller, token, reciter, surah, fromCommand, error) },
    ).catch(error => { watchdog.cancel(); void fail($, error, fromCommand).catch(() => {}) })
    if (!segment && plan.durationMs === null) void lookupDuration($, reciter, surah, controller)
    // An independent handle survives only natural advancement into this exact
    // quarter. Quarter repeat keeps the same quarter ready; it never reads the next one.
    if (isStale(controller, token)) return
    if (segment) {
      if (repeatMode((await $.state.get(repeatRef)).value) === 'segment') prefetchSegment($, plan, runtime.selectedSegment)
      else if (runtime.selectedSegment + 1 < plan.segments.length) prefetchSegment($, plan, runtime.selectedSegment + 1)
    }
    runtime.timer = $.clock.every(1000, () => $.ui.invalidate('ui.render'))
    $.ui.invalidate('ui.render')
  } catch (error) {
    const timedOut = runtime.timedOut === controller && runtime.controller === controller && token === runtime.generation
    if (isStale(controller, token) && !timedOut) return
    if (timedOut) { error = new Error('Quran request timed out. Retry.'); runtime.timedOut = undefined }
    await stop($, 'prepare:failed')
    await fail($, error, fromCommand)
  }
}
async function splitSelected($: EngineInterface): Promise<boolean> {
  return trackSelection(await chosen($), (await $.state.get(surahRef)).value ?? 1).segments.length > 0
}
function trackSelection(reciter: Reciter, surah: number) {
  const plan = planFor(reciter, surah)
  const preparing = runtime.preparing?.moshafKey === reciter.key && runtime.preparing.surah === surah ? runtime.preparing : undefined
  return { segments: plan?.segments.map(segment => ({ ...segment })) ?? [], selectedSegment: runtime.selectedSegment, durationMs: plan?.durationMs ?? null, loading: preparing?.stage ?? null }
}
// /quran on the desktop: the Muslim pane, with the Quran card unfolded.
const paneFoldsRef = { plugin: 'muslim', key: 'paneFolds' } as const
async function showCard($: EngineInterface): Promise<void> {
  const folds = (await $.state.get(paneFoldsRef)).value
  if (folds?.quran) await $.state.set(paneFoldsRef, { ...folds, quran: false })
  const placed = await $.ui.open({ id: 'muslim', title: '☾ Muslim', focus: true })
  if (!placed.isPlaced) throw new Error(placed.reason)
  $.ui.invalidate('ui.render')
}
// /quran off the desktop: the player lives in the Muslim pane only.
const DESKTOP_ONLY = 'Quran is a desktop feature: open the Muslim pane in the Claude desktop app.'
async function action($: EngineInterface, command: Command, fromCommand: CommandRow | false): Promise<string> {
  const generation = runtime.generation
  if (command.kind === 'stop') { runtime.retry = undefined; await stop($, fromCommand ? 'command:stop' : 'pane:stop'); await $.state.set(errorRef, null); return 'Quran stopped.' }
  if (command.kind === 'repeat' || command.kind === 'repeat-segment') {
    const target = command.kind === 'repeat' ? 'surah' : 'segment'
    if (target === 'segment' && !(await splitSelected($))) return 'Quarter repeat works only while a split surah is selected.'
    const repeat = toggleRepeat(repeatMode((await $.state.get(repeatRef)).value), target)
    await $.state.set(repeatRef, repeat)
    $.ui.invalidate('ui.render')
    return `Quran repeat ${repeat === 'off' ? 'off' : repeat === 'surah' ? 'on' : 'on: current quarter'}.`
  }
  await $.state.set(errorRef, null)
  $.ui.invalidate('ui.render')
  let reciter = await chosen($)
  const playing = (await $.state.get(playingRef)).value
  const current = await selectedSurah($, reciter)
  if (generation !== runtime.generation) return 'Quran stopped.'
  if (command.kind === 'open') {
    const surface = await $.session.surface() ?? 'desktop'
    if (surface !== 'desktop') return DESKTOP_ONLY
    await showCard($)
    if (!playing && !planFor(reciter, current)) await play($, reciter, current, fromCommand, 'command', 0, 'inspect')
    return 'Muslim pane opened with القرآن الكريم unfolded (desktop only).'
  }
  if (command.kind === 'reciter') {
    const choice = matchReciter(command.value, QURAN_CATALOG.reciters)
    if (!choice) return 'Reciter not found or ambiguous.'
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
    const retry = runtime.retry ?? { reciter, surah: current, index: runtime.selectedSegment, intent: 'select' as const }
    await play($, retry.reciter, retry.surah, fromCommand, fromCommand ? 'command' : 'pane', retry.index, retry.intent, true)
    return (await $.state.get(errorRef)).value ?? 'Quran recording checked again.'
  }
  if ((command.kind === 'next' || command.kind === 'prev') && planFor(reciter, current)?.segments.length) {
    const index = runtime.selectedSegment + (command.kind === 'next' ? 1 : -1)
    // Past the first or last quarter, prev and next move to the neighbouring surah.
    if (index >= 0 && index < planFor(reciter, current)!.segments.length) {
      await play($, reciter, current, fromCommand, fromCommand ? 'command' : 'pane', index)
      return (await $.state.get(errorRef)).value ?? 'Quran segment selected.'
    }
  }
  const surah = command.kind === 'play' ? matchSurah(command.value, QURAN_CATALOG.surahs)?.id : nextAvailable(reciter.key, current, command.kind === 'next' ? 1 : -1)
  if (surah === undefined) return 'Surah not found.'
  if (surah === null) return command.kind === 'prev' ? 'Already at the first surah.' : 'Already at the last surah.'
  if (!isAvailable(reciter.key, surah)) return fail($, new Error(UNAVAILABLE_ERROR), fromCommand)
  await play($, reciter, surah, fromCommand, fromCommand ? 'command' : 'pane', command.kind === 'play' ? command.segmentIndex ?? 0 : 0, 'play')
  const error = (await $.state.get(errorRef)).value
  if (error) return error
  if (runtime.controller?.signal.aborted || runtime.generation !== generation + 1) return 'Quran stopped.'
  return `Quran playing: ${await arabic($, await $.session.surface() ?? 'desktop', QURAN_CATALOG.surahs[surah - 1]!.name)}.`
}
// Serialize user actions; play completions check generation and controller identity.
async function dispatch($: EngineInterface, command: Command, fromCommand: CommandRow | false = false): Promise<string> {
  // Stop must abort now, even if recording preparation is holding the action queue.
  if (command.kind === 'stop') {
    ++runtime.stopEpoch
    return action($, command, fromCommand).catch(error => fail($, error, fromCommand))
  }
  const requestedEpoch = runtime.stopEpoch
  // Refuse known picks before replacement or any track work.
  if (command.kind === 'play') {
    const reciter = await chosen($)
    const key = reciter.key
    const value = latinDigits(command.value)
    const surah = matchSurah(value, QURAN_CATALOG.surahs)?.id
    if (surah !== undefined && Number.isInteger(surah) && surah >= 1 && surah <= 114 && !isAvailable(key, surah)) {
      runtime.retry = { reciter, surah, index: command.kind === 'play' ? command.segmentIndex ?? 0 : 0, intent: 'play' }
      return fail($, new Error(UNAVAILABLE_ERROR), fromCommand)
    }
  }
  if (requestedEpoch !== runtime.stopEpoch) return 'Quran stopped.'
  if (runtime.preparing && command.kind !== 'open' && command.kind !== 'repeat' && command.kind !== 'repeat-segment' && !(command.kind === 'reciter' && !command.value)) { ++runtime.stopEpoch; await stop($, 'prepare:replace') }
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
    const surah = await selectedSurah($, await chosen($))
    await paneAction($, playing || runtime.preparing ? { kind: 'stop' } : { kind: 'play', value: String(surah), segmentIndex: runtime.selectedSegment })
  } catch (error) { await fail($, error) }
}

// The player is ready on the first draw, using only the shipped catalog.
async function panelModel($: EngineInterface, width = 480) {
  const reciter = await chosen($)
  const stored = (await $.state.get(surahRef)).value ?? 1
  const surah = nearestAvailable(reciter.key, stored) ?? stored
  const playing = (await $.state.get(playingRef)).value
  const selection = trackSelection(reciter, surah)
  const repeat = repeatMode((await $.state.get(repeatRef)).value)
  const model = paneModel(QURAN_CATALOG, reciter, surah, playing, await $.clock.now(), width, runtime.generation, 0, false, (await $.state.get(errorRef)).value, selection, repeat)
  return { reciter, playing, selection, model }
}
// What the Muslim pane shows of the player.
async function panelQuran($: EngineInterface): Promise<PanelQuran> {
  const state = await panelModel($)
  const { reciter, playing, selection, model } = state
  const active = playing ? QURAN_CATALOG.reciters.find(r => r.key === playing.moshafKey) ?? reciter : reciter
  const index = playing?.segmentIndex ?? selection.selectedSegment
  return {
    reciter: active.label.replace(' — ', ' · '),
    surah: model.title,
    part: selection.segments.length ? segmentLabel(selection.segments, index) : '',
    segmented: selection.segments.length > 0,
    error: model.error,
    status: model.status,
    isLive: model.playing,
    elapsed: model.elapsed,
    total: model.total,
    progress: model.progress,
    isPlaying: model.playing || !!model.preparing,
    canPrev: model.canPrev !== false,
    canNext: model.canNext !== false,
    repeat: model.repeat,
    avatar: avatarSvg(model.playing, model.avatarElapsedMs, 96),
  }
}
// The rows of one list for the Muslim card's pickers: the Quran feature's own options and search.
async function panelOptions($: EngineInterface, list: PanelList, query: string): Promise<PanelOption[]> {
  const state = await panelModel($)
  return listOptions(state.model, list, query).map(o => ({ value: o.value, label: o.label, number: list === 'segment' ? '' : o.number, selected: o.selected }))
}
// One list pick, from the Muslim card: the same checks and the same actions.
async function pick($: EngineInterface, list: List, value: string): Promise<void> {
  if (!isPickMessage({ act: 'pick', list, value })) return
  // Dispatch surah picks before any track work so known gaps do no network work.
  if (list === 'surah') {
    const surah = Number(value)
    if (Number.isInteger(surah) && surah >= 1 && surah <= 114 && String(surah) === value) await paneAction($, { kind: 'play', value })
    return
  }
  if (list === 'reciter') {
    const index = QURAN_CATALOG.reciters.findIndex(r => r.key === value)
    if (index >= 0) await paneAction($, { kind: 'reciter', value: String(index + 1) })
  } else {
    const reciter = await chosen($)
    const current = (await $.state.get(surahRef)).value ?? 1
    const index = Number(value)
    if (planFor(reciter, current) && Number.isInteger(index) && runtime.plan!.segments[index]) {
      await paneAction($, { kind: 'play', value: String(current), segmentIndex: index })
    }
  }
}
// Connect on footer/pane draws (Quran adds nothing to the footer) and again in the Muslim press's own context.
function connectToPanel($: EngineInterface): void {
  connectBeforeReload(async () => {
    if (!runtime.controller && !runtime.preparing) return
    ++runtime.stopEpoch
    await stop($, 'setting:reload')
    $.ui.toast('Quran stopped: changing a setting reloads the player.')
  })
  connectQuran(() => panelQuran($))
  connectPanelAction('quran-retry', () => paneAction($, { kind: 'retry' }))
  connectPanelAction('quran-toggle', () => togglePlayback($))
  connectPanelAction('quran-prev', () => paneAction($, { kind: 'prev' }))
  connectPanelAction('quran-next', () => paneAction($, { kind: 'next' }))
  connectQuranOptions((list, query) => panelOptions($, list, query))
  connectPanelAction('quran-reciter', value => pick($, 'reciter', value ?? ''))
  connectPanelAction('quran-surah', value => pick($, 'surah', value ?? ''))
  connectPanelAction('quran-segment', value => pick($, 'segment', value ?? ''))
  connectPanelAction('quran-repeat-surah', () => paneAction($, { kind: 'repeat' }))
  connectPanelAction('quran-repeat-segment', () => paneAction($, { kind: 'repeat-segment' }))
}

export const install = (on: On, _options: Options) => {
  on('command.run', { command: 'muslim', args: /^\s*$/ }, ($, e, next) => {
    connectToPanel($)
    return next(e)
  }).catch(($, e, next) => next(e))
  on('ui.render', { component: 'Pane', requestId: 'muslim' }, ($, e, next) => {
    connectToPanel($)
    return next(e)
  })
  on('ui.message', { element: 'muslim-pane' }, ($, e, next) => {
    connectToPanel($)
    return next(e)
  })
  // Quran has no footer chip (the footer is ☾ Muslim and the prayer line); its draws still connect the panel feeds.
  on('ui.render', { component: 'SessionMode' }, ($, e, next) => {
    connectToPanel($)
    return next(e)
  })
  on('command.run', { command: 'quran' }, async ($, e) => {
    connectToPanel($)
    const row: CommandRow = { args: e.args, text: '' }
    row.text = await dispatch($, { kind: 'open' }, row)
    if (row.error) await $.state.set(commandErrorRef, { args: row.args, text: row.text, message: row.error })
    return { text: row.text }
  }).catch(($, e, next) => next.called ? next(e) : { text: commandFailure(e.command, e.args, next.error) })
  on('ui.render', { component: 'CommandOutput', props: { command: 'quran' } }, async ($, e, next) => {
    const error = (await $.state.get(commandErrorRef)).value
    if (!error || error.args !== e.props.args || error.text !== e.props.text) return next(e)
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>{error.message}</Text>
  })
}
