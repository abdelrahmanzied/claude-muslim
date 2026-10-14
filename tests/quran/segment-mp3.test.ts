import { expect, test } from 'claude-code/testing'
import { parseFrame, decodeBase64 } from '../../src/features/quran/mp3.ts'
import { SegmentScanner, SEGMENT_LEAD_MS, cbrStream, cbrByte, cbrCheckpoint, encodeBase64, seekCheckpoint } from '../../src/features/quran/segment-mp3.ts'
import { CLIP_ERROR, type Segment } from '../../src/features/quran/segments.ts'

function recording(vbr = false, frames = 1000) {
  const parts = Array.from({ length: frames }, (_, i) => {
    const header = new Uint8Array([255, 251, vbr && i % 2 ? 176 : 144, 0])
    const bytes = new Uint8Array(parseFrame(header)!.bytes)
    bytes.set(header); return bytes
  })
  const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  const offsets: number[] = []
  let at = 0
  for (const part of parts) { offsets.push(at); bytes.set(part, at); at += part.length }
  return { bytes, offsets, ms: 1152 / 44100 * 1000 }
}
const segment = (startMs: number, endMs: number): Segment => ({ id: 0, quarter: 1, firstAyah: 1, lastAyah: 25, startMs, endMs, durationMs: endMs - startMs })

test('frame scanning uses actual VBR offsets and survives frame boundaries across range chunks', () => {
  for (const vbr of [false, true]) {
    const { bytes, offsets, ms } = recording(vbr)
    const scanner = new SegmentScanner(segment(100 * ms + 1, 200 * ms - 1), bytes.length, false)
    for (let at = 0; at < bytes.length && !scanner.result;) {
      const length = at === 0 ? 4096 : 733
      scanner.feed(bytes.slice(at, at + length), at); at += length
    }
    expect(scanner.result?.startByte).toBe(offsets[vbr ? 99 : 98])
    expect(scanner.result?.endByte).toBe(offsets[200])
    expect(scanner.result?.durationMs).toBe(Math.round(ms * (vbr ? 101 : 102)))
    expect(parseFrame(bytes, scanner.result!.startByte)).toBeDefined()
    expect(parseFrame(bytes, scanner.result!.endByte)).toBeDefined()
  }
})
test('last segment includes remaining audio and tolerates a standard ID3v1 footer', () => {
  const { bytes, ms } = recording()
  const tagged = new Uint8Array(bytes.length + 128)
  tagged.set(bytes); tagged.set([84, 65, 71], bytes.length)
  const scanner = new SegmentScanner(segment(ms * 900, ms * 999), tagged.length, true)
  scanner.feed(tagged, 0)
  expect(scanner.result?.endByte).toBe(bytes.length)
  expect(scanner.result!.durationMs >= Math.round(ms * 100)).toBe(true)
})
test('checkpoints retain reservoir context and produce the same cut as a scan from the start', () => {
  const { bytes, ms } = recording(true)
  const first = new SegmentScanner(segment(0, ms * 300), bytes.length, false)
  first.feed(bytes, 0)
  const target = segment(ms * 400 + 1, ms * 500 - 1)
  const checkpoint = seekCheckpoint([first.result!.checkpoint], target.startMs)!
  const resumed = new SegmentScanner(target, bytes.length, false, checkpoint)
  resumed.feed(bytes.slice(checkpoint.byte), checkpoint.byte)
  const full = new SegmentScanner(target, bytes.length, false)
  full.feed(bytes, 0)
  expect(resumed.result?.startByte).toBe(full.result?.startByte)
  expect(resumed.result?.endByte).toBe(full.result?.endByte)
  expect(resumed.result?.durationMs).toBe(full.result?.durationMs)
  expect(seekCheckpoint([checkpoint], 0)).toBeUndefined()
})
test('broken frames, discontinuous requests and incomplete recordings fail without making clips', () => {
  const { bytes } = recording()
  const invalid = bytes.slice(); invalid[4170] = 0
  expect(() => new SegmentScanner(segment(0, 1000), invalid.length, false).feed(invalid, 0)).toThrow(CLIP_ERROR)
  expect(() => new SegmentScanner(segment(0, 1000), bytes.length, false).feed(bytes, 1)).toThrow(CLIP_ERROR)
  const truncated = bytes.slice(0, -1)
  expect(() => new SegmentScanner(segment(20000, 26000), truncated.length, true).feed(truncated, 0)).toThrow(CLIP_ERROR)
})
test('portable base64 retains every byte including chunk boundaries and padding', () => {
  for (const length of [0, 1, 2, 3, 8191, 100000]) {
    const bytes = Uint8Array.from({ length }, (_, i) => i % 256)
    expect([...decodeBase64(encodeBase64(bytes))]).toEqual([...bytes])
  }
})

// 48kHz/128kbps: each 384-byte frame is exactly 24ms, including padding.
function cbrRecording(tag = '', id3 = 0, frames = 6000) {
  const audioStart = id3 + (tag ? 384 : 0)
  const bytes = new Uint8Array(audioStart + frames * 384)
  if (id3) bytes.set([73, 68, 51, 3, 0, 0, 0, 0, 0, id3 - 10])
  for (let at = id3; at < bytes.length; at += 384) bytes.set([255, 251, 148, 0], at)
  if (tag) bytes.set(Array.from(tag, c => c.charCodeAt(0)), id3 + 36)
  return { bytes, audioStart }
}
test('CBR detection and byte mapping skip ID3 and the Info metadata frame', () => {
  for (const [tag, id3] of [['', 0], ['', 42], ['Info', 0], ['Info', 42]] as const) {
    const { bytes, audioStart } = cbrRecording(tag, id3, 40)
    const stream = cbrStream(bytes)!
    expect(stream).toEqual({ audioStart, bitrate: 128000 })
    expect(cbrByte(stream, 24000)).toBe(audioStart + 384000)
    expect(cbrByte(stream, -1)).toBe(audioStart)
  }
})
test('Xing VBR, mixed bitrates and malformed prefixes cannot produce a CBR jump', () => {
  expect(cbrStream(cbrRecording('Xing', 42, 40).bytes)).toBe(null)
  expect(cbrStream(recording(true).bytes)).toBe(null)
  expect(cbrStream(new Uint8Array(30))).toBe(null)
})
test('a CBR window aligns forward to a whole frame and its reservoir cut matches a full scan', () => {
  for (const tag of ['', 'Info']) {
    const { bytes, audioStart } = cbrRecording(tag, 42)
    const stream = cbrStream(bytes.slice(0, 131072))!
    const target = segment(121017, 125003)
    const at = cbrByte(stream, target.startMs - SEGMENT_LEAD_MS)
    const checkpoint = cbrCheckpoint(stream, at, bytes.slice(at, at + 8192))!
    const expected = audioStart + Math.ceil((at - audioStart) / 384) * 384
    expect(checkpoint.byte).toBe(expected)
    expect(checkpoint.timeMs).toBe((expected - audioStart) / 384 * 24)
    const resumed = new SegmentScanner(target, bytes.length, false, checkpoint)
    resumed.feed(bytes.slice(checkpoint.byte), checkpoint.byte)
    const full = new SegmentScanner(target, bytes.length, false)
    full.feed(bytes, 0)
    expect(resumed.result).toEqual(full.result)
    expect(resumed.result!.startByte).toBeLessThan(audioStart + Math.floor(target.startMs / 24) * 384)
    expect(cbrCheckpoint(stream, at, new Uint8Array(200))).toBe(null)
  }
})
test('saved checkpoints must preserve the same three-second reservoir lead-in as CBR jumps', () => {
  const checkpoints = Object.freeze([{ byte: 100, timeMs: 60000 }, { byte: 200, timeMs: 97500 }, { byte: 300, timeMs: 99000 }].map(c => Object.freeze(c)))
  expect(seekCheckpoint(checkpoints, 100000)).toEqual({ byte: 100, timeMs: 60000 })
  expect(checkpoints).toHaveLength(3)
})
test('MPEG-2 low-bitrate cuts retain its 255-byte reservoir within the scanner history', () => {
  const header = new Uint8Array([255, 243, 16, 0])
  const frame = parseFrame(header)!
  const bytes = new Uint8Array(frame.bytes * 1000)
  for (let at = 0; at < bytes.length; at += frame.bytes) bytes.set(header, at)
  const ms = frame.seconds * 1000
  const scanner = new SegmentScanner(segment(400 * ms + 1, 500 * ms - 1), bytes.length, false)
  scanner.feed(bytes, 0)
  // 26-byte frames have five bytes of main data: 51 preceding frames seed 255 bytes.
  expect(frame.bytes).toBe(26)
  expect(scanner.result!.startByte).toBe((400 - 51) * frame.bytes)
  expect(scanner.result!.endByte).toBe(500 * frame.bytes)
})
