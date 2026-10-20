import { commandFailure } from '../command/failure.ts'
import { MODES_KEY } from './terminal.ts'
import { arabicSetupShowing } from '../setup/visibility.ts'
import { accentText, type Accent } from '../color/index.ts'
import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import { ARABIC_MODES, defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode } from './terminal.ts'


const manual = atom({ plugin: 'muslim', key: 'arabicSurveyManualTerminal' } as const, null as string | null)
const cachedMode = atom({ plugin: 'muslim', key: 'arabicTerminalMode' } as const, null as { terminalId: string; mode: ArabicMode } | null)
export const ARABIC_SAMPLE = 'بِسْمِ اللَّهِ'
const TITLE = 'Terminal Arabic Setup'
const QUESTION = 'Which word is written correctly?'
const HINT = 'Some terminals break Arabic letters apart or reverse them — pick the one you can read.'

const terminalId = async ($: EngineInterface): Promise<string> => {
  const termProgram = await $.env.get('TERM_PROGRAM')
  if (termProgram) return terminalIdFromEnv({ TERM_PROGRAM: termProgram })
  const emulator = await $.env.get('TERMINAL_EMULATOR')
  if (emulator) return terminalIdFromEnv({ TERMINAL_EMULATOR: emulator })
  const bundle = await $.env.get('__CFBundleIdentifier')
  if (bundle) return terminalIdFromEnv({ __CFBundleIdentifier: bundle })
  const windowsTerminal = await $.env.get('WT_SESSION')
  if (windowsTerminal !== undefined) return terminalIdFromEnv({ WT_SESSION: windowsTerminal })
  const konsole = await $.env.get('KONSOLE_VERSION')
  if (konsole) return terminalIdFromEnv({ KONSOLE_VERSION: konsole })
  const vte = await $.env.get('VTE_VERSION')
  if (vte) return terminalIdFromEnv({ VTE_VERSION: vte })
  const kitty = await $.env.get('KITTY_WINDOW_ID')
  if (kitty) return terminalIdFromEnv({ KITTY_WINDOW_ID: kitty })
  const alacrittyWindow = await $.env.get('ALACRITTY_WINDOW_ID')
  if (alacrittyWindow) return terminalIdFromEnv({ ALACRITTY_WINDOW_ID: alacrittyWindow })
  const alacrittySocket = await $.env.get('ALACRITTY_SOCKET')
  if (alacrittySocket) return terminalIdFromEnv({ ALACRITTY_SOCKET: alacrittySocket })
  const os = await $.env.get('OS')

  return terminalIdFromEnv({ OS: os })
}

const choose = async ($: EngineInterface, termId: string, mode: ArabicMode): Promise<void> => {
  const saved = await $.store.get(MODES_KEY) as Record<string, unknown> | undefined
  await $.store.set(MODES_KEY, { ...(saved ?? {}), [termId]: mode })
  await update($, cachedMode, () => ({ terminalId: termId, mode }))
  await update($, manual, value => value === termId ? null : value)
  $.ui.toast(`muslim: Arabic for ${termId} set — /muslim terminal-arabic to redo`)
}

// This terminal's saved Arabic mode for the /muslim settings table; empty off the terminal.
const terminalLine = async ($: EngineInterface): Promise<string> => {
  if (await $.session.surface() !== 'terminal') return ''
  const id = await terminalId($)
  const saved = await $.store.get(MODES_KEY) as Record<string, unknown> | undefined
  const mode = saved?.[id]
  const shown = isArabicMode(mode) ? mode : `${defaultArabicMode(id)} (default, not chosen yet)`

  return `${shown} for ${id}`
}

export const install = (on: On, options: Options): void => {
  on('command.run', { command: 'muslim' }, async ($, e, next) => {
    const args = e.args.trim()
    const words = args ? args.split(/\s+/) : []
    const [command] = words
    if (command === undefined) return { text: await terminalLine($) }
    if (command !== 'terminal-arabic') return next(e)
    if (words.length !== 1) return { text: 'Usage: /muslim terminal-arabic' }
    if (await $.session.surface() !== 'terminal') return { text: 'The Arabic display check is available in the terminal only.' }
    const id = await terminalId($)
    await update($, manual, () => id)
    return { text: 'Arabic display check opened.' }
  }).catch(($, e, next) => next.called ? next(e) : { text: commandFailure(e.command, e.args, next.error) })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'terminal' || e.props.hasSurvey) return theirs
    const id = await terminalId($)
    const manualId = await read($, manual)
    const saved = await $.store.get(MODES_KEY) as Record<string, unknown> | undefined
    if (!arabicSetupShowing(e.surface, e.props.hasSurvey, { id, manual: manualId, saved })) return theirs

    const { Box, Text, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box>
          <Text color={await mainColor($, options.color)}>muslim</Text>
          <Text> · {TITLE} · {QUESTION}</Text>
        </Box>
        <Text dimColor>{HINT}</Text>
        <Box flexDirection="column">
          {ARABIC_MODES.map((mode, index) => (
            <Button key={`arabic-mode-${mode}`} plain hotkey={String(index + 1)} onPress={() => choose($, id, mode)}>
              <Text>{terminalArabic('terminal', mode, ARABIC_SAMPLE)}</Text>
            </Button>
          ))}
        </Box>
        <Text dimColor>Press 1–3</Text>
        {theirs}
      </Box>
    )
  })
}

// Engine access stays in this file; the shared palette is pure.
const mainColor = async ($: EngineInterface, color: Accent): Promise<string> => {
  if (color === 'orange') return accentText(color, undefined)
  const theme = (await $.config.list().catch(() => [])).find(row => row.key === 'theme')
  return accentText(color, theme?.value)
}
