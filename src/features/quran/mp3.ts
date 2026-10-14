// Pure MP3 helpers. All offsets are byte offsets; HTTP ends are inclusive.
export type Frame = { bytes: number; bitrate: number; sampleRate: number; seconds: number; version: number }

export function skipId3(bytes: Uint8Array): number {
  if (bytes[0] !== 73 || bytes[1] !== 68 || bytes[2] !== 51) return 0
  if (bytes.length < 10) throw new Error('Truncated ID3 header')
  const sizeBytes = bytes.slice(6, 10)
  if (Array.from(sizeBytes).some(n => n > 127)) throw new Error('Invalid syncsafe ID3 size')
  const size = sizeBytes[0]! * 2097152 + sizeBytes[1]! * 16384 + sizeBytes[2]! * 128 + sizeBytes[3]!
  return 10 + size + (bytes[3] === 4 && (bytes[5]! & 16) !== 0 ? 10 : 0)
}

export function parseFrame(bytes: Uint8Array, at = 0): Frame | undefined {
  if (at < 0 || at + 4 > bytes.length || bytes[at] !== 255 || (bytes[at + 1]! & 224) !== 224) return
  const versionBits = (bytes[at + 1]! >> 3) & 3
  const layer = (bytes[at + 1]! >> 1) & 3
  const bitrateIndex = bytes[at + 2]! >> 4
  const rateIndex = (bytes[at + 2]! >> 2) & 3
  if (versionBits === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3 || (bytes[at + 3]! & 3) === 2) return
  const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 2.5
  const rates = version === 1 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
  const bitrate = rates[bitrateIndex]! * 1000
  const sampleRate = [44100, 48000, 32000][rateIndex]! / (version === 1 ? 1 : version === 2 ? 2 : 4)
  const padding = (bytes[at + 2]! >> 1) & 1
  return { bytes: Math.floor((version === 1 ? 144 : 72) * bitrate / sampleRate) + padding,
    bitrate, sampleRate, seconds: (version === 1 ? 1152 : 576) / sampleRate, version }
}

export function alignFrame(bytes: Uint8Array, from = 0): number {
  for (let at = Math.max(0, from); at + 4 <= bytes.length; at++) {
    const frame = parseFrame(bytes, at)
    if (frame && at + frame.bytes <= bytes.length &&
      (at + frame.bytes + 4 > bytes.length || parseFrame(bytes, at + frame.bytes))) return at
  }
  throw new Error('No complete MP3 frame with valid sync found')
}

// Xing/Info lives after the header, optional CRC and Layer III side information.
export function durationMs(bytes: Uint8Array, total: number): number | null {
  try {
    const start = alignFrame(bytes, skipId3(bytes))
    const frame = parseFrame(bytes, start)!
    const mono = (bytes[start + 3]! >> 6) === 3
    const crc = (bytes[start + 1]! & 1) === 0 ? 2 : 0
    const side = frame.version === 1 ? (mono ? 17 : 32) : (mono ? 9 : 17)
    const at = start + 4 + crc + side
    const tag = String.fromCharCode(...bytes.slice(at, at + 4))
    if ((tag === 'Xing' || tag === 'Info') && at + 12 <= start + frame.bytes) {
      const flags = uint32(bytes, at + 4)
      if ((flags & 1) !== 0) {
        const frames = uint32(bytes, at + 8)
        if (frames > 0) return Math.round(frames * frame.seconds * 1000)
      }
    }
    return Number.isSafeInteger(total) && total > start ? Math.round((total - start) * 8 / frame.bitrate * 1000) : null
  } catch { return null }
}

function uint32(bytes: Uint8Array, at: number): number {
  return bytes[at]! * 16777216 + bytes[at + 1]! * 65536 + bytes[at + 2]! * 256 + bytes[at + 3]!
}

export function contentRangeTotal(headers: string): number | null {
  const ranges = [...headers.matchAll(/^content-range:\s*bytes\s+0-(\d+)\/(\d+)\s*$/gim)]
  const last = ranges[ranges.length - 1]
  const total = last ? Number(last[2]) : NaN
  return Number.isSafeInteger(total) && total > Number(last?.[1]) ? total : null
}

// No Node Buffer or optional Uint8Array.fromBase64 dependency.
export function decodeBase64(text: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const clean = text.replace(/\s/g, '')
  if (clean.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(clean)) throw new Error('Invalid base64')
  const out = new Uint8Array(clean.length / 4 * 3 - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0))
  let offset = 0
  for (let i = 0; i < clean.length; i += 4) {
    const n = alphabet.indexOf(clean[i]!) * 262144 + alphabet.indexOf(clean[i + 1]!) * 4096 + Math.max(0, alphabet.indexOf(clean[i + 2]!)) * 64 + Math.max(0, alphabet.indexOf(clean[i + 3]!))
    for (const shift of [16, 8, 0]) if (offset < out.length) out[offset++] = (n >>> shift) & 255
  }
  return out
}
