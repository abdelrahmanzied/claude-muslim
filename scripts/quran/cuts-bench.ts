// Offline developer benchmark. Audio files are opened read-only; no fetch.
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { CUT_OPTIONS as O, pauseCacheKey, type StoredCut } from '../../src/features/quran/cuts.ts'
import { cbrStream } from '../../src/features/quran/segment-mp3.ts'
import { timedSegments } from '../../src/features/quran/segments.ts'
import { audioWindow, ffmpeg, scanCut, windowPauses, type RangeReader } from './cuts-audio.ts'

type Row = { key: string; segment: number; plannedMs: number; trueMs: number | null; cut: StoredCut | null; errorMs: number | null; inside: boolean; escalated: boolean }
type Truth = { ts: number[]; sh: (number | null)[] }
function flags() {
  let data = '', cache = '', out = '', only = '', mode = 'both'
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const flag = args[i], value = args[++i]
    if (!value || value.startsWith('--')) throw new Error(`Expected a value for ${flag}`)
    if (flag === '--data') data = resolve(value)
    else if (flag === '--cache') cache = resolve(value)
    else if (flag === '--out') out = resolve(value)
    else if (flag === '--only') only = value
    else if (flag === '--mode' && ['before', 'after', 'both'].includes(value)) mode = value
    else throw new Error(`Unknown flag/value: ${flag}. Usage: cuts-bench.ts --data dir [--only read_surah,...] [--mode before|after|both] [--cache dir] [--out path]`)
  }
  if (!data) throw new Error('--data is required; the benchmark never uses network')
  for (const path of [cache, out]) if (path && (path === data || path.startsWith(data + '/'))) throw new Error('Benchmark outputs must be outside --data')
  return { data, cache, out, only: only ? new Set(only.split(',')) : null, mode }
}
function report(label: string, rows: Row[]) {
  const table = (key: string, selected: Row[]) => {
    const scored = selected.filter(r => r.trueMs !== null), pct = (n: number, total: number) => total ? (100 * n / total).toFixed(1) + '%' : 'n/a'
    return `${key.padEnd(10)} ${String(selected.length).padStart(4)} ${String(scored.length).padStart(6)} ${pct(scored.filter(r => r.errorMs !== null && r.errorMs <= 300).length, scored.length).padStart(8)} ${pct(scored.filter(r => r.errorMs !== null && r.errorMs <= 750).length, scored.length).padStart(8)} ${pct(selected.filter(r => r.inside).length, selected.length).padStart(8)} ${pct(selected.filter(r => r.escalated).length, selected.length).padStart(8)}`
  }
  console.log(`\n${label}: read_surah cuts scored ≤0.3s ≤0.75s pause wide`)
  console.log(table('TOTAL', rows))
  console.log('Per read (surahs 2 + 9):')
  for (const read of [...new Set(rows.map(r => Number(r.key.split('_')[0])))].sort((a, b) => a - b)) console.log(table(String(read), rows.filter(r => Number(r.key.split('_')[0]) === read)))
  console.log('Per file:')
  for (const key of [...new Set(rows.map(r => r.key))].sort((a, b) => Number(a.split('_')[0]) - Number(b.split('_')[0]) || Number(a.split('_')[1]) - Number(b.split('_')[1]))) console.log(table(key, rows.filter(r => r.key === key)))
  console.log('Worst 15 (absolute truth error; unresolved counts as infinity):')
  for (const r of rows.filter(r => r.trueMs !== null).sort((a, b) => (b.errorMs ?? Infinity) - (a.errorMs ?? Infinity) || a.key.localeCompare(b.key) || a.segment - b.segment).slice(0, 15)) console.log(`${r.key}/segment${r.segment}: planned ${r.plannedMs} true ${r.trueMs!.toFixed(2)} chosen ${r.cut?.ms.toFixed(2) ?? 'unresolved'} error ${r.errorMs?.toFixed(2) ?? 'unresolved'}ms`)
  for (const r of rows.filter(r => r.key === '112_9' && [7, 8].includes(r.segment))) console.log(`Minshawi ${r.segment}: ${JSON.stringify(r)}`)
}
async function main() {
  const f = flags()
  await ffmpeg(['-version'])
  const truth = JSON.parse(await readFile(resolve(f.data, 'viterbi.json'), 'utf8')) as Record<string, Truth>
  const files = (await readdir(resolve(f.data, 'audio'))).filter(name => /^\d+_(2|9)\.mp3$/.test(name)).sort()
  if (!files.length) throw new Error('No benchmark audio files')
  if (f.only) for (const key of f.only) if (!files.includes(key + '.mp3')) throw new Error(`Unknown fixture: ${key}`)
  if (f.cache) await mkdir(f.cache, { recursive: true })
  const results: Record<string, Row[]> = {}
  for (const mode of f.mode === 'both' ? ['before', 'after'] as const : [f.mode as 'before' | 'after']) {
    const rows: Row[] = []
    let bytes = 0
    for (const name of files) {
      const key = name.slice(0, -4)
      if (f.only && !f.only.has(key)) continue
      const surah = Number(key.split('_')[1]), handle = await open(resolve(f.data, 'audio', name), 'r')
      try {
        const stat = await handle.stat()
        const read: RangeReader = async (start, end) => {
          const bytesOut = new Uint8Array(end - start + 1)
          let at = 0
          while (at < bytesOut.length) { const r = await handle.read(bytesOut, at, bytesOut.length - at, start + at); if (!r.bytesRead) throw new Error('Truncated local file'); at += r.bytesRead }
          bytes += bytesOut.length; return bytesOut
        }
        const stream = cbrStream(await read(0, Math.min(stat.size, O.prefixBytes) - 1))
        if (!stream) throw new Error(`${key}: non-CBR fixture cannot be scored`)
        const duration = Math.round((stat.size - stream.audioStart) * 8000 / stream.bitrate)
        const timing = JSON.parse(await readFile(resolve(f.data, 'timing', key + '.json'), 'utf8')) as { start_time: number }[]
        const segments = timedSegments(timing, surah, stat.size, duration)
        const reference = truth[key]
        if (!reference || reference.ts.length !== reference.sh.length) throw new Error(`Invalid/missing Viterbi reference: ${key}`)
        // Timestamp matching handles shifted numbering and omissions. Never zip
        // truth indices to ayah numbers. Null truth remains unscored.
        const shifts = new Map(reference.ts.map((ts, i) => [Math.round(ts * 1000), reference.sh[i]]))
        let priorOffsetMs = 0
        for (const segment of segments.slice(1)) {
          const result = await scanCut(segment.startMs, timing.map(t => t.start_time), async radius => {
            const window = await audioWindow(read, stat.size, stream, segment.startMs, radius)
            const cachePath = f.cache && resolve(f.cache, `${pauseCacheKey(mode)}_${key}_${segment.id}_${radius}_${stat.size}_${stat.mtimeMs}.json`)
            let pauses
            if (cachePath) {
              try { pauses = JSON.parse(await readFile(cachePath, 'utf8')) as Awaited<ReturnType<typeof windowPauses>> }
              catch (error) { if ((error as { code?: string }).code !== 'ENOENT') throw error }
            }
            if (!pauses) { pauses = await windowPauses(window, mode); if (cachePath) await writeFile(cachePath, JSON.stringify(pauses), 'utf8') }
            return { window, pauses }
          }, mode, priorOffsetMs)
          if (result.offsetMs !== null) priorOffsetMs = result.offsetMs
          const sh = shifts.get(segment.startMs), trueMs = typeof sh === 'number' && Number.isFinite(sh) ? segment.startMs + sh * 1000 : null
          rows.push({ key, segment: segment.id, plannedMs: segment.startMs, trueMs, cut: result.cut, errorMs: result.cut && trueMs !== null ? Math.abs(result.cut.ms - trueMs) : null, inside: !!result.cut && result.pauses.some(p => result.cut!.ms >= p.startMs && result.cut!.ms <= p.endMs && result.cut!.startMs >= p.startMs), escalated: result.escalated })
        }
        console.log(`${mode} scanned ${key}: ${segments.length - 1} cuts`)
      } finally { await handle.close() }
    }
    results[mode] = rows
    report(mode === 'before' ? 'BEFORE (original nearest-pause path)' : 'AFTER (local alignment path)', rows)
    console.log(`${mode}: local audio bytes read ${bytes}; no network; ${rows.filter(r => r.trueMs === null).length} missing/null truths excluded from accuracy denominator`)
  }
  if (results.before && results.after) {
    for (const limit of [300, 750]) {
      const before = new Map(results.before.map(r => [`${r.key}:${r.segment}`, r]))
      const losses = results.after.filter(r => { const b = before.get(`${r.key}:${r.segment}`); return b?.errorMs !== null && b?.errorMs !== undefined && b.errorMs <= limit && (r.errorMs === null || r.errorMs > limit) })
      console.log(`Regressions at ${limit}ms: ${losses.length}${losses.length ? ` ${losses.map(r => `${r.key}/segment${r.segment}`).join(', ')}` : ''}`)
    }
  }
  if (f.out) await writeFile(f.out, JSON.stringify(results, null, 2) + '\n', 'utf8')
}
try { await main() }
catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 }
