import { configFailure, hasConfigRow, MISSING_CONFIG } from '../../shared/reload/config.ts'
import { stopBeforeReload } from '../../shared/reload/signal.ts'
import type { EngineInterface, On } from 'claude-code'
import type { Options } from '../../config.ts'
import type { PaneOptimistic, PanePicker } from '../../../types/index.d.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode } from '../../shared/arabic/terminal.ts'
import { readPanelAutoUpdate, readAthkar, readQuran, readQuranOptions, readSalah, runPanelAction, type PanelAction, type PanelOption } from '../../shared/panel/signal.ts'
import { pointerPixels } from '../../shared/card/pointer.ts'
import { NO_FOLDS, cardRects, hitOfCells, isFolds, isPaneMessage, keyAct, paneHeight, quranRowOf, type Enabled, type Folds, type PaneAct, type PaneMessage } from './layout.ts'
import { paneModel, quranLayout, textLines, widthOf, type PaneModel } from './model.ts'
import { dragBar, dragCell, isPanePicker, openPicker, pickerKey, pickerView, pressBar, type PickerView } from './picker.ts'
import { CATEGORIES, CLOSED_SETTINGS, COPIED_MS, changeCategory, copiedAt, isSwitchField, loadSettings, optimisticOptions, settingsBody, type SettingsState } from './settings.ts'
import { skipPaneScroll } from '../../shared/scroll/index.ts'
// DEMO BEGIN
import { DEMO_TICK_MS, demoAthkar, demoFolds, demoNow, demoQuran, demoReply, demoSalah, demoTerminalReply, isDemoOver } from './demo.ts'
import { avatarSvg } from '../../shared/quran-avatar/index.ts'
import { ATHKAR_TITLE } from '../../shared/athkar/titles.ts'
import { connectDemo, doneDemo } from '../../shared/demo/signal.ts'
// DEMO END

const playingRef = { plugin: 'muslim', key: 'quranPlaying' } as const
const PANE_ID = 'muslim'
const foldsRef = { plugin: 'muslim', key: 'paneFolds' } as const

// Which cards are folded to their title row, kept in the session.
async function readFolds($: EngineInterface): Promise<Folds> {
  const saved = (await $.state.get(foldsRef)).value
  return isFolds(saved) ? saved : NO_FOLDS
}
const settingsRef = { plugin: 'muslim', key: 'paneSettings' } as const
const optimisticRef = { plugin: 'muslim', key: 'paneOptimistic' } as const
const copiedRef = { plugin: 'muslim', key: 'paneCopied' } as const

// Read-modify-write of the pending switches: `edit` gets a copy and returns the
// new value, or null to leave it. A write that another press beat is redone from a fresh read.
async function editPending($: EngineInterface, edit: (pending: PaneOptimistic) => PaneOptimistic | null): Promise<void> {
  for (let tries = 0; tries < 5; tries++) {
    const held = await $.state.get(optimisticRef)
    const next = edit({ ...held.value })
    if (!next) return
    if ((await $.state.set(optimisticRef, next, { ifVersion: held.version })).isSet) return
  }
}

// The copy button's confirmation, shown until its expiry time; the timer only redraws.
async function confirmCopy($: EngineInterface, command: string): Promise<void> {
  const until = (await $.clock.now()) + COPIED_MS
  await $.state.set(copiedRef, { command, until })
  $.clock.after(COPIED_MS, () => { void expireCopy($, until) })
}
async function expireCopy($: EngineInterface, until: number): Promise<void> {
  const held = await $.state.get(copiedRef)
  if (held.value?.until === until) await $.state.set(copiedRef, null, { ifVersion: held.version })
  $.ui.invalidate('ui.render')
}
async function readSettings($: EngineInterface): Promise<SettingsState> {
  const saved = (await $.state.get(settingsRef)).value
  return loadSettings(saved)
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

const athkarMenuRef = { plugin: 'muslim', key: 'paneAthkarMenu' } as const
async function writeAthkarMenu($: EngineInterface, open: boolean): Promise<void> {
  await $.state.set(athkarMenuRef, open)
  $.ui.invalidate('ui.render')
}

const pickerRef = { plugin: 'muslim', key: 'panePicker' } as const
async function readPicker($: EngineInterface): Promise<PanePicker | null> {
  const saved = (await $.state.get(pickerRef)).value
  return isPanePicker(saved) ? saved : null
}
async function writePicker($: EngineInterface, picker: PanePicker | null): Promise<void> {
  await $.state.set(pickerRef, picker)
  $.ui.invalidate('ui.render')
}

// What the three cards show right now: whatever the features have connected, and the Quran card's open list.
async function modelNow($: EngineInterface, options: Options, columns: unknown): Promise<PaneModel> {
  const now = await $.clock.now()
  const folds = await readFolds($), quran = await readQuran(), picker = await readPicker($)
  // A segment list only means something for a split surah; a folded card shows no list.
  let view: PickerView | null = null
  if (picker && quran && !folds.quran && (picker.list !== 'segment' || quran.segmented)) view = pickerView(picker, await readQuranOptions(picker.list, picker.query))
  return paneModel({ salah: readSalah(now), quran, athkar: await readAthkar() }, now, widthOf(columns), options.color, undefined, folds, { state: await readSettings($), options: optimisticOptions(options, (await $.state.get(optimisticRef)).value), terminalMode: 'per-terminal setup', copied: copiedAt((await $.state.get(copiedRef)).value, now), autoUpdate: await readPanelAutoUpdate(), pendingAutoUpdate: (await $.state.get({ plugin: 'muslim', key: 'paneAutoUpdate' })).value ?? null }, view, (await $.state.get(athkarMenuRef)).value === true)
}

const enabledOf = (m: PaneModel): Enabled => ({
  athan: m.prayer.isSet,
  quran: m.quran.isAvailable,
  canPrev: m.quran.isAvailable && m.quran.canPrev,
  canNext: m.quran.isAvailable && m.quran.canNext,
  segmented: m.quran.isAvailable && m.quran.segmented,
  athkar: m.athkar.isAvailable,
  athkarFinish: m.athkar.isAvailable && !m.athkar.isDone,
  athkarDone: m.athkar.isAvailable && m.athkar.isDone,
})

// The athan toggle changes the salah setting itself (the module reloads); every other press is the owning feature's own action.
async function press($: EngineInterface, options: Options, act: PaneAct): Promise<void> {
  if (act.startsWith('settings:')) { await settingsPress($, options, act); return }
  if (act === 'fold-prayer' || act === 'fold-quran' || act === 'fold-athkar') {
    const key = act === 'fold-prayer' ? 'prayer' : act === 'fold-quran' ? 'quran' : 'athkar'
    const folds = await readFolds($)
    if (key === 'athkar') await writeAthkarMenu($, false)
    await $.state.set(foldsRef, { ...folds, [key]: !folds[key] })
    $.ui.invalidate('ui.render')
    return
  }
  if (act === 'athkar-picker') {
    await writeAthkarMenu($, (await $.state.get(athkarMenuRef)).value !== true)
    return
  }
  if (act.startsWith('athkar-set:')) {
    await writeAthkarMenu($, false)
    await runPanelAction('athkar-set', act.slice('athkar-set:'.length))
    return
  }
  if (act === 'athkar-reset') {
    const k = await readAthkar()
    if (k) await runPanelAction(k.canUndo ? 'athkar-undo' : 'athkar-reset')
    return
  }
  if (act === 'athan') {
    try {
      if (!hasConfigRow(await $.config.list(), 'muslim.salahAthan')) return void $.ui.toast(MISSING_CONFIG)
      await stopBeforeReload()
      const { deny } = await $.config.set({ key: 'muslim.salahAthan', value: !options.salahAthan })
      if (deny) $.ui.toast(configFailure(deny))
    } catch (error) { $.ui.toast(configFailure(error)) }
    return
  }
  if (act === 'quran-pick-reciter' || act === 'quran-pick-surah' || act === 'quran-pick-segment') {
    const list = act === 'quran-pick-reciter' ? 'reciter' : act === 'quran-pick-surah' ? 'surah' : 'segment'
    const rows = await readQuranOptions(list, '')
    if (!rows.length) { $.ui.toast('Quran is not ready yet. /quran'); return }
    await writeAthkarMenu($, false)
    await writePicker($, openPicker(list, rows.length, rows.findIndex(o => o.selected)))
    return
  }
  if (act === 'quran-back') { await writePicker($, null); return }
  const row = quranRowOf(act)
  if (row !== null) {
    const picker = await readPicker($)
    if (!picker) return
    const option = (await readQuranOptions(picker.list, picker.query))[picker.scroll + row]
    if (option) await choose($, picker, option)
    return
  }
  const action: PanelAction | null = act === 'quran-retry' || act === 'quran-toggle' || act === 'quran-prev' || act === 'quran-next' || act === 'quran-repeat-surah' || act === 'quran-repeat-segment' || act === 'athkar-open' || act === 'athkar-finish' ? act : null
  if (!action) return
  const took = await runPanelAction(action)
  if (!took) $.ui.toast((act === 'athkar-open' || act === 'athkar-finish') ? 'Athkar is not ready yet. /athkar' : 'Quran is not ready yet. /quran')
}

// A row chosen: the list closes first, then the Quran feature makes the pick it validates itself.
async function choose($: EngineInterface, picker: PanePicker, option: PanelOption): Promise<void> {
  await writePicker($, null)
  const took = await runPanelAction(picker.list === 'reciter' ? 'quran-reciter' : picker.list === 'surah' ? 'quran-surah' : 'quran-segment', option.value)
  if (!took) $.ui.toast('Quran is not ready yet. /quran')
}

// A key with a list open: the list takes it.
async function pickerKeyPress($: EngineInterface, key: string): Promise<void> {
  const picker = await readPicker($)
  if (!picker) return
  const rows = await readQuranOptions(picker.list, picker.query)
  const result = pickerKey(picker, key, rows.length)
  if (result.choose !== null) { const option = rows[result.choose]; if (option) await choose($, picker, option) }
  else if (result.picker !== picker) await writePicker($, result.picker)
}

// A press on the scrollbar moves the list there and starts a drag; the rest of the drag arrives as `drag` messages.
async function barPress($: EngineInterface, model: PaneModel, message: Extract<PaneMessage, { act: 'pointer' }>): Promise<void> {
  const picker = await readPicker($)
  if (!picker || !model.picker) return
  const layout = quranLayout(model)
  const height = paneHeight(model.folds, model.settings.state, model.settings.options, layout, model.athkarMenu)
  const y = pointerPixels(message.width, message.x, message.y, message.columns, message.rows, height).y
  await writePicker($, pressBar(picker, model.picker.count, cardRects(model.folds, model.settings.state, model.settings.options, layout, model.athkarMenu).quranY, y, dragCell(height, message.rows)))
}
async function dragPress($: EngineInterface, folds: Folds, message: Extract<PaneMessage, { act: 'drag' }>): Promise<void> {
  const picker = await readPicker($)
  if (!picker?.drag) return
  const count = (await readQuranOptions(picker.list, picker.query)).length
  const next = dragBar(picker, count, cardRects(folds).quranY, message.y, NaN, message.end)
  // A move that changes nothing draws nothing: every redraw swaps a whole picture on the host.
  if (next.scroll !== picker.scroll || next.highlight !== picker.highlight || next.drag !== picker.drag) await writePicker($, next)
}

async function settingsPress($: EngineInterface, options: Options, act: PaneAct): Promise<void> {
  const model = await modelNow($, options, 50)
  const s = model.settings.state
  if (act === 'settings:fold') {
    await $.state.set(settingsRef, { ...s, open: !s.open })
  } else if (act.startsWith('settings:tab:')) {
    const category = CATEGORIES.find(c => act === `settings:tab:${c[0]}`)?.[0]
    if (!category || !s.open || s.category === category) return
    await $.state.set(settingsRef, changeCategory(s, category))
  } else {
    const effect = settingsBody(model.width, model.settings).targets.find(t => t.act === act)?.effect
    if (!effect) return
    if (effect.kind === 'config') {
      // state.set redraws subscribed panes before config's reload completes.
      const field = effect.field
      try {
        if (!hasConfigRow(await $.config.list(), `muslim.${field}`)) return void $.ui.toast(MISSING_CONFIG)
      } catch (error) { $.ui.toast(configFailure(error)); return }
      const optimistic = isSwitchField(field) && typeof effect.value === 'boolean'
      if (optimistic) await editPending($, pending => ({ ...pending, [field]: effect.value as boolean }))
      if (s.face === 'methods') await $.state.set(settingsRef, { ...s, face: 'main', page: 0 })
      try {
        await stopBeforeReload()
        const { deny } = await $.config.set({ key: `muslim.${effect.field}`, value: effect.value })
        if (deny) throw new Error(deny)
      } catch (error) {
        // Clear only this press's own entry: a newer press for the field has a different value.
        if (optimistic) await editPending($, pending => pending[field] === effect.value ? Object.fromEntries(Object.entries(pending).filter(([k]) => k !== field)) : null)
        if (s.face === 'methods') await $.state.set(settingsRef, s)
        $.ui.toast(configFailure(error))
      }
    } else if (effect.kind === 'command') {
      try { await $.command.run({ command: 'muslim', args: effect.args }) }
      catch { $.ui.toast(`Run /muslim ${effect.args}.`) }
    } else if (effect.kind === 'autoupdate') {
      const ref = { plugin: 'muslim', key: 'paneAutoUpdate' } as const
      await $.state.set(ref, effect.value)
      if (!(await runPanelAction('muslim-autoupdate', effect.value ? 'on' : 'off'))) {
        const pending = await $.state.get(ref)
        if (pending.value === effect.value) await $.state.set(ref, null, { ifVersion: pending.version })
        $.ui.toast('Not changed: auto-update is unavailable')
      }
    } else if (effect.kind === 'face') {
      await $.state.set(settingsRef, { ...s, face: effect.face, page: 0 })
      if (effect.face === 'city' && !(await runPanelAction('salah-city'))) $.ui.toast('Choose a city with /salah city.')
    } else if (effect.kind === 'page') await $.state.set(settingsRef, { ...s, page: effect.page })
    else if ((await $.ui.copy({ text: effect.command, surface: 'desktop' })).isCopied) await confirmCopy($, effect.command)
    else $.ui.toast(effect.command)
  }
  $.ui.invalidate('ui.render')
}

// The footer chip toggles the pane: it opens it when closed and closes it when open.
async function isPaneOpen($: EngineInterface): Promise<boolean> {
  try { return (await $.ui.panes()).some(pane => pane.id === PANE_ID) } catch { return false }
}
async function togglePane($: EngineInterface): Promise<void> {
  try {
    if (await isPaneOpen($)) await $.ui.close({ id: PANE_ID })
    else { await $.ui.open({ id: PANE_ID, title: '☾ Muslim' }); $.ui.invalidate('ui.render') }
  } catch { $.ui.toast('Muslim pane unavailable. Use /muslim.') }
}

// DEMO BEGIN: the tour is module-local drawing only. It reads the clock and the pane list, and
// never writes settings, the store, folds, the athkar menu or any other saved state.
// shared: started by /muslim demo, which waits for this demo's end.
type PaneDemo = { startedAt: number; shared: boolean; wasOpen: boolean; timer?: { cancel: () => void } }
let demo: PaneDemo | undefined

// What the pane draws while the tour plays instead of the real feeds.
const demoModelAt = (elapsed: number, options: Options, columns: unknown): PaneModel => paneModel(
  { salah: demoSalah(), quran: demoQuran(elapsed, avatarSvg(true, elapsed, 96)), athkar: demoAthkar(elapsed, ATHKAR_TITLE.morning) },
  demoNow(elapsed), widthOf(columns), options.color, undefined, demoFolds(elapsed),
  { state: CLOSED_SETTINGS, options: optimisticOptions(options), terminalMode: 'per-terminal setup', copied: null },
)

const finishDemo = async ($: EngineInterface, playing: PaneDemo) => {
  if (demo !== playing) return
  playing.timer?.cancel()
  demo = undefined
  // Back to how it was: closed again if it was closed before the tour; an open pane just draws its real view.
  if (!playing.wasOpen) { try { await $.ui.close({ id: PANE_ID }) } catch { /* already closed */ } }
  $.ui.invalidate('ui.render')
  if (playing.shared) doneDemo('pane')
}
const tickDemo = async ($: EngineInterface, playing: PaneDemo) => {
  if (demo !== playing) return
  const elapsed = (await $.clock.now()) - playing.startedAt
  if (demo !== playing) return
  if (isDemoOver(elapsed)) await finishDemo($, playing)
  else $.ui.invalidate('ui.render')
}
const playDemo = async ($: EngineInterface, shared: boolean): Promise<string> => {
  if (await $.session.surface() !== 'desktop') {
    if (shared) doneDemo('pane')
    return ''
  }
  demo?.timer?.cancel()
  const wasOpen = await isPaneOpen($)
  const playing: PaneDemo = { startedAt: await $.clock.now(), shared, wasOpen }
  demo = playing
  try {
    if (!wasOpen) await $.ui.open({ id: PANE_ID, title: '☾ Muslim' })
  } catch {
    demo = undefined
    if (shared) doneDemo('pane')
    return 'Muslim pane unavailable. Use /muslim.'
  }
  playing.timer = $.clock.every(DEMO_TICK_MS, () => { void tickDemo($, playing) })
  $.ui.invalidate('ui.render')
  return demoReply()
}
// DEMO END

export const install = (on: On, options: Options) => {
  // Registered before Quran and salah: this outer hook prepends the chip, so it is the leftmost item.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'desktop' || !options.paneButton) return theirs
    const { Box, Text, Button } = $.ui.resolve(e)
    // Desktop draws a Button from its label alone; the Text repeats it for a Desktop that draws the children.
    return <Box gap={1}>
      <Button key="muslim-footer" label="☾ Muslim" plain onPress={() => { void togglePane($) }}><Text>☾ Muslim</Text></Button>
      {theirs}
    </Box>
  })

  // The pane's redraw clock: every second while the Quran plays, else once a minute (the countdown). Only while open.
  let ticker: { cancel: () => void } | undefined
  let lastMinute = -1
  const stopTicker = () => { ticker?.cancel(); ticker = undefined }
  // ui.scroll has no surface field: remember the surface and offset of the
  // pane's latest render, rather than assuming the session is its drawing.
  let desktopPane = false
  let paneOffset = 0

  // Outer to Arabic setup: desktop answers here, other surfaces keep the status table.
  on('command.run', { command: 'muslim', args: /^\s*$/ }, async ($, e, next) => {
    const surfaces = await $.session.surfaces()
    if (!surfaces.includes('desktop') || surfaces.includes('terminal')) return next(e)
    // Refresh Quran's feed through its own empty-command hook before opening.
    await next(e)
    try {
      await $.ui.open({ id: 'muslim', title: '☾ Muslim' })
      $.ui.invalidate('ui.render')
      return { text: 'Muslim pane opened.' }
    } catch {
      // An empty answer asks register to keep its existing text-table fallback.
      return {}
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    // Let the owning features connect even when the footer has not drawn;
    // nothing beneath may answer this pane, which is fine.
    try { await next(e) } catch { /* no hook beneath */ }
    desktopPane = e.surface === 'desktop'
    paneOffset = e.props.scroll?.offset ?? 0
    ticker ??= $.clock.every(TICK_MS, async () => {
      try {
        if (!(await $.ui.panes()).some(pane => pane.id === PANE_ID)) { stopTicker(); return }
        const now = await $.clock.now()
        const minute = Math.floor(now / 60_000)
        if ((await $.state.get(playingRef)).value || minute !== lastMinute) { lastMinute = minute; $.ui.invalidate('ui.render') }
      } catch { stopTicker() }
    })
    const { Box, Text } = $.ui.resolve(e)
    // DEMO BEGIN: the tour draws its own model on desktop.
    if (demo && e.surface === 'desktop') {
      const { Client } = $.ui.resolve(e)
      return <Client key="muslim-pane" module="./client.tsx" width="100%" props={demoModelAt((await $.clock.now()) - demo.startedAt, options, e.props.bodyColumns)} />
    }
    // DEMO END
    const model = await modelNow($, options, e.props.bodyColumns)
    if (e.surface !== 'desktop') {
      const mode = await arabicMode($, e.surface)
      model.settings.terminalMode = mode
      return <Box flexDirection="column">{textLines(model, text => terminalArabic(e.surface, mode, text)).map((line, i) => <Text key={`m${i}`} dimColor={line === ''}>{line}</Text>)}</Box>
    }
    const { Client } = $.ui.resolve(e)
    return <Client key="muslim-pane" module="./client.tsx" width="100%" props={model} />
  }).catch(async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>Muslim pane unavailable. Use /muslim again.</Text>
  })

  on('ui.message', { element: 'muslim-pane' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || !isPaneMessage(e.data)) return {}
    // DEMO BEGIN: pointer and keys do nothing during the tour.
    if (demo) return {}
    // DEMO END
    // Refresh action closures with this press's engine context, not a footer draw's.
    try { await next(e) } catch { /* no hook beneath */ }
    const message = e.data
    if (message.act === 'drag') { await dragPress($, await readFolds($), message); return {} }
    let act: PaneAct | null
    if (message.act === 'pointer') {
      if (message.button !== 'left') return {}
      const model = await modelNow($, options, message.columns)
      act = hitOfCells(message.width, message.x, message.y, message.columns, message.rows, message.coarse, enabledOf(model), model.folds, model.settings, quranLayout(model), model.athkarMenu)
      if (act === 'quran-scroll') { await barPress($, model, message); return {} }
    } else if ((await $.state.get(athkarMenuRef)).value === true && !(await readFolds($)).athkar) {
      // The host consumes Escape on this build; also accept it if a host forwards it.
      if (message.key === 'escape' || message.key === 'esc' || message.key === 'tab') await writeAthkarMenu($, false)
      return {}
    } else if ((await readPicker($)) && (await modelNow($, options, 50)).picker) {
      await pickerKeyPress($, message.key)
      return {}
    } else act = keyAct(message.key)
    if (act) await press($, options, act)
    return {}
  })

  on('ui.scroll', { component: 'Pane', requestId: PANE_ID }, ($, e, next) => {
    if (skipPaneScroll(desktopPane, paneOffset, e)) return {}
    return next(e)
  })

  // DEMO BEGIN: the tour is the last step of /muslim demo; `/muslim demo pane` plays it alone.
  on('command.run', { command: 'muslim', args: /^\s*demo\s*$/ }, ($, e, next) => {
    connectDemo('pane', () => playDemo($, true))
    return next(e)
  })
  on('command.run', { command: 'muslim', args: /^\s*demo\s+pane\s*$/ }, async $ => ({ text: (await playDemo($, false)) || demoTerminalReply() }))
  // DEMO END

  on('ui.close', { id: PANE_ID }, async ($, e, next) => {
    // DEMO BEGIN: closing the pane ends the tour; a shared run goes on to the next step.
    if (demo) {
      const closed = demo
      closed.timer?.cancel()
      demo = undefined
      if (closed.shared) doneDemo('pane')
    }
    // DEMO END
    stopTicker()
    desktopPane = false
    paneOffset = 0
    return next(e)
  })
}

