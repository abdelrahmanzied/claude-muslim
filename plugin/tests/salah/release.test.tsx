import { expect, mock, test } from 'claude-code/testing'
import { lastPray, lastSalahToday, nextSalah, NO_ADJUST, timesOn, clockText } from '../../src/features/salah/times.ts'
import { prayLine } from '../../src/shared/pray/line.ts'
import { readOptions } from '../../src/config.ts'
import { panelSalah } from '../../src/features/salah/panel.ts'
import { terminalArabic } from '../../src/shared/arabic/terminal.ts'
const place = { latitude: 42.88, longitude: -8.54, timeZone: 'Europe/Madrid' }
const now = Date.parse('2026-06-20T22:05:00Z') // Santiago de Compostela, June 21 at 00:05, MWL 17° Isha at 00:23.
const isha = timesOn(place, 'mwl', NO_ADJUST, Date.parse('2026-06-20T12:00:00Z')).isha
const run = (args: string) => ({ command: 'salah', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
test('real Santiago MWL Isha is after midnight; 00:05 counts down without an early athan', () => {
  expect(clockText(isha, place.timeZone)).toBe('00:23')
  expect(nextSalah(place, 'mwl', NO_ADJUST, now)).toEqual({ pray: 'isha', at: isha })
  const last = lastPray(place, 'mwl', NO_ADJUST, now)
  expect(last.pray).toBe('maghrib'); expect(last.at).toBeLessThan(now)
  const line = prayLine({ pray: 'isha', at: isha }, '00:23', last, now, { show: 'always', isAthan: true })!
  expect(line).not.toContain('حان وقت')
  expect(line).toContain('العشاء')
  const after = isha + 5 * 60_000
  expect(lastPray(place, 'mwl', NO_ADJUST, after)).toEqual({ pray: 'isha', at: isha })
  expect(lastSalahToday(place, 'mwl', NO_ADJUST, after)).toEqual({ pray: 'isha', at: isha })
  const next = nextSalah(place, 'mwl', NO_ADJUST, after)
  expect(prayLine(next, '', { pray: 'isha', at: isha }, after, { show: 'always', isAthan: true })).toBe('حان وقت صلاة العشاء')
  expect(prayLine({ pray: 'isha', at: isha }, '00:23', { pray: 'isha', at: isha }, now, { show: 'always', isAthan: true })).not.toContain('حان وقت')
  const pane = panelSalah(readOptions({ salahPlace: 'Santiago, Spain; 42.88, -8.54; Europe/Madrid; ES', salahMethod: 'mwl' }), now)!
  expect(pane.next.at).toBe(isha); expect(pane.prays.find(p => p.pray === 'isha')?.at).toBe(isha)
})
test('city-dialog Not now puts setup off durably', async ($, on) => {
  const clock = mock.clock(on, { now: 10000 }); mock.env(on, {}); const stored: Record<string, unknown> = { arabicTerminals: { unknown: 'plain' } }
  on('store.get', async (_$, e) => ({ value: stored[e.key] }))
  on('store.set', async (_$, e) => { stored[e.key] = e.value; return { value: undefined } })
  on('session.surface', async () => ({ value: 'terminal' }))
  on('tool.call', async (_$, e) => {
    const question = (e as unknown as { questions: { question: string }[] }).questions[0]!.question
    return { tool: e.tool, tool_use_id: e.tool_use_id, result: { questions: [], answers: { [question]: 'Not now' } } } as never
  })
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  expect((await $.command.run(run('city'))).text).toContain('put off')
  expect(stored.salahSetupLater).toBe(true)
  await clock.advance(24 * 3600_000)
  const ui = await $.ui.mount({ plugin: 'muslim', surface: 'terminal', component: 'AbovePrompt', requestId: 'setup', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
  expect(await ui.find({ key: 'salah-setup' })).toBeUndefined()
  await ui.unmount()
})
test('city completion timeout and rejection use the quiet reachability reply', async ($, on) => {
  const clock = mock.clock(on, { now: 10000 }); mock.env(on, {}); mock.store(on)
  on('session.surface', async () => ({ value: 'desktop' }))
  let timeout: number | undefined
  on('model.complete', async (_$, e) => { timeout = e.timeoutMs; return await new Promise<never>(() => {}) })
  const result = $.command.run(run('city London'))
  await clock.settle(); expect(timeout).toBe(8000)
  await clock.advance(8000)
  expect((await result).text).toContain('Could not reach Claude')
})
for (const surface of ['terminal', 'desktop'] as const) test(`${surface}: salah command/help Arabic follows the surface mode`, { options: { salahPlace: 'Santiago, Spain; 42.88, -8.54; Europe/Madrid; ES' } }, async ($, on) => {
  mock.clock(on, { now }); mock.env(on, {}); mock.store(on, { arabicTerminals: { unknown: 'reversed' } })
  on('session.surface', async () => ({ value: surface }))
  for (const args of ['', 'help']) {
    const reply = await $.command.run(run(args))
    expect(reply.text).toContain(terminalArabic(surface, 'reversed', 'حان وقت صلاة …'))
  }
})
