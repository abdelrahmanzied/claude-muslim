import { describe, expect, test } from 'claude-code/testing'

import { arabicDigits, minutesText, notifyText, statusText } from '../../src/features/salah/line.ts'

const MINUTE = 60_000
const ASR = { prayer: 'asr' as const, at: 1_000 * MINUTE }
const DHUHR = { prayer: 'dhuhr' as const, at: 800 * MINUTE }

describe('status line', () => {
  test('the next prayer\'s time, in Arabic digits', async () => {
    expect(statusText(ASR, '15:59', DHUHR, 900 * MINUTE)).toBe('☾ العصر ١٥:٥٩')
  })

  test('a countdown in the last 20 minutes', async () => {
    expect(statusText(ASR, '15:59', DHUHR, 980 * MINUTE)).toBe('☾ العصر بعد ٢٠ دقيقة')
    expect(statusText(ASR, '15:59', DHUHR, 995 * MINUTE)).toBe('☾ العصر بعد ٥ دقائق')
    expect(statusText(ASR, '15:59', DHUHR, 999.5 * MINUTE)).toBe('☾ العصر بعد دقيقة')
  })

  test('the call for 15 minutes after a prayer comes in', async () => {
    expect(statusText(ASR, '15:59', DHUHR, 801 * MINUTE)).toBe('حان وقت صلاة الظهر')
    expect(statusText(ASR, '15:59', DHUHR, 816 * MINUTE)).toBe('☾ العصر ١٥:٥٩')
  })

  test('minutes read as Arabic says them', async () => {
    expect([1, 2, 3, 10, 11, 20].map(minutesText)).toEqual(['دقيقة', 'دقيقتين', '٣ دقائق', '١٠ دقائق', '١١ دقيقة', '٢٠ دقيقة'])
    expect(arabicDigits('05:42')).toBe('٠٥:٤٢')
  })
})

describe('notification', () => {
  test('once, in the 20 minutes before', async () => {
    expect(notifyText(ASR, 970 * MINUTE, null)).toBe(undefined)
    expect(notifyText(ASR, 980 * MINUTE, null)).toBe('صلاة العصر بعد ٢٠ دقيقة')
    expect(notifyText(ASR, 985 * MINUTE, ASR.at)).toBe(undefined)
  })

  test('sunrise says Fajr is ending', async () => {
    expect(notifyText({ prayer: 'sunrise', at: ASR.at }, 990 * MINUTE, null)).toBe('الشروق بعد ١٠ دقائق، آخر وقت الفجر')
  })
})
