import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { TOTAL_MS as MINARET_MS } from '../../src/features/salah/minaret.ts'
import { demoDuration } from '../../src/features/salah/demo.ts'
import { DEMO_MS } from '../../src/features/friday/demo.ts'
import { ALKAHF_CARD_MS, ALKAHF_TITLE } from '../../src/features/friday/logic.ts'
import { defaultReciter } from '../../src/features/quran/catalog.ts'
import { QURAN_CATALOG } from '../../src/features/quran/catalog-data.ts'
import { runPanelAction } from '../../src/shared/panel/signal.ts'
import { dayOf, emptyDay } from '../../src/features/athkar/logic.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'
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
// How long the demo's athan step lasts on each surface (salah's own demo lengths).
const athanMs = (surface: Surface) => demoDuration(surface)

const fixture = (on: On, now: number, entries: Record<string, unknown> = {}, surface: Surface = 'terminal', env: Record<string, string> = {}) => {
  on('session.surface', async () => ({ value: surface }))
  mock.env(on, { TERM_PROGRAM: 'WarpTerminal', ...env })
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
const shown = (ui: Ui, surface: Surface) => surface === 'terminal' ? ui.find({ type: 'Text', text: ALKAHF_TITLE }) : ui.find({ type: 'Client', key: 'friday-alkahf' })

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

test('/friday salawat and /friday alkahf change their own setting only', { options: OPTIONS }, async ($, on) => {
  const { writes } = fixture(on, INSIDE)
  await $.command.run(run('salawat off'))
  await $.command.run(run('alkahf off'))
  await $.command.run(run('alkahf on'))
  expect(writes).toEqual([
    { key: 'muslim.fridaySalawat', value: false },
    { key: 'muslim.fridayAlkahf', value: false },
    { key: 'muslim.fridayAlkahf', value: true },
  ])
})

test('/friday help is the table', { options: OPTIONS }, async ($, on) => {
  fixture(on, INSIDE)
  expect((await $.command.run(run('help'))).text?.split('\n')[0]).toBe('**Muslim › Friday › Help**')
})

const waitFor = async (clock: { advance: (ms: number) => Promise<unknown> }) => { await clock.advance(1600) }

for (const surface of SURFACES) {
  test(`${surface}: /friday alkahf shows the card now, on any day and time, and it hides itself after one minute`, { options: OPTIONS }, async ($, on) => {
    const { clock } = fixture(on, THURSDAY, {}, surface)
    const ui = await $.ui.mount(band(surface))
    expect(await shown(ui, surface)).toBeUndefined()
    const reply = (await $.command.run(run('alkahf'))).text!
    expect(reply).toContain('shown above the prompt')
    // Only the desktop has ▶, and only its reply says so.
    expect(reply.includes('▶')).toBe(surface === 'desktop')
    expect(await shown(ui, surface)).toBeDefined()
    await clock.advance(ALKAHF_CARD_MS - 1000)
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
    expect(stored['friday.alkahfDay']).toBe(dayKey(INSIDE))
    // Three minutes later it is gone and does not come back.
    await clock.advance(ALKAHF_CARD_MS + 100)
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
      expect(stored['friday.alkahfDay']).toBeUndefined()
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
    expect(stored['friday.alkahfDay']).toBeUndefined()
    // By 11:40 it opened inside the window (and is up for one minute at most).
    await clock.advance(12 * 60_000)
    expect(stored['friday.alkahfDay']).toBe(dayKey(Date.parse('2026-10-09T11:40:00Z')))

    await ui.unmount()
  })

  test(`${surface}: already shown today, on any session, it does not show again`, { options: OPTIONS }, async ($, on) => {
    const { clock } = fixture(on, INSIDE, { 'friday.alkahfDay': dayKey(INSIDE) }, surface)
    const ui = await $.ui.mount(band(surface))
    await waitFor(clock)
    expect(await shown(ui, surface)).toBeUndefined()
    await ui.unmount()
  })

  test(`${surface}: with the reminder off it never shows by itself, while the command still opens it`, { options: { ...OPTIONS, fridayAlkahf: false } }, async ($, on) => {
    const { clock } = fixture(on, INSIDE, {}, surface)
    const ui = await $.ui.mount(band(surface))
    await waitFor(clock)
    expect(await shown(ui, surface)).toBeUndefined()
    await $.command.run(run('alkahf'))
    expect(await shown(ui, surface)).toBeDefined()
    await ui.unmount()
  })

  test(`${surface}: without a saved city there is no window and nothing shows by itself`, { options: NO_PLACE }, async ($, on) => {
    const { clock } = fixture(on, INSIDE, {}, surface)
    const ui = await $.ui.mount(band(surface))
    await waitFor(clock)
    expect(await shown(ui, surface)).toBeUndefined()
    await $.command.run(run('alkahf'))
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
    expect(stored['friday.alkahfDay']).toBeUndefined()
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
    expect(stored['friday.alkahfDay']).toBeUndefined()
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
      await $.command.run(run('alkahf'))
      await ui.post({ act: 'key', key: 'return' }, { in: 'friday-alkahf' })
      expect(played).toContain(18)
      expect(await shown(ui, surface)).toBeUndefined()
      await ui.unmount()
    })
  }

  test(`${surface}: the × closes the card before its minute`, { options: OPTIONS }, async ($, on) => {
    fixture(on, THURSDAY, {}, surface)
    const ui = await $.ui.mount(band(surface))
    await $.command.run(run('alkahf'))
    if (surface === 'terminal') await ui.press({ key: 'friday-alkahf-close' })
    else await ui.post({ act: 'hide' }, { in: 'friday-alkahf' })
    expect(await shown(ui, surface)).toBeUndefined()
    await ui.unmount()
  })

  test(`${surface}: the demo plays the athan card named الجمعة, then the Al-Kahf card, each showing and going, and saves nothing`, { options: OPTIONS }, async ($, on) => {
    const { clock, writes, stored } = fixture(on, THURSDAY, {}, surface)
    const ui = await $.ui.mount(band(surface))
    expect((await $.command.run(run('demo'))).text).toContain('Friday demo')
    // Step 1: the real athan (the terminal's minaret, which folds to a line naming الجمعة); the Al-Kahf card waits.
    expect(await shown(ui, surface)).toBeUndefined()
    let spent = 0
    if (surface === 'terminal') {
      expect(await ui.find({ text: '▐███▌' }), 'minaret').toBeDefined()
      await clock.advance(MINARET_MS + 500)
      spent = MINARET_MS + 500
      expect(await ui.find({ type: 'Text', text: 'حان وقت صلاة الجمعة' }), 'athan line').toBeDefined()
    }
    // None of the old fake rows.
    expect(await ui.find({ type: 'Box', key: 'friday-demo-rows' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: '☾ الجمعة ١٢:٣٠' })).toBeUndefined()
    await clock.advance(athanMs(surface) + 500 - spent)
    // Step 2: the Al-Kahf card, then it goes too.
    expect(await shown(ui, surface), 'card after athan').toBeDefined()
    if (surface === 'terminal') expect(await ui.find({ type: 'Text', text: 'حان وقت صلاة الجمعة' })).toBeUndefined()
    await clock.advance(DEMO_MS - 1500)
    expect(await shown(ui, surface), 'card still').toBeDefined()
    await clock.advance(1100)
    expect(await shown(ui, surface)).toBeUndefined()
    expect(stored['friday.alkahfDay']).toBeUndefined()
    expect(writes).toEqual([])
    await ui.unmount()
  })

  test(`${surface}: with no city /friday says the automatic reminder needs one, and /friday alkahf still works`, { options: NO_PLACE }, async ($, on) => {
    fixture(on, INSIDE, {}, surface)
    const status = (await $.command.run(run(''))).text!
    expect(status).toContain('The automatic Al-Kahf reminder needs a city: set one with `/salah city`.')
    expect((await $.command.run(run('alkahf'))).text).toContain('shown above the prompt')
  })

  test(`${surface}: with a city /friday has no city line`, { options: OPTIONS }, async ($, on) => {
    fixture(on, INSIDE, {}, surface)
    expect((await $.command.run(run(''))).text).not.toContain('needs a city')
  })

  test(`${surface}: /friday replies the same: status, settings and help`, { options: OPTIONS }, async ($, on) => {
    const { writes } = fixture(on, INSIDE, {}, surface)
    const status = (await $.command.run(run(''))).text!
    expect(status).toContain('| Today | Friday on this device\'s local day | Friday |')
    expect(status).toContain('| Al-Kahf |')
    expect((await $.command.run(run('help'))).text?.split('\n')[0]).toBe('**Muslim › Friday › Help**')
    await $.command.run(run('salawat off'))
    await $.command.run(run('alkahf off'))
    expect(writes.map(w => w.key)).toEqual(['muslim.fridaySalawat', 'muslim.fridayAlkahf'])
  })
}

// ▶ / «افتح في المتصفح» on each OS, through the real Quran feature (connected by /quran).
const FIRST = defaultReciter(QURAN_CATALOG)
const OTHER = QURAN_CATALOG.reciters.find(r => r.key !== FIRST.key)!
const quranRun = { command: 'quran', args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } }
const isOpen = (argv: readonly string[]) => argv[0] === 'xdg-open' || (argv[0] === 'cmd' && argv[3] === 'start')

// `uname` answers the OS probe; every other process succeeds (or fails, for the browser, when `opens` is false).
const spawns = (on: On, uname: string, opens = true) => {
  const argvs: string[][] = []
  on('process.run', async (_$, e) => {
    const argv = [...e.argv]
    argvs.push(argv)

    return { value: { exitCode: isOpen(argv) && !opens ? 1 : 0, stdout: argv[0] === 'uname' ? `${uname}\n` : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  return argvs
}
const watch = (on: On) => {
  const surahs: unknown[] = []
  const toasts: string[] = []
  on('state.set', { plugin: 'muslim', key: 'quranSurah' }, async (_$, e, next) => { surahs.push(e.value); return next(e) })
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })

  return { surahs, toasts }
}
const cardProps = async (ui: Ui) => ((await ui.find({ type: 'Client', key: 'friday-alkahf' })) as { props: { props: { reciter: string; inBrowser: boolean } } }).props.props

test('macOS: the pill reads «▶ استمع» and ▶ plays Al-Kahf in the player; no browser opens', { options: OPTIONS }, async ($, on) => {
  fixture(on, THURSDAY, {}, 'desktop')
  const argvs = spawns(on, 'Darwin')
  const { surahs } = watch(on)
  const ui = await $.ui.mount(band('desktop'))
  await $.command.run(quranRun)
  await $.command.run(run('alkahf'))
  expect(await cardProps(ui)).toMatchObject({ reciter: FIRST.name, inBrowser: false })
  await ui.post({ act: 'key', key: 'return' }, { in: 'friday-alkahf' })
  expect(surahs).toContain(18)
  expect(argvs.filter(isOpen)).toEqual([])
  expect(await shown(ui, 'desktop')).toBeUndefined()
  await ui.unmount()
})

test('Windows: the pill reads «↗ افتح في المتصفح»; pressing it opens the whole surah 18 MP3 with start and closes the card', { options: OPTIONS }, async ($, on) => {
  fixture(on, THURSDAY, {}, 'desktop', { OS: 'Windows_NT' })
  const argvs = spawns(on, '')
  const { surahs, toasts } = watch(on)
  const ui = await $.ui.mount(band('desktop'))
  await $.command.run(quranRun)
  await $.command.run(run('alkahf'))
  expect(await cardProps(ui)).toMatchObject({ reciter: FIRST.name, inBrowser: true })
  await ui.post({ act: 'key', key: 'return' }, { in: 'friday-alkahf' })
  expect(argvs.filter(isOpen)).toEqual([['cmd', '/d', '/c', 'start', '', `${FIRST.server}018.mp3`]])
  expect(surahs).not.toContain(18)
  expect(toasts).toEqual([])
  expect(await shown(ui, 'desktop')).toBeUndefined()
  await ui.unmount()
})

test('Linux: the same with xdg-open, the reciter last used, and no #t= segment', { options: OPTIONS }, async ($, on) => {
  fixture(on, THURSDAY, { 'quran.reciter': OTHER.key }, 'desktop')
  const argvs = spawns(on, 'Linux')
  const { surahs } = watch(on)
  const ui = await $.ui.mount(band('desktop'))
  await $.command.run(quranRun)
  await $.command.run(run('alkahf'))
  expect(await cardProps(ui)).toMatchObject({ reciter: OTHER.name, inBrowser: true })
  await ui.post({ act: 'key', key: 'return' }, { in: 'friday-alkahf' })
  expect(argvs.filter(isOpen)).toEqual([['xdg-open', `${OTHER.server}018.mp3`]])
  expect(argvs.filter(isOpen)[0]![1]).not.toContain('#t=')
  expect(surahs).not.toContain(18)
  await ui.unmount()
})

test('Linux: a browser that does not open shows the Quran player\'s toast; the card still closes', { options: OPTIONS }, async ($, on) => {
  fixture(on, THURSDAY, {}, 'desktop')
  spawns(on, 'Linux', false)
  const { toasts } = watch(on)
  const ui = await $.ui.mount(band('desktop'))
  await $.command.run(quranRun)
  await $.command.run(run('alkahf'))
  await ui.post({ act: 'key', key: 'return' }, { in: 'friday-alkahf' })
  expect(toasts).toEqual(['Could not open the browser.'])
  expect(await shown(ui, 'desktop')).toBeUndefined()
  await ui.unmount()
})

test('terminal: the line reads «سورة الكهف · يوم الجمعة» with the ×, never a reciter (it plays no Quran)', { options: OPTIONS }, async ($, on) => {
  fixture(on, THURSDAY, { 'quran.reciter': OTHER.key }, 'terminal')
  spawns(on, 'Darwin')
  const ui = await $.ui.mount(band('terminal'))
  await $.command.run(quranRun)
  await $.command.run(run('alkahf'))
  expect(await ui.find({ type: 'Text', text: 'سورة الكهف · يوم الجمعة' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'بصوت' })).toBeUndefined()
  expect(await ui.find({ type: 'Button', key: 'friday-alkahf-close' })).toBeDefined()
  await ui.unmount()
})

test('before the Quran is ready the card names only the day', { options: OPTIONS }, async ($, on) => {
  fixture(on, THURSDAY, {}, 'terminal')
  const ui = await $.ui.mount(band('terminal'))
  await $.command.run(run('alkahf'))
  expect(await ui.find({ type: 'Text', text: 'سورة الكهف · يوم الجمعة' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'بصوت' })).toBeUndefined()
  await ui.unmount()
})
