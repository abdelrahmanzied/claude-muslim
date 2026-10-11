import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import { arabicVisual } from './visual.ts'
import { needsArabicVisual } from './terminal.ts'

const answered = atom({ plugin: 'muslim', key: 'arabicFixAnswered' } as const, false)
const busy = atom({ plugin: 'muslim', key: 'arabicFixBusy' } as const, false)
const ANSWERED_KEY = 'arabicFixAnswered'
export const ARABIC_SAMPLE = 'سلام'

// Later counts as an answer: keep the current mode and never ask again.
const choose = async ($: EngineInterface, mode?: 'on' | 'off'): Promise<void> => {
  if (await read($, answered)) return
  let claimed = false
  await update($, busy, value => {
    claimed = !value
    return true
  })
  if (!claimed) return
  try {
    if (mode) {
      const { deny } = await $.config.set({ key: 'muslim.arabicFix', value: mode })
      if (deny) return void $.ui.toast(`Not changed: ${deny}`)
    }
    await $.store.set(ANSWERED_KEY, true)
    await update($, answered, () => true)
  } finally {
    await update($, busy, () => false)
  }
}

export const install = (on: On, options: Options): void => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'terminal' || e.props.hasSurvey) return theirs
    if (await read($, answered)) return theirs
    if ((await $.store.get(ANSWERED_KEY)) === true) return theirs
    const program = await $.env.get('TERM_PROGRAM')
    const likely = needsArabicVisual(options.arabicFix, program) ? 'on' : 'off'
    const { Box, Text, Button } = $.ui.resolve(e)
    const first = <Button key="arabic-fix-off" label="1 looks right" plain onPress={() => choose($, 'off')} />
    const second = <Button key="arabic-fix-on" label="2 looks right" plain onPress={() => choose($, 'on')} />

    return (
      <Box flexDirection="column">
        <Box key="arabic-fix-check" gap={1}>
          <Text dimColor>Arabic:</Text>
          <Text>{`1 ${ARABIC_SAMPLE}`}</Text>
          <Text>{`2 ${arabicVisual(ARABIC_SAMPLE)}`}</Text>
          {likely === 'on' ? second : first}
          {likely === 'on' ? first : second}
          <Button key="arabic-fix-later" label="Later" plain dimColor onPress={() => choose($)} />
        </Box>
        {theirs}
      </Box>
    )
  })
}
