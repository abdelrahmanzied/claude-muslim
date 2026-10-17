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
// the LTR `/muslim` label at the left edge.
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

// Quran card, from its top: the full player. The status and the surah title (a picker button), the
// reciter avatar at the left, then «ابدأ من» for a split surah, the reciter row, the progress bar,
// the times and the control row. A split surah pushes everything below the hero down by 30 (14 else).
export const Q_HERO_TOP = 52
export const Q_HERO_H = 76
export const Q_AVATAR_W = 96
export const Q_AVATAR_H = 90
export const Q_TITLE_TOP = Q_HERO_TOP + 36
export const Q_TITLE_H = 32
export const Q_SEG_TOP = 128
export const Q_SEG_H = 28
// «ابدأ من» keeps clear of the avatar: it starts 120 from the card's left edge.
export const Q_SEG_LEFT = 120
export const Q_RECITER_BASE = 134
export const Q_RECITER_H = 28
export const Q_BAR_BASE = 170
export const Q_TIMES_BASE = 182
export const Q_TIMES_H = 28
export const Q_CONTROLS_BASE = 216
export const Q_CONTROLS_H = 60
export const Q_BASE_H = 286
export const Q_PICKER_H = 474
export const quranOffset = (segmented: boolean): number => segmented ? 30 : 14

// The controls row, LTR and centered: repeat-segment, previous, play, next, repeat-surah. `dx` is the
// circle's center from the card's middle, `dy` from the row's middle (the two repeat buttons carry a
// caption under them, so they sit higher). The spacing shrinks on a narrow pane; the sizes do not.
export const CONTROLS_SPAN = 252
export const CONTROL_SPECS = [
  { act: 'quran-repeat-segment', dx: -110, dy: -8.25, r: 16, hit: 17 },
  { act: 'quran-prev', dx: -60, dy: 0, r: 20, hit: 20 },
  { act: 'quran-toggle', dx: 0, dy: 0, r: 26, hit: 26 },
  { act: 'quran-next', dx: 60, dy: 0, r: 20, hit: 20 },
  { act: 'quran-repeat-surah', dx: 110, dy: -8.25, r: 16, hit: 17 },
] as const
export const controlScale = (width: number): number => Math.max(0.5, Math.min(1, (width - 48) / CONTROLS_SPAN))

// A picker (reciter, surah or segment) opens as a sheet over the card's top: its head with «رجوع»,
// a search box, eight rows of 34, a drag scrollbar and a footer. The card grows to 474 while it is open.
// Sheet numbers are from its padding box (inside the 1px border).
export const SHEET_H = 432
export const SHEET_BORDER = 1
export const SHEET_HEAD_TOP = 8
export const SHEET_HEAD_H = 36
export const SHEET_BACK_W = 64
export const SHEET_SEARCH_TOP = 52
export const SHEET_SEARCH_H = 38
export const SHEET_ROWS_TOP = 100
export const SHEET_ROW_H = 34
export const SHEET_ROWS_H = 8 * SHEET_ROW_H
export const SHEET_ROWS_RIGHT = 6
export const SHEET_ROWS_LEFT = 24
export const SHEET_BAR_LEFT = 3
export const SHEET_BAR_W = 18
export const SHEET_FOOT_TOP = 380
export const SHEET_FOOT_H = 30
export const SHEET_MIN_THUMB = 28

export type QuranList = 'reciter' | 'surah' | 'segment'
// What the Quran card's height and targets depend on: a split surah, and the open picker.
export type QuranLayout = { segmented: boolean; picker: { list: QuranList; count: number; scroll: number } | null }
export const NO_QURAN: QuranLayout = { segmented: false, picker: null }
export const quranHeight = (q: QuranLayout): number => (q.picker ? Q_PICKER_H : Q_BASE_H) + quranOffset(q.segmented)
export const QURAN_H = quranHeight(NO_QURAN)

// Athkar card, from its top.
export const KROW_TOP = 48
export const KROW_H = 36
// The progress row's buttons, from the card's left edge: «إعادة», «✓ أتممتُها», then «ابدأ» or «أكمل» (RTL order after the bar).
// Up to KCOMPACT_W wide the first two shrink to icons (their aria-labels stay) so the bar keeps room at 240.
export const KCOMPACT_W = 380
export const KROW_GAP = 8
export const KROW_GAP_COMPACT = 6
export const athkarRow = (width: number) => {
  const compact = width <= KCOMPACT_W, gap = compact ? KROW_GAP_COMPACT : KROW_GAP, left = PAD + SIDE
  const resetW = compact ? 28 : 64, finishW = compact ? 28 : 84, openW = compact ? 40 : 52
  const reset = { x0: left, x1: left + resetW }
  const finish = { x0: reset.x1 + gap, x1: reset.x1 + gap + finishW }
  const open = { x0: finish.x1 + gap, x1: finish.x1 + gap + openW }
  // The done note takes the finish and open slots' place beside «إعادة».
  const done = { x0: finish.x0, x1: compact ? finish.x0 + 76 : finish.x0 + 84 }
  return { compact, gap, resetW, finishW, openW, doneW: done.x1 - done.x0, reset, finish, open, done }
}
export const ATHKAR_H = KROW_TOP + KROW_H + 14
export const ATHKAR_MENU_H = 208
export const KMENU_TOP = 48
export const KMENU_PAD = 5 // 1px border and 4px top padding
export const KMENU_ROW_H = 32
export const KMENU_GAP = 2
export const KROW_OPEN_TOP = 158
export const ATHKAR_SETS = [
  { key: 'morning', title: 'أذكار الصباح', icon: 'sun' },
  { key: 'evening', title: 'أذكار المساء', icon: 'moon' },
  { key: 'after-salah', title: 'أذكار بعد الصلاة', icon: 'prayer' },
] as const
export const athkarRowTop = (open: boolean) => open ? KROW_OPEN_TOP : KROW_TOP
// The shared header's fold chevron sits at the card's left end in every card (a 26px target, 6px past the inset);
// the athkar header boxes follow it: fold, fraction, then the title button (the menu) up to the icon at the right.
export const FOLD_W = 26
export const FOLD_BLEED = 6
export const athkarHead = (width: number) => {
  const left = PAD + SIDE, right = width - PAD - SIDE
  const fold = { x0: left - FOLD_BLEED, x1: left - FOLD_BLEED + FOLD_W }
  const fraction = { x0: fold.x1 + 8, x1: fold.x1 + 8 + 40 }
  return { fold, fraction, title: { x0: fraction.x1 + 4, x1: right } }
}

// A folded card is just its title row.
export const FOLDED_H = HEAD_TOP * 2 + HEAD_H
// The title row's press area, from the card's top: it spans the whole row.
export const TITLE_HIT_H = HEAD_TOP + HEAD_H + 4

export type Folds = { prayer: boolean; quran: boolean; athkar: boolean }
export const NO_FOLDS: Folds = { prayer: false, quran: false, athkar: false }
export const isFolds = (value: unknown): value is Folds => !!value && typeof value === 'object' && (['prayer', 'quran', 'athkar'] as const).every(k => typeof (value as Record<string, unknown>)[k] === 'boolean')

// Where each card sits and how tall it is, and the whole pane's height, for the folded cards.
export const cardRects = (f: Folds, settings: SettingsState = CLOSED_SETTINGS, options?: SettingsOptions, quran: QuranLayout = NO_QURAN, athkarMenu = false) => {
  const prayerH = f.prayer ? FOLDED_H : PRAYER_H, quranH = f.quran ? FOLDED_H : quranHeight(quran), athkarH = f.athkar ? FOLDED_H : athkarMenu ? ATHKAR_MENU_H : ATHKAR_H
  const prayerY = CARDS_TOP, quranY = prayerY + prayerH + GAP, athkarY = quranY + quranH + GAP
  const settingsY = athkarY + athkarH + GAP, settingsH = settingsHeight(settings, options)
  return { prayerY, prayerH, quranY, quranH, athkarY, athkarH, settingsY, settingsH, height: settingsY + settingsH + PAD }
}
export const paneHeight = (f: Folds, settings: SettingsState = CLOSED_SETTINGS, options?: SettingsOptions, quran: QuranLayout = NO_QURAN, athkarMenu = false): number => cardRects(f, settings, options, quran, athkarMenu).height

// The unfolded pane.
export const PRAYER_Y = CARDS_TOP
export const QURAN_Y = PRAYER_Y + PRAYER_H + GAP
export const ATHKAR_Y = QURAN_Y + QURAN_H + GAP
export const PANE_HEIGHT = paneHeight(NO_FOLDS)

type QuranRowAct = `quran-row:${number}`
export type PaneAct = SettingsAct | 'fold-prayer' | 'fold-quran' | 'fold-athkar' | 'athan' | 'quran-prev' | 'quran-toggle' | 'quran-next' | 'quran-repeat-surah' | 'quran-repeat-segment'
  | 'quran-pick-reciter' | 'quran-pick-surah' | 'quran-pick-segment' | 'quran-back' | 'quran-scroll' | QuranRowAct | 'athkar-open' | 'athkar-finish' | 'athkar-picker' | 'athkar-reset' | `athkar-set:${typeof ATHKAR_SETS[number]['key']}`
export const quranRowOf = (act: string): number | null => {
  const m = /^quran-row:(\d+)$/.exec(act)
  return m ? Number(m[1]) : null
}

// What can be pressed now: the Quran controls need a connected Quran, «ابدأ من» and segment repeat a split surah, the athkar button a connected athkar, the athan row a place.
export type Enabled = { athan: boolean; quran: boolean; canPrev: boolean; canNext: boolean; athkar: boolean; athkarFinish?: boolean; athkarDone?: boolean; segmented?: boolean }

type Circle = { act: PaneAct; x: number; y: number; r: number }
const circles = (width: number, f: Folds, q: QuranLayout, quranY: number): Circle[] => {
  if (f.quran || q.picker) return []
  const cx = width / 2, s = controlScale(width), mid = quranY + Q_CONTROLS_BASE + quranOffset(q.segmented) + Q_CONTROLS_H / 2
  return CONTROL_SPECS.map(c => ({ act: c.act, x: cx + c.dx * s, y: mid + c.dy, r: c.hit }))
}
type Box = { act: PaneAct; x0: number; x1: number; y0: number; y1: number }
// The open picker's sheet owns its pixels; nothing beneath it can be pressed.
export const sheetBar = (quranY: number) => ({ top: quranY + SHEET_BORDER + SHEET_ROWS_TOP, height: SHEET_ROWS_H, minThumb: SHEET_MIN_THUMB })
const sheetBoxes = (width: number, q: QuranLayout, quranY: number): Box[] => {
  const p = q.picker
  if (!p) return []
  const x0 = PAD + SHEET_BORDER, x1 = width - PAD - SHEET_BORDER, y0 = quranY + SHEET_BORDER
  const rows: Box[] = []
  for (let i = 0; i < 8 && p.scroll + i < p.count; i++) rows.push({ act: `quran-row:${i}`, x0: x0 + SHEET_ROWS_LEFT, x1: x1 - SHEET_ROWS_RIGHT, y0: y0 + SHEET_ROWS_TOP + i * SHEET_ROW_H, y1: y0 + SHEET_ROWS_TOP + (i + 1) * SHEET_ROW_H })
  return [
    { act: 'quran-back', x0: x0 + 12, x1: x0 + 12 + SHEET_BACK_W, y0: y0 + SHEET_HEAD_TOP, y1: y0 + SHEET_HEAD_TOP + SHEET_HEAD_H },
    ...rows,
    ...(p.count > 8 ? [{ act: 'quran-scroll' as const, x0: x0 + SHEET_BAR_LEFT, x1: x0 + SHEET_BAR_LEFT + SHEET_BAR_W, y0: y0 + SHEET_ROWS_TOP, y1: y0 + SHEET_ROWS_TOP + SHEET_ROWS_H }] : []),
  ]
}
const boxes = (width: number, f: Folds, settings: SettingsModel, q: QuranLayout, athkarMenu: boolean, athkar: boolean): Box[] => {
  const kr = athkarRow(width)
  const r = cardRects(f, settings.state, settings.options, q, athkarMenu)
  const kh = athkarHead(width), ky = r.athkarY + athkarRowTop(athkarMenu)
  const headBox = (act: PaneAct, b: { x0: number; x1: number }): Box => ({ act, ...b, y0: r.athkarY + HEAD_TOP, y1: r.athkarY + HEAD_TOP + HEAD_H })
  if (q.picker && !f.quran) return sheetBoxes(width, q, r.quranY)
  const title = (act: PaneAct, y: number): Box => ({ act, x0: PAD, x1: width - PAD, y0: y, y1: y + TITLE_HIT_H })
  const off = quranOffset(q.segmented), qy = r.quranY
  return [
    ...settingsBoxes(width, f, settings, q, athkarMenu),
    title('settings:fold', r.settingsY),
    title('fold-prayer', r.prayerY), title('fold-quran', r.quranY),
    ...(f.athkar || !athkar ? [title('fold-athkar', r.athkarY)] : [
      headBox('fold-athkar', kh.fold), headBox('athkar-picker', kh.title),
      ...(athkarMenu ? ATHKAR_SETS.map((set, i): Box => ({ act: `athkar-set:${set.key}`, x0: PAD + SIDE, x1: width - PAD - SIDE, y0: r.athkarY + KMENU_TOP + KMENU_PAD + i * (KMENU_ROW_H + KMENU_GAP), y1: r.athkarY + KMENU_TOP + KMENU_PAD + i * (KMENU_ROW_H + KMENU_GAP) + KMENU_ROW_H })) : []),
    ]),
    ...(f.prayer ? [] : [{ act: 'athan' as const, x0: PAD + SIDE - 8, x1: width - PAD - SIDE + 8, y0: r.prayerY + ATHAN_TOP, y1: r.prayerY + ATHAN_TOP + ATHAN_H }]),
    ...(f.quran ? [] : [
      // The title button spans the hero's text column, right of the avatar.
      { act: 'quran-pick-surah' as const, x0: PAD + SIDE + Q_AVATAR_W + 8, x1: width - PAD - SIDE, y0: qy + Q_TITLE_TOP, y1: qy + Q_TITLE_TOP + Q_TITLE_H },
      ...(q.segmented ? [{ act: 'quran-pick-segment' as const, x0: PAD + Q_SEG_LEFT, x1: width - PAD - SIDE, y0: qy + Q_SEG_TOP, y1: qy + Q_SEG_TOP + Q_SEG_H }] : []),
      { act: 'quran-pick-reciter' as const, x0: PAD + SIDE, x1: width - PAD - SIDE, y0: qy + Q_RECITER_BASE + off, y1: qy + Q_RECITER_BASE + off + Q_RECITER_H },
    ]),
    // In RTL the row's buttons sit at the left end: «إعادة», then «أتممتُها», then «ابدأ» or «أكمل».
    ...(f.athkar ? [] : (['athkar-reset', 'athkar-finish', 'athkar-open'] as const).map((act): Box => ({ act, ...kr[act === 'athkar-reset' ? 'reset' : act === 'athkar-finish' ? 'finish' : 'open'], y0: ky + 2, y1: ky + KROW_H - 2 }))),
  ]
}

// Settings share the existing nearest-edge/slack arbitration with daily cards.
export const settingsBoxes = (width: number, folds: Folds, m: SettingsModel, q: QuranLayout = NO_QURAN, athkarMenu = false): Box[] => {
  const y = cardRects(folds, m.state, m.options, q, athkarMenu).settingsY
  if (!m.state.open) return []
  return [
    ...categoryTabs(width).map(c => ({ act:`settings:tab:${c.category}` as const, x0:c.x0, x1:c.x1, y0:y+c.y0, y1:y+c.y1 })),
    ...settingsBody(width,m).targets.map(b => ({ ...b, y0:y+SETTINGS_BODY_TOP+b.y0, y1:y+SETTINGS_BODY_TOP+b.y1 })),
  ]
}

const isEnabled = (act: PaneAct, on: Enabled): boolean =>
  act.startsWith('settings:') ? true : act === 'fold-prayer' || act === 'fold-quran' || act === 'fold-athkar' ? true : act === 'athan' ? on.athan : act === 'athkar-finish' ? !!on.athkarFinish : act === 'athkar-open' ? on.athkar && !on.athkarDone : act.startsWith('athkar-') ? on.athkar
    : act === 'quran-back' || act === 'quran-scroll' || quranRowOf(act) !== null ? true
    : act === 'quran-prev' ? on.quran && on.canPrev : act === 'quran-next' ? on.quran && on.canNext
    : act === 'quran-repeat-segment' || act === 'quran-pick-segment' ? on.quran && !!on.segmented : on.quran

const gap = (v: number, lo: number, hi: number) => (v < lo ? lo - v : v > hi ? v - hi : 0)

// `sx`/`sy` are the half-extent of the pointer's cell (see pointerSlack): a pointer
// known only as a whole cell may sit anywhere in it, so a target is hit when the cell
// overlaps it, the one nearest the pointer (its edge, not its center) winning.
export const hitAt = (width: number, x: number, y: number, on: Enabled, sx = 0, sy = 0, folds: Folds = NO_FOLDS, settings: SettingsModel = DEFAULT_SETTINGS, quran: QuranLayout = NO_QURAN, athkarMenu = false): PaneAct | null => {
  if (![width, x, y, sx, sy].every(Number.isFinite) || width < 1) return null
  let best: PaneAct | null = null, bestDistance = Infinity
  for (const c of circles(width, folds, quran, cardRects(folds, settings.state, settings.options, quran, athkarMenu).quranY)) {
    if (!isEnabled(c.act, on)) continue
    const dx = Math.max(Math.abs(x - c.x) - sx, 0), dy = Math.max(Math.abs(y - c.y) - sy, 0)
    if (dx ** 2 + dy ** 2 > c.r ** 2 + 1e-8) continue
    const d = Math.max(0, Math.hypot(x - c.x, y - c.y) - c.r)
    if (d < bestDistance) { best = c.act; bestDistance = d }
  }
  for (const b of boxes(width, folds, settings, quran, athkarMenu, on.athkar)) {
    if (!isEnabled(b.act, on)) continue
    if (gap(x, b.x0, b.x1) > sx || gap(y, b.y0, b.y1) > sy) continue
    const d = Math.hypot(gap(x, b.x0, b.x1), gap(y, b.y0, b.y1))
    if (d < bestDistance) { best = b.act; bestDistance = d }
  }
  return best
}

// A click in region cells, to its act.
export const hitOfCells = (width: number, x: number, y: number, columns: number, rows: number, isCoarse: boolean, on: Enabled, folds: Folds = NO_FOLDS, settings: SettingsModel = DEFAULT_SETTINGS, quran: QuranLayout = NO_QURAN, athkarMenu = false): PaneAct | null => {
  if (!(columns > 0) || !(rows > 0)) return null
  const height = paneHeight(folds, settings.state, settings.options, quran, athkarMenu)
  const p = pointerPixels(width, x, y, columns, rows, height)
  const s = pointerSlack(width, columns, rows, height, isCoarse)
  return hitAt(width, p.x, p.y, on, s.x, s.y, folds, settings, quran, athkarMenu)
}

// What the Client posts: a click with its region and the width it drew at, or a key.
export type PaneMessage =
  | { act: 'pointer'; x: number; y: number; columns: number; rows: number; width: number; button: string; coarse: boolean }
  | { act: 'key'; key: string }
  // A scrollbar drag in progress: the pointer's row (in cells, as `fine` reports it) and whether it was released.
  | { act: 'drag'; y: number; rows: number; end: boolean }

export const isPaneMessage = (value: unknown): value is PaneMessage => {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  if (m.act === 'key') return typeof m.key === 'string'
  if (m.act === 'drag') return typeof m.y === 'number' && Number.isFinite(m.y) && typeof m.rows === 'number' && Number.isFinite(m.rows) && m.rows > 0 && typeof m.end === 'boolean'
  return m.act === 'pointer' && ['x', 'y', 'columns', 'rows', 'width'].every(k => typeof m[k] === 'number' && Number.isFinite(m[k])) && (m.columns as number) > 0 && (m.rows as number) > 0 && typeof m.button === 'string' && typeof m.coarse === 'boolean'
}

// Keys, with the pane focused: space or enter plays and stops, the arrows move.
export const keyAct = (key: string): PaneAct | null => key === ' ' || key === 'space' || key === 'return' ? 'quran-toggle' : key === 'left' ? 'quran-prev' : key === 'right' ? 'quran-next' : null
