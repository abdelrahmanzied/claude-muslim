import { describe, expect, test } from 'claude-code/testing'

import { callText, openWindow } from '../../src/features/thikr/call.ts'

const MINUTE = 60_000
const ASR = { pray: 'asr' as const, at: 1_000 * MINUTE }

describe('call to pray', () => {
  test('the pray and whole minutes left, in Arabic digits', async () => {
    expect(callText(ASR, 990 * MINUTE)).toBe('حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د')
    expect(callText(ASR, 990 * MINUTE + 1_000)).toBe('حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د')
    expect(callText(ASR, 999.9 * MINUTE)).toBe('حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١ د')
    expect(callText({ pray: 'isha', at: 20 * MINUTE }, 0)).toBe('حَيَّ عَلَى الصَّلَاةِ · العشاء بعد ٢٠ د')
  })

  test('only a window still ahead opens a turn', async () => {
    expect(openWindow(ASR, 990 * MINUTE)).toBe(ASR)
    expect(openWindow(ASR, ASR.at)).toBe(undefined)
    expect(openWindow(null, 0)).toBe(undefined)
  })
})
