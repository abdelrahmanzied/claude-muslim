import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { KAHF_CARD_MS, KAHF_TITLE } from '../../src/features/friday/logic.ts'
import { runPanelAction } from '../../src/shared/panel/signal.ts'
import { dayOf, emptyDay } from '../../src/features/athkar/logic.ts'
import { dayKey } from '../../src/shared/friday/index.ts'
import { ATHKAR_QUIET, configRows } from '../fixtures/config.ts'

const MUNICH = 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE'
const OPTIONS = { ...ATHKAR_QUIET, thikr: false, salahShow: 'off', salahAthan: false, salahPlace: MUNICH }
const { salahPlace: _place, ...NO_PLACE } = OPTIONS
// Friday 2026-10-09 in Munich: Dhuhr about 11:02 UTC, Maghrib about 16:25 UTC; the window is 11:32 to 16:25.
const MORNING = Date.parse('2026-10-09T05:00:00Z')
const BEFORE_WINDOW = Date.parse('2026-10-09T11:20:00Z')
const INSIDE = Date.parse('2026-10-09T14:00:00Z')
const AFTER_MAGHRIB = Date.parse('2026-10-09T17:30:00Z')
const THURSDAY = Date.parse('2026-10-08T14:00:00Z')

const run = (args: string) => ({ command: 'friday', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const band = (surface: 'terminal' | 'desktop') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'friday-test',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
})

const SURFACES = ['terminal', 'desktop'] as const
type Surface = (typeof SURFACES)[number]

const fixture = (on: On, now: number, entries: Record<string, unknown> = {}, surface: Surface = 'terminal') => {
  on('session.surface', async () => ({ value: surface }))
  mock.env(on, { TERM_PROGRAM: 'WarpTerminal' })
  const stored: Record<string, unknown> = { arabicTerminals: { WarpTerminal: 'plain' }, ...entries }
  on('store.get', async (_$, e) => ({ value: stored[e.key] }))
  on('store.set', async (_$, e) => (stored[e.key] = e.value, { value: undefined }))
  const clock = mock.clock(on, { now })
  const writes: { key: string; value: unknown }[] = []
  on('config.list', async () => ({ value: configRows }))
  on('config.set', async (_$, e) => (writes.push({ key: e.key, value: e.value }), { value: e.value }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })

  return { clock, writes, stored }
}
type Ui = { find: (q: { type: string; text?: string; key?: string }) => Promise<unknown> }
// The card is up: the terminal's line holding the title, the desktop's Client picture.
const shown = (ui: Ui, surface: Surface) => surface === 'terminal' ? ui.find({ type: 'Text', text: KAHF_TITLE }) : ui.find({ type: 'Client', key: 'friday-kahf' })

test('/friday tells the day, both settings and whether the reminder was shown today', { options: OPTIONS }, async ($, on) => {
  fixture(on, INSIDE)
  const friday = (await $.command.run(run(''))).text!
  expect(friday.split('\n')[0]).toBe('**Muslim › Friday**')
  expect(friday).toContain('| Today | Friday on this device\'s local day | Friday |')
  expect(friday).toContain('| Salawat | Salawat on the Prophet in the thikr line on Friday, from Fajr | on |')
  expect(friday).toContain('| Reminder | Whether it was shown today | not shown yet today |')
})

test('/friday on another day says it is not Friday', { options: OPTIONS }, async ($, on) => {
  fixture(on, THURSDAY)
  expect((await $.command.run(run(''))).text).toContain('| Today | Friday on this device\'s local day | not Friday |')
})

test('/friday salawat and /friday kahf change their own setting only', { options: OPTIONS }, async ($, on) => {
  const { writes } = fixture(on, INSIDE)
  await $.command.run(run('salawat off'))
  await $.command.run(run('kahf off'))
  await $.command.run(run('kahf on'))
  expect(writes).toEqual([
    { key: 'muslim.fridaySalawat', value: false },
    { key: 'muslim.fridayKahf', value: false },
    { key: 'muslim.fridayKahf', value: true },
  ])
})

test('/friday help is the table', { options: OPTIONS }, async ($, on) => {
  fixture(on, INSIDE)
  expect((await $.command.run(run('help'))).text?.split('\n')[0]).toBe('**Muslim › Friday › Help**')
})

const waitFor = async (clock: { advance: (ms: number) => Promise<unknown> }) => { await clock.advance(1600) }

for (const surface of SURFACES) {
  test(`${surface}: /friday kahf shows the card now, on any day and time, and it hides itself after three minutes`, { options: OPTIONS }, async ($, on) => {
    const { clock } = fixture(on, THURSDAY, {}, surface)
    const ui = await $.ui.mount(band(surface))
    expect(await shown(ui, surface)).toBeUndefined()
    const reply = (await $.command.run(run('kahf'))).text!
    expect(reply).toContain('shown above the prompt')
    // Only the desktop has ▶, and only its reply says so.
    expect(reply.includes('▶')).toBe(surface === 'desktop')
    expect(await shown(ui, surface)).toBeDefined()
    await clock.advance(KAHF_CARD_MS - 1000)
    expect(await shown(ui, surface)).toBeDefined()
    await clock.advance(1100)
    expect(await shown(ui, surface)).toBeUndefined()
    await ui.unmount()
  })

  test(`${surface}: inside the window the first open session shows the reminder once and keeps the day`, { options: OPTIONS }, async ($, on) => {
    const { clock, stored } = fixture(on, INSIDE, {}, surface)
    const ui = await $.ui.mount(band(surface))
    await waitFor(clock)
    expect(await shown(ui, surface)).toBeDefined()
    expect(stored['friday.kahfDay']).toBe(dayKey(INSIDE))
    // Three minutes later it is gone and does not come back.
    await clock.advance(KAHF_CARD_MS + 100)
    expect(await shown(ui, surface)).toBeUndefined()
    await clock.advance(60_000)
    expect(await shown(ui, surface)).toBeUndefined()
    await ui.unmount()
  })

  for (const [name, now] of [['in the morning', MORNING], ['just before the window', BEFORE_WINDOW], ['after Maghrib', AFTER_MAGHRIB], ['on a Thursday', THURSDAY]] as const) {
    test(`${surface}: ${name} nothing shows by itself`, { options: OPTIONS }, async ($, on) => {
      const { clock, stored } = fixture(on, now, {}, surface)
      const ui = await $.ui.mount(band(surface))
      await waitFor(clock)
      await clock.advance(30_000)
      expect(await shown(ui, surface)).toBeUndefined()
      expect(stored['friday.kahfDay']).toBeUndefined()
      await ui.unmount()
    })
  }

  test(`${surface}: opened before the window, it shows when the window opens (Jumu'ah + 30 min), not before`, { options: OPTIONS }, async ($, on) => {
    // Jumu'ah (Dhuhr) in Munich is about 11:02 UTC, so the window opens about 11:32.
    const { clock, stored } = fixture(on, Date.parse('2026-10-09T11:20:00Z'), {}, surface)
    const ui = await $.ui.mount(band(surface))
    await waitFor(clock)
    await clock.advance(8 * 60_000)
    expect(await shown(ui, surface)).toBeUndefined()
    expect(stored['friday.kahfDay']).toBeUndefined()
    // By 11:40 it opened inside the window (and is up for three minutes at most).
    await clock.advance(12 * 60_000)
    expect(stored['friday.kahfDay']).toBe(dayKey(Date.parse('2026-10-09T11:40:00Z')))

    await ui.unmount()
  })

  test(`${surface}: already shown today, on any session, it does not show again`, { options: OPTIONS }, async ($, on) => {
    const { clock } = fixture(on, INSIDE, { 'friday.kahfDay': dayKey(INSIDE) }, surface)
    const ui = await $.ui.mount(band(surface))
    await waitFor(clock)
    expect(await shown(ui, surface)).toBeUndefined()
    await ui.unmount()
  })

  test(`${surface}: with the reminder off it never shows by itself, while the command still opens it`, { options: { ...OPTIONS, fridayKahf: false } }, async ($, on) => {
    const { clock } = fixture(on, INSIDE, {}, surface)
    const ui = await $.ui.mount(band(surface))
    await waitFor(clock)
    expect(await shown(ui, surface)).toBeUndefined()
    await $.command.run(run('kahf'))
    expect(await shown(ui, surface)).toBeDefined()
    await ui.unmount()
  })

  test(`${surface}: without a saved city there is no window and nothing shows by itself`, { options: NO_PLACE }, async ($, on) => {
    const { clock } = fixture(on, INSIDE, {}, surface)
    const ui = await $.ui.mount(band(surface))
    await waitFor(clock)
    expect(await shown(ui, surface)).toBeUndefined()
    await $.command.run(run('kahf'))
    expect(await shown(ui, surface)).toBeDefined()
    await ui.unmount()
  })

  test(`${surface}: another card above the prompt makes it wait, then it shows when that card closes`, { options: OPTIONS }, async ($, on) => {
    const { clock, stored } = fixture(on, INSIDE, {}, surface)
    // The athan card is showing for another minute.
    on('state.get', { plugin: 'muslim', key: 'salahCard' }, async (_$, e, next) => {
      const actual = await next(e)

      return { value: { value: { pray: 'dhuhr', time: '12:00', isFolded: false, foldsAt: INSIDE + 30_000, until: INSIDE + 60_000 }, version: actual.value?.version ?? 0 } }
    })
    const ui = await $.ui.mount(band(surface))
    await waitFor(clock)
    expect(await shown(ui, surface)).toBeUndefined()
    expect(stored['friday.kahfDay']).toBeUndefined()
    await clock.advance(61_000)
    expect(await shown(ui, surface)).toBeDefined()
    await ui.unmount()
  })

  test(`${surface}: an open athkar reading makes it wait, then it shows when the reading is closed`, { options: OPTIONS }, async ($, on) => {
    const { clock, stored } = fixture(on, INSIDE, { salahSetupLater: true }, surface)
    // The real athkar feature draws the reading (a day to read from); the Friday card must not sit on it.
    const kept = { day: emptyDay(dayOf(new Date(INSIDE))) }
    on('state.get', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => { const result = await next(e); return { value: { value: kept.day, version: result.value?.version ?? 0 } } })
    on('state.set', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => { const result = await next(e); kept.day = e.value as typeof kept.day; return result })
    on('state.get', { plugin: 'muslim', key: 'salahLast' }, async () => ({ value: { value: null, version: 0 } }))
    await $.command.run({ command: 'athkar', args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
    const ui = await $.ui.mount(band(surface))
    // Open on purpose, as the pane's button does; a folded row leaves the slot free.
    await runPanelAction('athkar-open')
    await ui.redraw()
    await waitFor(clock)
    expect(await ui.find({ type: 'Client', key: 'athkar' }), 'the athkar reading is open').toBeDefined()
    expect(await shown(ui, surface)).toBeUndefined()
    expect(stored['friday.kahfDay']).toBeUndefined()
    await ui.post({ act: 'hide' }, { in: 'athkar' })
    await ui.redraw()
    await clock.advance(16_000)
    expect(await shown(ui, surface)).toBeDefined()
    await ui.unmount()
  })

  if (surface === 'desktop') {
    test('desktop: ▶ (Enter or Space) plays Surat al-Kahf through the Quran player and closes the card', { options: OPTIONS }, async ($, on) => {
      fixture(on, THURSDAY, {}, surface)
      const played: unknown[] = []
      on('state.set', { plugin: 'muslim', key: 'quranSurah' }, async (_$, e, next) => { played.push(e.value); return next(e) })
      const ui = await $.ui.mount(band(surface))
      // The Quran feature connects its player actions when it is first used.
      await $.command.run({ command: 'quran', args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
      await $.command.run(run('kahf'))
      await ui.post({ act: 'key', key: 'return' }, { in: 'friday-kahf' })
      expect(played).toContain(18)
      expect(await shown(ui, surface)).toBeUndefined()
      await ui.unmount()
    })
  }

  test(`${surface}: the × closes the card before its three minutes`, { options: OPTIONS }, async ($, on) => {
    fixture(on, THURSDAY, {}, surface)
    const ui = await $.ui.mount(band(surface))
    await $.command.run(run('kahf'))
    if (surface === 'terminal') await ui.press({ key: 'friday-kahf-close' })
    else await ui.post({ act: 'hide' }, { in: 'friday-kahf' })
    expect(await shown(ui, surface)).toBeUndefined()
    await ui.unmount()
  })

  test(`${surface}: the demo shows the card for six seconds and saves nothing`, { options: OPTIONS }, async ($, on) => {
    const { clock, writes, stored } = fixture(on, THURSDAY, {}, surface)
    const ui = await $.ui.mount(band(surface))
    expect((await $.command.run(run('demo'))).text).toContain('Friday demo')
    expect(await shown(ui, surface)).toBeDefined()
    await clock.advance(6600)
    expect(await shown(ui, surface)).toBeUndefined()
    expect(stored['friday.kahfDay']).toBeUndefined()
    expect(writes).toEqual([])
    await ui.unmount()
  })

  test(`${surface}: /friday replies the same: status, settings and help`, { options: OPTIONS }, async ($, on) => {
    const { writes } = fixture(on, INSIDE, {}, surface)
    const status = (await $.command.run(run(''))).text!
    expect(status).toContain('| Today | Friday on this device\'s local day | Friday |')
    expect(status).toContain('| Al-Kahf |')
    expect((await $.command.run(run('help'))).text?.split('\n')[0]).toBe('**Muslim › Friday › Help**')
    await $.command.run(run('salawat off'))
    await $.command.run(run('kahf off'))
    expect(writes.map(w => w.key)).toEqual(['muslim.fridaySalawat', 'muslim.fridayKahf'])
  })
}
