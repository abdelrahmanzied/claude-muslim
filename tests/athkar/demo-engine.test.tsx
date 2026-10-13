import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { demoDuration, demoScenes } from '../../src/features/athkar/demo.ts'
import { arabicDigits, dayOf, emptyDay, listFor, timesOf, type Day } from '../../src/features/athkar/logic.ts'
import { accentHex } from '../../src/shared/color/index.ts'
import { athkarHelp } from '../../src/features/athkar/help.ts'

const NOW = new Date(2026, 9, 10, 10, 0).getTime()
const FINALE_MS = 3200
const run = (args: string) => ({ command: 'athkar', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const band = (surface: 'desktop' | 'terminal') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'demo-band',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
})

const engineBand = (on: On, surface: 'desktop' | 'terminal' = 'desktop') => {
  mock.env(on, {})
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

// Read-only fixtures; record ALL persistent writes, not only the reading key.
const savedReading = (on: On, day = emptyDay(dayOf(new Date(NOW)))) => {
  const written: unknown[] = []
  on('store.get', async (_$, e) => ({ value: e.key === 'athkar' ? day : e.key === 'arabicTerminals' ? { unknown: 'plain' } : undefined }))
  on('store.set', async (_$, e) => (written.push(e), { value: undefined }))
  on('config.set', async (_$, e) => (written.push(e), { value: e.value }))
  on('state.set', async (_$, e, next) => {
    written.push(e)

    return next(e)
  })

  return written
}

for (const style of ['sky', 'frame'] as const) {
  test(`desktop ${style}: the story draws readings, the full finale and folded done, then restores the real band`, async ($, on) => {
    const clock = mock.clock(on, { now: NOW })
    engineBand(on)
    const day = emptyDay(dayOf(new Date(NOW)))
    day.morning.index = 4
    day.morning.counts = { '75': 1, '77': 1 }
    const before = JSON.stringify(day)
    const written = savedReading(on, day)
    const ui = await $.ui.mount(band('desktop'))
    const real = (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props as Record<string, unknown>
    expect((await $.command.run(run(`demo ${style}`))).text).toBe(`**Athkar demo:** ${style} · ${style === 'sky' ? '8 scenes · 33.2s' : '6 scenes · 24.2s'}`)
    const scenes = demoScenes(style, 'orange', FINALE_MS)
    const model = async () => (await ui.find({ type: 'Client', key: 'athkar-demo' }))?.props.props as Record<string, unknown>
    const picture = async () => String((await ui.find({ in: 'athkar-demo', type: 'Svg' }))?.props.source)
    for (const [i, scene] of scenes.entries()) {
      expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
      expect(await model()).toMatchObject({ thikrId: scene.id, sky: scene.sky, accent: scene.accent, style, phase: scene.kind === 'reading' ? 'reading' : 'done', isActive: scene.kind !== 'folded' })
      if (scene.kind === 'reading') {
        const list = listFor(scene.period)
        const index = list.findIndex(t => t.id === scene.id)
        expect(await model()).toMatchObject({ period: scene.period, position: `${arabicDigits(index + 1)} مِنْ ${arabicDigits(list.length)}`, count: 0 })
        const authored = list[index]!
        expect((await model()).text).toBe(scene.period === 'evening' ? authored.evening ?? authored.text : authored.text)
        expect((await model()).times).toBe(timesOf(authored))
        if (i === 0) expect((await model()).note).toBe(authored.note)
        const firstProgress = Number((await model()).progress)
        await clock.advance(scene.countMs)
        expect((await model()).count).toBe(1)
        expect(Number((await model()).progress)).toBeGreaterThan(firstProgress)
        expect((await model()).from).toBe(firstProgress)
        expect((await model()).glowMs).toBe(0)
        expect(await picture()).toContain(`>${arabicDigits(timesOf(authored) - 1)}</span>`)
        if (scene.id === '98') {
          await clock.advance(9 * scene.countMs)
          expect(await model()).toMatchObject({ count: 10, times: 10, progress: 100, phase: 'reading' })
          expect(await picture()).toContain('>٠</span>')
          await clock.advance(scene.duration - 10 * scene.countMs)
        } else await clock.advance(scene.duration - scene.countMs)
      } else if (scene.kind === 'finale') {
        expect(await model()).toMatchObject({ finaleMs: 0, progress: 100 })
        expect(await picture()).toContain('class="rise-msg"')
        expect(await picture()).toContain('class="fall"')
        await clock.advance(scene.duration - 100)
        expect((await model()).finaleMs).toBe(FINALE_MS - 100)
        expect(await picture()).toContain('class="rise-msg"')
        await clock.advance(100)
      } else {
        expect((await model()).finaleMs).toBeUndefined()
        expect(await picture()).not.toContain('class="rise-msg"')
        expect(Number((await ui.find({ in: 'athkar-demo', type: 'Svg' }))?.props.height)).toBe(44)
        await clock.advance(scene.duration)
      }
    }
    expect(await ui.find({ type: 'Client', key: 'athkar-demo' })).toBeUndefined()
    const { now: _now, glowMs: _glowMs, from: _from, ...kept } = real
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject(kept)
    expect(JSON.stringify(day)).toBe(before)
    expect(written).toEqual([])
    await ui.unmount()
  })
}

test('terminal frame plays the same readings and colors, then its own open and folded done rows', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  engineBand(on, 'terminal')
  const written = savedReading(on)
  const ui = await $.ui.mount(band('terminal'))
  await $.command.run(run('demo frame'))
  const scenes = demoScenes('frame', 'orange', FINALE_MS)
  for (const [i, scene] of scenes.entries()) {
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    const props = (await ui.find({ type: 'Client', key: 'athkar-demo' }))?.props.props as Record<string, unknown>
    expect(props).toMatchObject({ phase: i < 4 ? 'reading' : 'done', isActive: i !== 5, look: { style: 'frame', ring: accentHex(scene.accent, true) } })
    expect(await ui.find({ in: 'athkar-demo', type: 'Svg' })).toBeUndefined()
    if (i < 4) {
      const authored = listFor('morning').find(t => t.id === scene.id)!
      expect(props.text).toBe(authored.text.replace(/[\u064b-\u065f\u0670]/g, ''))
      await clock.advance(scene.countMs)
      if (i === 3) {
        await clock.advance(9 * scene.countMs)
        expect((await ui.find({ type: 'Client', key: 'athkar-demo' }))?.props.props).toMatchObject({ left: '٠', progress: 1 })
        await clock.advance(scene.duration - 10 * scene.countMs)
      } else await clock.advance(scene.duration - scene.countMs)
    } else {
      expect((await ui.find({ in: 'athkar-demo', key: 'done' }))?.props.paddingY).toBe(i === 4 ? 1 : 0)
      expect(await ui.find({ in: 'athkar-demo', text: i === 4 ? '/athkar morning reset → to read again' : /أتممت وردك/ })).toBeDefined()
      await clock.advance(scene.duration)
    }
  }
  expect(await ui.find({ type: 'Client', key: 'athkar-demo' })).toBeUndefined()
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ phase: 'cover', isActive: false })
  expect(written).toEqual([])
  await ui.unmount()
})

for (const surface of ['desktop', 'terminal'] as const) {
  test(`${surface}: demo pointer, key and hide messages have no real-reading handler`, async ($, on) => {
    const clock = mock.clock(on, { now: NOW })
    engineBand(on, surface)
    const day = emptyDay(dayOf(new Date(NOW)))
    const before = JSON.stringify(day)
    const written = savedReading(on, day)
    const ui = await $.ui.mount(band(surface))
    await $.command.run(run('demo frame'))
    for (const key of ['space', 'return', 'backspace', 'left', 'right']) await ui.post({ act: 'key', key }, { in: 'athkar-demo' })
    for (const button of ['left', 'right']) await ui.post({ act: 'pointer', button, x: 2, y: 1, columns: 100, rows: 5 }, { in: 'athkar-demo' })
    await ui.post({ act: 'hide' }, { in: 'athkar-demo' })
    expect(await ui.find({ type: 'Client', key: 'athkar-demo' })).toBeDefined()
    await clock.advance(demoDuration('frame', FINALE_MS))
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ phase: 'cover', isActive: false })
    expect(JSON.stringify(day)).toBe(before)
    expect(written).toEqual([])
    await ui.unmount()
  })
}

test('terminal rejects explicit sky without changing the band, and no-word demo uses frame', async ($, on) => {
  mock.clock(on, { now: NOW })
  engineBand(on, 'terminal')
  const written = savedReading(on)
  const ui = await $.ui.mount(band('terminal'))
  const before = (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props
  expect((await $.command.run(run('demo sky'))).text).toContain('Sky is desktop only')
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toEqual(before)
  expect(await ui.find({ type: 'Client', key: 'athkar-demo' })).toBeUndefined()
  expect((await $.command.run(run('demo'))).text).toBe('**Athkar demo:** frame · 6 scenes · 24.2s')
  expect(written).toEqual([])
  await ui.unmount()
})

for (const style of ['sky', 'frame'] as const) {
  test(`desktop default uses ${style}; restart replaces the old expiry`, { options: { athkarStyle: style } }, async ($, on) => {
    const clock = mock.clock(on, { now: NOW })
    engineBand(on)
    const written = savedReading(on)
    const ui = await $.ui.mount(band('desktop'))
    await $.command.run(run('demo'))
    await clock.advance(21_200)
    await $.command.run(run('demo'))
    expect((await ui.find({ type: 'Client', key: 'athkar-demo' }))?.props.props).toMatchObject({ thikrId: '75', count: 0, sky: 'dawn', accent: 'orange' })
    await clock.advance(3000)
    expect((await ui.find({ type: 'Client', key: 'athkar-demo' }))?.props.props).toMatchObject({ thikrId: '75', count: 1, phase: 'reading' })
    await clock.advance(demoDuration(style, FINALE_MS) - 3000)
    expect(await ui.find({ type: 'Client', key: 'athkar-demo' })).toBeUndefined()
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeDefined()
    expect(written).toEqual([])
    await ui.unmount()
  })
}

for (const visibility of ['hidden', 'done', 'off'] as const) {
  test(`demo overrides a ${visibility} band and restores it when the story ends`, { options: { athkar: visibility !== 'off' } }, async ($, on) => {
    const clock = mock.clock(on, { now: NOW })
    engineBand(on)
    const day: Day = emptyDay(dayOf(new Date(NOW)))
    day.morning.isHidden = visibility === 'hidden'
    day.morning.isDone = visibility === 'done'
    const written = savedReading(on, day)
    const ui = await $.ui.mount(band('desktop'))
    await $.command.run(run('demo frame'))
    expect(await ui.find({ type: 'Client', key: 'athkar-demo' })).toBeDefined()
    await clock.advance(demoDuration('frame', FINALE_MS))
    if (visibility === 'done') expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ phase: 'done', isActive: false })
    else expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    expect(written).toEqual([])
    await ui.unmount()
  })
}

test('unknown demo option answers with help', async $ => {
  expect((await $.command.run(run('demo unknown'))).text).toBe(athkarHelp())
})

test('the demo leaves an open real reading and its view untouched', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  engineBand(on)
  const written = savedReading(on)
  const ui = await $.ui.mount(band('desktop'))
  await ui.post({ act: 'enter' }, { in: 'athkar' })
  await ui.post({ act: 'key', key: 'return' }, { in: 'athkar' })
  await ui.post({ act: 'key', key: 'return' }, { in: 'athkar' })
  const real = (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props as Record<string, unknown>
  expect(real).toMatchObject({ phase: 'reading', isActive: true, thikrId: '75', count: 0 })
  await $.command.run(run('demo frame'))
  expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
  await clock.advance(demoDuration('frame', FINALE_MS))
  const { now: _now, glowMs: _glowMs, from: _from, ...kept } = real
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject(kept)
  expect(written).toEqual([])
  await ui.unmount()
})
