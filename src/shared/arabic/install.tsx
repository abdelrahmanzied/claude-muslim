import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import { ARABIC_MODES, defaultArabicMode, isArabicMode, terminalArabic, type ArabicMode } from './terminal.ts'

const manual = atom({ plugin: 'muslim', key: 'arabicSurveyManualTerminal' } as const, null as string | null)
const cachedMode = atom({ plugin: 'muslim', key: 'arabicTerminalMode' } as const, null as { terminalId: string; mode: ArabicMode } | null)
const MODES_KEY = 'arabicTerminals'
export const ARABIC_SAMPLE = 'بِسْمِ اللَّهِ'
const QUESTION = 'Which line reads correctly in this terminal?'

const terminalId = async ($: EngineInterface): Promise<string> => (await $.env.get('TERM_PROGRAM')) || 'unknown'

const choose = async ($: EngineInterface, termId: string, choice: ArabicMode | 'keep'): Promise<void> => {
  const saved = await $.store.get(MODES_KEY) as Record<string, unknown> | undefined
  const mode = choice === 'keep' ? defaultArabicMode(termId) : choice
  await $.store.set(MODES_KEY, { ...(saved ?? {}), [termId]: mode })
  await update($, cachedMode, () => ({ terminalId: termId, mode }))
  await update($, manual, value => value === termId ? null : value)
  $.ui.toast(`muslim: Arabic for ${termId} set — /muslim terminal-arabic to redo`)
}

export const install = (on: On, _options: Options): void => {
  on('command.run', { command: 'muslim' }, async ($, e, next) => {
    const args = e.args.trim()
    const words = args ? args.split(/\s+/) : []
    const [command] = words
    if (command !== 'terminal-arabic') return next(e).catch(() => ({ text: 'Usage: /muslim terminal-arabic' }))
    if (words.length !== 1) return { text: 'Usage: /muslim terminal-arabic' }
    if (await $.session.surface() !== 'terminal') return { text: 'The Arabic display check is available in the terminal only.' }
    const id = await terminalId($)
    await update($, manual, () => id)
    return { text: 'Arabic display check opened.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'terminal' || e.props.hasSurvey) return theirs
    const id = await terminalId($)
    const isManual = (await read($, manual)) === id
    const saved = await $.store.get(MODES_KEY) as Record<string, unknown> | undefined
    if (!isManual && isArabicMode(saved?.[id])) return theirs

    const { Box, Text, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box>
          <Text color="claude">muslim</Text>
          <Text dimColor> · {QUESTION}</Text>
        </Box>
        <Box flexDirection="column">
          {ARABIC_MODES.map((mode, index) => (
            <Button key={`arabic-mode-${mode}`} plain hotkey={String(index + 1)} onPress={() => choose($, id, mode)}>
              <Text>{terminalArabic('terminal', mode, ARABIC_SAMPLE)}</Text>
            </Button>
          ))}
          <Button key="arabic-mode-keep" plain hotkey="5" onPress={() => choose($, id, 'keep')}>Not now</Button>
        </Box>
        <Text dimColor>Press 1–5</Text>
        {theirs}
      </Box>
    )
  })
}
