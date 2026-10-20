import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { asksToFinish, arabicDigits, dayOf, emptyDay, emptyReading, finishReading, incomplete, listFor, overall, questionKey, readDay, step, type Day, type FinishQuestion } from '../../src/features/athkar/logic.ts'
import { readerProps, lookFor } from '../../src/features/athkar/look.ts'
import { bandHeight, bandSvg, questionAreas, type BandModel } from '../../src/features/athkar/band.ts'
import { hitsFor } from '../../src/features/athkar/band.ts'
import { terminalArabic } from '../../src/shared/arabic/terminal.ts'

const NOW = new Date(2026, 9, 10, 10).getTime()
const band = (surface: 'terminal' | 'desktop') => ({ plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'finish-band', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
const fixture = (on: On, day: Day) => {
  mock.env(on, {})
  const kept = { day }
  on('store.get', async (_$, e) => ({ value: e.key === 'salahSetupLater' ? true : e.key === 'athkar' ? kept.day : e.key === 'arabicTerminals' ? { unknown: 'plain' } : undefined }))
  on('store.set', async (_$, e) => { if (e.key === 'athkar') kept.day = e.value as Day; return { value: undefined } })
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  return kept
}

for (const period of ['morning', 'evening'] as const) {
  test(`${period}: only a full set finishes automatically; confirmation fills every count and resume finds the first gap`, () => {
    const list = listFor(period), last = list[list.length - 1]!
    const r = { ...emptyReading(), index: list.length - 1, counts: { [list[0]!.id]: list[0]!.times, [last.id]: last.times } }
    expect(step(period, r, { act: 'next' }).isDone).toBe(false)
    expect(asksToFinish(period, r, { act: 'next' })).toBe(true)
    expect(asksToFinish(period, r, { act: 'count' })).toBe(true)
    expect(asksToFinish(period, { ...r, counts: {} }, { act: 'next' })).toBe(true)
    expect(asksToFinish(period, { ...r, counts: {} }, { act: 'count' })).toBe(false)
    expect(step(period, r, { act: 'resume' }).index).toBe(1)
    const done = step(period, r, { act: 'finish' })
    expect(done).toEqual(finishReading(period, r))
    expect(incomplete(period, done)).toHaveLength(0)
    expect(overall(period, done)).toBe(1)
    expect(done.isDone).toBe(true)
    expect(list.map(t => done.counts[t.id])).toEqual(list.map(t => t.times))
    expect(step(period, { ...done, isDone: false }, { act: 'next' }).isDone).toBe(true)
    expect(r.counts).toEqual({ [list[0]!.id]: list[0]!.times, [last.id]: last.times })
  })
}

test('completed readings preserve authored counts; unfinished readings keep their counts and no question is stored', () => {
  const day = emptyDay('2026-10-10')
  day.morning = finishReading('morning', day.morning)
  day.evening.counts = { '75': 1 }
  const loaded = readDay(day, day.day)
  expect(incomplete('morning', loaded.morning)).toHaveLength(0)
  expect(loaded.evening).toEqual(day.evening)
  expect(Object.keys(loaded.morning).sort()).toEqual(['counts', 'index', 'isDone', 'isHidden'])
})

test('question key selection latches the entry counting key without timeouts, permits another key, and back returns to the last thikr', () => {
  const q: FinishQuestion = { day: 'd', period: 'morning', focus: 'finish', blockedKey: 'space' }
  expect(questionKey(q, ' ')).toEqual({ question: q })
  expect(questionKey(q, 'space')).toEqual({ question: q })
  expect(questionKey(q, 'return').act).toEqual({ act: 'finish' })
  expect(questionKey(q, 'right')).toEqual({})
  expect(questionKey(q, 'backspace')).toEqual({})
  const selected = questionKey(q, 'tab').question!
  expect(selected.focus).toBe('resume')
  expect(questionKey(selected, 'space').act).toEqual({ act: 'resume' })
  expect(questionKey(questionKey(selected, 'left').question!, 'space').act).toEqual({ act: 'finish' })
})

for (const style of ['sky', 'frame'] as const) {
  test(`${style}: question has the same fixed height, incomplete fraction, choices and hit geometry`, () => {
    const reading = emptyReading()
    const props = readerProps('morning', reading, lookFor(style, 'orange', 'day', true, true), t => t, { isOpen: true, isActive: true, isPicture: true, question: { focus: 'finish' } })
    const m: BandModel = { phase: props.phase, question: props.question, period: 'morning', sky: 'day', style, accent: 'orange', isDark: true, isActive: true, hasBegun: false, title: props.title, thikrId: '75', text: props.text, position: props.position, count: 0, times: 1, progress: 0, from: 0, end: props.end, endHint: props.endHint, endNote: props.endNote, now: 0, width: 840, height: 77, restHeight: 24 }
    expect(bandHeight(m, 840)).toBe(77)
    const svg = bandSvg(m)
    expect(svg).toContain('أتممتَ الأذكار؟')
    expect(svg).toContain(`${arabicDigits(listFor('morning').length)} دون عدّ كامل`)
    expect(svg).toContain('نعم، أتممتُها')
    expect(svg).toContain('أكمل العدّ')
    expect(svg).not.toContain('class="fall"')
    expect(svg.length).toBeLessThan(98000)
    for (const area of questionAreas(m.width)) {
      expect(hitsFor(m).find(h => h.act.act === area.act)).toEqual({ ...area, act: { act: area.act } })
    }
    expect(hitsFor({ ...m, isActive: false })).toHaveLength(1)
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    test(`${surface} ${style}: skipped athkar ask, back stays on last, resume finds first gap, confirmation saves all and plays the finale`, { options: { athkarStyle: style } }, async ($, on) => {
      mock.clock(on, { now: NOW })
      const day = emptyDay(dayOf(new Date(NOW))), list = listFor('morning')
      day.morning.index = list.length - 1
      day.morning.counts = { '75': 1 }
      const kept = fixture(on, day)
      const ui = await $.ui.mount(band(surface))
      const post = (key: string) => ui.key({ in: 'athkar', key })
      const props = async () => (await ui.find({ type: 'Client', key: 'athkar' }))!.props.props as { phase: string; question?: { remaining: string }; position: string; finaleMs?: number }
      await post('return'); await post('return'); await post('left')
      expect((await props()).phase).toBe('question')
      expect((await props()).question?.remaining).toBe(terminalArabic(surface, 'plain', `${arabicDigits(list.length - 1)} دون عدّ كامل`))
      expect(kept.day).toEqual(day)
      await post('right')
      expect((await props()).phase).toBe('reading')
      expect((await props()).position).toContain(arabicDigits(list.length))
      await post('left'); await post('tab'); await post('return')
      expect((await props()).phase).toBe('reading')
      expect(kept.day.morning.index).toBe(1)
      for (let i = 1; i < list.length; i++) await post('left')
      expect((await props()).phase).toBe('question')
      if (surface === 'terminal') await ui.press({ key: 'finish' })
      else await ui.post({ act: 'pointer', button: 'left', x: 70, y: 3, columns: 100, rows: 5 }, { in: 'athkar' })
      const saved = kept.day
      expect(saved.morning.isDone).toBe(true)
      expect(incomplete('morning', saved.morning)).toHaveLength(0)
      expect(saved.evening).toEqual(emptyReading())
      expect(Object.keys(saved.morning).sort()).toEqual(['counts', 'index', 'isDone', 'isHidden'])
      expect((await props()).phase).toBe('done')
      if (surface === 'desktop') expect(String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source)).toContain('class="fall"')
      await ui.unmount()
    })

    test(`${surface} ${style}: counting-key repeat across the last auto advance never confirms`, { options: { athkarStyle: style } }, async ($, on) => {
      const clock = mock.clock(on, { now: NOW }), day = emptyDay(dayOf(new Date(NOW)))
      const list = listFor('morning'), last = list[list.length - 1]!
      day.morning.index = list.length - 1
      day.morning.counts[last.id] = last.times - 1
      const kept = fixture(on, day)
      const ui = await $.ui.mount(band(surface))
      const key = (key: string) => ui.key({ in: 'athkar', key })
      await key('return'); await key('return'); await key('space')
      await clock.advance(650)
      for (let i = 0; i < 8; i++) { await key(i % 2 ? 'space' : ' '); await clock.advance(100) }
      expect((await ui.find({ type: 'Client', key: 'athkar' }))!.props.props).toMatchObject({ phase: 'question' })
      expect((kept.day).morning.isDone).toBe(false)
      await key('tab'); await key('tab'); await key('space')
      expect((kept.day).morning.isDone).toBe(true)
      await ui.unmount()
    })
  }
}

for (const mode of ['plain', 'joined', 'reversed'] as const) {
  test(`terminal ${mode}: all question chrome follows the shared Arabic path`, () => {
    const show = (text: string) => terminalArabic('terminal', mode, text)
    const p = readerProps('evening', emptyReading(), lookFor('frame', 'orange', 'crescent', true, false), show, { isOpen: true, isActive: true, isPicture: false, question: { focus: 'resume' } })
    expect(p.question).toEqual({ title: show('أتممتَ الأذكار؟'), remaining: show(`${arabicDigits(listFor('evening').length)} دون عدّ كامل`), confirm: show('نعم، أتممتُها'), resume: show('أكمل العدّ'), focus: 'resume' })
  })
}

test('question clears on hiding, reset, chosen-period change and day rollover without saving view state', async ($, on) => {
  const clock = mock.clock(on, { now: NOW }), day = emptyDay(dayOf(new Date(NOW)))
  day.morning.index = listFor('morning').length - 1
  const kept = fixture(on, day)
  const ui = await $.ui.mount(band('terminal'))
  const key = (key: string) => ui.key({ in: 'athkar', key })
  const props = async () => (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props as { phase: string; question?: unknown } | undefined
  const command = (args: string) => $.command.run({ command: 'athkar', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  await key('return'); await key('return'); await key('left')
  expect((await props())?.phase).toBe('question')
  await ui.post({ act: 'hide' }, { in: 'athkar' })
  expect(await props()).toBeUndefined()
  await command('morning')
  expect((await props())?.question).toBeUndefined()
  await key('return'); await key('left')
  expect((await props())?.phase).toBe('question')
  await command('evening')
  expect((await props())?.question).toBeUndefined()
  await command('morning')
  await key('return'); await key('left')
  expect((await props())?.phase).toBe('question')
  await command('morning reset')
  expect((await props())?.phase).toBe('cover')
  expect(kept.day.morning).toEqual(emptyReading())
  await key('return'); await key('return')
  for (let i = 0; i < listFor('morning').length; i++) await key('left')
  expect((await props())?.phase).toBe('question')
  await ui.unmount()
  await clock.advance(24 * 60 * 60 * 1000)
  const tomorrow = await $.ui.mount(band('terminal'))
  expect((await tomorrow.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ phase: 'reading' })
  expect(((await tomorrow.find({ type: 'Client', key: 'athkar' }))?.props.props as { question?: unknown }).question).toBeUndefined()
  expect(Object.keys(kept.day.morning).sort()).toEqual(['counts', 'index', 'isDone', 'isHidden'])
  await tomorrow.unmount()
})
