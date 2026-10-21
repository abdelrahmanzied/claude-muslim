import { BUTTON_SLOP, settingsBoxes } from '../../src/features/muslim-pane/layout.ts'
import { DEFAULT_SETTINGS, settingsOptions } from '../../src/features/muslim-pane/settings.ts'
import { readOptions } from '../../src/config.ts'
import { athkarHead, athkarRow, FOLD_W, FOLD_BLEED, KROW_OPEN_TOP, KMENU_TOP, KMENU_PAD, KMENU_ROW_H, KMENU_GAP } from '../../src/features/muslim-pane/layout.ts'
import { expect, test } from 'claude-code/testing'
import { AVATAR_H, CARDS_TOP, CITY_H, CITY_TOP, FOLDED_H, GAP, TOP_H, TOP_Y, NO_FOLDS, TITLE_HIT_H, cardRects, paneHeight, ATHAN_H, ATHAN_TOP, ATHKAR_H, ATHKAR_Y, CONTROL_SPECS, Q_CONTROLS_BASE, Q_CONTROLS_H, Q_RECITER_BASE, Q_SEG_TOP, Q_TITLE_TOP, Q_BASE_H, Q_PICKER_H, SHEET_BORDER, SHEET_ROWS_TOP, SHEET_ROW_H, SHEET_HEAD_TOP, SHEET_BACK_W, quranHeight, quranOffset, sheetBar, quranRowOf, NO_QURAN, KROW_TOP, PAD, SIDE, PANE_HEIGHT, PRAYER_H, PRAYER_Y, QURAN_Y, hitAt, hitOfCells, isPaneMessage, keyAct, type Enabled } from '../../src/features/muslim-pane/layout.ts'

const ALL: Enabled = { athan: true, quran: true, canPrev: true, canNext: true, athkar: true }
const W = 360
const mid = (b: { x0: number; x1: number }) => (b.x0 + b.x1) / 2
const SEG = { segmented: true, picker: null }
const CY = QURAN_Y + Q_CONTROLS_BASE + quranOffset(false) + Q_CONTROLS_H / 2

test('the cards stack in order and the pane height ends under the folded settings card', () => {
  expect(PRAYER_Y).toBe(CARDS_TOP)
  expect(TOP_Y).toBe(0)
  expect(TOP_H).toBe(52)
  expect(AVATAR_H).toBe(TOP_H)
  expect(CARDS_TOP).toBe(60)
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
  expect(hitAt(W, mid(athkarRow(W).open), ATHKAR_Y + KROW_TOP + 18, ALL)).toBe('athkar-open')
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
  expect(hitAt(W, mid(athkarRow(W).open), ATHKAR_Y + KROW_TOP + 18, none)).toBeNull()
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
  expect(hitAt(W, W / 2, ATHKAR_Y + 20, ALL)).toBe('athkar-picker')
  // A cell just under the row still reaches it.
  expect(hitAt(W, PAD + SIDE + 4, ATHKAR_Y + 40, ALL, 4, 4)).toBe('fold-athkar')
  const folds = { prayer: true, quran: true, athkar: true }
  const r = cardRects(folds)
  expect(hitAt(W, W / 2, r.quranY + 20, ALL, 0, 0, folds)).toBe('fold-quran')
  expect(hitAt(W, W / 2, CY, ALL, 0, 0, folds)).toBeNull()
  expect(hitAt(W, W / 2, PRAYER_Y + ATHAN_TOP + 10, ALL, 0, 0, folds)).toBeNull()
  expect(hitOfCells(W, 20, (r.athkarY + 20) / (r.height / 40), 40, 40, false, ALL, folds)).toBe('fold-athkar')
})

test('athkar finish sits beside Open and is inactive when done, off or folded; Open is hidden when done', () => {
  const y = ATHKAR_Y + KROW_TOP + 18, x = mid(athkarRow(W).finish)
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

for (const width of [240, 360, 420]) test(`athkar ${width}: fold at the left end, title menu, row buttons and a usable bar`, () => {
  const head = athkarHead(width), row = athkarRow(width)
  const y = ATHKAR_Y, on = { ...ALL, athkarFinish: true }
  // The fold chevron is where the shared header puts it: the same 26px target 6px past the card's left inset.
  expect(head.fold).toEqual({ x0: PAD + SIDE - FOLD_BLEED, x1: PAD + SIDE - FOLD_BLEED + FOLD_W })
  // RTL after the bar: «ابدأ/أكمل», «أتممتُها», then «إعادة» at the far left; no overlaps, all inside the card.
  expect(row.reset.x0).toBe(PAD + SIDE)
  expect(row.finish.x0).toBeGreaterThan(row.reset.x1)
  expect(row.open.x0).toBeGreaterThan(row.finish.x1)
  expect(row.open.x1).toBeLessThan(width - PAD - SIDE)
  // The bar (row width minus the 18px icon, the buttons and the gaps) keeps a sensible minimum.
  const inner = width - 2 * (PAD + SIDE), bar = inner - 18 - row.gap - (row.open.x1 - row.reset.x0) - row.gap
  expect(bar).toBeGreaterThanOrEqual(40)
  expect(row.compact).toBe(width <= 380)
  for (const open of [false, true]) {
    const hit = (x: number, py: number, sx = 0, sy = 0) => hitAt(width, x, y + py, on, sx, sy, NO_FOLDS, undefined, NO_QURAN, open)
    expect(hit(mid(head.title), 28)).toBe('athkar-picker')
    expect(hit(mid(head.fold), 28)).toBe('fold-athkar')
    expect(hit(head.title.x0 - 1, 28, 4, 12)).toBe('athkar-picker')
    const rowTop = open ? KROW_OPEN_TOP : KROW_TOP
    if (!open) {
      expect(hit(mid(row.reset), rowTop + 18)).toBe('athkar-reset')
      expect(hit(mid(row.finish), rowTop + 18)).toBe('athkar-finish')
      expect(hit(mid(row.open), rowTop + 18)).toBe('athkar-open')
      expect(hitAt(width, mid(row.open), y + rowTop + 18, { ...on, athkarDone: true, athkarFinish: false }, 0, 0, NO_FOLDS, undefined, NO_QURAN, false)).toBeNull()
      expect(hitAt(width, mid(row.reset), y + rowTop + 18, { ...on, athkarDone: true, athkarFinish: false }, 0, 0, NO_FOLDS, undefined, NO_QURAN, false)).toBe('athkar-reset')
    }
    for (const [i, key] of ['morning', 'evening', 'after-salah'].entries()) {
      const py = KMENU_TOP + KMENU_PAD + i * (KMENU_ROW_H + KMENU_GAP) + 16
      if (open) {
        expect(hit(width / 2, py)).toBe(`athkar-set:${key}`)
        const height = paneHeight(NO_FOLDS, undefined, undefined, NO_QURAN, true)
        expect(hitOfCells(width, width / 2 * 40 / width, (y + py) * 80 / height, 40, 80, true, on, NO_FOLDS, undefined, NO_QURAN, true)).toBe(`athkar-set:${key}`)
      } else expect(hit(width - PAD - SIDE, py)).not.toBe(`athkar-set:${key}`)
    }
  }
  expect(cardRects(NO_FOLDS).athkarH).toBe(98)
  const openRects = cardRects(NO_FOLDS, undefined, undefined, NO_QURAN, true)
  expect(openRects.athkarH).toBe(208)
  expect(openRects.settingsY).toBe(cardRects(NO_FOLDS).settingsY + 110)
  expect(openRects.height).toBe(PANE_HEIGHT + 110)
  expect(cardRects({ ...NO_FOLDS, athkar: true }, undefined, undefined, NO_QURAN, true).athkarH).toBe(FOLDED_H)
  expect(hitAt(width, mid(head.title), y + 28, { ...on, athkar: false })).toBe('fold-athkar')
})

test('the fold chevron sits at the same left x on all three folding cards, folded or open', () => {
  const x = PAD + SIDE + 4
  for (const folded of [false, true]) {
    const folds = { prayer: folded, quran: folded, athkar: folded }
    const r = cardRects(folds)
    expect(hitAt(W, x, r.prayerY + 28, ALL, 0, 0, folds)).toBe('fold-prayer')
    expect(hitAt(W, x, r.quranY + 28, ALL, 0, 0, folds)).toBe('fold-quran')
    expect(hitAt(W, x, r.athkarY + 28, ALL, 0, 0, folds)).toBe('fold-athkar')
  }
})

test('a settings control takes a press on every pixel and just outside it; a press inside one always picks it',()=>{
  const on: Enabled = { athan: true, quran: false, canPrev: false, canNext: false, segmented: false, athkar: false, athkarFinish: false }
  const folds = { prayer: true, quran: true, athkar: true }
  const settings = { ...DEFAULT_SETTINGS, state: { open: true, category: 'thikr' as const, face: 'main' as const, page: 0 }, options: settingsOptions(readOptions({ thikrSpeed: '3' })) }
  const pills = settingsBoxes(420, folds, settings).filter(b => /thikr(Mode|Speed):|field:thikrSpeed$/.test(b.act))
  expect(pills.length).toBe(4)
  for (const b of pills) {
    for (let x = b.x0; x <= b.x1; x += 2) for (let y = b.y0; y <= b.y1; y += 2) expect(hitAt(420, x, y, on, 0, 0, folds, settings)).toBe(b.act)
    const midX = (b.x0 + b.x1) / 2, midY = (b.y0 + b.y1) / 2
    // Just outside the edge, nearer to it than to any neighbour.
    expect(hitAt(420, midX, b.y0 - 3, on, 0, 0, folds, settings)).toBe(b.act)
    expect(hitAt(420, midX, b.y1 + 3, on, 0, 0, folds, settings)).toBe(b.act)
    expect(hitAt(420, b.x0 - 1, midY, on, 0, 0, folds, settings)).toBe(b.act)
    // Past the margin above the content row nothing is pressed.
    if (b.act.startsWith('settings:thikrMode:')) expect(hitAt(420, midX, b.y0 - BUTTON_SLOP.y - 1, on, 0, 0, folds, settings)).toBe(null)
  }
})

// Desktop often knows a click only as its whole cell (about 8px × 20px): any cell that touches a number box,
// even one centred up to half a cell above or below it, picks the box, never the choices stacked above it.
// Real Desktop presses on the top edge of the thikr speed box, low in the open pane (61 × 72 cells, 512px):
// each came in a whole row higher than the box's drawn top, and must still pick the box.
test('a press reported a row above a button low in the pane still picks it', () => {
  const on: Enabled = { athan: true, quran: false, canPrev: false, canNext: false, segmented: false, athkar: false, athkarFinish: false }
  const folds = { prayer: false, quran: false, athkar: false }
  const settings = { ...DEFAULT_SETTINGS, state: { open: true, category: 'thikr' as const, face: 'main' as const, page: 0 }, options: settingsOptions(readOptions({ thikrSpeed: 'auto' })) }
  expect(paneHeight(folds, settings.state, settings.options)).toBe(1368)
  for (const column of [10, 11, 14, 16, 17, 18]) expect(hitOfCells(512, column + 0.5, 62.5, 61, 72, true, on, folds, settings)).toBe('settings:field:thikrSpeed')
  expect(hitOfCells(512, 6.5, 57.5, 61, 72, true, on, folds, settings)).toBe('settings:thikrMode:all')
})

test('a number box takes every whole-cell press on it, never the choice above it', () => {
  const on: Enabled = { athan: true, quran: false, canPrev: false, canNext: false, segmented: false, athkar: false, athkarFinish: false }
  const folds = { prayer: true, quran: true, athkar: true }
  for (const [category, act] of [['thikr', 'settings:field:thikrSpeed'], ['prayer', 'settings:field:salahShow']] as const) {
    const settings = { ...DEFAULT_SETTINGS, state: { open: true, category, face: 'main' as const, page: 0 }, options: settingsOptions(readOptions({ thikrSpeed: '3', salahShow: '20' })) }
    const b = settingsBoxes(420, folds, settings).find(t => t.act === act)!
    for (let x = b.x0; x <= b.x1; x += 2) for (let y = b.y0 - 10; y <= b.y1 + 10; y++) expect(hitAt(420, x, y, on, 4.2, 10, folds, settings)).toBe(act)
  }
})

test('every pixel of the side-by-side thikr speed choices hits its own control with coarse slack in auto and fixed states',()=>{
  const on: Enabled = { athan: true, quran: false, canPrev: false, canNext: false, athkar: false }
  const folds = { prayer: true, quran: true, athkar: true }
  for(const width of [240,360]) for(const thikrSpeed of ['auto','5']){
    const settings={...DEFAULT_SETTINGS,state:{open:true,category:'thikr' as const,face:'main' as const,page:0},options:settingsOptions(readOptions({thikrSpeed}))}
    for(const act of ['settings:thikrSpeed:auto','settings:field:thikrSpeed']){
      const b=settingsBoxes(width,folds,settings).find(t=>t.act===act)!
      for(let x=b.x0;x<=b.x1;x++) for(let y=b.y0;y<=b.y1;y++) expect(hitAt(width,x,y,on,4.2,10,folds,settings)).toBe(act)
    }
  }
})

test('the athkar style pills take a press anywhere in their frame and in the button margin, the nearer one between them',()=>{
  const on: Enabled = { athan: true, quran: false, canPrev: false, canNext: false, segmented: false, athkar: false, athkarFinish: false }
  const folds = { prayer: true, quran: true, athkar: true }
  const settings = { ...DEFAULT_SETTINGS, state: { open: true, category: 'athkar' as const, face: 'main' as const, page: 0 } }
  const [sky, frame] = ['settings:athkarStyle:sky', 'settings:athkarStyle:frame'].map(act => settingsBoxes(420, folds, settings).find(b => b.act === act)!)
  for (const b of [sky!, frame!]) {
    for (let x = b.x0; x <= b.x1; x++) for (let y = b.y0; y <= b.y1; y++) expect(hitAt(420, x, y, on, 0, 0, folds, settings)).toBe(b.act)
    const midX = (b.x0 + b.x1) / 2, midY = (b.y0 + b.y1) / 2
    expect(hitAt(420, midX, b.y0 - BUTTON_SLOP.y, on, 0, 0, folds, settings)).toBe(b.act)
    expect(hitAt(420, midX, b.y1 + BUTTON_SLOP.y, on, 0, 0, folds, settings)).toBe(b.act)
    expect(hitAt(420, midX, b.y1 + BUTTON_SLOP.y + 1, on, 0, 0, folds, settings)).toBe(null)
  }
  expect(hitAt(420, sky!.x0 - BUTTON_SLOP.x, (sky!.y0 + sky!.y1) / 2, on, 0, 0, folds, settings)).toBe(sky!.act)
  // The 4px gap between them: each half goes to the nearer pill.
  expect(hitAt(420, sky!.x1 + 1, sky!.y0 + 4, on, 0, 0, folds, settings)).toBe(sky!.act)
  expect(hitAt(420, frame!.x0 - 1, frame!.y0 + 4, on, 0, 0, folds, settings)).toBe(frame!.act)
})

test('every settings button, in every tab and page, takes a press on every pixel of its frame and in its margin',()=>{
  const on: Enabled = { athan: true, quran: false, canPrev: false, canNext: false, segmented: false, athkar: false, athkarFinish: false }
  const folds = { prayer: true, quran: true, athkar: true }
  const states = [
    ...(['general', 'prayer', 'athkar', 'thikr'] as const).map(category => ({ open: true, category, face: 'main' as const, page: 0 })),
    ...(['methods', 'adjust', 'city'] as const).map(face => ({ open: true, category: 'prayer' as const, face, page: 1 })),
  ]
  for (const state of states) {
    // Steppers shown: «عرض الصلاة» and the thikr speed.
    const settings = { ...DEFAULT_SETTINGS, state, options: settingsOptions(readOptions({ thikrSpeed: '4', salahShow: '20' })) }
    const targets = settingsBoxes(420, folds, settings)
    expect(targets.length).toBeGreaterThan(0)
    for (const b of targets) {
      for (let x = Math.ceil(b.x0); x <= b.x1; x += 2) for (let y = Math.ceil(b.y0); y <= b.y1; y += 2) expect(hitAt(420, x, y, on, 0, 0, folds, settings)).toBe(b.act)
      const midX = (b.x0 + b.x1) / 2, midY = (b.y0 + b.y1) / 2
      for (const [x, y] of [[midX, b.y0 - BUTTON_SLOP.y], [midX, b.y1 + BUTTON_SLOP.y], [b.x0 - BUTTON_SLOP.x, midY], [b.x1 + BUTTON_SLOP.x, midY]] as const) expect(hitAt(420, x, y, on, 0, 0, folds, settings)).not.toBeNull()
    }
  }
})
