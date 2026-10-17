import { expect, test } from 'claude-code/testing'
import { alignFrame, contentRangeTotal, decodeBase64, durationMs, parseFrame, skipId3 } from '../../src/features/quran/mp3.ts'

function mp3(version = 1, mono = false, crc = false): Uint8Array {
  const bytes = new Uint8Array(1000)
  const header = [255, version === 1 ? (crc ? 250 : 251) : (crc ? 242 : 243), version === 1 ? 144 : 128, mono ? 192 : 0]
  bytes.set(header)
  const frame = parseFrame(bytes)!
  bytes.set(header, frame.bytes)
  return bytes
}
function xing(bytes: Uint8Array, tag = 'Xing', frames = 1000): Uint8Array {
  const f = parseFrame(bytes)!
  const mono = bytes[3] === 192
  const side = f.version === 1 ? (mono ? 17 : 32) : (mono ? 9 : 17)
  const at = 4 + ((bytes[1]! & 1) === 0 ? 2 : 0) + side
  bytes.set([...tag].map(c => c.charCodeAt(0)), at)
  bytes[at + 7] = 1
  bytes[at + 8] = (frames >>> 24) & 255
  bytes[at + 9] = (frames >>> 16) & 255
  bytes[at + 10] = (frames >>> 8) & 255
  bytes[at + 11] = frames & 255
  return bytes
}
test('MPEG-1 and MPEG-2 Layer III headers, sync and CBR duration', () => {
  expect(parseFrame(mp3())).toEqual({ bytes: 417, bitrate: 128000, sampleRate: 44100, seconds: 1152 / 44100, version: 1 })
  expect(parseFrame(mp3(2))).toEqual({ bytes: 208, bitrate: 64000, sampleRate: 22050, seconds: 576 / 22050, version: 2 })
  expect(durationMs(mp3(), 1600000)).toBe(100000)
  expect(durationMs(mp3(2), 800000)).toBe(100000)
  const junk = new Uint8Array(1008); junk.set(mp3(), 8)
  expect(alignFrame(junk)).toBe(8)
  expect(durationMs(junk, 1600008)).toBe(100000)
  expect(parseFrame(new Uint8Array([255, 235, 144, 0]))).toBeUndefined()
  expect(parseFrame(new Uint8Array([255, 251, 0, 0]))).toBeUndefined()
  expect(durationMs(new Uint8Array(1000), 1000)).toBe(null)
})
test('Xing VBR and Info frame counts beat byte-size estimates for both MPEG versions', () => {
  for (const version of [1, 2]) for (const mono of [false, true]) for (const crc of [false, true]) {
    const bytes = xing(mp3(version, mono, crc))
    expect(durationMs(bytes, 99999999)).toBe(Math.round(1000 * parseFrame(bytes)!.seconds * 1000))
  }
  expect(durationMs(xing(mp3(), 'Info', 2000), 1)).toBe(Math.round(2000 * 1152 / 44100 * 1000))
})
test('ID3 syncsafe size and footer skip precede CBR audio start', () => {
  const bytes = new Uint8Array(1100)
  bytes.set([73, 68, 51, 4, 0, 16, 0, 0, 0, 80]); bytes.set(mp3(), 100)
  expect(skipId3(bytes)).toBe(100)
  expect(durationMs(bytes, 1600100)).toBe(100000)
  expect(skipId3(mp3())).toBe(0)
  expect(durationMs(new Uint8Array([73, 68, 51]), 1000)).toBe(null)
  const invalid = bytes.slice(); invalid[6] = 255
  expect(durationMs(invalid, 1600100)).toBe(null)
})
test('Content-Range uses the last redirect response and base64 decodes portable bytes', () => {
  expect(contentRangeTotal('Content-Range: bytes 0-100/1000\r\ncontent-range: bytes 0-131071/1234567\r\n')).toBe(1234567)
  expect(contentRangeTotal('content-range: bytes 0-131071/131473974')).toBe(131473974)
  expect(contentRangeTotal('Content-Range: bytes 1-10/100')).toBe(null)
  expect(contentRangeTotal('Content-Range: bytes 0-100/*')).toBe(null)
  expect([...decodeBase64('/wCA')]).toEqual([255, 0, 128])
  expect([...decodeBase64('AQ==')]).toEqual([1])
  expect([...decodeBase64('AQI=')]).toEqual([1, 2])
})
