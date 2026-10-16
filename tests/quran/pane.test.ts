import { expect, test } from 'claude-code/testing'
import { CARD_TOP, FIELD_HEIGHT, PANE_HEIGHT, SEGMENT_EXTRA, VISIBLE_ROWS, arabicDigits, fieldTop, isPickMessage, moveHighlight, openPicker, options, overlayTop, pickerOverlayHeight, columnsWidth, headingLayout, HEADING_EDGE, HEADING_GAP, safeWidth, paneHit, paneModel, paneSvg, pickerInitial, typeQuery } from '../../src/features/quran/pane.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'
import { CONTROLS_Y, controls, paletteCss, pointerSlack } from '../../src/features/quran/card.ts'
import { AUDIO_LIMIT_BYTES, timedSegments } from '../../src/features/quran/segments.ts'

const model = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, { moshafKey: '10:20', surah: 18, durationMs: 60000, startedAt: 0 }, 10000, 420, 4, 0, true, null)
test('whole pane model includes full catalogs, authoritative selected keys and playback fields', () => {
  expect(model.reciters).toEqual(fixtureCatalog.reciters)
  expect(model.surahs).toHaveLength(114)
  expect(model.selectedReciter).toBe('10:20')
  expect(model.selectedSurah).toBe(18)
  expect(model.title).toBe('سورة الكهف')
  expect(model.elapsed).toBe('00:10')
  expect(model.focusRevision).toBe(0)
  expect(model.error).toBe('')
  expect(options(model, 'surah', '')).toHaveLength(114)
  expect(options(model, 'surah', '١٨')[0]?.value).toBe('18')
  expect(options(model, 'reciter', 'مجود')[0]?.value).toBe('10:21')
  expect(arabicDigits(114)).toBe('١١٤')
})
test('pure picker navigation keeps the highlight visible and has no catalog/page cap', () => {
  let state = openPicker(model, pickerInitial(model), 'surah')
  expect(state.highlight).toBe(17)
  expect(state.scroll).toBe(10)
  state = moveHighlight(state, 114, 1000)
  expect(state.highlight).toBe(113)
  expect(state.scroll).toBe(114 - VISIBLE_ROWS)
  state = moveHighlight(state, 114, -1000)
  expect(state.highlight).toBe(0)
  expect(state.scroll).toBe(0)
  for (const key of 'الكهف') state = typeQuery(state, key)
  expect(options(model, 'surah', state.query)[0]?.value).toBe('18')
  expect(typeQuery(state, 'backspace').query).toBe('الكه')
  expect(typeQuery(state, '😀').highlight).toBe(0)
  expect(openPicker(model, state, 'surah').open).toBe(null)
})
test('overlay hit testing owns rows and empty panel areas, blocks player controls, and closes outside', () => {
  const initial = pickerInitial(model)
  expect(paneHit(model, initial, 210, fieldTop('surah') + 15)).toEqual({ act: 'field', list: 'surah' })
  const opened = { ...openPicker(model, initial, 'reciter'), query: '', scroll: 0 }
  expect(paneHit(model, opened, 210, overlayTop('reciter') + 60)).toEqual({ act: 'row', index: 0 })
  expect(paneHit(model, opened, 210, overlayTop('reciter') + 10)).toEqual({ act: 'panel' })
  expect(paneHit(model, opened, 210, overlayTop('reciter') + pickerOverlayHeight('reciter') + 6)).toEqual({ act: 'close' })
  expect(paneHit(model, initial, 210, CARD_TOP + CONTROLS_Y)).toEqual({ act: 'control', action: 'toggle' })
  expect(paneHit(model, opened, -2, 10)).toEqual({ act: 'close' })
  expect(paneHit(model, initial, NaN, 0)).toBe(null)
  expect(paneHit(model, initial, 315, 28)).toBe(null)
  expect(isPickMessage({ act: 'pick', list: 'surah', value: '18' })).toBe(true)
  expect(isPickMessage({ act: 'pick', list: 'reciter', value: '10:20' })).toBe(true)
  expect(isPickMessage({ act: 'pick', list: 'other', value: '18' })).toBe(false)
})
test('pane picture embeds both full Tajawal weights within engine limits and draws RTL fields/isolated numbers', () => {
  const svg = paneSvg(model, pickerInitial(model))
  for (const expected of ['font-family:Tajawal', 'font-weight:400', 'font-weight:700', 'data:font/woff2;base64,', 'border-radius:9px', 'dir="rtl"', '<bdi dir="ltr">١٨</bdi>', '▾', 'class="orn"', 'السورة</div>']) expect(svg).toContain(expected)
  expect(svg).toContain('aria-label="المصحف"')
  expect(svg).not.toContain('role="tab"')
  expect(svg.match(/@font-face/g)).toHaveLength(2)
  expect(svg.length).toBeLessThan(131072)
  expect(JSON.stringify({ type: 'Svg', props: { source: svg, width: 420, height: PANE_HEIGHT } }).length).toBeLessThan(100000)
  const open = paneSvg(model, openPicker(model, pickerInitial(model), 'surah'))
  expect(open.match(/role="option"/g)).toHaveLength(8)
  expect(open).toContain('Use ↑ ↓ for scrolling')
  expect(open).toContain('ابحث عن سورة أو رقمها')
})
test('avatar plus fonts and either open catalog stay below the Client payload limit at all supported widths', () => {
  const reciters = Array.from({ length: 160 }, (_, i) => ({ ...fixtureCatalog.reciters[0]!, key: `${100 + i}:20`, label: 'اختيار تجريبي '.repeat(10) + i }))
  for (const width of [240, 420, 672, 1200]) {
    const picture = { ...model, width, reciters }
    for (const list of ['reciter', 'surah'] as const) {
      const svg = paneSvg(picture, openPicker(picture, pickerInitial(picture), list))
      expect(JSON.stringify({ type: 'Box', props: {}, children: [{ type: 'Svg', props: { source: svg, width, height: PANE_HEIGHT } }] }).length).toBeLessThan(100000)
      expect(svg).toContain('<span>القرآن الكريم</span>')
      expect(svg).toContain('class="avatar"')
    }
  }
})
test('pane note names the surah without reader-duration text; root is transparent without rounded edges and command is LTR', () => {
  const segments = timedSegments(Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 })), 2, AUDIO_LIMIT_BYTES * 2)
  const quarter = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 2, null, 0, 420, 1, 0, true, null, { segments, selectedSegment: 0, durationMs: 286000, loading: null })
  const svg = paneSvg(quarter, pickerInitial(quarter))
  expect(svg).toContain('المقطع <bdi dir="ltr">١</bdi> من <bdi dir="ltr">٢٠</bdi> داخل سورة البقرة')
  expect(svg).not.toContain('مدة المقطع حسب القارئ')
  expect(svg).not.toContain('داخل هذه السورة')
  expect(svg).toContain('<bdi dir="ltr">/quran</bdi>')
  expect(svg).not.toContain('>quran/</')
  const root = svg.match(/\.pane\{(position[^}]+)\}/)![1]!
  expect(root).toContain('background:transparent;border:0;overflow:hidden')
  expect(root).not.toContain('border-radius')
  expect(root).not.toContain('border-left')
  expect(root).not.toContain('border-right')
  expect(svg).not.toContain('quran-pane-clip')
  expect(svg).toContain('<foreignObject width="100%" height="100%"><div')
  expect(svg).not.toContain(`<rect width="${quarter.width}" height="${PANE_HEIGHT + SEGMENT_EXTRA}"`)
  for (const width of [240, 420, 672]) {
    const resized = { ...quarter, width }
    const repeat = controls(width - 40).find(b => b.action === 'repeat')!
    expect(paneHit(resized, pickerInitial(resized), repeat.x + 20, repeat.y + CARD_TOP + SEGMENT_EXTRA)).toEqual({ act: 'control', action: 'repeat' })
    const quarterButton = controls(width - 40).find(b => b.action === 'repeat-segment')!
    expect(paneHit(resized, pickerInitial(resized), quarterButton.x + 20, quarterButton.y + CARD_TOP + SEGMENT_EXTRA)).toEqual({ act: 'control', action: 'repeat-segment' })
    const open = openPicker(resized, pickerInitial(resized), 'segment')
    expect(paneHit(resized, open, repeat.x + 20, repeat.y + CARD_TOP + SEGMENT_EXTRA)?.act).not.toBe('control')
  }
})

test('pane colors are CSS variables with a light palette under prefers-color-scheme and an optional forced theme class', () => {
  const svg = paneSvg(model, pickerInitial(model))
  expect(svg).toContain('@media (prefers-color-scheme: light){.pane{--q-bg:transparent;--q-text:#302f2a;--q-title:#302f2a')
  expect(svg).toContain('--q-field-bg:#f9f7f2')
  expect(svg).toContain('--q-field-bg:#252321')
  expect(svg).toContain('--q-accent:#d97757')
  expect(svg).toContain('--q-shadow:0 10px 30px rgba(48,47,42,.14)')
  expect(svg).not.toMatch(/(^|[;{\s])color-scheme\s*:/)
  const outside = svg.replace(paletteCss('.pane'), '').replace(paletteCss('.quran'), '').replace(/<svg[^>]*kbx-root[\s\S]*?<\/svg>/, '').replace(/base64,[A-Za-z0-9+/=]+/g, '')
  expect(outside).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
  expect(svg).toContain('class="pane" dir="rtl"')
  const dropdown = paneSvg(model, { ...pickerInitial(model), open: 'surah' }).replace(paletteCss('.pane'), '').replace(paletteCss('.quran'), '').replace(/<svg[^>]*kbx-root[\s\S]*?<\/svg>/, '').replace(/base64,[A-Za-z0-9+/=]+/g, '')
  expect(dropdown).toContain('class="dropdown"')
  expect(dropdown).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
  const forced = paneSvg(paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 0, 420, 4, 0, true, null, undefined, 'off', 'light'), pickerInitial(model))
  expect(forced).toContain('class="pane theme-light"')
  expect(forced).toContain('class="quran theme-light"')
  expect(paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 0, 420, 4, 0, true, null).theme).toBeUndefined()
})

test('pane and SVG wrapper stay transparent while every dropdown and search use opaque palette backgrounds', () => {
  for (const theme of [undefined, 'light', 'dark'] as const) for (const list of ['reciter', 'surah', 'segment'] as const) {
    const picture = { ...model, theme }
    const svg = paneSvg(picture, openPicker(picture, pickerInitial(picture), list))
    const root = svg.match(/\.pane\{(position[^}]+)\}/)![1]!
    expect(root).toContain('background:transparent;')
    expect(root).not.toContain('border-radius')
    expect(svg).not.toContain('quran-pane-clip')
    expect(svg.slice(0, svg.indexOf('<foreignObject'))).not.toContain('<rect')
    const dropdown = svg.match(/\.dropdown\{([^}]+)\}/)![1]!
    const search = svg.match(/\.search\{([^}]+)\}/)![1]!
    expect(dropdown).toContain('background:var(--q-dropdown-bg);')
    expect(search).toContain('background:var(--q-search-bg);')
    expect(dropdown + search).not.toContain('var(--q-bg)')
    expect(svg.match(/\.field\{([^}]+)\}/)![1]!).toContain('background:var(--q-field-bg);')
  }
})

test('pane widths stay finite and in range when a closing or expanded pane reports 0, undefined or NaN', () => {
  for (const bad of [0, -5, NaN, Infinity, undefined, null, '80']) {
    expect(columnsWidth(bad)).toBe(480)
    expect(safeWidth(bad)).toBe(480)
    const bounded = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 0, columnsWidth(bad), 1, 0, false, null)
    expect(Number.isFinite(bounded.width) && bounded.width >= 240 && bounded.width <= 1200).toBe(true)
    expect(paneSvg(bounded, pickerInitial(bounded), null)).not.toMatch(/NaN|width="0"|undefined/)
  }
  expect(paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 0, NaN, 1, 0, false, null).width).toBe(240)
  expect(columnsWidth(5000)).toBe(1200)
  expect(columnsWidth(10)).toBe(240)
})

test('supported recording hides unavailable options from every search and leaves reciters unchanged', () => {
  const limited = paneModel(fixtureCatalog, { ...fixtureCatalog.reciters[0]!, key: '102:102' }, 1, null, 0, 420, 0, 0, true, null)
  expect(options(limited, 'surah', '')).toHaveLength(109)
  for (const query of ['2', '٢', 'البقرة', 'بقر', '3', 'آل عمران', '7']) expect(options(limited, 'surah', query)).toEqual([])
  expect(options(limited, 'surah', '6')[0]?.value).toBe('6')
  expect(options(limited, 'reciter', '').map(o => o.value)).toEqual(options(model, 'reciter', '').map(o => o.value))
  expect(limited.next).toBe('التالي تلقائي: Fixture 6')
  const restored = paneModel(fixtureCatalog, { ...fixtureCatalog.reciters[0]!, key: '102:102' }, 2, null, 0, 420, 0, 0, true, null)
  expect(restored.selectedSurah).toBe(6)
})
test('one dim inactive unavailable note sits outside option navigation and scrolling in both palettes', () => {
  for (const theme of ['light', 'dark'] as const) {
    const limited = paneModel(fixtureCatalog, { ...fixtureCatalog.reciters[0]!, key: '102:102' }, 1, null, 0, 420, 0, 0, true, null, undefined, 'off', theme)
    const picker = openPicker(limited, pickerInitial(limited), 'surah')
    const svg = paneSvg(limited, picker)
    expect(svg.match(/class="unavailable-note"/g)).toHaveLength(1)
    expect(svg).toContain('<bdi dir="ltr">٥</bdi> سور غير متاحة لهذا القارئ')
    expect(svg).toContain('color:var(--q-dim);font-size:12px;pointer-events:none')
    const note = svg.match(/<div class="unavailable-note"[^>]*>.*?<\/div>/)?.[0] ?? ''
    expect(note).not.toContain('role=')
    expect(note).not.toContain('tabindex')
    expect(note).not.toContain('option')
    expect(svg.match(/role="option"/g)).toHaveLength(8)
    expect(svg).toContain('aria-valuemax="101"')
    const last = moveHighlight(picker, options(limited, 'surah', '').length, 1000)
    expect(last.highlight).toBe(108)
    expect(last.scroll).toBe(101)
    expect(paneHit(limited, picker, 210, overlayTop('surah') + 56 + 8 * 34 + 15)).toEqual({ act: 'panel' })
    const searched = { ...picker, query: 'البقرة', highlight: 0, scroll: 0 }
    expect(paneSvg(limited, searched)).toContain('class="unavailable-note"')
    expect(paneHit(limited, searched, 210, overlayTop('surah') + 60)).toEqual({ act: 'panel' })
    expect(paneHit(limited, last, 25, overlayTop('surah') + 56 + 8 * 34 + 15)).toEqual({ act: 'panel' })
    expect(paneHit(limited, last, 25, overlayTop('surah') + 56 + 8 * 34)).toEqual({ act: 'panel' })
    expect(paneSvg(limited, openPicker(limited, pickerInitial(limited), 'reciter'))).not.toContain('class="unavailable-note"')
  }
  const complete = paneModel(fixtureCatalog, { ...fixtureCatalog.reciters[0]!, key: '112:112' }, 1, null, 0, 420, 0, 0, true, null)
  expect(paneSvg(complete, openPicker(complete, pickerInitial(complete), 'surah'))).not.toContain('class="unavailable-note"')
  expect(paneSvg(model, openPicker(model, pickerInitial(model), 'surah'))).not.toContain('class="unavailable-note"')
})

test('selected design geometry: 46px fields every 90px, rosette rule under the heading, repeat right of next in the control row', () => {
  expect(FIELD_HEIGHT).toBe(46)
  expect(fieldTop('surah') - fieldTop('reciter')).toBe(90)
  expect(overlayTop('surah') - fieldTop('surah')).toBe(FIELD_HEIGHT + 8)
  const svg = paneSvg(model, pickerInitial(model))
  expect(svg.match(/class="orn"/g)).toHaveLength(2)
  expect(svg).toContain('style="top:65px;left:20px;right:20px"')
  expect(svg).toContain('role="combobox"')
  expect(svg).toContain(`height:${FIELD_HEIGHT}px`)
  const row = controls(380)
  const at = (action: string) => row.find(b => b.action === action)!.x
  expect(at('repeat-segment')).toBeLessThan(at('prev'))
  expect(at('prev')).toBeLessThan(at('toggle'))
  expect(at('toggle')).toBeLessThan(at('next'))
  expect(at('next')).toBeLessThan(at('repeat'))
  expect(PANE_HEIGHT).toBe(CARD_TOP + 446 + 12)
})
test('every control is hit-testable in the pane at supported widths, with the repeat button toggled by aria-pressed', () => {
  for (const width of [240, 420, 672, 1200]) {
    const picture = { ...model, width }
    // The quarter repeat is dead on a whole surah; every other control answers.
    for (const b of controls(width - 40)) expect(paneHit(picture, pickerInitial(picture), b.x + 20, b.y + CARD_TOP)).toEqual(b.action === 'repeat-segment' ? null : { act: 'control', action: b.action })
  }
  const quarters = timedSegments(Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 })), 2, AUDIO_LIMIT_BYTES * 2)
  for (const width of [240, 420, 672]) {
    const split = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 2, null, 0, width, 1, 0, true, null, { segments: quarters, selectedSegment: 0, durationMs: 286000, loading: null }, 'segment')
    for (const b of controls(width - 40)) expect(paneHit(split, pickerInitial(split), b.x + 20, b.y + CARD_TOP + SEGMENT_EXTRA)).toEqual({ act: 'control', action: b.action })
  }
  const on = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 0, 420, 4, 0, true, null, undefined, 'surah')
  expect(paneSvg(on, pickerInitial(on))).toContain('aria-label="تكرار السورة" aria-disabled="false" aria-pressed="true"')
  expect(paneSvg(model, pickerInitial(model))).toContain('aria-label="تكرار السورة" aria-disabled="false" aria-pressed="false"')
})

test('the /quran label is always rendered and never overlaps the heading at any supported width', () => {
  for (const width of [240, 260, 300, 301, 340, 370, 371, 420, 672, 1200]) {
    const picture = { ...model, width }
    const svg = paneSvg(picture, pickerInitial(picture))
    expect(svg).toContain('<div class="command" dir="ltr"><bdi dir="ltr">/quran</bdi></div>')
    expect(svg).not.toMatch(/\.command[^}]*display:none/)
    expect(svg).not.toContain('display:none')
    expect(svg).toContain('<span>القرآن الكريم</span>')
    const layout = headingLayout(width)
    // The label occupies [labelLeft, labelRight] from the left edge; the title is capped to end GAP before it, from the right edge.
    expect(layout.labelRight + HEADING_GAP + layout.titleMaxWidth + HEADING_EDGE).toBe(width)
    expect(layout.titleMaxWidth).toBeGreaterThan(0)
    expect(svg).toContain(`max-width:${layout.titleMaxWidth}px`)
    expect(svg).toContain(`.command{position:absolute;left:${layout.labelLeft}px`)
  }
  expect([240, 300, 340, 420].map(w => headingLayout(w).titleSize)).toEqual([18, 18, 20, 23])
  expect(headingLayout(240).titleMaxWidth).toBeGreaterThanOrEqual(22 + 9 + 6 * 18)
})
test('a whole-cell pointer (no fine position) hits a field whose bottom edge it overlaps, and never a neighbour', () => {
  // Desktop reports cells only: the pointer is snapped to the cell center, 8.4px wide and about 19px tall at 751px / 40 rows.
  const rows = 40, columns = Math.round(420 / 8.4)
  const slack = pointerSlack(420, columns, rows, PANE_HEIGHT, true)
  expect(slack.y).toBeGreaterThan(9)
  const initial = pickerInitial(model)
  for (const list of ['reciter', 'surah'] as const) {
    const bottom = fieldTop(list) + FIELD_HEIGHT
    // Cell centers just below the field's bottom edge, and above its top edge, belong to cells that overlap it.
    expect(paneHit(model, initial, 210, bottom + 5)).toBe(null)
    expect(paneHit(model, initial, 210, bottom + 5, slack)).toEqual({ act: 'field', list })
    expect(paneHit(model, initial, 210, fieldTop(list) - 5, slack)).toEqual({ act: 'field', list })
    // Sideways: a cell centered just outside the field edges still overlaps it.
    expect(paneHit(model, initial, 20 - 3, bottom - 10, slack)).toEqual({ act: 'field', list })
    expect(paneHit(model, initial, 420 - 20 + 3, bottom - 10, slack)).toEqual({ act: 'field', list })
    // Beyond the half cell the cell no longer touches it: labels, gaps and the next field stay unclaimed.
    expect(paneHit(model, initial, 210, bottom + slack.y + 1, slack)).toBe(null)
    expect(paneHit(model, initial, 210, fieldTop(list) - slack.y - 1, slack)).toBe(null)
    expect(paneHit(model, initial, 20 - slack.x - 1, bottom - 10, slack)).toBe(null)
  }
  // Midway in the 44px gap between two fields hits neither, with or without slack.
  expect(paneHit(model, initial, 210, fieldTop('reciter') + FIELD_HEIGHT + 22, slack)).toBe(null)
  // Without slack (exact pointer) the edges are unchanged.
  expect(paneHit(model, initial, 210, fieldTop('surah') + FIELD_HEIGHT)).toEqual({ act: 'field', list: 'surah' })
  expect(paneHit(model, initial, 210, fieldTop('surah') + FIELD_HEIGHT + 0.5)).toBe(null)
})
test('slack does not let a field steal the open overlay, controls keep the nearest circle and the segment note stays inert', () => {
  const slack = pointerSlack(420, 50, 40, PANE_HEIGHT, true)
  const opened = { ...openPicker(model, pickerInitial(model), 'reciter'), query: '', scroll: 0 }
  // Surah field sits under the open reciter overlay: its pixels belong to the overlay.
  expect(paneHit(model, opened, 210, fieldTop('surah') + 20, slack)?.act).toBe('row')
  // Controls: a cell centered just past the play circle's edge overlaps it; one a full half cell further does not.
  const play = controls(420 - 40).find(b => b.action === 'toggle')!
  const edge = CARD_TOP + play.y + play.radius
  expect(paneHit(model, pickerInitial(model), 210, edge + 5)).toBe(null)
  expect(paneHit(model, pickerInitial(model), 210, edge + 5, slack)).toEqual({ act: 'control', action: 'toggle' })
  expect(paneHit(model, pickerInitial(model), 210, edge + slack.y + 1, slack)).toBe(null)
  // Neighbouring circles stay distinct: the nearest to the cell center wins.
  const next = controls(420 - 40).find(b => b.action === 'next')!
  expect(paneHit(model, pickerInitial(model), 20 + next.x, CARD_TOP + next.y, slack)).toEqual({ act: 'control', action: 'next' })
  expect(paneHit(model, pickerInitial(model), 20 + play.x, CARD_TOP + play.y, slack)).toEqual({ act: 'control', action: 'toggle' })
  // The segment field is hit by its bottom-edge cell; the note beneath it is not, beyond the half cell.
  const segments = timedSegments(Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 })), 2, AUDIO_LIMIT_BYTES * 2)
  const segmented = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 2, null, 0, 420, 1, 0, true, null, { segments, selectedSegment: 0, durationMs: 286000, loading: null })
  const bottom = fieldTop('segment') + FIELD_HEIGHT
  expect(paneHit(segmented, pickerInitial(segmented), 210, bottom + 5, slack)).toEqual({ act: 'field', list: 'segment' })
  expect(paneHit(segmented, pickerInitial(segmented), 210, bottom + slack.y + 1, slack)).toBe(null)
  // No slack when the host gave exact (fine) positions, or sizes are nonsense.
  expect(pointerSlack(420, 50, 40, PANE_HEIGHT, false)).toEqual({ x: 0, y: 0 })
  expect(pointerSlack(420, 0, 40, PANE_HEIGHT, true)).toEqual({ x: 0, y: 0 })
})
