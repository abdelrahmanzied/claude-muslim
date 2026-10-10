import { describe, expect, test } from 'claude-code/testing'

import { arabicDigits, minutesText, reminderText, statusText, type View } from '../../src/features/salah/line.ts'

const MINUTE = 60_000
const ASR = { prayer: 'asr' as const, at: 1_000 * MINUTE }
const ALWAYS: View = { mode: 'always', reminder: 20, isAdhan: true }
const REMINDER: View = { ...ALWAYS, mode: 'reminder' }
const DHUHR = { prayer: 'dhuhr' as const, at: 800 * MINUTE }

describe('status line', () => {
  test('the next prayer\'s time, in Arabic digits', async () => {
    expect(statusText(ASR, '15:59', DHUHR, 900 * MINUTE, ALWAYS)).toBe('☾ العصر ١٥:٥٩')
  })

  test('a countdown in the last 20 minutes', async () => {
    expect(statusText(ASR, '15:59', DHUHR, 980 * MINUTE, ALWAYS)).toBe('☾ العصر بعد ٢٠ دقيقة')
    expect(statusText(ASR, '15:59', DHUHR, 995 * MINUTE, ALWAYS)).toBe('☾ العصر بعد ٥ دقائق')
    expect(statusText(ASR, '15:59', DHUHR, 999.5 * MINUTE, ALWAYS)).toBe('☾ العصر بعد دقيقة')
  })

  test('the call for 15 minutes after a prayer comes in', async () => {
    expect(statusText(ASR, '15:59', DHUHR, 801 * MINUTE, ALWAYS)).toBe('حان وقت صلاة الظهر')
    expect(statusText(ASR, '15:59', DHUHR, 816 * MINUTE, ALWAYS)).toBe('☾ العصر ١٥:٥٩')
  })

  test('reminder mode is empty outside the window, and after the call', async () => {
    expect(statusText(ASR, '15:59', DHUHR, 900 * MINUTE, REMINDER)).toBe(undefined)
    expect(statusText(ASR, '15:59', DHUHR, 816 * MINUTE, REMINDER)).toBe(undefined)
    expect(statusText(ASR, '15:59', DHUHR, 801 * MINUTE, REMINDER)).toBe('حان وقت صلاة الظهر')
    expect(statusText(ASR, '15:59', DHUHR, 980 * MINUTE, REMINDER)).toBe('☾ العصر بعد ٢٠ دقيقة')
  })

  test('the window follows the reminder minutes', async () => {
    const view = { ...ALWAYS, reminder: 30 }

    expect(statusText(ASR, '15:59', DHUHR, 970 * MINUTE, view)).toBe('☾ العصر بعد ٣٠ دقيقة')
    expect(statusText(ASR, '15:59', DHUHR, 970 * MINUTE, ALWAYS)).toBe('☾ العصر ١٥:٥٩')
  })

  test('off is empty; the call can be turned off', async () => {
    expect(statusText(ASR, '15:59', DHUHR, 980 * MINUTE, { ...ALWAYS, mode: 'off' })).toBe(undefined)
    expect(statusText(ASR, '15:59', DHUHR, 801 * MINUTE, { ...ALWAYS, isAdhan: false })).toBe('☾ العصر ١٥:٥٩')
    expect(statusText(ASR, '15:59', DHUHR, 801 * MINUTE, { ...REMINDER, isAdhan: false })).toBe(undefined)
  })

  test('minutes read as Arabic says them', async () => {
    expect([1, 2, 3, 10, 11, 20].map(minutesText)).toEqual(['دقيقة', 'دقيقتين', '٣ دقائق', '١٠ دقائق', '١١ دقيقة', '٢٠ دقيقة'])
    expect(arabicDigits('05:42')).toBe('٠٥:٤٢')
  })
})

describe('reminder toast', () => {
  test('once, in the 20 minutes before', async () => {
    expect(reminderText(ASR, 970 * MINUTE, null, 20)).toBe(undefined)
    expect(reminderText(ASR, 980 * MINUTE, null, 20)).toBe('صلاة العصر بعد ٢٠ دقيقة')
    expect(reminderText(ASR, 985 * MINUTE, ASR.at, 20)).toBe(undefined)
  })

  test('the window follows the reminder minutes', async () => {
    expect(reminderText(ASR, 970 * MINUTE, null, 30)).toBe('صلاة العصر بعد ٣٠ دقيقة')
  })

  test('sunrise has no reminder', async () => {
    expect(reminderText({ prayer: 'sunrise', at: ASR.at }, 990 * MINUTE, null, 20)).toBe(undefined)
  })
})
