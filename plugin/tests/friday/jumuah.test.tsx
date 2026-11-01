// Jumu'ah: on a device-local Friday the Dhuhr slot is named «الجمعة» / Jumu'ah wherever a prayer name shows,
// on the terminal and on the desktop alike. Each place is checked on its own surface.

import { ATHKAR_QUIET } from '../fixtures/config.ts'
import { describe, expect, mock, test } from 'claude-code/testing'

import { textLines, paneModel, prayerCard, prayerRows } from '../../src/features/muslim-pane/model.ts'
import { athanSvg } from '../../src/features/salah/card.ts'
import { TOTAL_MS } from '../../src/features/salah/minaret.ts'
import { reviewRows } from '../../src/features/salah/review.ts'
import { NO_ADJUST } from '../../src/features/salah/times.ts'
import { callText } from '../../src/features/thikr/call.ts'
import { athanText, prayLine } from '../../src/shared/pray/line.ts'
import type { PanelSalah } from '../../src/shared/panel/signal.ts'

const MUNICH_PLACE = { name: 'Munich, Germany', latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin', country: 'DE' }
const MUNICH = { ...ATHKAR_QUIET, salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE' }
const MIN = 60_000
const FRIDAY = Date.parse('2026-10-09T11:02:00Z')
const SATURDAY = Date.parse('2026-10-10T11:02:00Z')
// Dhuhr is 13:02 in Munich, 11:02:00Z; a quarter minute before it.
const BEFORE_DHUHR = (day: string) => Date.parse(`${day}T11:01:45Z`)
const DHUHR = (at: number) => ({ pray: 'dhuhr' as const, at })
const ASR = { pray: 'asr' as const, at: FRIDAY + 4 * 60 * MIN }
const ALWAYS = { show: 'always' as const, isAthan: true }

const salah = (at: number): PanelSalah => ({
  city: 'Munich',
  prays: [
    { pray: 'fajr', at: at - 6 * 60 * MIN, clock: '05:42' },
    { pray: 'dhuhr', at, clock: '13:02' },
    { pray: 'asr', at: at + 3 * 60 * MIN, clock: '16:04' },
    { pray: 'maghrib', at: at + 5 * 60 * MIN, clock: '18:35' },
    { pray: 'isha', at: at + 7 * 60 * MIN, clock: '20:10' },
  ],
  next: { pray: 'dhuhr', at, clock: '13:02' },
  isAthan: true,
})

describe('terminal', () => {
  test('the status line counts down to Jumu\'ah, and the call says its time came', () => {
    expect(prayLine(DHUHR(FRIDAY), '13:02', { pray: 'fajr', at: FRIDAY - 6 * 60 * MIN }, FRIDAY - 10 * MIN, ALWAYS)).toBe('☾ الجمعة ١٠:٠٠')
    expect(prayLine(ASR, '16:04', DHUHR(FRIDAY), FRIDAY + MIN, ALWAYS)).toBe('حان وقت صلاة الجمعة')
    expect(athanText('dhuhr', FRIDAY)).toBe('حان وقت صلاة الجمعة')
    expect(athanText('dhuhr', SATURDAY)).toBe('حان وقت صلاة الظهر')
  })

  test('the thikr call before the prayer names Jumu\'ah', () => {
    expect(callText({ pray: 'dhuhr', at: FRIDAY }, FRIDAY - 10 * MIN)).toContain('الجمعة بعد ١٠ د')
    expect(callText({ pray: 'dhuhr', at: SATURDAY }, SATURDAY - 10 * MIN)).toContain('الظهر بعد ١٠ د')
  })

  test('the Muslim pane\'s text fallback lists the Dhuhr row as Jumu\'ah', () => {
    const lines = textLines(paneModel({ salah: salah(FRIDAY), quran: null, athkar: null }, FRIDAY - MIN, 360, 'orange'), text => `<${text}>`)
    expect(lines).toContain('▸ <الجمعة> <١٣:٠٢>')
    expect(lines.some(line => line.includes('الظهر'))).toBe(false)
  })

  test('the review form (typed boxes) names the row Jumu\'ah', () => {
    const rows = reviewRows(MUNICH_PLACE, 'mwl', NO_ADJUST, FRIDAY)
    expect(rows.map(row => row.name.trim())).toEqual(['Fajr', 'Sunrise', "Jumu'ah", 'Asr', 'Maghrib', 'Isha'])
    expect(reviewRows(MUNICH_PLACE, 'mwl', NO_ADJUST, SATURDAY).map(row => row.name.trim())[2]).toBe('Dhuhr')
  })

  for (const [day, name] of [['2026-10-09', 'الجمعة'], ['2026-10-10', 'الظهر']] as const) {
    test(`the real athan call on the terminal on ${day} says ${name}`, { options: MUNICH }, async ($, on) => {
      mock.env(on, {})
      mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
      const clock = mock.clock(on, { now: BEFORE_DHUHR(day) })
      on('session.surface', async () => ({ value: 'terminal' as const }))
      on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
      const ui = await $.ui.mount(band('terminal'))
      await clock.advance(15_000 + TOTAL_MS)
      expect(JSON.stringify(await ui.findAll({ type: 'Text' }))).toContain(`حان وقت صلاة ${name}`)
      await ui.unmount()
    })
  }
})

describe('desktop', () => {
  test('the pane\'s prayer card and rows name Jumu\'ah', () => {
    expect(prayerRows(salah(FRIDAY), FRIDAY - MIN).map(row => row.name)).toEqual(['الفجر', 'الجمعة', 'العصر', 'المغرب', 'العشاء'])
    expect(prayerCard(salah(FRIDAY), FRIDAY - MIN).nextName).toBe('الجمعة')
    expect(prayerCard(salah(SATURDAY), SATURDAY - MIN).nextName).toBe('الظهر')
  })

  test('the athan card says Jumu\'ah on a Friday and Dhuhr on any other day', () => {
    const card = (at: number) => athanSvg({ isActive: true, isFolded: false, now: 0, pray: 'dhuhr', at, time: '13:02', photo: 'QUJD', width: 800, card: { ch: 8.4, lh: 20 } }, { hoverClose: false, columns: 0 })
    expect(card(FRIDAY)).toContain('حان وقت صلاة الجمعة')
    expect(card(SATURDAY)).toContain('حان وقت صلاة الظهر')
  })

  test('the real athan card on the desktop says Jumu\'ah', { options: MUNICH }, async ($, on) => {
    mock.env(on, {})
    mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
    const clock = mock.clock(on, { now: BEFORE_DHUHR('2026-10-09') })
    on('session.surface', async () => ({ value: 'desktop' as const }))
    on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
    on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
    const ui = await $.ui.mount(band('desktop'))
    await clock.advance(15_000)
    expect(String((await ui.find({ in: 'salah-athan', type: 'Svg' }))?.props.source)).toContain('حان وقت صلاة الجمعة')
    await ui.unmount()
  })
})

// Both surfaces share the command's table.
for (const surface of ['terminal', 'desktop'] as const) {
  for (const [name, at, row] of [['Jumu\'ah on a Friday', FRIDAY, '**Jumu\'ah** · next'], ['Dhuhr on any other day', SATURDAY, '**Dhuhr** · next']] as const) {
    test(`${surface}: /salah shows today's Dhuhr row as ${name}`, { options: MUNICH }, async ($, on) => {
      mock.env(on, {})
      mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
      on('session.surface', async () => ({ value: surface }))
      mock.clock(on, { now: at - 3 * 60 * MIN })
      const text = (await $.command.run({ command: 'salah', args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })).text!
      expect(text).toContain(row)
      expect(text.includes(at === FRIDAY ? 'Dhuhr' : "Jumu'ah")).toBe(false)
    })
  }
}

function band(surface: 'terminal' | 'desktop') {
  return {
    plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'band',
    props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  }
}
