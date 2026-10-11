import { expect, mock, test } from 'claude-code/testing'
import { arabicVisual } from '../../../src/shared/arabic/visual.ts'
import { END_OF_TURN, SALAWAT, USAGE_LIMIT } from '../../../src/features/thikr/phrases.ts'

const band = (surface: 'terminal' | 'desktop') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'band',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
})

for (const program of ['Apple_Terminal', 'WarpTerminal', 'unknown']) {
  test(`${program}: only terminal Arabic is transformed, engine text stays`, { options: { thikrMode: 'salawat' } }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: program })
    mock.store(on, { arabicFixShownIn: 'done' })
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
      const shown = (text: string) => surface === 'terminal' && program === 'Apple_Terminal' ? arabicVisual(text) : text
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

for (const mode of ['off', 'on'] as const) {
  test(`manual ${mode} overrides detection and never changes desktop`, { options: { arabicFix: mode } }, async ($, on) => {
    // No env mock: explicit modes must not call env.get.
    let word = ''
    on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
      word = e.props.word
      const { Text } = $.ui.resolve(e)
      return <Text>{word}</Text>
    })
    for (const surface of ['terminal', 'desktop'] as const) {
      await $.ui.render({ surface, component: 'TurnDuration', requestId: 'end', props: { word: 'Baked', durationMs: 3000 } })
      expect(word).toBe(surface === 'terminal' && mode === 'on' ? arabicVisual(END_OF_TURN) : END_OF_TURN)
    }
  })
}

test('/muslim arabic-fix validates, persists the override and reports denial', async ($, on) => {
  const command = (args: string) => $.command.run({ command: 'muslim', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  const writes: unknown[] = []
  on('config.set', async (_$, e) => {
    writes.push({ key: e.key, value: e.value })
    return e.value === 'off' ? { deny: 'test refusal' } : { value: e.value }
  })
  expect((await command('arabic-fix')).text).toContain('Arabic fix auto')
  expect((await command('arabic-fix wrong')).text).toContain('is auto (detect), on')
  expect((await command('arabic-fix on extra')).text).toContain('is auto (detect), on')
  expect(writes).toEqual([])
  expect((await command('arabic-fix on')).text).toBe('Arabic fix on')
  expect((await command('arabic-fix auto')).text).toBe('Arabic fix auto')
  expect((await command('arabic-fix off')).text).toBe('Not changed: test refusal')
  expect(writes).toEqual([
    { key: 'muslim.arabicFix', value: 'on' },
    { key: 'muslim.arabicFix', value: 'auto' },
    { key: 'muslim.arabicFix', value: 'off' },
  ])
})

// Render-tree evidence only: this does not emulate a terminal's cell-diff repaint.
test('each spinner update shapes fresh text while desktop keeps logical Arabic', { options: { thikrMode: 'salawat' } }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
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
      expect(word).toBe(surface === 'terminal' ? arabicVisual(SALAWAT[index]!) : SALAWAT[index])
    }
  }
})
