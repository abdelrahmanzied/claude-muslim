import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { SALAWAT } from '../../src/features/thikr/phrases.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'

const FRIDAY = Date.parse('2026-10-09T14:00:00Z')
const THURSDAY = Date.parse('2026-10-08T14:00:00Z')
const MUNICH = 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE'

const SURFACES = ['terminal', 'desktop'] as const
type Surface = (typeof SURFACES)[number]

const spinner = (surface: Surface, mode: 'requesting' | 'thinking') => ({
  surface, component: 'Spinner' as const, requestId: 'main',
  props: { word: 'Sauteing', message: null, suffix: '…', mode },
})

// The words the spinner showed for two turns.
const words = async ($: Engine, on: On, now: number, surface: Surface): Promise<string[]> => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  mock.env(on, {})
  const clock = mock.clock(on, { now })
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  const seen: string[] = []
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    seen.push(e.props.word)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })
  for (let turn = 0; turn < 2; turn++) {
    await $.turn.start({ text: 'hi', turnId: `t${turn}` })
    await $.ui.render(spinner(surface, 'requesting'))
    await clock.advance(20_000)
    await $.ui.render(spinner(surface, 'thinking'))
  }

  return seen
}
// The terminal's line follows the tashkeel setting (off here); the desktop shows the phrase as authored.
const salawat = (text: string, surface: Surface) => SALAWAT.map(phrase => (surface === 'terminal' ? stripTashkeel(phrase) : phrase)).includes(text)

for (const surface of SURFACES) {
  test(`${surface}: on a Friday the thikr line shows the salawat, one per turn`, async ($, on) => {
    const seen = await words($, on, FRIDAY, surface)
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every(text => salawat(text, surface))).toBe(true)
  })

  test(`${surface}: on another day the thikr line is the usual rotation`, async ($, on) => {
    const seen = await words($, on, THURSDAY, surface)
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.some(text => !salawat(text, surface))).toBe(true)
  })

  test(`${surface}: with the setting off a Friday is the usual rotation`, { options: { fridaySalawat: false } }, async ($, on) => {
    const seen = await words($, on, FRIDAY, surface)
    expect(seen.some(text => !salawat(text, surface))).toBe(true)
  })

  test(`${surface}: with a saved city the salawat waits for Fajr on Friday`, { options: { salahPlace: MUNICH } }, async ($, on) => {
    const beforeFajr = await words($, on, Date.parse('2026-10-09T01:00:00Z'), surface)
    expect(beforeFajr.some(text => !salawat(text, surface))).toBe(true)
  })
}
