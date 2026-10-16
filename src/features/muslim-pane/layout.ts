// The pane's fixed vertical layout, in CSS pixels, and what a click on it
// means. Every height is a constant, whatever the data, so the hooks module
// (hit testing) and the Client (drawing) agree without measuring anything.
// Pure: no $.

import { CLOSED_SETTINGS, DEFAULT_SETTINGS, SETTINGS_BODY_TOP, categoryTabs, settingsBody, settingsHeight, type SettingsAct, type SettingsModel, type SettingsOptions, type SettingsState } from './settings.ts'
import { pointerPixels, pointerSlack } from '../../shared/card/pointer.ts'

export const PAD = 12
export const GAP = 12
// Inside a card: the side inset and the rows' own insets.
export const SIDE = 16
export const HEAD_TOP = 14
export const HEAD_H = 28

// The pane's own heading above the cards: the full avatar and «مسلم» at the right edge,
// the LTR `/muslim` label at the left edge, as the Quran pane's heading.
// The Desktop adds its own space above the picture (the API has no setting for it),
// so the heading starts at the picture's top edge. The 36px avatar fills the row.
export const TOP_Y = 0
export const TOP_H = 36
export const AVATAR_H = 36
export const CARDS_TOP = TOP_Y + TOP_H + 8

// Prayer card, from its top.
export const NX_TOP = 48
export const NX_H = 64
export const ROWS_TOP = 118
export const ROW_H = 32
export const ROW_COUNT = 5
export const ATHAN_TOP = ROWS_TOP + ROW_COUNT * ROW_H + 6
export const ATHAN_H = 40
export const CITY_TOP = ATHAN_TOP + ATHAN_H + 4
export const CITY_H = 16
export const PRAYER_H = CITY_TOP + CITY_H + 12

// Quran card, from its top.
export const FIELD_H = 36
export const RECITER_TOP = 48
export const SURAH_TOP = RECITER_TOP + FIELD_H
export const BAR_TOP = SURAH_TOP + FIELD_H + 10
export const TIMES_TOP = BAR_TOP + 12
export const CONTROLS_CY = TIMES_TOP + 18 + 8 + 26
export const OPEN_TOP = CONTROLS_CY + 26 + 10
export const OPEN_H = 42
export const QURAN_H = OPEN_TOP + OPEN_H + 14

// Athkar card, from its top.
export const KROW_TOP = 48
export const KROW_H = 36
export const KBTN_W = 56
export const KFINISH_W = 84
export const KROW_GAP = 8
export const ATHKAR_H = KROW_TOP + KROW_H + 14

// A folded card is just its title row.
export const FOLDED_H = HEAD_TOP * 2 + HEAD_H
// The title row's press area, from the card's top: it spans the whole row.
export const TITLE_HIT_H = HEAD_TOP + HEAD_H + 4

export type Folds = { prayer: boolean; quran: boolean; athkar: boolean }
export const NO_FOLDS: Folds = { prayer: false, quran: false, athkar: false }
export const isFolds = (value: unknown): value is Folds => !!value && typeof value === 'object' && (['prayer', 'quran', 'athkar'] as const).every(k => typeof (value as Record<string, unknown>)[k] === 'boolean')

// Where each card sits and how tall it is, and the whole pane's height, for the folded cards.
export const cardRects = (f: Folds, settings: SettingsState = CLOSED_SETTINGS, options?: SettingsOptions) => {
  const prayerH = f.prayer ? FOLDED_H : PRAYER_H, quranH = f.quran ? FOLDED_H : QURAN_H, athkarH = f.athkar ? FOLDED_H : ATHKAR_H
  const prayerY = CARDS_TOP, quranY = prayerY + prayerH + GAP, athkarY = quranY + quranH + GAP
  const settingsY = athkarY + athkarH + GAP, settingsH = settingsHeight(settings, options)
  return { prayerY, prayerH, quranY, quranH, athkarY, athkarH, settingsY, settingsH, height: settingsY + settingsH + PAD }
}
export const paneHeight = (f: Folds, settings: SettingsState = CLOSED_SETTINGS, options?: SettingsOptions): number => cardRects(f, settings, options).height

// The unfolded pane.
export const PRAYER_Y = CARDS_TOP
export const QURAN_Y = PRAYER_Y + PRAYER_H + GAP
export const ATHKAR_Y = QURAN_Y + QURAN_H + GAP
export const PANE_HEIGHT = paneHeight(NO_FOLDS)

export type PaneAct = SettingsAct | 'fold-prayer' | 'fold-quran' | 'fold-athkar' | 'athan' | 'quran-prev' | 'quran-toggle' | 'quran-next' | 'quran-open' | 'athkar-open' | 'athkar-finish'

// What can be pressed now: the Quran controls need a connected Quran, the athkar button a connected athkar, the athan row a place.
export type Enabled = { athan: boolean; quran: boolean; canPrev: boolean; canNext: boolean; athkar: boolean; athkarFinish?: boolean }

type Circle = { act: PaneAct; x: number; y: number; r: number }
const circles = (width: number, f: Folds): Circle[] => {
  const cx = width / 2, y = cardRects(f).quranY + CONTROLS_CY
  if (f.quran) return []
  return [
    { act: 'quran-prev', x: cx - 62, y, r: 20 },
    { act: 'quran-toggle', x: cx, y, r: 26 },
    { act: 'quran-next', x: cx + 62, y, r: 20 },
  ]
}
type Box = { act: PaneAct; x0: number; x1: number; y0: number; y1: number }
const boxes = (width: number, f: Folds, settings: SettingsModel): Box[] => {
  const r = cardRects(f, settings.state, settings.options)
  const title = (act: PaneAct, y: number): Box => ({ act, x0: PAD, x1: width - PAD, y0: y, y1: y + TITLE_HIT_H })
  return [
    ...settingsBoxes(width, f, settings),
    title('settings:fold', r.settingsY),
    title('fold-prayer', r.prayerY), title('fold-quran', r.quranY), title('fold-athkar', r.athkarY),
    ...(f.prayer ? [] : [{ act: 'athan' as const, x0: PAD + SIDE - 8, x1: width - PAD - SIDE + 8, y0: r.prayerY + ATHAN_TOP, y1: r.prayerY + ATHAN_TOP + ATHAN_H }]),
    ...(f.quran ? [] : [{ act: 'quran-open' as const, x0: PAD + SIDE, x1: width - PAD - SIDE, y0: r.quranY + OPEN_TOP, y1: r.quranY + OPEN_TOP + OPEN_H }]),
    // In RTL the button sits at the left end of its row.
    ...(f.athkar ? [] : [{ act: 'athkar-finish' as const, x0: PAD + SIDE + KBTN_W + KROW_GAP, x1: PAD + SIDE + KBTN_W + KROW_GAP + KFINISH_W, y0: r.athkarY + KROW_TOP + 2, y1: r.athkarY + KROW_TOP + KROW_H - 2 }]),
    ...(f.athkar ? [] : [{ act: 'athkar-open' as const, x0: PAD + SIDE, x1: PAD + SIDE + KBTN_W, y0: r.athkarY + KROW_TOP + 2, y1: r.athkarY + KROW_TOP + KROW_H - 2 }]),
  ]
}

// Settings share the existing nearest-edge/slack arbitration with daily cards.
export const settingsBoxes = (width: number, folds: Folds, m: SettingsModel): Box[] => {
  const y = cardRects(folds, m.state, m.options).settingsY
  if (!m.state.open) return []
  return [
    ...categoryTabs(width).map(c => ({ act:`settings:tab:${c.category}` as const, x0:c.x0, x1:c.x1, y0:y+c.y0, y1:y+c.y1 })),
    ...settingsBody(width,m).targets.map(b => ({ ...b, y0:y+SETTINGS_BODY_TOP+b.y0, y1:y+SETTINGS_BODY_TOP+b.y1 })),
  ]
}

const isEnabled = (act: PaneAct, on: Enabled): boolean =>
  act.startsWith('settings:') ? true : act === 'fold-prayer' || act === 'fold-quran' || act === 'fold-athkar' ? true : act === 'athan' ? on.athan : act === 'quran-open' ? true : act === 'athkar-finish' ? !!on.athkarFinish : act === 'athkar-open' ? on.athkar
    : act === 'quran-prev' ? on.quran && on.canPrev : act === 'quran-next' ? on.quran && on.canNext : on.quran

const gap = (v: number, lo: number, hi: number) => (v < lo ? lo - v : v > hi ? v - hi : 0)

// `sx`/`sy` are the half-extent of the pointer's cell (see pointerSlack): a pointer
// known only as a whole cell may sit anywhere in it, so a target is hit when the cell
// overlaps it, the one nearest the pointer (its edge, not its center) winning.
export const hitAt = (width: number, x: number, y: number, on: Enabled, sx = 0, sy = 0, folds: Folds = NO_FOLDS, settings: SettingsModel = DEFAULT_SETTINGS): PaneAct | null => {
  if (![width, x, y, sx, sy].every(Number.isFinite) || width < 1) return null
  let best: PaneAct | null = null, bestDistance = Infinity
  for (const c of circles(width, folds)) {
    if (!isEnabled(c.act, on)) continue
    const dx = Math.max(Math.abs(x - c.x) - sx, 0), dy = Math.max(Math.abs(y - c.y) - sy, 0)
    if (dx ** 2 + dy ** 2 > c.r ** 2 + 1e-8) continue
    const d = Math.max(0, Math.hypot(x - c.x, y - c.y) - c.r)
    if (d < bestDistance) { best = c.act; bestDistance = d }
  }
  for (const b of boxes(width, folds, settings)) {
    if (!isEnabled(b.act, on)) continue
    if (gap(x, b.x0, b.x1) > sx || gap(y, b.y0, b.y1) > sy) continue
    const d = Math.hypot(gap(x, b.x0, b.x1), gap(y, b.y0, b.y1))
    if (d < bestDistance) { best = b.act; bestDistance = d }
  }
  return best
}

// A click in region cells, to its act.
export const hitOfCells = (width: number, x: number, y: number, columns: number, rows: number, isCoarse: boolean, on: Enabled, folds: Folds = NO_FOLDS, settings: SettingsModel = DEFAULT_SETTINGS): PaneAct | null => {
  if (!(columns > 0) || !(rows > 0)) return null
  const height = paneHeight(folds, settings.state, settings.options)
  const p = pointerPixels(width, x, y, columns, rows, height)
  const s = pointerSlack(width, columns, rows, height, isCoarse)
  return hitAt(width, p.x, p.y, on, s.x, s.y, folds, settings)
}

// What the Client posts: a click with its region and the width it drew at, or a key.
export type PaneMessage =
  | { act: 'pointer'; x: number; y: number; columns: number; rows: number; width: number; button: string; coarse: boolean }
  | { act: 'key'; key: string }

export const isPaneMessage = (value: unknown): value is PaneMessage => {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  if (m.act === 'key') return typeof m.key === 'string'
  return m.act === 'pointer' && ['x', 'y', 'columns', 'rows', 'width'].every(k => typeof m[k] === 'number' && Number.isFinite(m[k])) && (m.columns as number) > 0 && (m.rows as number) > 0 && typeof m.button === 'string' && typeof m.coarse === 'boolean'
}

// Keys, with the pane focused: space or enter plays and stops, the arrows move.
export const keyAct = (key: string): PaneAct | null => key === ' ' || key === 'space' || key === 'return' ? 'quran-toggle' : key === 'left' ? 'quran-prev' : key === 'right' ? 'quran-next' : null
