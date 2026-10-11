import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import { ARABIC_MODES, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode, type TerminalEnvironment } from './terminal.ts'


const manual = atom({ plugin: 'muslim', key: 'arabicSurveyManualTerminal' } as const, null as string | null)
const cachedMode = atom({ plugin: 'muslim', key: 'arabicTerminalMode' } as const, null as { terminalId: string; mode: ArabicMode } | null)
const MODES_KEY = 'arabicTerminals'
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
        <Text dimColor>Press 1–4</Text>
        {theirs}
      </Box>
    )
  })
}
