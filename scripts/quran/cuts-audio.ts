// Shared developer-only audio path for the catalog tool and local benchmark.
import { spawn } from 'node:child_process'
import { CUT_OPTIONS as O, alignOffset, chooseCut, chooseNearestCut, confidentCut, cutPauses, frameCut, windowFrames, type Pause, type StoredCut, type WindowFrame } from '../../src/features/quran/cuts.ts'
import { cbrByte, SEGMENT_LEAD_MS, type CbrStream } from '../../src/features/quran/segment-mp3.ts'
export type RangeReader = (start: number, end: number) => Promise<Uint8Array>
export type AudioWindow = { bytes: Uint8Array; frames: WindowFrame[]; start: number }
const message = (error: unknown) => error instanceof Error ? error.message : String(error)
// No shell interpolation. Consume stderr too, cap stdout, kill a hung decoder.
export function ffmpeg(args: string[], bytes?: Uint8Array): Promise<Uint8Array> {
  return new Promise((done, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const chunks: Uint8Array[] = [], errors: Uint8Array[] = []
    let length = 0, errorBytes = 0, failure: Error | null = null
    const stop = (error: Error) => { failure ??= error; child.kill('SIGKILL') }
    const timer = setTimeout(() => stop(new Error('ffmpeg decode timed out')), O.decodeTimeoutMs)
    child.on('error', error => { clearTimeout(timer); reject(new Error(`ffmpeg unavailable: install ffmpeg and ensure it is on PATH (${message(error)})`)) })
    child.stdin.on('error', error => { failure ??= error })
    child.stdout.on('data', chunk => {
      length += chunk.length
      if (length > O.maxPcmBytes) stop(new Error('ffmpeg exceeded bounded PCM size'))
      else chunks.push(chunk)
    })
    child.stderr.on('data', chunk => { if (errorBytes < 8192) { errors.push(chunk.slice(0, 8192 - errorBytes)); errorBytes += chunk.length } })
    child.on('close', code => {
      clearTimeout(timer)
      if (failure || code !== 0) { reject(failure ?? new Error(`ffmpeg exit ${code}: ${errors.map(c => new TextDecoder().decode(c)).join('')}`)); return }
      const output = new Uint8Array(length)
      let at = 0
      for (const chunk of chunks) { output.set(chunk, at); at += chunk.length }
      done(output)
    })
    child.stdin.end(bytes)
  })
}
export async function decode(window: AudioWindow): Promise<Int16Array> {
  const first = window.frames[0]!, last = window.frames.at(-1)!
  // Starting at a real frame removes demux resync ambiguity. first_pts=0 pads
  // initial reservoir-dependent decoder frames instead of moving the PCM clock.
  const pcm = await ffmpeg(['-hide_banner', '-loglevel', 'error', '-f', 'mp3', '-i', 'pipe:0', '-map', '0:a:0', '-ac', '1', '-af', `aresample=${O.sampleRate}:async=1:first_pts=0`, '-ar', String(O.sampleRate), '-f', 's16le', 'pipe:1'], window.bytes.slice(first.offset, last.endOffset))
  const expectedMs = last.ms + last.seconds * 1000 - first.ms
  if (pcm.length % 2 || Math.abs(pcm.length / 2 * 1000 / O.sampleRate - expectedMs) > O.pcmToleranceMs) throw new Error('Decoded PCM clock does not match the MP3 frame clock')
  const samples = new Int16Array(pcm.length / 2), view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true)
  return samples
}
export async function audioWindow(readRange: RangeReader, sizeBytes: number, stream: CbrStream, targetMs: number, radius: number): Promise<AudioWindow> {
  const start = Math.max(stream.audioStart, cbrByte(stream, targetMs - radius - SEGMENT_LEAD_MS))
  const end = Math.min(sizeBytes - 1, cbrByte(stream, targetMs + radius + O.clipMs) + O.syncBytes - 1)
  const bytes = await readRange(start, end), frames = windowFrames(bytes, start, stream)
  if (frames.length < 2) throw new Error('No decodable frame window')
  return { bytes, frames, start }
}
export async function windowPauses(window: AudioWindow, mode: 'before' | 'after' = 'after'): Promise<Pause[]> {
  const samples = await decode(window), origin = window.frames[0]!.ms
  // Preserve the accurate original intervals. The lower percentile supplies
  // missing pauses in windows whose original speech/floor contrast was weak.
  return cutPauses(samples, O.sampleRate, mode).map(p => ({ startMs: p.startMs + origin, endMs: p.endMs + origin }))
}
export type WindowEvidence = { window: AudioWindow; pauses: Pause[] }
export type CutScan = WindowEvidence & { cut: StoredCut | null; escalated: boolean; offsetMs: number | null }
export async function scanCut(targetMs: number, plannedStarts: readonly number[], load: (radius: number) => Promise<WindowEvidence>, mode: 'before' | 'after' = 'after', priorOffsetMs = 0): Promise<CutScan> {
  let result: CutScan | null = null, narrow: CutScan | null = null
  for (const radius of [O.windowMs, O.wideWindowMs]) {
    const { window, pauses } = await load(radius), origin = window.frames[0]!.ms
    const credible = pauses.filter(p => p.startMs >= origin + SEGMENT_LEAD_MS && frameCut(window.frames, (p.startMs + p.endMs) / 2, targetMs, p) !== null)
    const options = { searchMs: radius === O.windowMs ? O.searchMs : [...O.searchMs, O.wideWindowMs] }
    const alignmentOptions = { windowStartMs: origin + SEGMENT_LEAD_MS, windowEndMs: window.frames.at(-1)!.ms, priorOffsetMs }
    const alignment = mode === 'after' && radius === O.wideWindowMs ? alignOffset(credible, plannedStarts, targetMs, alignmentOptions) : null
    const chosen = mode === 'before' ? chooseNearestCut(credible, targetMs, options) : chooseCut(credible, targetMs, { ...options, ...(radius === O.wideWindowMs ? { plannedStarts, ...alignmentOptions } : {}) })
    const pause = chosen && credible.find(p => chosen.ms >= p.startMs && chosen.ms <= p.endMs)
    const cut = chosen && pause ? frameCut(window.frames, chosen.ms, targetMs, pause) : null
    result = { window, pauses, cut, escalated: radius === O.wideWindowMs, offsetMs: alignment && chosen && Math.abs(chosen.ms - targetMs - alignment.offsetMs) <= O.alignmentSnapMs ? alignment.offsetMs : null }
    if (mode === 'after' && radius === O.wideWindowMs && narrow?.cut) {
      // Do not move a good narrow boundary just because the wider window's
      // adaptive threshold changed the edges of that same pause.
      if (cut && Math.abs(cut.ms - narrow.cut.ms) <= O.preservePauseChangeMs && pauses.some(p => cut.ms >= p.startMs && cut.ms <= p.endMs && narrow!.cut!.ms >= p.startMs && narrow!.cut!.ms <= p.endMs)) return { ...narrow, escalated: true, offsetMs: result.offsetMs }
      if (alignment && Math.abs(narrow.cut.shiftMs) <= O.confidentShiftMs && (Math.abs(alignment.offsetMs) <= O.confidentShiftMs || alignment.boundaries < O.alignmentOverrideMinBoundaries)) return { ...narrow, escalated: true }
    }
    if (cut && (mode === 'before' || radius === O.wideWindowMs || Math.abs(priorOffsetMs) <= O.confidentShiftMs && confidentCut(chosen))) return result
    if (radius === O.windowMs) narrow = result
  }
  return !result!.cut && narrow?.cut ? { ...narrow, escalated: true } : result!
}
