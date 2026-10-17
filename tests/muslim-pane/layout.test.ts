import { expect, test } from 'claude-code/testing'
import { AVATAR_H, CARDS_TOP, CITY_H, CITY_TOP, FOLDED_H, GAP, TOP_H, TOP_Y, NO_FOLDS, TITLE_HIT_H, cardRects, paneHeight, ATHAN_H, ATHAN_TOP, ATHKAR_H, ATHKAR_Y, CONTROL_SPECS, Q_CONTROLS_BASE, Q_CONTROLS_H, Q_RECITER_BASE, Q_SEG_TOP, Q_TITLE_TOP, Q_BASE_H, Q_PICKER_H, SHEET_BORDER, SHEET_ROWS_TOP, SHEET_ROW_H, SHEET_HEAD_TOP, SHEET_BACK_W, quranHeight, quranOffset, sheetBar, quranRowOf, NO_QURAN, KBTN_W, KFINISH_W, KROW_GAP, KROW_TOP, PAD, SIDE, PANE_HEIGHT, PRAYER_H, PRAYER_Y, QURAN_Y, hitAt, hitOfCells, isPaneMessage, keyAct, type Enabled } from '../../src/features/muslim-pane/layout.ts'

const ALL: Enabled = { athan: true, quran: true, canPrev: true, canNext: true, athkar: true }
const W = 360
const SEG = { segmented: true, picker: null }
const CY = QURAN_Y + Q_CONTROLS_BASE + quranOffset(false) + Q_CONTROLS_H / 2

test('the cards stack in order and the pane height ends under the folded settings card', () => {
  expect(PRAYER_Y).toBe(CARDS_TOP)
  expect(TOP_Y).toBe(0)
  expect(TOP_H).toBe(36)
  expect(AVATAR_H).toBe(TOP_H)
  expect(CARDS_TOP).toBe(44)
  expect(CARDS_TOP - TOP_Y - TOP_H).toBe(8)
  expect(hitAt(W, W / 2, TOP_Y + TOP_H / 2, ALL)).toBeNull()
  expect(QURAN_Y).toBe(PRAYER_Y + PRAYER_H + GAP)
  expect(ATHKAR_Y).toBeGreaterThan(QURAN_Y)
  expect(PANE_HEIGHT).toBe(ATHKAR_Y + ATHKAR_H + GAP + FOLDED_H + PAD)
})

test('the city line reserves fixed space below Athan without a hit target', () => {
  expect(CITY_TOP).toBe(ATHAN_TOP + ATHAN_H + 4)
  expect(CITY_H).toBe(16)
  expect(PRAYER_H).toBe(CITY_TOP + CITY_H + 12)
  expect(PRAYER_H).toBe(356)
  for (const x of [PAD + SIDE, W / 2, W - PAD - SIDE]) {
    for (const y of [CITY_TOP, CITY_TOP + CITY_H / 2, CITY_TOP + CITY_H]) {
      expect(hitAt(W, x, PRAYER_Y + y, ALL)).toBeNull()
    }
  }
})

test('each control is hit at its center', () => {
  const y = CY
  expect(hitAt(W, W / 2 - 60, y, ALL)).toBe('quran-prev')
  expect(hitAt(W, W / 2, y, ALL)).toBe('quran-toggle')
  expect(hitAt(W, W / 2 + 60, y, ALL)).toBe('quran-next')
  expect(hitAt(W, W / 2 + 110, y - 8.25, ALL)).toBe('quran-repeat-surah')
  expect(hitAt(W, W / 2 - 110, y - 8.25, ALL)).toBeNull()
  expect(hitAt(W, W / 2 - 110, y - 8.25, { ...ALL, segmented: true }, 0, 0, NO_FOLDS, undefined, SEG)).toBe('quran-repeat-segment')
  expect(hitAt(W, W / 2, PRAYER_Y + ATHAN_TOP + 10, ALL)).toBe('athan')
  expect(hitAt(W, PAD + SIDE + KBTN_W / 2, ATHKAR_Y + KROW_TOP + 18, ALL)).toBe('athkar-open')
})

test('empty space and the right side of the athkar row hit nothing', () => {
  expect(hitAt(W, W / 2, PRAYER_Y - 5, ALL)).toBeNull()
  expect(hitAt(W, W - PAD - 20, ATHKAR_Y + KROW_TOP + 18, ALL)).toBeNull()
  expect(hitAt(Number.NaN, 1, 1, ALL)).toBeNull()
})

test('disabled targets are not hit', () => {
  const none: Enabled = { athan: false, quran: false, canPrev: false, canNext: false, athkar: false }
  const y = CY
  expect(hitAt(W, W / 2, y, none)).toBeNull()
  expect(hitAt(W, PAD + SIDE + KBTN_W / 2, ATHKAR_Y + KROW_TOP + 18, none)).toBeNull()
  expect(hitAt(W, W / 2, PRAYER_Y + ATHAN_TOP + 10, none)).toBeNull()
  expect(hitAt(W, W / 2 + 10, QURAN_Y + Q_TITLE_TOP + 10, none)).toBeNull()
  expect(hitAt(W, W / 2 - 60, y, { ...ALL, canPrev: false })).toBeNull()
  expect(hitAt(W, W / 2 + 60, y, { ...ALL, canNext: false })).toBeNull()
})

test('a whole-cell pointer hits a target its cell overlaps', () => {
  const y = CY + 28
  expect(hitAt(W, W / 2, y, ALL)).toBeNull()
  expect(hitAt(W, W / 2, y, ALL, 4, 12)).toBe('quran-toggle')
})

test('cells map to pixels over the pane height', () => {
  const columns = 40, rows = 40
  const x = (W / 2) / (W / columns), y = CY / (PANE_HEIGHT / rows)
  expect(hitOfCells(W, x, y, columns, rows, false, ALL)).toBe('quran-toggle')
  expect(hitOfCells(W, x, y, 0, rows, false, ALL)).toBeNull()
})

test('messages are checked and keys map to the player', () => {
  expect(isPaneMessage({ act: 'pointer', x: 1, y: 2, columns: 40, rows: 30, width: 360, button: 'left', coarse: true })).toBe(true)
  expect(isPaneMessage({ act: 'pointer', x: 1, y: 2, columns: 0, rows: 30, width: 360, button: 'left', coarse: true })).toBe(false)
  expect(isPaneMessage({ act: 'key', key: 'left' })).toBe(true)
  expect(isPaneMessage(null)).toBe(false)
  expect(keyAct('return')).toBe('quran-toggle')
  expect(keyAct(' ')).toBe('quran-toggle')
  expect(keyAct('left')).toBe('quran-prev')
  expect(keyAct('right')).toBe('quran-next')
  expect(keyAct('x')).toBeNull()
})

test('folded cards shrink to their title row and the cards below move up', () => {
  expect(paneHeight(NO_FOLDS)).toBe(PANE_HEIGHT)
  const r = cardRects({ prayer: true, quran: false, athkar: false })
  expect(r.prayerH).toBe(FOLDED_H)
  expect(r.quranY).toBe(CARDS_TOP + FOLDED_H + GAP)
  expect(r.height).toBe(PANE_HEIGHT - (r.athkarY === ATHKAR_Y ? 0 : ATHKAR_Y - r.athkarY))
  expect(paneHeight({ prayer: true, quran: true, athkar: true })).toBe(CARDS_TOP + PAD + 4 * FOLDED_H + 3 * GAP)
  expect(TITLE_HIT_H).toBeLessThanOrEqual(FOLDED_H)
})

test('the whole title row folds, even by a whole-cell pointer, and folded cards hit nothing else', () => {
  expect(hitAt(W, 40, PRAYER_Y + 20, ALL)).toBe('fold-prayer')
  expect(hitAt(W, W - 40, QURAN_Y + 20, ALL)).toBe('fold-quran')
  expect(hitAt(W, W / 2, ATHKAR_Y + 20, ALL)).toBe('fold-athkar')
  // A cell just under the row still reaches it.
  expect(hitAt(W, W / 2, ATHKAR_Y + 50, ALL, 4, 12)).toBe('fold-athkar')
  const folds = { prayer: true, quran: true, athkar: true }
  const r = cardRects(folds)
  expect(hitAt(W, W / 2, r.quranY + 20, ALL, 0, 0, folds)).toBe('fold-quran')
  expect(hitAt(W, W / 2, CY, ALL, 0, 0, folds)).toBeNull()
  expect(hitAt(W, W / 2, PRAYER_Y + ATHAN_TOP + 10, ALL, 0, 0, folds)).toBeNull()
  expect(hitOfCells(W, 20, (r.athkarY + 20) / (r.height / 40), 40, 40, false, ALL, folds)).toBe('fold-athkar')
})

test('athkar finish sits beside Open and is inactive when done, off or folded', () => {
  const y = ATHKAR_Y + KROW_TOP + 18, x = PAD + SIDE + KBTN_W + KROW_GAP + KFINISH_W / 2
  expect(hitAt(W, x, y, { ...ALL, athkarFinish: true })).toBe('athkar-finish')
  expect(hitAt(W, x, y, { ...ALL, athkarFinish: false })).toBeNull()
  expect(hitAt(W, x, y, { ...ALL, athkarFinish: true }, 0, 0, { ...NO_FOLDS, athkar: true })).toBeNull()
  expect(hitOfCells(W, x * 40 / W, y * 40 / PANE_HEIGHT, 40, 40, true, { ...ALL, athkarFinish: true })).toBe('athkar-finish')
})

test('the Quran card is 300 tall, 316 when segmented, and 474 plus the offset with a picker', () => {
  expect(Q_BASE_H + quranOffset(false)).toBe(300)
  expect(quranHeight(NO_QURAN)).toBe(300)
  expect(quranHeight(SEG)).toBe(316)
  expect(quranHeight({ segmented: false, picker: { list: 'reciter', count: 20, scroll: 0 } })).toBe(Q_PICKER_H + 14)
  expect(quranHeight({ segmented: true, picker: { list: 'reciter', count: 20, scroll: 0 } })).toBe(504)
  expect(paneHeight(NO_FOLDS, undefined, undefined, SEG)).toBe(PANE_HEIGHT + 16)
  expect(paneHeight({ prayer: true, quran: true, athkar: true }, undefined, undefined, SEG)).toBe(CARDS_TOP + PAD + 4 * FOLDED_H + 3 * GAP)
})

test('the title, reciter and the start-from line open their pickers', () => {
  expect(hitAt(W, W - 60, QURAN_Y + Q_TITLE_TOP + 16, ALL)).toBe('quran-pick-surah')
  expect(hitAt(W, W / 2, QURAN_Y + Q_RECITER_BASE + 14 + 14, ALL)).toBe('quran-pick-reciter')
  expect(hitAt(W, W / 2, QURAN_Y + Q_RECITER_BASE + 30 + 14, { ...ALL, segmented: true }, 0, 0, NO_FOLDS, undefined, SEG)).toBe('quran-pick-reciter')
  const y = QURAN_Y + Q_SEG_TOP + 14
  expect(hitAt(W, W - 60, y, { ...ALL, segmented: true }, 0, 0, NO_FOLDS, undefined, SEG)).toBe('quran-pick-segment')
  expect(hitAt(W, 40, y, { ...ALL, segmented: true }, 0, 0, NO_FOLDS, undefined, SEG)).toBeNull()
  expect(hitAt(W, W - 60, y, ALL)).not.toBe('quran-pick-segment')
})

const OPEN = { segmented: false, picker: { list: 'surah' as const, count: 114, scroll: 10 } }
test('an open sheet owns the card: rows, the back button and the scrollbar are hit, nothing beneath', () => {
  const top = QURAN_Y + SHEET_BORDER
  for (const i of [0, 3, 7]) expect(hitAt(W, W / 2, top + SHEET_ROWS_TOP + i * SHEET_ROW_H + 17, ALL, 0, 0, NO_FOLDS, undefined, OPEN)).toBe(`quran-row:${i}`)
  expect(hitAt(W, PAD + 12 + SHEET_BACK_W / 2, top + SHEET_HEAD_TOP + 18, ALL, 0, 0, NO_FOLDS, undefined, OPEN)).toBe('quran-back')
  expect(hitAt(W, PAD + 12, top + SHEET_ROWS_TOP + 100, ALL, 0, 0, NO_FOLDS, undefined, OPEN)).toBe('quran-scroll')
  expect(hitAt(W, W / 2, QURAN_Y + 400, ALL, 0, 0, NO_FOLDS, undefined, OPEN)).toBeNull()
  expect(hitAt(W, W / 2, QURAN_Y + Q_TITLE_TOP + 10, ALL, 0, 0, NO_FOLDS, undefined, OPEN)).toBeNull()
  expect(sheetBar(QURAN_Y)).toMatchObject({ top: top + SHEET_ROWS_TOP, height: 8 * SHEET_ROW_H })
})

test('a short list has no scrollbar, and only its rows are hit', () => {
  const few = { segmented: false, picker: { list: 'reciter' as const, count: 3, scroll: 0 } }
  const top = QURAN_Y + SHEET_BORDER
  expect(hitAt(W, PAD + 12, top + SHEET_ROWS_TOP + 100, ALL, 0, 0, NO_FOLDS, undefined, few)).toBeNull()
  expect(hitAt(W, W / 2, top + SHEET_ROWS_TOP + 2 * SHEET_ROW_H + 10, ALL, 0, 0, NO_FOLDS, undefined, few)).toBe('quran-row:2')
  expect(hitAt(W, W / 2, top + SHEET_ROWS_TOP + 3 * SHEET_ROW_H + 10, ALL, 0, 0, NO_FOLDS, undefined, few)).toBeNull()
  expect(quranRowOf('quran-row:5')).toBe(5)
  expect(quranRowOf('quran-toggle')).toBeNull()
  expect(CONTROL_SPECS).toHaveLength(5)
})
