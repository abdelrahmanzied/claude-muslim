// Developer tool only: Node 24 + ffmpeg. Never imported by the hooks module.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { CUT_OPTIONS as O, cutsAlgorithm, cutsPlan, targetsHash, windowFrames, type CutsCatalog, type StoredCut, type SurahCuts } from '../../src/features/quran/cuts.ts'
import { audioWindow, ffmpeg, scanCut, windowPauses, type AudioWindow } from './cuts-audio.ts'
import { QURAN_SUPPORT } from '../../src/features/quran/reciter-support.ts'
import { QURAN_QUARTER_BOUNDARIES, QURAN_QUARTER_MAP_VERSION } from '../../src/features/quran/quarter-boundaries.ts'
import { cbrStream, SEGMENT_LEAD_MS, type CbrStream } from '../../src/features/quran/segment-mp3.ts'
import { AUDIO_LIMIT_BYTES, fileSize, timedSegments } from '../../src/features/quran/segments.ts'

const API = 'https://www.mp3quran.net/api/v3'
const DEFAULT_OUT = resolve('src/features/quran/reciter-cuts.ts')
const USER_AGENT = 'muslim-quran-cuts/1.0 (developer silence audit; bounded audio ranges only)'
const started = Date.now(), counts = { head: 0, timings: 0, range: 0, retries: 0, bytes: 0, scanned: 0, reused: 0, failed: 0, nonCbr: 0, fallback: 0, cutsScanned: 0, escalated: 0 }
const message = (error: unknown) => error instanceof Error ? error.message : String(error)
const sleep = (ms: number) => new Promise<void>(done => setTimeout(done, ms))
type Flags = { only: Set<string> | null; out: string; concurrency: number; force: boolean; clips: string | null }
type Identity = { sizeBytes: number; etag: string | null }

function flags(): Flags {
  const result: Flags = { only: null, out: DEFAULT_OUT, concurrency: O.concurrency, force: false, clips: null }
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!
    if (flag === '--force') { result.force = true; continue }
    if (!['--only', '--out', '--concurrency', '--clips'].includes(flag)) throw new Error(`Unknown flag: ${flag}. Usage: node --experimental-strip-types scripts/quran/cuts.ts [--only key,...] [--out path] [--concurrency 4] [--force] [--clips dir]`)
    const value = args[++i]
    if (!value || value.startsWith('--')) throw new Error(`Expected a value for ${flag}`)
    if (flag === '--only') {
      const keys = value.split(',')
      if (!keys.every(key => /^[1-9]\d*:[1-9]\d*$/.test(key))) throw new Error('--only expects comma-separated reciter:moshaf keys')
      result.only = new Set(keys)
    } else if (flag === '--out') result.out = resolve(value)
    else if (flag === '--clips') result.clips = resolve(value)
    else {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 1 || n > O.maxConcurrency) throw new Error(`--concurrency must be an integer from 1 to ${O.maxConcurrency}`)
      result.concurrency = n
    }
  }
  return result
}

async function request<T>(kind: 'head' | 'timings' | 'range', url: string, init: RequestInit, consume: (response: Response) => Promise<T>): Promise<T> {
  let failure: unknown
  for (let attempt = 0; attempt <= O.retries; attempt++) {
    if (attempt) { counts.retries++; await sleep(O.backoffMs * 2 ** (attempt - 1)) }
    counts[kind]++
    let response: Response | undefined
    try {
      response = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'identity', ...init.headers }, signal: AbortSignal.timeout(O.timeoutMs) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await consume(response)
    } catch (error) { failure = error }
    finally { if (response?.body && !response.bodyUsed) await response.body.cancel().catch(() => undefined) }
  }
  throw new Error(`${kind} ${url}: ${message(failure)}`)
}
async function body(response: Response, limit: number, exact = false): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Missing response body')
  const bytes = new Uint8Array(limit)
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      counts.bytes += value.length
      if (length + value.length > limit) throw new Error('Response exceeded bounded body size')
      bytes.set(value, length); length += value.length
    }
  } finally { await reader.cancel().catch(() => undefined) }
  if (exact && length !== limit) throw new Error('Truncated range')
  return bytes.slice(0, length)
}
const head = (url: string) => request('head', url, { method: 'HEAD' }, async response => {
  const sizeBytes = fileSize({ 'content-length': response.headers.get('content-length') ?? '' })
  if (sizeBytes === null) throw new Error('Missing or invalid content-length')
  if (response.headers.get('accept-ranges')?.toLowerCase() !== 'bytes') throw new Error('Source does not advertise byte ranges')
  return { sizeBytes, etag: response.headers.get('etag') } as Identity
})
const timings = (surah: number, readId: number) => request('timings', `${API}/ayat_timing?surah=${surah}&read=${readId}`, {}, async response => JSON.parse(new TextDecoder().decode(await body(response, O.timingBytes))) as unknown)
async function range(url: string, source: Identity, start: number, end: number): Promise<Uint8Array> {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end >= source.sizeBytes || end < start || end - start + 1 >= source.sizeBytes) throw new Error('Invalid or whole-file Range')
  return request('range', url, { headers: { Range: `bytes=${start}-${end}`, ...(source.etag && !source.etag.startsWith('W/') ? { 'If-Match': source.etag } : {}) } }, async response => {
    // Reject ignored ranges and changed files before consuming an audio body.
    if (response.status !== 206 || response.headers.get('content-range') !== `bytes ${start}-${end}/${source.sizeBytes}`) throw new Error('Ignored or inconsistent Range')
    if (response.headers.get('etag') !== source.etag) throw new Error('ETag changed during scan')
    const length = response.headers.get('content-length'), encoding = response.headers.get('content-encoding')
    if (length !== null && Number(length) !== end - start + 1 || encoding && encoding !== 'identity') throw new Error('Invalid range content-length or encoding')
    return body(response, end - start + 1, true)
  })
}

async function clip(dir: string, key: string, surah: number, segment: number, cut: StoredCut, url: string, source: Identity, stream: CbrStream, held?: AudioWindow): Promise<void> {
  let window = held
  if (!window || window.frames[0]!.ms > cut.ms - O.clipMs || window.frames.at(-1)!.ms < cut.ms + O.clipMs) window = await audioWindow((a, b) => range(url, source, a, b), source.sizeBytes, stream, cut.ms, O.clipMs)
  const first = window.frames.find(f => f.ms >= cut.ms - O.clipMs) ?? window.frames[0]!
  const last = window.frames.find(f => f.ms >= cut.ms + O.clipMs) ?? window.frames.at(-1)!
  await mkdir(dir, { recursive: true })
  await writeFile(resolve(dir, `${key}_${surah}_${segment}_${cut.shiftMs}.mp3`), window.bytes.slice(first.offset, last.offset))
}

async function previous(out: string): Promise<{ text: string; catalog: CutsCatalog } | null> {
  let text: string
  try { text = await readFile(out, 'utf8') }
  catch (error) { if ((error as { code?: string }).code === 'ENOENT') return null; throw error }
  const module = await import(pathToFileURL(out).href) as { QURAN_CUTS_VERSION: unknown; QURAN_CUTS: CutsCatalog }
  if (module.QURAN_CUTS_VERSION !== 1 || !module.QURAN_CUTS || typeof module.QURAN_CUTS !== 'object') throw new Error('Existing output is not a version-1 cuts catalog')
  return { text, catalog: module.QURAN_CUTS }
}
function generated(catalog: CutsCatalog, out: string, partial: boolean): string {
  let source = relative(dirname(out), resolve('src/features/quran/cuts.ts')).replaceAll('\\', '/')
  if (!source.startsWith('.')) source = './' + source
  const lines = Object.keys(catalog).sort().flatMap(key => [`  ${JSON.stringify(key)}: {`, ...Object.keys(catalog[key]!).map(Number).sort((a, b) => a - b).map(surah => `    ${surah}: ${JSON.stringify(catalog[key]![surah])},`), '  },'])
  return `// Generated by scripts/quran/cuts.ts. Do not edit.\n// Regenerate from the repo root: node --experimental-strip-types scripts/quran/cuts.ts\n${partial ? '// Partial catalog from --only; do not ship as the complete catalog.\n' : ''}import type { CutsCatalog } from ${JSON.stringify(source)}\n\nexport const QURAN_CUTS_VERSION = 1\nexport const QURAN_CUTS_MAP_VERSION = ${QURAN_QUARTER_MAP_VERSION}\nexport const QURAN_CUTS: CutsCatalog = {\n${lines.join('\n')}\n}\n`
}
const diagnostics: { key: string; surah: number; segment: number; plannedMs: number; cut: StoredCut | null }[] = []
async function scan(key: string, surah: number, old: SurahCuts | undefined, flags: Flags): Promise<SurahCuts> {
  const recording = QURAN_SUPPORT[key]!, readId = recording.timingReadId
  if (readId === null) throw new Error(`Split recording ${key} has no timing read`)
  const url = `${recording.server}${String(surah).padStart(3, '0')}.mp3`
  const source = await head(url)
  if (source.sizeBytes < AUDIO_LIMIT_BYTES) throw new Error(`${key} s${surah} no longer needs splitting; regenerate support first`)
  const rows = await timings(surah, readId), prefix = await range(url, source, 0, O.prefixBytes - 1), stream = cbrStream(prefix)
  const duration = stream ? Math.round((source.sizeBytes - stream.audioStart) * 8000 / stream.bitrate) : null
  const segments = timedSegments(rows, surah, source.sizeBytes, duration), planHash = targetsHash(segments)
  let entry: SurahCuts = { ...source, readId, server: recording.server, mapVersion: QURAN_QUARTER_MAP_VERSION, planHash, algorithm: cutsAlgorithm(), segments, first: null, last: null, cuts: segments.slice(1).map(() => null) }
  if (!flags.force && source.etag && old && old.algorithm === entry.algorithm && old.sizeBytes === source.sizeBytes && old.etag === source.etag && old.mapVersion === entry.mapVersion && old.readId === readId && old.server === recording.server && old.planHash === planHash && old.unresolved !== 'scan-error') {
    entry = old; counts.reused++
    if (flags.clips && stream) for (const [i, cut] of entry.cuts.entries()) if (cut) await clip(flags.clips, key, surah, i + 1, cut, url, source, stream)
  } else if (!stream) { entry = { ...entry, unresolved: 'non-cbr' }; counts.scanned++ }
  else {
    counts.scanned++
    const tailStart = Math.max(stream.audioStart, source.sizeBytes - O.tailBytes)
    const tail = await range(url, source, tailStart, source.sizeBytes - 1), frames = windowFrames(tail, tailStart, stream), last = frames.at(-1)
    if (!last || tail.length - last.endOffset !== 0 && !(tail.length - last.endOffset === 128 && String.fromCharCode(...tail.slice(last.endOffset, last.endOffset + 3)) === 'TAG')) throw new Error('Unrecognized or truncated MP3 tail')
    const cuts: (StoredCut | null)[] = []
    let priorOffsetMs = 0
    for (const segment of segments.slice(1)) {
      let cut: StoredCut | null = null
      counts.cutsScanned++
      try {
        const result = await scanCut(segment.startMs, (Array.isArray(rows) ? rows : (rows as { ayat_timing: { start_time: number }[] }).ayat_timing).map((r: { start_time: number }) => r.start_time), async radius => {
          if (radius === O.wideWindowMs) counts.escalated++
          const window = await audioWindow((a, b) => range(url, source, a, b), source.sizeBytes, stream, segment.startMs, radius)
          return { window, pauses: await windowPauses(window) }
        }, 'after', priorOffsetMs)
        if (result.offsetMs !== null) priorOffsetMs = result.offsetMs
        cut = result.cut
        if (cut && flags.clips) await clip(flags.clips, key, surah, segment.id, cut, url, source, stream, result.window)
      } catch (error) { console.warn(`${key} s${surah} segment ${segment.id}: ${message(error)}`) }
      // Never reorder cuts if a very short neighbouring segment shares a pause.
      const prior = cuts.at(-1)
      if (cut && (cut.ms <= 0 || cut.ms >= last.ms || prior && (cut.byte <= prior.byte || cut.startByte <= prior.byte))) cut = null
      cuts.push(cut)
    }
    entry = { ...entry, first: { byte: stream.audioStart, ms: 0 }, last: { byte: tailStart + last.endOffset, ms: last.ms + last.seconds * 1000 }, cuts }
    // The acoustic shift can invalidate a near-limit segment. Fall back rather
    // than writing an apparently complete plan the runtime cannot play.
    if (cuts.every(c => c !== null) && !cutsPlan(entry, source.sizeBytes, source.etag, entry.mapVersion)) {
      entry = { ...entry, unresolved: 'scan-error' }
      console.warn(`${key} s${surah}: verified plan failed size/order/source validation; fallback required`)
    }
  }
  if (entry.unresolved === 'non-cbr') counts.nonCbr++
  if (!cutsPlan(entry, source.sizeBytes, source.etag, entry.mapVersion)) counts.fallback++
  for (const [i, cut] of entry.cuts.entries()) diagnostics.push({ key, surah, segment: i + 1, plannedMs: segments[i + 1]!.startMs, cut })
  return entry
}

function summary(jobs: number): void {
  const resolved = diagnostics.filter(d => d.cut), buckets = [0, 0, 0, 0, 0]
  for (const { cut } of resolved) { const shift = Math.abs(cut!.shiftMs); buckets[shift < 500 ? 0 : shift < 1500 ? 1 : shift < 3000 ? 2 : shift < 6000 ? 3 : 4]!++ }
  console.log(`Surahs: ${jobs}; scanned ${counts.scanned}; reused ${counts.reused}; failed ${counts.failed}; non-CBR ${counts.nonCbr}; runtime fallback ${counts.fallback + counts.failed}. Cuts: ${diagnostics.length}; resolved ${resolved.length}; unresolved ${diagnostics.length - resolved.length} (plus ${counts.failed} failed surahs).`)
  console.log(`|shift| buckets <0.5s/<1.5s/<3s/<6s/≥6s: ${buckets.join('/')}`)
  console.log(`Wide windows: ${counts.escalated}/${counts.cutsScanned} newly scanned cuts (${counts.cutsScanned ? (100 * counts.escalated / counts.cutsScanned).toFixed(1) : '0.0'}%). Narrow pass first; one wide window only when not confident.`)
  const line = (d: typeof diagnostics[number]) => `${d.key}/s${d.surah}/segment${d.segment}: ${d.plannedMs}→${d.cut ? d.cut.ms.toFixed(2) : 'unresolved'}ms${d.cut ? ` (shift ${d.cut.shiftMs}ms; pause ${d.cut.pauseMs.toFixed(0)}ms)` : ''}`
  console.log('20 largest shifts:')
  for (const d of resolved.sort((a, b) => Math.abs(b.cut!.shiftMs) - Math.abs(a.cut!.shiftMs) || a.key.localeCompare(b.key) || a.surah - b.surah || a.segment - b.segment).slice(0, 20)) console.log(line(d))
  const minshawi = diagnostics.filter(d => d.key === '112:112' && d.surah === 9).sort((a, b) => Math.abs(a.plannedMs - 3235000) - Math.abs(b.plannedMs - 3235000))[0]
  if (minshawi) console.log(`Minshawi cut nearest 3235s: ${line(minshawi)}`)
  for (const d of diagnostics.filter(d => d.surah === 9 && /حذيف|Hudhaifi/i.test(QURAN_SUPPORT[d.key]!.name)).sort((a, b) => a.key.localeCompare(b.key) || a.segment - b.segment)) console.log(`Hudhaifi: ${line(d)}`)
}
async function main(): Promise<void> {
  const f = flags()
  await ffmpeg(['-version'])
  if (f.only) for (const key of f.only) if (!QURAN_SUPPORT[key]) throw new Error(`Unknown recording: ${key}`)
  const old = await previous(f.out)
  const all = Object.keys(QURAN_SUPPORT).sort().flatMap(key => Object.keys(QURAN_SUPPORT[key]!.split).map(Number).sort((a, b) => a - b).map(surah => ({ key, surah })))
  const jobs = all.filter(j => !f.only || f.only.has(j.key))
  if (f.only && f.out === DEFAULT_OUT && all.some(j => !f.only!.has(j.key) && !old?.catalog[j.key]?.[j.surah])) throw new Error('A partial first run cannot replace the shipped catalog. Use --out /tmp/quran-cuts.ts, or run without --only.')
  const estimatedCuts = jobs.reduce((n, j) => n + QURAN_QUARTER_BOUNDARIES[j.surah]!.length - 1, 0)
  const overhead = jobs.length * (O.prefixBytes + O.tailBytes)
  const seconds = (2 * O.windowMs + SEGMENT_LEAD_MS + O.clipMs) / 1000
  const baseline = overhead + estimatedCuts * (seconds * O.estimateBitrate / 8 + O.syncBytes)
  const wideExtra = estimatedCuts * ((2 * O.wideWindowMs + SEGMENT_LEAD_MS + O.clipMs) / 1000 * O.estimateBitrate / 8 + O.syncBytes)
  const worst = overhead + estimatedCuts * ((seconds + (2 * O.wideWindowMs + SEGMENT_LEAD_MS + O.clipMs) / 1000) * O.estimateMaxBitrate / 8 + 2 * O.syncBytes)
  console.log(`Checking ${jobs.length} split surahs; concurrency ${f.concurrency}. Estimated audio download at 128kbps: ${(baseline / 1024 ** 3).toFixed(2)} GiB + ${(wideExtra / 1024 ** 3).toFixed(2)} GiB × wide fraction (${estimatedCuts} quarter cuts). Narrow first, then wide only when not confident.`)
  console.log(`Wide-window scenarios: ${O.estimateWideFractions.map(fraction => `${fraction * 100}%=${((baseline + wideExtra * fraction) / 1024 ** 3).toFixed(2)} GiB`).join('; ')}. 320kbps/every cut widened: ${(worst / 1024 ** 3).toFixed(2)} GiB. Extra ayah subdivisions, retries, timing JSON and clips add traffic; reuse skips audio windows and tail probes.`)
  const catalog: Record<string, Partial<Record<number, SurahCuts>>> = {}
  // Partial output keeps only still-supported, unselected existing entries.
  if (f.only && old) for (const j of all) if (!f.only.has(j.key) && old.catalog[j.key]?.[j.surah]) (catalog[j.key] ??= {})[j.surah] = old.catalog[j.key]![j.surah]!
  let cursor = 0, done = 0
  const progress = setInterval(() => console.log(`Progress ${done}/${jobs.length}; reused ${counts.reused}; downloaded ${(counts.bytes / 1024 ** 2).toFixed(1)} MiB`), O.progressMs)
  try {
    await Promise.all(Array.from({ length: f.concurrency }, async () => {
      for (;;) {
        const job = jobs[cursor++]
        if (!job) return
        try { (catalog[job.key] ??= {})[job.surah] = await scan(job.key, job.surah, old?.catalog[job.key]?.[job.surah], f) }
        catch (error) {
          counts.failed++; console.warn(`${job.key} s${job.surah}: ${message(error)}`)
          // Drop an old result after a failed refresh: its identity is unverified.
          const r = QURAN_SUPPORT[job.key]!
          ;(catalog[job.key] ??= {})[job.surah] = { sizeBytes: r.split[job.surah]!, etag: null, readId: r.timingReadId!, server: r.server, mapVersion: QURAN_QUARTER_MAP_VERSION, planHash: targetsHash([]), segments: [], first: null, last: null, cuts: [], unresolved: 'scan-error' }
        }
        done++
      }
    }))
  } finally { clearInterval(progress) }
  summary(jobs.length)
  const partial = all.some(j => !catalog[j.key]?.[j.surah])
  const text = generated(catalog, f.out, partial)
  if (text === old?.text) console.log(`Unchanged: ${f.out}`)
  else {
    await mkdir(dirname(f.out), { recursive: true })
    await writeFile(f.out + '.tmp', text, 'utf8'); await rename(f.out + '.tmp', f.out)
    console.log(`Wrote ${Object.keys(catalog).length} recordings: ${f.out}`)
  }
  if (counts.failed) process.exitCode = 1
}
try { await main() }
catch (error) { console.error(message(error)); process.exitCode = 1 }
finally { console.log(`Downloaded ${counts.bytes} bytes (${(counts.bytes / 1024 ** 3).toFixed(3)} GiB); elapsed ${((Date.now() - started) / 1000).toFixed(1)}s; attempts ${JSON.stringify(counts)} (fetch follows redirects).`) }
