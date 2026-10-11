import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import { arabicVisual } from './visual.ts'
import { needsArabicVisual, type ArabicFix } from './terminal.ts'

const answered = atom({ plugin: 'muslim', key: 'arabicFixAnswered' } as const, false)
const shown = atom({ plugin: 'muslim', key: 'arabicFixShown' } as const, false)
const busy = atom({ plugin: 'muslim', key: 'arabicFixBusy' } as const, false)
const ANSWERED_KEY = 'arabicFixAnswered'
export const ARABIC_SAMPLE = 'سلام'

// Dismiss before config.set reloads the module; even a denied choice hides it.
const choose = async ($: EngineInterface, current: ArabicFix, mode?: 'on' | 'off'): Promise<void> => {
  if (await read($, answered)) return
  let claimed = false
  await update($, busy, value => {
    claimed = !value
    return true
  })
  if (!claimed) return
  try {
    await update($, answered, () => true)
    if (mode) {
      const { deny } = await $.config.set({ key: 'muslim.arabicFix', value: mode })
      if (deny) return void $.ui.toast(`muslim: Not changed: ${deny} — change with /muslim arabic-fix`)
    }
    $.ui.toast(`muslim: Arabic fix ${mode ?? current} — change with /muslim arabic-fix`)
  } finally {
    await update($, busy, () => false)
  }
}

export const install = (on: On, options: Options): void => {
  // Bridge the first draw until the clock callback may legally write state.
  let pendingShown = false
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'terminal' || e.props.hasSurvey) return theirs
    if (await read($, answered)) return theirs
    if (!pendingShown && !(await read($, shown))) {
      if ((await $.store.get(ANSWERED_KEY)) === true) return theirs
      // Consume the machine's first check on display, even without an answer.
      await $.store.set(ANSWERED_KEY, true)
      pendingShown = true
      $.clock.after(0, async () => {
        try {
          await update($, shown, () => true)
        } finally {
          pendingShown = false
        }
      })
    }
    const program = await $.env.get('TERM_PROGRAM')
    const likely = needsArabicVisual(options.arabicFix, program) ? 'on' : 'off'
    const { Box, Text, Button } = $.ui.resolve(e)
    const first = <Button key="arabic-fix-off" label={ARABIC_SAMPLE} plain onPress={() => choose($, options.arabicFix, 'off')} />
    const second = <Button key="arabic-fix-on" label={arabicVisual(ARABIC_SAMPLE)} plain onPress={() => choose($, options.arabicFix, 'on')} />

    return (
      <Box flexDirection="column">
        <Box key="arabic-fix-check" flexDirection="column">
          <Box>
            <Text color="claude">muslim</Text>
            <Text dimColor> · Which Arabic word reads correctly here?</Text>
          </Box>
          <Box gap={2}>
            {likely === 'on' ? second : first}
            {likely === 'on' ? first : second}
            <Button key="arabic-fix-later" label="Not now" plain dimColor onPress={() => choose($, options.arabicFix)} />
          </Box>
        </Box>
        {theirs}
      </Box>
    )
  })
}
