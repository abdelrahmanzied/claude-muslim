import { IN_MS } from '../../src/shared/pray/line.ts'
import { expect, test } from 'claude-code/testing'
import { AFTER_SALAH, afterSalah } from '../../src/features/athkar/after-salah.ts'
import { currentOf, dayOf, emptyAfterSalah, emptyDay, emptyReading, listFor, overall, readDay, setAt, shouldAdvance, step, syncAfterSalah } from '../../src/features/athkar/logic.ts'
import { resetHint } from '../../src/features/athkar/look.ts'
import { bandHeight, fitOf } from '../../src/features/athkar/band.ts'
import { TEXT_WIDTH } from '../../src/features/athkar/metrics.ts'

const NOW = new Date(2026, 9, 10, 13).getTime()
const last = { pray: 'dhuhr' as const, at: NOW }
const fresh = () => syncAfterSalah(emptyDay(dayOf(new Date(NOW))), last)

test('general, Dhuhr, Fajr and Maghrib use the authored items and counts', () => {
  const general = afterSalah(null)
  expect(general.map(t => t.id)).toEqual(AFTER_SALAH.filter(t => !t.only).map(t => t.id))
  expect(general.map(t => t.times)).toEqual([3, 1, 1, 1, 33, 1, 1, 1, 1, 1])
  expect(afterSalah('dhuhr')).toEqual(general)
  for (const pray of ['fajr', 'maghrib'] as const) {
    const list = afterSalah(pray)
    expect(list.filter(t => t.id.startsWith('70-')).map(t => t.times)).toEqual([3, 3, 3])
    expect(list.find(t => t.id === '72')?.times).toBe(10)
    expect(list.map(t => t.text)).toEqual(AFTER_SALAH.filter(t => !t.only || t.only.includes(pray)).map(t => t.text))
  }
  expect(listFor('afterSalah')).toEqual(general)
})

test('the order follows the Ibn Baz fatwa', () => {
  expect(afterSalah('fajr').map(t => t.id)).toEqual(['66-istighfar', '66-salam', '67', '68', '72', '69-tasbih', '69-tahlil', '71', '70-ikhlas', '70-falaq', '70-nas'])
  expect(afterSalah('dhuhr').map(t => t.id)).toEqual(['66-istighfar', '66-salam', '67', '68', '69-tasbih', '69-tahlil', '71', '70-ikhlas', '70-falaq', '70-nas'])
})

test('old stored days load an empty third slot, valid slots survive, malformed metadata and new days reset', () => {
  const old = { day: '2026-10-10', morning: { ...emptyReading(), index: 2 }, evening: emptyReading() }
  expect(readDay(old, old.day).afterSalah).toEqual(emptyAfterSalah())
  expect(readDay(old, old.day).morning.index).toBe(2)
  const day = fresh()
  day.afterSalah.counts['66-istighfar'] = 2
  expect(readDay(day, day.day)).toEqual(day)
  expect(readDay(day, '2026-10-11')).toEqual(emptyDay('2026-10-11'))
  expect(readDay({ ...day, afterSalah: { ...day.afterSalah, pray: 'sunrise' } }, day.day).afterSalah).toEqual(emptyAfterSalah())
})

test('one slot keeps the same prayer and resets counts, hidden and done for a different timestamp or general reading', () => {
  const day = fresh()
  day.afterSalah = { ...day.afterSalah, counts: { '66-istighfar': 3 }, index: 4, isDone: true, isHidden: true }
  expect(syncAfterSalah(day, last)).toBe(day)
  const next = syncAfterSalah(day, { pray: 'asr', at: NOW + 3 * 3600_000 })
  expect(next.afterSalah).toEqual({ ...emptyReading(), pray: 'asr', at: NOW + 3 * 3600_000 })
  expect(next.morning).toBe(day.morning)
  expect(syncAfterSalah(day, null).afterSalah).toEqual(emptyAfterSalah())
})

test('the offer starts after the shared card duration, stays without expiry, and done, hidden or no times fall back', () => {
  const day = fresh()
  for (const [offset, expected] of [[-1, 'morning'], [0, 'morning'], [IN_MS - 1, 'morning'], [IN_MS, 'afterSalah'], [3 * 3600_000, 'afterSalah']] as const) {
    expect(setAt(new Date(NOW + offset), day, last)).toBe(expected)
  }
  expect(setAt(new Date(NOW), day, null)).toBe('morning')
  expect(setAt(new Date(2026, 9, 10, 20), day, null)).toBe('evening')
  for (const key of ['isDone', 'isHidden'] as const) {
    expect(setAt(new Date(NOW + IN_MS), { ...day, afterSalah: { ...day.afterSalah, [key]: true } }, last)).toBe('morning')
  }
  expect(setAt(new Date(NOW), day, last, undefined, last)).toBe('afterSalah')
  expect(setAt(new Date(NOW), day, last, undefined, { ...last, at: NOW - 1 })).toBe('morning')
  expect(setAt(new Date(NOW), day, last, 'evening')).toBe('evening')
  expect(setAt(new Date(NOW + 7200_000), day, null, 'afterSalah')).toBe('afterSalah')
})

test('the shared count, advance, progress, undo, last-item completion and reset hint use the prayer list', () => {
  const day = syncAfterSalah(fresh(), { pray: 'fajr', at: NOW })
  const reading = { ...day.afterSalah, index: 8 }
  expect(currentOf('afterSalah', reading).times).toBe(3)
  const before = { ...reading, counts: { '70-ikhlas': 2 } }
  const after = step('afterSalah', before, { act: 'count' })
  expect(shouldAdvance('afterSalah', before, after)).toBe(true)
  expect(after.pray).toBe('fajr')
  expect(overall('afterSalah', after)).toBe(1 / 11)
  expect(step('afterSalah', after, { act: 'back' }).counts['70-ikhlas']).toBe(2)
  // Only a fully counted set finishes on next; otherwise the reader asks first.
  expect(step('afterSalah', { ...reading, index: 10, counts: { '70-nas': 3 } }, { act: 'next' }).isDone).toBe(false)
  const full = Object.fromEntries(listFor('afterSalah', reading).map(t => [t.id, t.times]))
  const done = step('afterSalah', { ...reading, index: 10, counts: full }, { act: 'next' })
  expect(done.isDone).toBe(true)
  expect(resetHint('afterSalah')).toBe('/athkar after-salah reset → to read again')
})

test('every new passage has sizing metrics and fits the same two-line area and fixed height', () => {
  for (const thikr of AFTER_SALAH) {
    expect(TEXT_WIDTH[thikr.id]).toBeDefined()
    for (const width of [200, 500, 860]) {
      const model = { phase: 'reading' as const, thikrId: thikr.id, period: 'afterSalah' as const }
      const fit = fitOf(model, width)
      expect(fit.rows * 1.7 * fit.size).toBeLessThanOrEqual(fit.area)
      expect(bandHeight(model, width)).toBe(77)
    }
  }
})

test('after-salah waits while a morning reading is being counted, unless asked for from the athan card', () => {
  const day = emptyDay('2026-10-10')
  const last = { pray: 'fajr' as const, at: NOW }
  const busy = { ...day, morning: { ...day.morning, counts: { x: 1 } } }
  expect(setAt(new Date(NOW + IN_MS), busy, last)).toBe('morning')
  expect(setAt(new Date(NOW + IN_MS), { ...busy, morning: { ...busy.morning, isDone: true } }, last)).toBe('afterSalah')
  expect(setAt(new Date(NOW + IN_MS), { ...busy, morning: { ...busy.morning, isHidden: true } }, last)).toBe('afterSalah')
  expect(setAt(new Date(NOW), busy, last, undefined, last)).toBe('afterSalah')
})
