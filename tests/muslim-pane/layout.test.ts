import { expect, test } from 'claude-code/testing'
import { AVATAR_H, CARDS_TOP, FOLDED_H, GAP, TOP_H, TOP_Y, NO_FOLDS, TITLE_HIT_H, cardRects, paneHeight, ATHAN_TOP, ATHKAR_H, ATHKAR_Y, CONTROLS_CY, KBTN_W, KFINISH_W, KROW_GAP, KROW_TOP, OPEN_TOP, PAD, SIDE, PANE_HEIGHT, PRAYER_Y, QURAN_Y, hitAt, hitOfCells, isPaneMessage, keyAct, type Enabled } from '../../src/features/muslim-pane/layout.ts'

const ALL: Enabled = { athan: true, quran: true, canPrev: true, canNext: true, athkar: true }
const W = 360

test('the cards stack in order and the pane height ends under the folded settings card', () => {
  expect(PRAYER_Y).toBe(CARDS_TOP)
  expect(TOP_Y).toBe(0)
  expect(TOP_H).toBe(36)
  expect(AVATAR_H).toBe(TOP_H)
  expect(CARDS_TOP).toBe(44)
  expect(CARDS_TOP - TOP_Y - TOP_H).toBe(8)
  expect(hitAt(W, W / 2, TOP_Y + TOP_H / 2, ALL)).toBeNull()
  expect(QURAN_Y).toBeGreaterThan(PRAYER_Y)
  expect(ATHKAR_Y).toBeGreaterThan(QURAN_Y)
  expect(PANE_HEIGHT).toBe(ATHKAR_Y + ATHKAR_H + GAP + FOLDED_H + PAD)
})

test('each control is hit at its center', () => {
  const y = QURAN_Y + CONTROLS_CY
  expect(hitAt(W, W / 2 - 62, y, ALL)).toBe('quran-prev')
  expect(hitAt(W, W / 2, y, ALL)).toBe('quran-toggle')
  expect(hitAt(W, W / 2 + 62, y, ALL)).toBe('quran-next')
  expect(hitAt(W, W / 2, QURAN_Y + OPEN_TOP + 10, ALL)).toBe('quran-open')
  expect(hitAt(W, W / 2, PRAYER_Y + ATHAN_TOP + 10, ALL)).toBe('athan')
  expect(hitAt(W, PAD + SIDE + KBTN_W / 2, ATHKAR_Y + KROW_TOP + 18, ALL)).toBe('athkar-open')
})

test('empty space and the right side of the athkar row hit nothing', () => {
  expect(hitAt(W, W / 2, PRAYER_Y - 5, ALL)).toBeNull()
  expect(hitAt(W, W - PAD - 20, ATHKAR_Y + KROW_TOP + 18, ALL)).toBeNull()
  expect(hitAt(Number.NaN, 1, 1, ALL)).toBeNull()
})

test('disabled targets are not hit; the full-player button always is', () => {
  const none: Enabled = { athan: false, quran: false, canPrev: false, canNext: false, athkar: false }
  const y = QURAN_Y + CONTROLS_CY
  expect(hitAt(W, W / 2, y, none)).toBeNull()
  expect(hitAt(W, PAD + SIDE + KBTN_W / 2, ATHKAR_Y + KROW_TOP + 18, none)).toBeNull()
  expect(hitAt(W, W / 2, PRAYER_Y + ATHAN_TOP + 10, none)).toBeNull()
  expect(hitAt(W, W / 2, QURAN_Y + OPEN_TOP + 10, none)).toBe('quran-open')
  expect(hitAt(W, W / 2 - 62, y, { ...ALL, canPrev: false })).toBeNull()
  expect(hitAt(W, W / 2 + 62, y, { ...ALL, canNext: false })).toBeNull()
})

test('a whole-cell pointer hits a target its cell overlaps', () => {
  const y = QURAN_Y + CONTROLS_CY + 30
  expect(hitAt(W, W / 2, y, ALL)).toBeNull()
  expect(hitAt(W, W / 2, y, ALL, 4, 12)).toBe('quran-toggle')
})

test('cells map to pixels over the pane height', () => {
  const columns = 40, rows = 40
  const x = (W / 2) / (W / columns), y = (QURAN_Y + CONTROLS_CY) / (PANE_HEIGHT / rows)
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
  expect(hitAt(W, W / 2, QURAN_Y + CONTROLS_CY, ALL, 0, 0, folds)).toBeNull()
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
