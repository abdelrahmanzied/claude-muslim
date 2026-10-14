import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode } from '../../shared/arabic/terminal.ts'
import { readAthkar, readQuran, readSalah, runPanelAction } from '../../shared/panel/signal.ts'
import { NO_FOLDS, hitOfCells, isFolds, isPaneMessage, keyAct, type Enabled, type Folds, type PaneAct } from './layout.ts'
import { paneModel, textLines, widthOf, type PaneModel } from './model.ts'

const playingRef = { plugin: 'muslim', key: 'quranPlaying' } as const
const PANE_ID = 'muslim'
const foldsRef = { plugin: 'muslim', key: 'paneFolds' } as const

// Which cards are folded to their title row, kept in the session.
async function readFolds($: EngineInterface): Promise<Folds> {
  const saved = (await $.state.get(foldsRef)).value
  return isFolds(saved) ? saved : NO_FOLDS
}
const TICK_MS = 1000

// The Arabic mode of this terminal, by the shared rules; plain on every other surface.
async function arabicMode($: EngineInterface, surface: string): Promise<ArabicMode> {
  if (surface !== 'terminal') return 'plain'
  const id = terminalIdFromEnv({
    TERM_PROGRAM: await $.env.get('TERM_PROGRAM'),
    TERMINAL_EMULATOR: await $.env.get('TERMINAL_EMULATOR'),
    __CFBundleIdentifier: await $.env.get('__CFBundleIdentifier'),
    WT_SESSION: await $.env.get('WT_SESSION'),
    KONSOLE_VERSION: await $.env.get('KONSOLE_VERSION'),
    VTE_VERSION: await $.env.get('VTE_VERSION'),
    KITTY_WINDOW_ID: await $.env.get('KITTY_WINDOW_ID'),
    ALACRITTY_WINDOW_ID: await $.env.get('ALACRITTY_WINDOW_ID'),
    ALACRITTY_SOCKET: await $.env.get('ALACRITTY_SOCKET'),
    OS: await $.env.get('OS'),
  })
  const cached = (await $.state.get({ plugin: 'muslim', key: 'arabicTerminalMode' })).value
  const saved = (await $.store.get('arabicTerminals') as Record<string, unknown> | undefined)?.[id]
  return cached?.terminalId === id ? cached.mode : isArabicMode(saved) ? saved : defaultArabicMode(id)
}

// What the three cards show right now: whatever the features have connected.
async function modelNow($: EngineInterface, options: Options, columns: unknown): Promise<PaneModel> {
  const now = await $.clock.now()
  return paneModel({ salah: readSalah(now), quran: await readQuran(), athkar: await readAthkar() }, now, widthOf(columns), options.color, undefined, await readFolds($))
}

const enabledOf = (m: PaneModel): Enabled => ({
  athan: m.prayer.isSet,
  quran: m.quran.isAvailable,
  canPrev: m.quran.isAvailable && m.quran.canPrev,
  canNext: m.quran.isAvailable && m.quran.canNext,
  athkar: m.athkar.isAvailable,
})

// The athan toggle changes the salah setting itself (the module reloads); every other press is the owning feature's own action.
async function press($: EngineInterface, options: Options, act: PaneAct): Promise<void> {
  if (act === 'fold-prayer' || act === 'fold-quran' || act === 'fold-athkar') {
    const key = act === 'fold-prayer' ? 'prayer' : act === 'fold-quran' ? 'quran' : 'athkar'
    const folds = await readFolds($)
    await $.state.set(foldsRef, { ...folds, [key]: !folds[key] })
    $.ui.invalidate('ui.render')
    return
  }
  if (act === 'athan') {
    const { deny } = await $.config.set({ key: 'muslim.salahAthan', value: !options.salahAthan })
    if (deny) $.ui.toast(`Not changed: ${deny}`)
    return
  }
  const took = await runPanelAction(act === 'quran-toggle' ? 'quran-toggle' : act === 'quran-prev' ? 'quran-prev' : act === 'quran-next' ? 'quran-next' : act === 'quran-open' ? 'quran-open' : 'athkar-open')
  if (!took) $.ui.toast(act === 'athkar-open' ? 'Athkar are off. /athkar on' : 'Quran is not ready yet. /quran')
}

// The footer chip toggles the pane: it opens it when closed and closes it when open.
async function isPaneOpen($: EngineInterface): Promise<boolean> {
  try { return (await $.ui.panes()).some(pane => pane.id === PANE_ID) } catch { return false }
}
async function togglePane($: EngineInterface): Promise<void> {
  try {
    if (await isPaneOpen($)) await $.ui.close({ id: PANE_ID })
    else { await $.ui.open({ id: PANE_ID, title: 'Muslim' }); $.ui.invalidate('ui.render') }
  } catch { $.ui.toast('Muslim pane unavailable. Use /muslim pane.') }
}

export const install = (on: On, options: Options) => {
  // Registered before Quran and salah: this outer hook prepends the chip, so it is the leftmost item.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'desktop') return theirs
    const { Box, Text, Button } = $.ui.resolve(e)
    // Desktop draws a Button from its label alone; the Text repeats it for a Desktop that draws the children.
    return <Box gap={1}>
      <Button key="muslim-footer" label="☾" plain onPress={() => { void togglePane($) }}><Text>☾</Text></Button>
      {theirs}
    </Box>
  })

  // The pane's redraw clock: every second while the Quran plays, else once a minute (the countdown). Only while open.
  let ticker: { cancel: () => void } | undefined
  let lastMinute = -1
  const stopTicker = () => { ticker?.cancel(); ticker = undefined }

  on('command.run', { command: 'muslim', args: /^\s*pane\s*$/ }, async $ => {
    const surface = await $.session.surface() ?? 'desktop'
    if (surface !== 'desktop') {
      const mode = await arabicMode($, surface)
      return { text: textLines(await modelNow($, options, 0), text => terminalArabic(surface, mode, text)).join('\n') }
    }
    await $.ui.open({ id: PANE_ID, title: 'Muslim' })
    $.ui.invalidate('ui.render')
    return { text: 'Muslim pane opened (desktop only).' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    ticker ??= $.clock.every(TICK_MS, async () => {
      try {
        if (!(await $.ui.panes()).some(pane => pane.id === PANE_ID)) { stopTicker(); return }
        const now = await $.clock.now()
        const minute = Math.floor(now / 60_000)
        if ((await $.state.get(playingRef)).value || minute !== lastMinute) { lastMinute = minute; $.ui.invalidate('ui.render') }
      } catch { stopTicker() }
    })
    const { Box, Text } = $.ui.resolve(e)
    const model = await modelNow($, options, e.props.bodyColumns)
    if (e.surface !== 'desktop') {
      const mode = await arabicMode($, e.surface)
      return <Box flexDirection="column">{textLines(model, text => terminalArabic(e.surface, mode, text)).map((line, i) => <Text key={`m${i}`} dimColor={line === ''}>{line}</Text>)}</Box>
    }
    const { Client } = $.ui.resolve(e)
    return <Client key="muslim-pane" module="./client.tsx" width="100%" props={model} />
  }).catch(async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>Muslim pane unavailable. Use /muslim pane again.</Text>
  })

  on('ui.message', { element: 'muslim-pane' }, async ($, e) => {
    if (e.surface !== 'desktop' || !isPaneMessage(e.data)) return {}
    const message = e.data
    if (message.act === 'size') return {}
    let act: PaneAct | null
    if (message.act === 'pointer') {
      if (message.button !== 'left') return {}
      const model = await modelNow($, options, message.columns)
      act = hitOfCells(message.width, message.x, message.y, message.columns, message.rows, message.coarse, enabledOf(model), model.folds)
    } else act = keyAct(message.key)
    if (act) await press($, options, act)
    return {}
  })

  on('ui.close', { id: PANE_ID }, async ($, e, next) => {
    stopTicker()
    return next(e)
  })
}

