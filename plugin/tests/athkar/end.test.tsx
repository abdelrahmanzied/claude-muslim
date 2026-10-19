import { expect, mock, test } from 'claude-code/testing'
import { ADVANCE_MS, dayOf, emptyDay, END, listFor, timesOf } from '../../src/features/athkar/logic.ts'
import { ARABIC_MODES, terminalArabic } from '../../src/shared/arabic/terminal.ts'
import { withTashkeel } from '../../src/shared/arabic/visual.ts'

const NOW = new Date(2026, 9, 10, 10, 0).getTime()
const variants = [
  { surface: 'terminal' as const, mode: ARABIC_MODES[0]!, tashkeel: true },
  { surface: 'desktop' as const, mode: 'plain' as const, tashkeel: true },
]

for (const set of ['morning', 'afterSalah'] as const) {
  for (const { surface, mode, tashkeel } of variants) {
    test(`${set} closing greeting: ${surface}, ${mode}, tashkeel ${tashkeel}`, { options: { tashkeel } }, async ($, on) => {
      const clock = mock.clock(on, { now: NOW })
      const day = emptyDay(dayOf(new Date(NOW)))
      const list = listFor(set)
      const reading = day[set]
      reading.index = list.length - 1
      reading.counts = Object.fromEntries(list.map(thikr => [thikr.id, timesOf(thikr)]))
      reading.counts[list.at(-1)!.id]!--
      mock.store(on, { salahSetupLater: true, athkar: day, arabicTerminals: { unknown: mode } })
      mock.env(on, {})
      on('session.surface', async () => ({ value: surface }))
      on('config.list', async () => ({ value: [] }))
      on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
        const { Box } = $.ui.resolve(e)
        return <Box />
      })
      await $.command.run({ command: 'athkar', args: set === 'afterSalah' ? 'after-salah' : set,
        origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
      const ui = await $.ui.mount({ plugin: 'muslim', surface, component: 'AbovePrompt', requestId: 'closing',
        props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
      const key = (key: string) => ui.post({ act: 'key', key })
      await key('return') // Open the reading from its lit cover.
      await key('return') // Its last remaining count.
      await clock.advance(ADVANCE_MS)
      const shown = terminalArabic(surface, mode, withTashkeel(END, tashkeel))
      const picture = async () => String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source)
      if (surface === 'desktop') {
        const finale = await picture()
        expect(finale).toContain('class="rise-msg"')
        expect(finale).toContain(`>${shown}</span>`)
        expect(finale).not.toContain('class="cite"')
        expect(finale).not.toContain('البقرة')
        expect(finale).not.toContain('—')
      } else {
        // Render-tree evidence: native Text owns emoji cell measurement and
        // wrapping, rather than hand padding by UTF-16 string length.
        expect(await ui.find({ in: 'athkar', type: 'Text', text: shown })).toBeDefined()
        expect(shown).toContain('🤲')
        expect(shown).not.toMatch(/[\u064b-\u065f\u0670]/)
        expect(await ui.find({ in: 'athkar', text: /البقرة|—/ })).toBeUndefined()
        await clock.advance(3200)
        expect(await ui.find({ in: 'athkar', type: 'Text', text: shown })).toBeDefined()
      }
      await ui.unmount()
    })
  }
}
