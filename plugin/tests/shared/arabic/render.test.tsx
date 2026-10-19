import { expect, mock, test } from 'claude-code/testing'
import { defaultArabicMode, terminalArabic } from '../../../src/shared/arabic/terminal.ts'
import { END_OF_TURN, SALAWAT, USAGE_LIMIT } from '../../../src/features/thikr/phrases.ts'
import { ATHKAR_QUIET } from '../../fixtures/config.ts'

const band = (surface: 'terminal' | 'desktop') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'band',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
})

for (const program of ['Apple_Terminal', 'WarpTerminal', 'unknown']) {
  test(`${program}: only terminal Arabic is transformed, engine text stays`, { options: { ...ATHKAR_QUIET, thikrMode: 'salawat' } }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: program })
    mock.store(on, { salahSetupLater: true, arabicTerminals: { [program]: defaultArabicMode(program) } })
    mock.clock(on, { now: 0 })
    on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
    const seen: Array<{ word: string; message: string | null; suffix: string }> = []
    on('ui.render', { component: 'Spinner' }, async ($, e) => {
      seen.push(e.props)
      const { Text } = $.ui.resolve(e)
      return <Text>{e.props.word}</Text>
    })
    let ended = ''
    on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
      ended = e.props.word
      expect(e.props.durationMs).toBe(3000)
      const { Text } = $.ui.resolve(e)
      return <Text>{ended}</Text>
    })
    on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
      const { Box } = $.ui.resolve(e)
      return <Box />
    })
    on('state.get', { plugin: 'muslim', key: 'usageLimit' }, async () => ({ value: { value: { until: null }, version: 1 } }))
    for (const surface of ['terminal', 'desktop'] as const) {
      const phrase = SALAWAT[surface === 'terminal' ? 0 : 1]!
      const shown = (text: string) => terminalArabic(surface, defaultArabicMode(program), text)
      await $.turn.start({ text: 'hi', turnId: surface })
      await $.ui.render({ surface, component: 'Spinner', requestId: 'spinner', props: { word: 'Working', message: 'Compacting conversation', suffix: '…', mode: 'thinking' } })
      expect(seen.at(-1)?.word).toBe(shown(phrase))
      expect(seen.at(-1)?.message).toBe(`Compacting conversation · ${shown(phrase)}`)
      await $.ui.render({ surface, component: 'TurnDuration', requestId: 'end', props: { word: 'Baked', durationMs: 3000 } })
      expect(ended).toBe(shown(END_OF_TURN))
      const above = await $.ui.mount(band(surface))
      expect(await above.find({ type: 'Text', text: shown(USAGE_LIMIT) })).toBeDefined()
      await above.unmount()
    }
  })
}

// Render-tree evidence only: this does not emulate a terminal's cell-diff repaint.
test('thikr uses the saved current-terminal mode and desktop keeps logical Arabic', { options: { ...ATHKAR_QUIET, thikrMode: 'salawat' } }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
  mock.store(on, { arabicTerminals: { Apple_Terminal: 'joined' } })
  mock.clock(on, { now: 0 })
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  let word = ''
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    word = e.props.word
    const { Text } = $.ui.resolve(e)
    return <Text>{word}</Text>
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    for (let index = 0; index < SALAWAT.length; index++) {
      await $.turn.start({ text: 'hi', turnId: `${surface}-${index}` })
      await $.ui.render({ surface, component: 'Spinner', requestId: 'updates', props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' } })
      expect(word).toBe(terminalArabic(surface, surface === 'terminal' ? 'joined' : 'plain', SALAWAT[index]!))
    }
  }
})
