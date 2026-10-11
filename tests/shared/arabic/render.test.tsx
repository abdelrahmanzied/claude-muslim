import { expect, mock, test } from 'claude-code/testing'
import { arabicVisual } from '../../../src/shared/arabic/visual.ts'
import { END_OF_TURN, SALAWAT, USAGE_LIMIT } from '../../../src/features/thikr/phrases.ts'

const band = (surface: 'terminal' | 'desktop') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'band',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
})

for (const program of ['Apple_Terminal', 'WarpTerminal', 'unknown']) {
  test(`${program}: only terminal Arabic is transformed, engine text stays`, { options: { thikrMode: 'salawat', salahPlace: 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE' } }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: program })
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
    on('state.get', { plugin: 'muslim', key: 'salahLine' }, async () => ({ value: { value: '☾ العشاء ٠٣:٢٨', version: 1 } }))
    on('state.get', { plugin: 'muslim', key: 'salahMinaret' }, async () => ({ value: { value: { prayer: 'isha', frame: 7 }, version: 1 } }))
    on('ui.render', { component: 'SessionMode' }, async ($, e) => {
      const { Text } = $.ui.resolve(e)
      return <Text>focus</Text>
    })
    on('state.get', { plugin: 'muslim', key: 'usageLimit' }, async () => ({ value: { value: { until: null }, version: 1 } }))
    for (const surface of ['terminal', 'desktop'] as const) {
      const phrase = SALAWAT[surface === 'terminal' ? 0 : 1]!
      const shown = (text: string) => surface === 'terminal' && program === 'Apple_Terminal' ? arabicVisual(text) : text
      await $.turn.start({ text: 'hi', turnId: surface })
      await $.ui.render({ surface, component: 'Spinner', requestId: 'spinner', props: { word: 'Working', message: 'Compacting conversation', suffix: '…', mode: 'thinking' } })
      expect(seen.at(-1)?.word).toBe(shown(phrase))
      expect(seen.at(-1)?.message).toBe(`Compacting conversation · ${shown(phrase)}`)
      await $.ui.render({ surface, component: 'TurnDuration', requestId: 'end', props: { word: 'Baked', durationMs: 3000 } })
      expect(ended).toBe(shown(END_OF_TURN))
      const footer = await $.ui.mount({ plugin: 'muslim', surface, component: 'SessionMode', requestId: 'footer', props: { modes: [] } })
      expect(await footer.find({ type: 'Text', text: shown('☾ العشاء ٠٣:٢٨') })).toBeDefined()
      expect(await footer.find({ type: 'Text', text: 'focus' })).toBeDefined()
      await footer.unmount()
      const above = await $.ui.mount(band(surface))
      expect(await above.find({ type: 'Text', text: shown(USAGE_LIMIT) })).toBeDefined()
      expect(await above.find({ type: 'Text', text: shown('حان وقت صلاة العشاء') }) !== undefined).toBe(surface === 'terminal')
      await above.unmount()
    }
  })
}

for (const mode of ['plain', 'shaped'] as const) {
  test(`manual ${mode} overrides detection and never changes desktop`, { options: { arabicTerminal: mode } }, async ($, on) => {
    // No env mock: explicit modes must not call env.get.
    let word = ''
    on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
      word = e.props.word
      const { Text } = $.ui.resolve(e)
      return <Text>{word}</Text>
    })
    for (const surface of ['terminal', 'desktop'] as const) {
      await $.ui.render({ surface, component: 'TurnDuration', requestId: 'end', props: { word: 'Baked', durationMs: 3000 } })
      expect(word).toBe(surface === 'terminal' && mode === 'shaped' ? arabicVisual(END_OF_TURN) : END_OF_TURN)
    }
  })
}

test('/muslim arabic validates, persists the override and reports denial', async ($, on) => {
  const command = (args: string) => $.command.run({ command: 'muslim', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  const writes: unknown[] = []
  on('config.set', async (_$, e) => {
    writes.push({ key: e.key, value: e.value })
    return e.value === 'plain' ? { deny: 'test refusal' } : { value: e.value }
  })
  expect((await command('arabic')).text).toContain('Arabic terminal auto')
  expect((await command('arabic wrong')).text).toContain('is auto, shaped')
  expect((await command('arabic shaped extra')).text).toContain('is auto, shaped')
  expect(writes).toEqual([])
  expect((await command('arabic shaped')).text).toBe('Arabic terminal shaped')
  expect((await command('arabic auto')).text).toBe('Arabic terminal auto')
  expect((await command('arabic plain')).text).toBe('Not changed: test refusal')
  expect(writes).toEqual([
    { key: 'muslim.arabicTerminal', value: 'shaped' },
    { key: 'muslim.arabicTerminal', value: 'auto' },
    { key: 'muslim.arabicTerminal', value: 'plain' },
  ])
})
