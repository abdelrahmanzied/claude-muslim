import { commandFailure } from '../../shared/command/failure.ts'
import { MODES_KEY } from '../../shared/arabic/terminal.ts'
import { configFailure, hasConfigRow, MISSING_CONFIG } from '../../shared/reload/config.ts'
import { stopBeforeReload } from '../../shared/reload/signal.ts'
import { accentText, type Accent } from '../../shared/color/index.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode } from '../../shared/arabic/terminal.ts'
import { atom, read } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { SalahCard, SalahMinaret } from '../../../types'
import type { Options } from '../../config.ts'
import { isCardMessage, isOnClose } from '../../shared/card/card.ts'
import { isAnotherCardShown } from '../../shared/card/slot.ts'
import { dayKey, isFriday } from '../../shared/friday/index.ts'
import { athkarTimesAt } from '../../shared/pray/bounds.ts'
import { playSurah, readSurahPlay } from '../../shared/panel/signal.ts'
import { helpHint, statusTable } from '../../table.ts'
import { CELL_PX, LINE_PX } from '../../shared/card/card.ts'
import { isOnPlay, kahfFrame, type KahfCardProps } from './card.ts'
import { fridayHelp } from './help.ts'
import { cardAt, KAHF_CARD_MS, KAHF_NEEDS_CITY, KAHF_SURAH, KAHF_TITLE, kahfDecision, kahfLine, kahfStatus } from './logic.ts'
import { withTashkeel } from '../../shared/arabic/visual.ts'

// DEMO BEGIN: imports and transient runner (no settings, store or saved state).
import { DEMO_MS, DEMO_TICK_MS, demoPrayLine, demoReply, demoSalawat, demoShowing } from './demo.ts'
import { connectDemo, doneDemo } from '../../shared/demo/signal.ts'

let demo: { startedAt: number; shared: boolean; timer?: { cancel: () => void } } | undefined

const endDemo = ($: EngineInterface) => {
  const playing = demo
  if (!playing) return
  playing.timer?.cancel()
  demo = undefined
  $.ui.invalidate('ui.render')
  if (playing.shared) doneDemo('friday')
}

const playDemo = async ($: EngineInterface, shared = false) => {
  demo?.timer?.cancel()
  demo = { startedAt: await $.clock.now(), shared }
  const playing = demo
  playing.timer = $.clock.every(DEMO_TICK_MS, () => void $.clock.now().then(now => {
    if (demo === playing && !demoShowing(playing.startedAt, now)) endDemo($)
  }).catch(() => {}))
  $.ui.invalidate('ui.render')

  return demoReply()
}
// DEMO END

const cachedArabicMode = atom({ plugin: 'muslim', key: 'arabicTerminalMode' } as const, null as { terminalId: string; mode: ArabicMode } | null)

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

// Resolve once per terminal per session; the Arabic picker refreshes this atom on a choice.
const renderArabic = async ($: EngineInterface, surface: string, text: string, cache: { current: { terminalId: string; mode: ArabicMode } | null }): Promise<string> => {
  if (surface !== 'terminal') return terminalArabic(surface, 'plain', text)
  const id = await terminalId($)
  const selected = await read($, cachedArabicMode)
  let cached = selected?.terminalId === id ? selected : cache.current
  if (cached?.terminalId !== id) {
    const saved = await $.store.get(MODES_KEY) as Record<string, unknown> | undefined
    const storedMode = saved?.[id]
    const mode = isArabicMode(storedMode) ? storedMode : defaultArabicMode(id)
    cached = { terminalId: id, mode }
    cache.current = cached
  }

  return terminalArabic(surface, cached.mode, text)
}


// The card showing in this session: the day it belongs to and when it hides. In $.state so a reload keeps it.
const cardRef = atom({ plugin: 'muslim', key: 'fridayCard' } as const, null as { day: string; until: number } | null)

// Kept across sessions: the day the reminder was last shown, so it shows once per Friday.
const SHOWN_KEY = 'friday.kahfDay'

const shownDayOf = async ($: EngineInterface): Promise<string | undefined> => {
  const value = await $.store.get(SHOWN_KEY).catch(() => undefined)

  return typeof value === 'string' ? value : undefined
}

// Read-merge-write: re-reads the store and takes today only if no session has. True when this session took it.
const claim = async ($: EngineInterface, day: string): Promise<boolean> => {
  if (await shownDayOf($) === day) return false
  await $.store.set(SHOWN_KEY, day)

  return true
}

// Another card above the prompt: the athan card or minaret (read from salah's state), or one a feature marked drawn.
const isBusy = async ($: EngineInterface, now: number): Promise<boolean> => {
  const athan: SalahCard | null | undefined = (await $.state.get({ plugin: 'muslim', key: 'salahCard' })).value
  const minaret: SalahMinaret | null | undefined = (await $.state.get({ plugin: 'muslim', key: 'salahMinaret' })).value

  return (!!athan && athan.until > now) || (!!minaret && minaret.until > now) || isAnotherCardShown('friday')
}

const openCard = async ($: EngineInterface, now: number) => {
  await $.state.set({ plugin: 'muslim', key: 'fridayCard' }, { day: dayKey(now), until: now + KAHF_CARD_MS })
  $.ui.invalidate('ui.render')
}

const closeCard = async ($: EngineInterface) => {
  await $.state.set({ plugin: 'muslim', key: 'fridayCard' }, null)
  $.ui.invalidate('ui.render')
}

// «▶ استمع»: closes the card and plays Surat al-Kahf with the reciter last used (the Quran feature's own choice);
// where Claude Code plays no audio (Windows, Linux) the Quran feature opens the whole surah in the browser instead.
const playKahf = async ($: EngineInterface) => {
  await closeCard($)
  if (!(await playSurah(KAHF_SURAH))) $.ui.toast('Quran is not ready yet. /quran')
}

// Preflight and quiet failure mapping stay in this file; callers keep their reply.
const writeSetting = async ($: EngineInterface, key: string, value: boolean | number | string): Promise<string | undefined> => {
  try {
    if (!hasConfigRow(await $.config.list(), key)) return MISSING_CONFIG
    await stopBeforeReload()
    const { deny } = await $.config.set({ key, value })
    return deny ? configFailure(deny) : undefined
  } catch (error) { return configFailure(error) }
}

// Engine access stays in this file; the shared palette is pure.
const mainColor = async ($: EngineInterface, color: Accent): Promise<string> => {
  if (color === 'orange') return accentText(color, undefined)
  const theme = (await $.config.list().catch(() => [])).find(row => row.key === 'theme')
  return accentText(color, theme?.value)
}

// Due on a Friday inside the window, once for all sessions, and only when no other card shows.
const check = async ($: EngineInterface, options: Options) => {
  if (demo) return
  const now = await $.clock.now()
  const times = athkarTimesAt(now)
  const decision = kahfDecision({
    now,
    times: times ? { dhuhr: times.dhuhr, maghrib: times.maghrib } : null,
    enabled: options.fridayKahf,
    shownDay: await shownDayOf($),
    isBusy: await isBusy($, now),
  })
  if (decision !== 'show' || !(await claim($, dayKey(now)))) return
  await openCard($, now)
}

// The reminder's check runs on a timer, started once per module load by the first draw.
let hasTracking = false
const track = ($: EngineInterface, options: Options) => {
  if (hasTracking) return
  hasTracking = true
  $.clock.after(1500, () => void check($, options).catch(() => {}))
  $.clock.every(15_000, () => void check($, options).catch(() => {}))
}

export const install = (on: On, options: Options) => {
  const arabicCache: { current: { terminalId: string; mode: ArabicMode } | null } = { current: null }
  let hideTimer: { at: number; handle: { cancel: () => void } } | undefined
  // The card last drawn and its region, for its clicks.
  const drawn: { props: KahfCardProps | undefined; region: { columns: number; rows: number } } = { props: undefined, region: { columns: 0, rows: 0 } }

  on('command.run', { command: 'friday' }, async ($, e) => {
    const [word = '', value = ''] = e.args.trim().split(/\s+/)
    const set = async (field: string, to: boolean, said: string) => ({ text: await writeSetting($, `muslim.${field}`, to) ?? said })
    const onOff = (v: boolean) => (v ? 'on' : 'off')
    const surface = await $.session.surface().catch(() => 'desktop' as const) ?? 'desktop'
    const now = await $.clock.now()

    // DEMO BEGIN: command entry; no settings or saved state.
    if (word === 'demo') return { text: await playDemo($) }
    // DEMO END
    if (word === '') {
      return {
        text: [
          '**Muslim › Friday**',
          helpHint('/friday'),
          '',
          statusTable([
            ['Today', 'Friday on this device\'s local day', isFriday(now) ? 'Friday' : 'not Friday'],
            ['Salawat', 'Salawat on the Prophet in the thikr line on Friday, from Fajr', onOff(options.fridaySalawat)],
            ['Al-Kahf', 'The reminder to read Surat al-Kahf, once on Friday from 30 minutes after Jumu\'ah until Maghrib', onOff(options.fridayKahf)],
            ['Reminder', 'Whether it was shown today', kahfStatus(now, await shownDayOf($))],
          ]),
          ...(athkarTimesAt(now) ? [] : ['', KAHF_NEEDS_CITY]),
        ].join('\n'),
      }
    }
    if (word === 'help') return { text: fridayHelp() }
    if (word === 'salawat' && (value === 'on' || value === 'off')) return set('fridaySalawat', value === 'on', `Friday salawat ${value}`)
    if (word === 'kahf' && (value === 'on' || value === 'off')) return set('fridayKahf', value === 'on', `Al-Kahf reminder ${value}`)
    if (word === 'kahf' && value === '') {
      // Manual opening always works, any day and any time; on a Friday it counts as today's showing.
      if (isFriday(now)) await claim($, dayKey(now))
      await openCard($, now)

      return { text: surface === 'terminal' ? 'Al-Kahf reminder shown above the prompt.' : 'Al-Kahf reminder shown above the prompt; ▶ plays the surah.' }
    }

    return { text: fridayHelp() }
  }).catch(($, e, next) => next.called ? next(e) : { text: commandFailure(e.command, e.args, next.error) })

  // DEMO BEGIN: connects the shared demo's starter; passes through.
  on('command.run', { command: 'muslim', args: /^\s*demo\s*$/ }, ($, e, next) => {
    connectDemo('friday', () => playDemo($, true))
    return next(e)
  }).catch(($, e, next) => next(e))
  // DEMO END

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    // A draw with no clock to read has nothing to show.
    const now = await $.clock.now().catch(() => undefined)
    if (now === undefined) return theirs
    // The timers start only where the reminder can ever fire: on a Friday, switched on, with a saved place.
    if (options.fridayKahf && isFriday(now) && athkarTimesAt(now)) track($, options)
    if (e.surface !== 'desktop' && e.surface !== 'terminal') return theirs
    const shown = demo ? (demoShowing(demo.startedAt, now) ? { until: demo.startedAt + DEMO_MS } : null) : cardAt(await read($, cardRef), now)
    if (!shown) return theirs
    // Hides itself: one redraw at the deadline.
    if (hideTimer?.at !== shown.until) {
      hideTimer?.handle.cancel()
      hideTimer = { at: shown.until, handle: $.clock.after(Math.max(0, shown.until - now) + 50, () => $.ui.invalidate('ui.render')) }
    }
    const { Box, Button, Client, Text } = $.ui.resolve(e)
    // The reciter last used and the OS rule come from the Quran feature, through the shared panel link.
    const surahPlay = await readSurahPlay()
    const reciter = surahPlay?.reciter ?? ''

    // DEMO BEGIN: the other Friday things, drawn beside the card for the demo only.
    const demoRows = demo ? [
      await renderArabic($, e.surface, demoPrayLine(), arabicCache),
      await renderArabic($, e.surface, withTashkeel(demoSalawat(), options.tashkeel), arabicCache),
      await renderArabic($, e.surface, e.surface === 'terminal' ? `${KAHF_TITLE} · /friday kahf` : `[ ${KAHF_TITLE} ]`, arabicCache),
    ] : []
    const demoBlock = demo ? (
      <Box key="friday-demo-rows" flexDirection="column">
        <Text key="friday-demo-pray">{demoRows[0]}</Text>
        <Text key="friday-demo-thikr" color={await mainColor($, options.color)}>{demoRows[1]}</Text>
        <Text key="friday-demo-pane" dimColor>{demoRows[2]}</Text>
      </Box>
    ) : null
    // DEMO END

    if (e.surface === 'terminal') {
      const label = await renderArabic($, e.surface, kahfLine(reciter), arabicCache)

      return (
        <Box flexDirection="column">
          <Box key="friday-kahf-row" gap={1}>
            <Text bold color={await mainColor($, options.color)} wrap="truncate-end">{label}</Text>
            <Button key="friday-kahf-close" label="×" plain onPress={() => (demo ? endDemo($) : closeCard($))} />
          </Box>
          {demoBlock}
          {theirs}
        </Box>
      )
    }

    const props: KahfCardProps = { isActive: true, now, accent: options.color, reciter, inBrowser: !!surahPlay?.inBrowser, startedAt: shown.until - (demo ? DEMO_MS : KAHF_CARD_MS), width: Math.round(e.props.bodyColumns * CELL_PX), card: { ch: CELL_PX, lh: LINE_PX } }
    drawn.props = props

    return (
      // As the athkar band and the athan card: the picture reaches a cell past the slot each side
      // and half a line above and below, over the desktop's own card.
      <Box flexDirection="column">
        <Box key="friday-kahf-card" marginX={-1} marginY={-1}>
          <Client key="friday-kahf" module="./card.tsx" props={props} width="100%" />
        </Box>
        {demoBlock}
        {theirs ?? <Box key="friday-kahf-end" height={0} />}
      </Box>
    )
  })

  // The shared × closes the card, ▶ plays the surah; Enter or Space plays it, Escape closes it.
  on('ui.message', { element: 'friday-kahf' }, async ($, e) => {
    const m = e.data
    if (!isCardMessage(m)) return {}
    if (m.act === 'size') {
      drawn.region = { columns: m.columns, rows: m.rows }
      return {}
    }
    const close = () => (demo ? endDemo($) : closeCard($))
    const columns = m.act === 'pointer' ? (m.columns ?? drawn.region.columns) : 0
    const rows = m.act === 'pointer' ? (m.rows ?? drawn.region.rows) : 0
    const props = drawn.props
    if (m.act === 'hide' || (m.act === 'key' && m.key === 'escape')) await close()
    else if (m.act === 'key' && (m.key === 'return' || m.key === 'space')) await (demo ? close() : playKahf($))
    else if (m.act === 'pointer' && m.button === 'left' && props && columns > 0 && rows > 0) {
      if (isOnClose(kahfFrame(props, columns), m.x, m.y, columns, rows)) await close()
      else if (isOnPlay(props, m.x, m.y, columns, rows)) await (demo ? close() : playKahf($))
    }

    return {}
  })
}
