import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { demoDuration, demoScenes } from '../../src/features/athkar/demo.ts'
import { dayOf, emptyDay, listFor, TITLE } from '../../src/features/athkar/logic.ts'
import { demoDuration as momentDuration } from '../../src/features/salah/demo.ts'
import { START_LABEL } from '../../src/features/salah/card.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'

const NOW = new Date(2026, 9, 10, 10).getTime()
const FINALE_MS = 3200
const OPTIONS = { thikr: false, athkar: false, salahShow: 'off', salahAthan: false }
const run = () => ({ command: 'salah', args: 'demo', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const band = (surface: 'desktop' | 'terminal') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'salah-flow',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
})
const fixture = (on: On, surface: 'desktop' | 'terminal') => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, {})
  const day = emptyDay(dayOf(new Date(NOW)))
  day.afterSalah = { ...day.afterSalah, pray: 'maghrib', at: NOW - 3600_000, index: 6, counts: { '70-ikhlas': 2 }, isHidden: true }
  const saved = JSON.stringify(day)
  const writes: string[] = []
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('store.get', async (_$, e) => ({ value: e.key === 'athkar' ? day : e.key === 'arabicTerminals' ? { unknown: 'plain' } : undefined }))
  on('store.set', async (_$, e) => (writes.push(`store:${e.key}`), { value: undefined }))
  on('store.delete', async (_$, e) => (writes.push(`delete:${e.key}`), { value: undefined }))
  on('config.set', async (_$, e) => (writes.push(`config:${e.key}`), { value: e.value }))
  on('state.set', async (_$, e, next) => (writes.push(`state:${e.key}`), next(e)))
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  return { clock, day, saved, writes }
}

for (const surface of ['desktop', 'terminal'] as const) {
  for (const ending of (surface === 'desktop' ? ['expire', 'close', 'start'] : ['expire', 'close']) as ('expire' | 'close' | 'start')[]) {
    test(`${surface}: demo ${ending} hands off to real Fajr reader scenes, finale and folded done without persistent writes`, { options: OPTIONS, timeoutMs: 15000 }, async ($, on) => {
      const { clock, day, saved, writes } = fixture(on, surface)
      const ui = await $.ui.mount(band(surface))
      await clock.settle()
      writes.length = 0
      expect((await $.command.run(run())).text).toBe('**Salah demo:** athan · Fajr 05:00 · athkar after salah')
      expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
      if (surface === 'desktop') {
        const source = String((await ui.find({ in: 'salah-athan', type: 'Svg' }))?.props.source)
        expect(source).toContain(START_LABEL) // Also visible with athkar off.
        if (ending !== 'expire') {
          await ui.resize({ columns: 100, rows: 5, in: 'salah-athan' })
          await ui.pointer({ type: 'down', button: 'left', x: ending === 'start' ? 10 : 2, y: ending === 'start' ? 2 : 1, in: 'salah-athan' })
        }
      } else if (ending === 'close') await ui.press({ key: 'salah-athan-close' })
      if (ending === 'expire') {
        await clock.advance(momentDuration(surface) - 1)
        expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
        await clock.advance(1)
      }
      expect(await ui.find({ key: 'salah-athan' })).toBeUndefined()
      expect(await ui.find({ key: 'salah-athan-row' })).toBeUndefined()
      const sceneProps = async () => (await ui.find({ key: 'athkar-demo' }))?.props.props as Record<string, unknown>
      const style = surface === 'desktop' ? 'sky' : 'frame'
      for (const scene of demoScenes(style, 'orange', FINALE_MS, 'afterSalah')) {
        const p = await sceneProps()
        expect(p).toMatchObject({ period: 'afterSalah', phase: scene.kind === 'reading' ? 'reading' : 'done', isActive: scene.kind !== 'folded' })
        if (surface === 'desktop') {
          expect(p).toMatchObject({ title: TITLE.afterSalah, sky: 'day', accent: 'orange', style: 'sky' })
          if (scene.kind === 'reading') expect(p.thikrId).toBe(scene.id)
        }
        if (scene.kind === 'reading') {
          const t = listFor('afterSalah', { index: 0, counts: {}, isDone: false, isHidden: false, pray: 'fajr' }).find(t => t.id === scene.id)!
          expect(p.text).toBe(surface === 'desktop' ? t.text : stripTashkeel(t.text))
          await clock.advance(scene.countMs)
          expect(await sceneProps()).toMatchObject(surface === 'desktop' ? { count: 1, times: t.times } : { left: String(t.times - 1).replace(/\d/g, n => '٠١٢٣٤٥٦٧٨٩'[+n]!) })
          await clock.advance(scene.duration - scene.countMs)
        } else {
          if (surface === 'desktop' && scene.kind === 'finale') {
            expect(p.finaleMs).toBe(0)
            expect(String((await ui.find({ in: 'athkar-demo', type: 'Svg' }))?.props.source)).toContain('class="rise-msg"')
          }
          await clock.advance(scene.duration)
        }
      }
      expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
      expect(writes).toEqual([]) // Includes athkar day, salahLast and salahAfterSalahStart.
      expect(JSON.stringify(day)).toBe(saved)
      await ui.unmount()
    })
  }
}

test('restarting during after-salah cancels the old continuation and its completion', { options: OPTIONS }, async ($, on) => {
  const { clock, writes } = fixture(on, 'desktop')
  const ui = await $.ui.mount(band('desktop'))
  await clock.settle()
  writes.length = 0
  await $.command.run(run())
  await clock.advance(momentDuration('desktop') + 2000)
  expect(await ui.find({ key: 'athkar-demo' })).toBeDefined()
  await $.command.run(run())
  expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
  expect(await ui.find({ key: 'salah-athan' })).toBeDefined()
  await clock.advance(demoDuration('sky', FINALE_MS, 'afterSalah') - 2000)
  expect(await ui.find({ key: 'athkar-demo' })).toBeDefined()
  await clock.advance(momentDuration('desktop') + 2000)
  expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
  expect(writes).toEqual([])
  await ui.unmount()
})
