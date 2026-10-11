import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import { arabicVisual } from './visual.ts'
import { needsArabicVisual, type ArabicFix } from './terminal.ts'

const picking = atom({ plugin: 'muslim', key: 'arabicFixPicking' } as const, true)
const manual = atom({ plugin: 'muslim', key: 'arabicFixManual' } as const, false)
const SHOWN_IN_KEY = 'arabicFixShownIn'
export const ARABIC_SAMPLE = 'سلام'
const QUESTION = 'Which Arabic word reads correctly in this terminal?'

const choose = async ($: EngineInterface, current: ArabicFix, value: string): Promise<void> => {
  const shownIn = await $.store.get(SHOWN_IN_KEY)
  const sessionId = await $.session.id()
  const firstRun = shownIn === undefined || shownIn === sessionId
  if (firstRun) await $.store.set(SHOWN_IN_KEY, 'done')
  await update($, picking, () => false)
  await update($, manual, () => false)

  const mode = value === 'on' || value === 'off' ? value : undefined
  if (mode) {
    const { deny } = await $.config.set({ key: 'muslim.arabicFix', value: mode })
    if (deny) return void $.ui.toast(`muslim: Not changed: ${deny} — run /muslim terminal-arabic to check again`)
  }
  $.ui.toast(`muslim: Arabic fix ${mode ?? current} — run /muslim terminal-arabic to check again`)
}

export const install = (on: On, options: Options): void => {
  on('command.run', { command: 'muslim' }, async ($, e, next) => {
    const args = e.args.trim()
    const words = args ? args.split(/\s+/) : []
    const [command] = words
    if (command !== 'terminal-arabic') return next(e).catch(() => ({ text: 'Usage: /muslim terminal-arabic' }))
    if (words.length !== 1) return { text: 'Usage: /muslim terminal-arabic' }
    if (await $.session.surface() !== 'terminal') return { text: 'The Arabic display check is available in the terminal only.' }
    await update($, manual, () => true)
    await update($, picking, () => true)
    return { text: 'Arabic display check opened.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'terminal' || e.props.hasSurvey) return theirs
    if (!await read($, picking)) return theirs
    const isManual = await read($, manual)

    const shownIn = await $.store.get(SHOWN_IN_KEY)
    if (!isManual && shownIn === 'done') return theirs
    const sessionId = await $.session.id()
    if (!isManual && shownIn !== undefined && shownIn !== sessionId) return theirs
    if (!isManual && shownIn === undefined) await $.store.set(SHOWN_IN_KEY, sessionId)

    const program = await $.env.get('TERM_PROGRAM')
    const likely = needsArabicVisual(options.arabicFix, program) ? 'on' : 'off'
    const fixed = arabicVisual(ARABIC_SAMPLE)
    const ordered = likely === 'on'
      ? [{ value: 'on', label: fixed }, { value: 'off', label: ARABIC_SAMPLE }]
      : [{ value: 'off', label: ARABIC_SAMPLE }, { value: 'on', label: fixed }]
    const { Box, Text, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box>
          <Text color="claude">muslim</Text>
          <Text dimColor> · {QUESTION}</Text>
        </Box>
        <Box flexDirection="column">
          <Button key={`arabic-fix-${ordered[0]!.value}`} plain hotkey="1" onPress={() => choose($, options.arabicFix, ordered[0]!.value)}>
            <Text>{ordered[0]!.label}</Text>
          </Button>
          <Button key={`arabic-fix-${ordered[1]!.value}`} plain hotkey="2" onPress={() => choose($, options.arabicFix, ordered[1]!.value)}>
            <Text>{ordered[1]!.label}</Text>
          </Button>
          <Button key="arabic-fix-keep" plain hotkey="3" onPress={() => choose($, options.arabicFix, 'keep')}>Not now</Button>
        </Box>
        <Text dimColor>Press 1, 2 or 3</Text>
        {theirs}
      </Box>
    )
  })
}
