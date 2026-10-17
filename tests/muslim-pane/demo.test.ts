import { expect, test } from 'claude-code/testing'
import { DEMO_ATHKAR_DONE_MS, DEMO_ATHKAR_TOTAL, DEMO_DURATION_MS, DEMO_FOLD_MS, DEMO_TICK_MS, DEMO_UNFOLD_MS, demoAthkar, demoAthkarDone, demoFolds, demoNow, demoQuran, demoReply, demoSalah, demoTerminalReply, isDemoOver } from '../../src/features/muslim-pane/demo.ts'
import { paneModel } from '../../src/features/muslim-pane/model.ts'
import { TITLE } from '../../src/features/athkar/logic.ts'
import { ARABIC } from '../../src/shared/pray/names.ts'

test('the tour is about ten seconds and ticks fast enough to animate', () => {
  expect(DEMO_DURATION_MS).toBe(10_000)
  expect(DEMO_TICK_MS).toBeLessThanOrEqual(250)
  expect(isDemoOver(DEMO_DURATION_MS - 1)).toBe(false)
  expect(isDemoOver(DEMO_DURATION_MS)).toBe(true)
})

test('cards start folded, unfold one after another, then fold back', () => {
  expect(demoFolds(0)).toEqual({ prayer: true, quran: true, athkar: true })
  expect(demoFolds(DEMO_UNFOLD_MS.prayer)).toEqual({ prayer: false, quran: true, athkar: true })
  expect(demoFolds(DEMO_UNFOLD_MS.quran)).toEqual({ prayer: false, quran: false, athkar: true })
  expect(demoFolds(DEMO_UNFOLD_MS.athkar)).toEqual({ prayer: false, quran: false, athkar: false })
  expect(demoFolds(DEMO_FOLD_MS.athkar)).toEqual({ prayer: false, quran: false, athkar: true })
  expect(demoFolds(DEMO_FOLD_MS.quran)).toEqual({ prayer: false, quran: true, athkar: true })
  expect(demoFolds(DEMO_DURATION_MS - 1)).toEqual({ prayer: true, quran: true, athkar: true })
  expect(DEMO_UNFOLD_MS.prayer).toBeLessThan(DEMO_UNFOLD_MS.quran)
  expect(DEMO_UNFOLD_MS.quran).toBeLessThan(DEMO_UNFOLD_MS.athkar)
  expect(DEMO_ATHKAR_DONE_MS).toBeLessThan(DEMO_FOLD_MS.athkar)
  expect(DEMO_FOLD_MS.prayer).toBeLessThan(DEMO_DURATION_MS)
})

test('the prayer feed is Fajr at 05:00 with a countdown that runs down', () => {
  const salah = demoSalah()
  expect(salah.next.pray).toBe('fajr')
  expect(salah.next.clock).toBe('05:00')
  expect(salah.prays.map(p => p.pray)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  const card = (elapsed: number) => paneModel({ salah, quran: null, athkar: null }, demoNow(elapsed), 360, 'orange').prayer
  expect(card(0).nextName).toBe(ARABIC.fajr)
  expect(card(0).until).toContain('٤٨')
  expect(card(0).until).not.toBe(card(DEMO_DURATION_MS).until)
  expect(card(DEMO_DURATION_MS).rows.filter(r => r.state === 'next')).toHaveLength(1)
})

test('the Quran feed looks playing and its progress advances', () => {
  const a = demoQuran(0, '<svg/>'), b = demoQuran(DEMO_DURATION_MS, '<svg/>')
  expect(a.isPlaying && a.isLive).toBe(true)
  expect(a.status).toBe('يتلى الآن')
  expect(a.surah.startsWith('سورة ')).toBe(true)
  expect(b.progress).toBeGreaterThan(a.progress)
  expect(b.progress).toBeLessThan(1)
  expect(a.elapsed).not.toBe(b.elapsed)
})

test('the athkar fill scene by scene up to done, with the authored title', () => {
  expect(demoAthkarDone(0)).toBe(0)
  expect(demoAthkarDone(DEMO_UNFOLD_MS.athkar)).toBe(0)
  expect(demoAthkarDone(DEMO_ATHKAR_DONE_MS)).toBe(DEMO_ATHKAR_TOTAL)
  let last = 0
  for (let t = 0; t <= DEMO_DURATION_MS; t += DEMO_TICK_MS) { const n = demoAthkarDone(t); expect(n).toBeGreaterThanOrEqual(last); last = n }
  const done = demoAthkar(DEMO_ATHKAR_DONE_MS, TITLE.morning)
  expect(done.isDone).toBe(true)
  expect(done.title).toBe(TITLE.morning)
  expect(demoAthkar(0, TITLE.morning).isDone).toBe(false)
})

test('the replies name the tour; a terminal is told it is desktop only', () => {
  expect(demoReply()).toContain('Muslim pane demo')
  expect(demoTerminalReply()).toBe('The Muslim pane demo is desktop only. Run /muslim pane demo in the Claude desktop app.')
})
