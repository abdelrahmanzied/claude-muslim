import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Day, SalahLast } from '../../types'
import { athanFrame, CARD_MS, FOLD_MS, startArea, START_LABEL } from '../../src/features/salah/card.ts'
import { ADVANCE_MS, dayOf, emptyDay, listFor, TITLE } from '../../src/features/athkar/logic.ts'
import { IDLE_MS } from '../../src/shared/card/card.ts'
import { timesOn, NO_ADJUST } from '../../src/features/salah/times.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'
import { accentHex } from '../../src/shared/color/index.ts'

const PLACE = { latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin' }
const MUNICH = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE' }
const TIMES = timesOn(PLACE, 'mwl', NO_ADJUST, Date.parse('2026-10-10T10:00:00Z'))
const band = (surface: 'desktop' | 'terminal') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'handoff',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
})
const setup = (on: On, now: number, surface: 'desktop' | 'terminal', photo = true) => {
  const clock = mock.clock(on, { now })
  const day = emptyDay(dayOf(new Date(now)))
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, athkar: day })
  mock.env(on, {})
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: 'light', provider: { plugin: 'engine', tier: 'core' }, isLocked: false }] }))
  on('fs.read', async () => photo ? ({ value: { base64: 'QUJD' } }) : ({ deny: 'Photo unavailable' }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  const held = { day, request: null as SalahLast | null, until: 0 }
  on('state.get', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => {
    const actual = await next(e)
    return { value: { value: held.day, version: actual.value?.version ?? 0 } }
  })
  on('state.set', async (_$, e, next) => {
    const result = await next(e)
    if (result.value?.isSet) {
      if (e.key === 'athkar') held.day = e.value as Day
      if (e.key === 'salahAfterSalahStart') held.request = e.value as SalahLast | null
      if (e.key === 'salahCard' && e.value) held.until = (e.value as { until: number }).until
    }
    return result
  })
  return { clock, held }
}

test('an untouched reader explicitly started on the athan card at five minutes stays at forty minutes', { options: MUNICH, timeoutMs: 60000 }, async ($, on) => {
  const { clock, held } = setup(on, TIMES.fajr + CARD_MS / 3, 'desktop')
  const ui = await $.ui.mount(band('desktop'))
  await clock.advance(0)
  const card = (await ui.find({ type: 'Client', key: 'salah-athan' }))?.props.props as Parameters<typeof athanFrame>[0]
  const area = startArea(athanFrame(card, 100))
  const x = Math.floor(((area.x0 + area.x1) / 2 + card.card.ch) / card.card.ch)
  const y = Math.floor(((area.y0 + area.y1) / 2 + card.card.lh / 2) / card.card.lh)
  await ui.resize({ columns: 100, rows: 5, in: 'salah-athan' })
  await ui.pointer({ type: 'down', button: 'left', x, y, in: 'salah-athan' })
  expect(held.request).toEqual({ pray: 'fajr', at: TIMES.fajr })
  await clock.advance(2 * CARD_MS + CARD_MS / 3)
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah', count: 0 })
  expect(held.day.afterSalah.counts).toEqual({})
  await ui.unmount()
})

for (const folded of [false, true]) {
  test(`desktop start button ${folded ? 'folded' : 'open'} closes the moment and opens Fajr's reading ready to count`, { options: { ...MUNICH, color: 'green' } }, async ($, on) => {
    const { clock, held } = setup(on, TIMES.fajr + 5000, 'desktop')
    const ui = await $.ui.mount(band('desktop'))
    await clock.advance(0)
    // A late detection still expires at the actual prayer + shared duration.
    expect(held.until).toBe(TIMES.fajr + CARD_MS)
    if (folded) await clock.advance(FOLD_MS)
    const card = (await ui.find({ type: 'Client', key: 'salah-athan' }))?.props.props as Parameters<typeof athanFrame>[0]
    expect(card).toMatchObject({ isFolded: folded })
    const area = startArea(athanFrame(card, 100))
    const x = Math.floor(((area.x0 + area.x1) / 2 + card.card.ch) / card.card.ch)
    const y = Math.floor(((area.y0 + area.y1) / 2 + card.card.lh / 2) / card.card.lh)
    await ui.resize({ columns: 100, rows: folded ? 2 : 5, in: 'salah-athan' })
    await ui.pointer({ type: 'move', x, y, in: 'salah-athan' })
    const svg = String((await ui.find({ in: 'salah-athan', type: 'Svg' }))?.props.source)
    expect(svg).toContain(START_LABEL)
    expect(svg).toContain('class="start hot"')
    expect(svg).toContain(accentHex('green', false))
    await ui.pointer({ type: 'down', button: 'left', x, y, in: 'salah-athan' })
    expect(held.request).toEqual({ pray: 'fajr', at: TIMES.fajr })
    expect(await ui.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
    const reader = async () => (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props
    expect(await reader()).toMatchObject({ period: 'afterSalah', phase: 'reading', isActive: true, count: 0 })
    expect(held.day.afterSalah).toMatchObject({ pray: 'fajr', at: TIMES.fajr })
    expect(listFor('afterSalah', held.day.afterSalah).find(t => t.id === '70-nas')).toBeDefined()
    await ui.key({ key: 'space', in: 'athkar' })
    expect(held.day.afterSalah.counts['66-istighfar']).toBe(1)
    // Close returns to the clock's period and the early-start signal cannot unhide it.
    await ui.post({ act: 'hide' }, { in: 'athkar' })
    expect(await reader()).toMatchObject({ period: 'morning' })
    await clock.advance(CARD_MS)
    expect(await reader()).toMatchObject({ period: 'morning' })
    await ui.unmount()
  })
}

test('desktop: finishing after-salah started from the athan card plays the finale, then hands back to morning', { options: MUNICH, timeoutMs: 15000 }, async ($, on) => {
  const { clock, held } = setup(on, TIMES.fajr + 5000, 'desktop')
  const ui = await $.ui.mount(band('desktop'))
  await clock.advance(0)
  const card = (await ui.find({ type: 'Client', key: 'salah-athan' }))?.props.props as Parameters<typeof athanFrame>[0]
  const area = startArea(athanFrame(card, 100))
  const x = Math.floor(((area.x0 + area.x1) / 2 + card.card.ch) / card.card.ch)
  const y = Math.floor(((area.y0 + area.y1) / 2 + card.card.lh / 2) / card.card.lh)
  await ui.resize({ columns: 100, rows: 5, in: 'salah-athan' })
  await ui.pointer({ type: 'down', button: 'left', x, y, in: 'salah-athan' })
  expect(held.request).toEqual({ pray: 'fajr', at: TIMES.fajr })
  // Every thikr counted but the last count of the last one.
  const list = listFor('afterSalah', held.day.afterSalah)
  const counts = Object.fromEntries(list.map(t => [t.id, t.times]))
  counts[list[list.length - 1]!.id]! -= 1
  held.day = { ...held.day, afterSalah: { ...held.day.afterSalah, index: list.length - 1, counts } }
  await ui.key({ key: 'space', in: 'athkar' })
  await clock.advance(ADVANCE_MS)
  expect(held.day.afterSalah.isDone).toBe(true)
  const model = async () => (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props as { period: string; phase: string; finaleMs?: number }
  expect(await model()).toMatchObject({ period: 'afterSalah', phase: 'done' })
  const picture = String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source)
  expect(picture).toContain('class="rise-msg"')
  expect(picture).toContain('class="fall"')
  // Once the finale has played and the band rests, the clock's period comes back.
  await clock.advance(IDLE_MS)
  expect(await model()).toMatchObject({ period: 'morning' })
  await ui.unmount()
})

test('desktop: June Fajr before 05:00 keeps the prayer day when the last-count timer finishes after-salah', { options: MUNICH, timeoutMs: 15000 }, async ($, on) => {
  // June Fajr is before 05:00 on both CEST and UTC machines.
  const times = timesOn(PLACE, 'mwl', NO_ADJUST, Date.parse('2026-06-10T10:00:00Z'))
  const { clock, held } = setup(on, times.fajr + 5000, 'desktop')
  const ui = await $.ui.mount(band('desktop'))
  await clock.advance(0)
  const card = (await ui.find({ type: 'Client', key: 'salah-athan' }))?.props.props as Parameters<typeof athanFrame>[0]
  const area = startArea(athanFrame(card, 100))
  const x = Math.floor(((area.x0 + area.x1) / 2 + card.card.ch) / card.card.ch)
  const y = Math.floor(((area.y0 + area.y1) / 2 + card.card.lh / 2) / card.card.lh)
  await ui.resize({ columns: 100, rows: 5, in: 'salah-athan' })
  await ui.pointer({ type: 'down', button: 'left', x, y, in: 'salah-athan' })
  expect(held.request).toEqual({ pray: 'fajr', at: times.fajr })
  const list = listFor('afterSalah', held.day.afterSalah)
  const counts = Object.fromEntries(list.map(t => [t.id, t.times]))
  counts[list[list.length - 1]!.id]! -= 1
  held.day = { ...held.day, afterSalah: { ...held.day.afterSalah, index: list.length - 1, counts } }
  await ui.key({ key: 'space', in: 'athkar' })
  expect(held.day.day).toBe('2026-06-10')
  expect(held.day.afterSalah.counts[list[list.length - 1]!.id]).toBe(list[list.length - 1]!.times)
  await clock.advance(ADVANCE_MS)
  expect(held.day.afterSalah.isDone).toBe(true)
  expect(held.day.day).toBe('2026-06-10')
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah', phase: 'done' })
  await clock.advance(IDLE_MS)
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'morning' })
  await ui.unmount()
})

for (const close of [false, true]) {
  test(`desktop ${close ? '× waits for' : 'untouched card hands off at'} prayer + duration; counted after-salah stays until done or next prayer`, { options: MUNICH, timeoutMs: 60000 }, async ($, on) => {
    const { clock, held } = setup(on, TIMES.dhuhr, 'desktop')
    const ui = await $.ui.mount(band('desktop'))
    await clock.advance(0)
    if (close) {
      await ui.post({ act: 'pointer', button: 'left', x: 2, y: 1, columns: 100, rows: 5 }, { in: 'salah-athan' })
      expect(await ui.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
      expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'morning' })
    }
    await clock.advance(CARD_MS - 1)
    if (close) expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'morning' })
    else expect(await ui.find({ type: 'Client', key: 'salah-athan' })).toBeDefined()
    await clock.advance(1)
    expect(await ui.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
    await ui.key({ key: 'space', in: 'athkar' }) // Wake, open the cover, then count.
    await ui.key({ key: 'space', in: 'athkar' })
    await ui.key({ key: 'space', in: 'athkar' })
    expect(held.day.afterSalah.counts['66-istighfar']).toBe(1)
    await clock.advance(90 * 60_000)
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
    if (close) {
      held.day = { ...held.day, afterSalah: { ...held.day.afterSalah, isDone: true } }
      await clock.advance(60_000)
      expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'morning' })
    } else {
      held.day = { ...held.day, afterSalah: { ...held.day.afterSalah, counts: { '66-istighfar': 2 } } }
    }
    await clock.advance(TIMES.asr - (TIMES.dhuhr + CARD_MS + 90 * 60_000 + (close ? 60_000 : 0)))
    await clock.advance(0)
    expect(held.day.afterSalah).toEqual({ ...emptyDay(held.day.day).afterSalah, updatedAt: expect.any(Number), pray: 'asr', at: TIMES.asr })
    // Close the new athan to observe the wait before its fresh offer.
    await ui.post({ act: 'hide' }, { in: 'salah-athan' })
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'morning' })
    await clock.advance(CARD_MS)
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
    await ui.unmount()
  })
}

for (const scenario of ['terminal', 'athan-off', 'show-off', 'missing-photo'] as const) {
  test(`no desktop card (${scenario}) offers after the same duration`, { options: { ...MUNICH, salahAthan: scenario !== 'athan-off', salahShow: scenario === 'show-off' ? 'off' : '20' } }, async ($, on) => {
    const surface = scenario === 'terminal' ? 'terminal' : 'desktop'
    const { clock } = setup(on, TIMES.dhuhr, surface, scenario !== 'missing-photo')
    const ui = await $.ui.mount(band(surface))
    await clock.advance(0)
    const title = async (set: 'morning' | 'afterSalah') => surface === 'desktop'
      ? String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source).includes(TITLE[set])
      : (await ui.find({ in: 'athkar', text: stripTashkeel(TITLE[set]) })) !== undefined
    expect(await ui.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
    // Missing-photo still has a logical athan moment, so it can occupy the
    // desktop slot until expiry even though its picture cannot be drawn.
    if (scenario !== 'missing-photo') expect(await title('morning')).toBe(true)
    await clock.advance(CARD_MS - 1)
    if (scenario !== 'missing-photo') expect(await title('morning')).toBe(true)
    await clock.advance(1)
    expect(await title('afterSalah')).toBe(true)
    await ui.unmount()
  })
}
