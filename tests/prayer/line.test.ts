import { describe, expect, test } from 'claude-code/testing'

import { arabicDigits, countdownText, isInWindow, minutesText, reminderText, prayerLine, type View } from '../../src/prayer/line.ts'

const MINUTE = 60_000
const ASR = { prayer: 'asr' as const, at: 1_000 * MINUTE }
const ALWAYS: View = { mode: 'always', reminder: 20, isAdhan: true }
const REMINDER: View = { ...ALWAYS, mode: 'reminder' }
const DHUHR = { prayer: 'dhuhr' as const, at: 800 * MINUTE }

describe('status line', () => {
  test('the next prayer\'s time, in Arabic digits', async () => {
    expect(prayerLine(ASR, '15:59', DHUHR, 900 * MINUTE, ALWAYS)).toBe('☾ العصر ١٥:٥٩')
  })

  test('a live mm:ss countdown in the last 20 minutes', async () => {
    expect(prayerLine(ASR, '15:59', DHUHR, 980 * MINUTE, ALWAYS)).toBe('☾ العصر ٢٠:٠٠')
    expect(prayerLine(ASR, '15:59', DHUHR, 980 * MINUTE + 18_000, ALWAYS)).toBe('☾ العصر ١٩:٤٢')
    expect(prayerLine(ASR, '15:59', DHUHR, 995 * MINUTE, ALWAYS)).toBe('☾ العصر ٠٥:٠٠')
    expect(prayerLine(ASR, '15:59', DHUHR, 999.5 * MINUTE, ALWAYS)).toBe('☾ العصر ٠٠:٣٠')
  })

  test('countdown rounds up to the second and window is the reminder minutes', async () => {
    expect(countdownText(59_001)).toBe('٠١:٠٠')
    expect(countdownText(500)).toBe('٠٠:٠١')
    expect(isInWindow(ASR, 979 * MINUTE, 20)).toBe(false)
    expect(isInWindow(ASR, 980 * MINUTE, 20)).toBe(true)
    expect(isInWindow(ASR, ASR.at, 20)).toBe(false)
  })

  test('the call for 15 minutes after a prayer comes in', async () => {
    expect(prayerLine(ASR, '15:59', DHUHR, 801 * MINUTE, ALWAYS)).toBe('حان وقت صلاة الظهر')
    expect(prayerLine(ASR, '15:59', DHUHR, 816 * MINUTE, ALWAYS)).toBe('☾ العصر ١٥:٥٩')
  })

  test('reminder mode is empty outside the window, and after the call', async () => {
    expect(prayerLine(ASR, '15:59', DHUHR, 900 * MINUTE, REMINDER)).toBe(undefined)
    expect(prayerLine(ASR, '15:59', DHUHR, 816 * MINUTE, REMINDER)).toBe(undefined)
    expect(prayerLine(ASR, '15:59', DHUHR, 801 * MINUTE, REMINDER)).toBe('حان وقت صلاة الظهر')
    expect(prayerLine(ASR, '15:59', DHUHR, 980 * MINUTE, REMINDER)).toBe('☾ العصر ٢٠:٠٠')
  })

  test('the window follows the reminder minutes', async () => {
    const view = { ...ALWAYS, reminder: 30 }

    expect(prayerLine(ASR, '15:59', DHUHR, 970 * MINUTE, view)).toBe('☾ العصر ٣٠:٠٠')
    expect(prayerLine(ASR, '15:59', DHUHR, 970 * MINUTE, ALWAYS)).toBe('☾ العصر ١٥:٥٩')
  })

  test('off is empty; the call can be turned off', async () => {
    expect(prayerLine(ASR, '15:59', DHUHR, 980 * MINUTE, { ...ALWAYS, mode: 'off' })).toBe(undefined)
    expect(prayerLine(ASR, '15:59', DHUHR, 801 * MINUTE, { ...ALWAYS, isAdhan: false })).toBe('☾ العصر ١٥:٥٩')
    expect(prayerLine(ASR, '15:59', DHUHR, 801 * MINUTE, { ...REMINDER, isAdhan: false })).toBe(undefined)
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
