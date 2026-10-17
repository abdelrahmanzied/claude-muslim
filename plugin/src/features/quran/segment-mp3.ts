import { alignFrame, parseFrame, skipId3 } from './mp3.ts'
import { AUDIO_LIMIT_BYTES, CLIP_ERROR, type Checkpoint, type Segment } from './segments.ts'

export type SegmentBounds = { startByte: number; endByte: number; durationMs: number; startTimeMs: number; checkpoint: Checkpoint }
export const SEGMENT_LEAD_MS = 3000
type SeenFrame = { byte: number; timeMs: number; dataBytes: number }
export class SegmentScanner {
  private carry = new Uint8Array(0)
  private position: number
  private time: number
  private first: boolean
  private history: SeenFrame[] = []
  private start: SeenFrame | null = null
  private rate: number | null = null
  private finished: SegmentBounds | null = null
  private readonly segment: Segment
  private readonly totalBytes: number
  private readonly last: boolean
  constructor(segment: Segment, totalBytes: number, last: boolean, checkpoint?: Checkpoint) {
    this.segment = segment
    this.totalBytes = totalBytes
    this.last = last
    this.position = checkpoint?.byte ?? 0
    this.time = checkpoint?.timeMs ?? 0
    this.first = !checkpoint
  }
  get result(): SegmentBounds | null { return this.finished }
  feed(chunk: Uint8Array, byte: number): void {
    if (this.finished) return
    if (byte !== this.position + this.carry.length) throw new Error(CLIP_ERROR)
    const bytes = new Uint8Array(this.carry.length + chunk.length)
    bytes.set(this.carry); bytes.set(chunk, this.carry.length)
    let at = 0
    if (this.first) {
      const skip = skipId3(bytes)
      if (skip > bytes.length - 4) throw new Error(CLIP_ERROR)
      at = alignFrame(bytes, skip)
      this.first = false
    }
    while (at + 4 <= bytes.length) {
      const frame = parseFrame(bytes, at)
      if (!frame) {
        if (this.position + at + 128 >= this.totalBytes && String.fromCharCode(...bytes.slice(at, at + 3)) === 'TAG') break
        throw new Error(CLIP_ERROR)
      }
      if (at + frame.bytes > bytes.length) break
      if (this.rate !== null && this.rate !== frame.sampleRate) throw new Error(CLIP_ERROR)
      this.rate = frame.sampleRate
      const mono = (bytes[at + 3]! >> 6) === 3
      const crc = (bytes[at + 1]! & 1) === 0 ? 2 : 0
      const side = frame.version === 1 ? mono ? 17 : 32 : mono ? 9 : 17
      const tagAt = at + 4 + crc + side
      const tag = String.fromCharCode(...bytes.slice(tagAt, tagAt + 4))
      if (this.time === 0 && !this.history.length && (tag === 'Xing' || tag === 'Info')) { at += frame.bytes; continue }
      const current = { byte: this.position + at, timeMs: this.time, dataBytes: frame.bytes - 4 - crc - side }
      if (!this.start && this.time + frame.seconds * 1000 > this.segment.startMs) {
        let index = this.history.length, data = 0
        const reservoir = frame.version === 1 ? 511 : 255
        while (index > 0 && data < reservoir) data += this.history[--index]!.dataBytes
        this.start = this.history[index] ?? current
      }
      if (this.start && !this.last && this.time >= this.segment.endMs) {
        this.finished = this.bounds(current.byte, this.time)
        break
      }
      this.history.push(current)
      if (this.history.length > 64) this.history.shift()
      this.time += frame.seconds * 1000
      at += frame.bytes
      if (this.start && current.byte + frame.bytes - this.start.byte >= AUDIO_LIMIT_BYTES) throw new Error(CLIP_ERROR)
    }
    this.position += at
    this.carry = bytes.slice(at)
    if (!this.finished && byte + chunk.length === this.totalBytes) {
      const tail = this.carry
      if (tail.length && !(tail.length === 128 && String.fromCharCode(...tail.slice(0, 3)) === 'TAG')) throw new Error(CLIP_ERROR)
      if (!this.start || !this.last && this.time + 100 < this.segment.endMs) throw new Error(CLIP_ERROR)
      this.finished = this.bounds(this.position, this.time)
    }
  }
  private bounds(endByte: number, endMs: number): SegmentBounds {
    if (!this.start || endByte <= this.start.byte || endByte - this.start.byte >= AUDIO_LIMIT_BYTES) throw new Error(CLIP_ERROR)
    return { startByte: this.start.byte, endByte, durationMs: Math.round(endMs - this.start.timeMs), startTimeMs: this.start.timeMs, checkpoint: { byte: this.history[0]?.byte ?? this.start.byte, timeMs: this.history[0]?.timeMs ?? this.start.timeMs } }
  }
}
export function seekCheckpoint(checkpoints: readonly Checkpoint[], startMs: number): Checkpoint | undefined {
  return checkpoints.filter(c => c.timeMs <= startMs - SEGMENT_LEAD_MS).sort((a, b) => b.timeMs - a.timeMs)[0]
}
export function encodeBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const chunks: string[] = []
  let chunk = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!, b = bytes[i + 1], c = bytes[i + 2]
    chunk += alphabet[a >> 2]! + alphabet[(a & 3) * 16 + ((b ?? 0) >> 4)]! + (b === undefined ? '=' : alphabet[(b & 15) * 4 + ((c ?? 0) >> 6)]!) + (c === undefined ? '=' : alphabet[c & 63]!)
    if (chunk.length >= 8192) { chunks.push(chunk); chunk = '' }
  }
  chunks.push(chunk)
  return chunks.join('')
}
// Constant-bitrate audio maps time to bytes directly, so a late quarter needs no scan from the start.
export type CbrStream = { audioStart: number; bitrate: number }
export function cbrStream(prefix: Uint8Array): CbrStream | null {
  try {
    const skip = skipId3(prefix)
    if (skip + 4 > prefix.length) return null
    const start = alignFrame(prefix, skip)
    const frame = parseFrame(prefix, start)!
    const mono = (prefix[start + 3]! >> 6) === 3
    const crc = (prefix[start + 1]! & 1) === 0 ? 2 : 0
    const side = frame.version === 1 ? mono ? 17 : 32 : mono ? 9 : 17
    const tag = String.fromCharCode(...prefix.slice(start + 4 + crc + side, start + 8 + crc + side))
    if (tag === 'Xing') return null
    // Every following frame must keep the same bitrate, or byte offsets are not proportional to time.
    let at = start + (tag === 'Info' ? frame.bytes : 0)
    const audioStart = at
    let bitrate: number | null = null
    for (let n = 0; n < 32 && at + 4 <= prefix.length; n++) {
      const f = parseFrame(prefix, at)
      if (!f || at + f.bytes > prefix.length || f.sampleRate !== frame.sampleRate || bitrate !== null && f.bitrate !== bitrate) return null
      bitrate = f.bitrate
      at += f.bytes
    }
    return bitrate === null ? null : { audioStart, bitrate }
  } catch { return null }
}
export const cbrByte = (stream: CbrStream, ms: number): number => stream.audioStart + Math.floor(Math.max(0, ms) * stream.bitrate / 8000)
export function cbrCheckpoint(stream: CbrStream, windowStart: number, window: Uint8Array): Checkpoint | null {
  try {
    const byte = windowStart + alignFrame(window, Math.max(0, stream.audioStart - windowStart))
    return { byte, timeMs: (byte - stream.audioStart) * 8000 / stream.bitrate }
  } catch { return null }
}
