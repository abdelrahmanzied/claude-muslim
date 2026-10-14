// Developer tool only: Node 24. Never imported by hooks/register.tsx.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { audioUrl, filterReciters } from '../../src/features/quran/catalog.ts'
import { cbrStream } from '../../src/features/quran/segment-mp3.ts'
import { AUDIO_LIMIT_BYTES, fileSize } from '../../src/features/quran/segments.ts'
import { classifyRecording, timingRead, type RecordingSupport, type SurahProbe, type UnavailableReason } from '../../src/features/quran/support.ts'

const API = 'https://www.mp3quran.net/api/v3'
const DEFAULT_OUT = resolve('src/features/quran/reciter-support.ts')
const CONCURRENCY = 6
const PREFIX_BYTES = 128 * 1024
const TIMEOUT_MS = 15000
const USER_AGENT = 'muslim-quran-support/1.0 (developer catalog audit; HEAD and 128-KiB ranges only)'
const started = Date.now()
const requests = { catalog: 0, head: 0, timings: 0, prefix: 0, retries: 0 }
type RequestKind = 'catalog' | 'head' | 'timings' | 'prefix'
const pause = (ms: number) => new Promise<void>(done => setTimeout(done, ms))
const message = (error: unknown) => error instanceof Error ? `${error.message}${error.cause instanceof Error ? `: ${error.cause.message}` : ''}` : String(error)

async function request<T>(kind: RequestKind, url: string, init: RequestInit, consume: (response: Response) => Promise<T>): Promise<T> {
  let failure: unknown
  // Initial attempt plus three retries. A worker keeps its slot during backoff.
  for (let attempt = 0; attempt <= 3; attempt++) {
    if (attempt) { requests.retries++; await pause(500 * 2 ** (attempt - 1)) }
    requests[kind]++
    let response: Response | undefined
    try {
      response = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'identity', ...init.headers }, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await consume(response)
    } catch (error) { failure = error }
    finally { if (response?.body && !response.bodyUsed) await response.body.cancel().catch(() => undefined) }
  }
  throw new Error(`${kind} ${url}: ${message(failure)}`)
}

const json = (kind: 'catalog' | 'timings', url: string) => request(kind, url, {}, response => response.json() as Promise<unknown>)
const head = (url: string) => request('head', url, { method: 'HEAD' }, async response => {
  const size = fileSize({ 'content-length': response.headers.get('content-length') ?? '' })
  if (size === null) throw new Error('Missing or invalid content-length')
  return size
})
async function duration(url: string, size: number): Promise<number | null> {
  const bytes = await request('prefix', url, { headers: { Range: `bytes=0-${PREFIX_BYTES - 1}` } }, async response => {
    // Reject a server that ignores Range BEFORE consuming its body.
    if (response.status !== 206 || response.headers.get('content-range') !== `bytes 0-${PREFIX_BYTES - 1}/${size}`) throw new Error('Ignored or inconsistent Range')
    const length = response.headers.get('content-length')
    if (length !== null && Number(length) !== PREFIX_BYTES) throw new Error('Invalid prefix content-length')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Missing prefix body')
    const prefix = new Uint8Array(PREFIX_BYTES)
    let count = 0
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (count + value.length > PREFIX_BYTES) throw new Error('Prefix exceeded 128 KiB')
        prefix.set(value, count); count += value.length
      }
    } finally { await reader.cancel().catch(() => undefined) }
    if (count !== PREFIX_BYTES) throw new Error('Truncated prefix')
    return prefix
  })
  const stream = cbrStream(bytes)
  return stream && size > stream.audioStart ? Math.round((size - stream.audioStart) * 8000 / stream.bitrate) : null
}

function flags(): { only: Set<string> | null; out: string } {
  let only: Set<string> | null = null, out = DEFAULT_OUT
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const flag = args[i], value = args[++i]
    if (!value || value.startsWith('--')) throw new Error(`Expected a value for ${flag}`)
    if (flag === '--only') {
      const keys = value.split(',')
      if (!keys.every(key => /^[1-9]\d*:[1-9]\d*$/.test(key))) throw new Error('--only expects comma-separated reciter:moshaf keys')
      only = new Set(keys)
    } else if (flag === '--out') out = resolve(value)
    else throw new Error(`Unknown flag: ${flag}. Usage: node --experimental-strip-types scripts/quran/support.ts [--only key,...] [--out path]`)
  }
  return { only, out }
}

async function previous(out: string): Promise<{ text: string; catalog: Readonly<Record<string, RecordingSupport>> } | null> {
  let text: string
  try { text = await readFile(out, 'utf8') }
  catch (error) { if ((error as { code?: string }).code === 'ENOENT') return null; throw error }
  // Only import the developer's own existing generated TypeScript file.
  const module = await import(pathToFileURL(out).href) as { QURAN_SUPPORT_VERSION: unknown; QURAN_SUPPORT: Readonly<Record<string, RecordingSupport>> }
  if (module.QURAN_SUPPORT_VERSION !== 1 || !module.QURAN_SUPPORT || typeof module.QURAN_SUPPORT !== 'object') throw new Error('Existing output is not a version-1 support catalog')
  return { text, catalog: module.QURAN_SUPPORT }
}

function generated(catalog: Readonly<Record<string, RecordingSupport>>, out: string, partial: boolean): string {
  let source = relative(dirname(out), resolve('src/features/quran/support.ts')).replaceAll('\\', '/')
  if (!source.startsWith('.')) source = './' + source
  const lines = Object.keys(catalog).sort().map(key => `  ${JSON.stringify(key)}: ${JSON.stringify(catalog[key])},`)
  return `// Generated by scripts/quran/support.ts. Do not edit.\n// Regenerate from the repo root: node --experimental-strip-types scripts/quran/support.ts\n${partial ? '// Partial catalog from --only; do not ship as the complete catalog.\n' : ''}import type { RecordingSupport } from ${JSON.stringify(source)}\n\nexport const QURAN_SUPPORT_VERSION = 1\nexport const QURAN_SUPPORT: Readonly<Record<string, RecordingSupport>> = {\n${lines.join('\n')}\n}\n`
}

function summary(catalog: Readonly<Record<string, RecordingSupport>>, old: Readonly<Record<string, RecordingSupport>> | undefined): void {
  const reasons: Record<UnavailableReason, number> = { 'no-timing': 0, 'timing-error': 0, 'clip-too-big': 0, unreachable: 0 }
  let whole = 0, split = 0, noRead = 0
  for (const [key, recording] of Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b))) {
    const splitCount = Object.keys(recording.split).length, unavailableCount = Object.keys(recording.unavailable).length
    split += splitCount; whole += 114 - splitCount - unavailableCount
    if (recording.timingReadId === null) noRead++
    for (const reason of Object.values(recording.unavailable)) if (reason) reasons[reason]++
    const before = old?.[key]
    if (!before) { console.log(`New recording ${key}: ${114 - unavailableCount} available, ${unavailableCount} unavailable`); continue }
    const available: number[] = [], unavailable: number[] = []
    for (let surah = 1; surah <= 114; surah++) {
      if (before.unavailable[surah] && !recording.unavailable[surah]) available.push(surah)
      if (!before.unavailable[surah] && recording.unavailable[surah]) unavailable.push(surah)
    }
    if (available.length || unavailable.length) console.log(`Changes ${key}: newly available [${available}], newly unavailable [${unavailable}]`)
  }
  console.log(`Recordings scanned: ${Object.keys(catalog).length}; no timing read: ${noRead}`)
  console.log(`Playable whole: ${whole}; split: ${split}; unavailable: ${Object.values(reasons).reduce((a, b) => a + b, 0)}`)
  console.log(`Unavailable by reason: ${JSON.stringify(reasons)}`)
  for (const [read, surah] of [[87, 27], [232, 14]] as const) {
    const matches = Object.entries(catalog).filter(([, r]) => r.timingReadId === read)
    console.log(`Cross-check read ${read} s${surah}: ${matches.length ? matches.map(([key, r]) => `${key}=${r.unavailable[surah] ?? (r.split[surah] ? 'split' : 'whole')}`).join(', ') : 'not scanned'}`)
  }
  const minshawi = catalog['112:112']
  console.log(`Cross-check Minshawi 112:112 s9: ${minshawi ? minshawi.unavailable[9] ?? (minshawi.split[9] ? 'split' : 'whole') : 'not scanned'}`)
}

async function main(): Promise<void> {
  const { only, out } = flags()
  const old = await previous(out)
  const reciters = filterReciters(await json('catalog', `${API}/reciters?language=ar`))
  if (!reciters.length) throw new Error('Empty reciter catalog; refusing to replace the shipped file')
  const reads = await json('catalog', `${API}/ayat_timing/reads`)
  const rows = Array.isArray(reads) ? reads : (reads as { reads?: unknown } | null)?.reads
  if (!Array.isArray(rows) || !rows.length) throw new Error('Empty or invalid timing-read catalog; refusing to generate no-timing results')
  if (only) for (const key of only) if (!reciters.some(r => r.key === key)) throw new Error(`Unknown recording: ${key}`)
  const selected = reciters.filter(r => !only || only.has(r.key))
  if (only && out === DEFAULT_OUT && reciters.some(r => !only.has(r.key) && !old?.catalog[r.key])) throw new Error('A partial first run cannot replace the shipped catalog. Use --out /tmp/quran-support.ts, or run without --only.')
  const probes = new Map(selected.map(r => [r.key, {} as Record<number, SurahProbe>]))
  const readIds = new Map(selected.map(r => [r.key, timingRead(reads, r.server)]))
  const jobs = selected.flatMap(reciter => Array.from({ length: 114 }, (_, i) => ({ reciter, surah: i + 1 })))
  let cursor = 0, done = 0, headFailures = 0, timingFailures = 0, prefixFailures = 0, unknownDurations = 0
  console.log(`Checking ${selected.length} recordings × 114 surahs (${jobs.length} HEAD probes); concurrency ${CONCURRENCY}.`)
  const progress = setInterval(() => console.log(`Progress ${done}/${jobs.length}; HEAD failures ${headFailures}; requests ${requests.catalog + requests.head + requests.timings + requests.prefix}`), 20000)
  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const job = jobs[cursor++]
        if (!job) return
        const { reciter, surah } = job, url = audioUrl(reciter, surah)
        const probe: SurahProbe = { sizeBytes: null }
        try { probe.sizeBytes = await head(url) }
        catch (error) { headFailures++; console.warn(message(error)) }
        const readId = readIds.get(reciter.key)!
        if (probe.sizeBytes !== null && probe.sizeBytes >= AUDIO_LIMIT_BYTES && readId !== null) {
          try { probe.timings = await json('timings', `${API}/ayat_timing?surah=${surah}&read=${readId}`) }
          catch (error) { timingFailures++; console.warn(message(error)) }
          try { probe.durationMs = await duration(url, probe.sizeBytes) }
          catch (error) { prefixFailures++; probe.durationMs = null; console.warn(message(error)) }
          if (probe.durationMs === null) unknownDurations++
        }
        probes.get(reciter.key)![surah] = probe
        done++
      }
    }))
  } finally { clearInterval(progress) }
  const scanned = Object.fromEntries(selected.map(r => [r.key, classifyRecording(r, readIds.get(r.key)!, probes.get(r.key)!)]))
  summary(scanned, old?.catalog)
  console.log(`Failed timing requests: ${timingFailures}; failed prefixes: ${prefixFailures}; unknown CBR durations: ${unknownDurations}`)
  if (!only && old) for (const key of Object.keys(old.catalog).sort()) if (!scanned[key]) console.log(`Removed recording: ${key}`)
  const catalog = only ? { ...old?.catalog, ...scanned } : scanned
  const partial = reciters.some(r => !catalog[r.key])
  const text = generated(catalog, out, partial)
  if (text === old?.text) console.log(`Unchanged: ${out}`)
  else {
    await mkdir(dirname(out), { recursive: true })
    await writeFile(out + '.tmp', text, 'utf8')
    await rename(out + '.tmp', out)
    console.log(`Wrote ${Object.keys(catalog).length} recordings: ${out}`)
  }
}

try { await main() }
catch (error) { console.error(message(error)); process.exitCode = 1 }
finally {
  console.log(`Elapsed: ${((Date.now() - started) / 1000).toFixed(1)}s; request attempts: ${requests.catalog + requests.head + requests.timings + requests.prefix}; ${JSON.stringify(requests)} (fetch follows redirects).`)
}
