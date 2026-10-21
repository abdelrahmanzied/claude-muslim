import { terminalArabic } from '../../src/shared/arabic/terminal.ts'
import { listFor, emptyReading, overall } from '../../src/features/athkar/logic.ts'
import { expect, test } from 'claude-code/testing'
import { enabledOf, PANE_HEIGHT, cardRects, settingsBoxes, hitAt, Q_BASE_H, Q_BROWSER_DY, Q_BROWSER_H, Q_ERROR_EXTRA, Q_NOTE_EXTRA, Q_NOTE_H, Q_RETRY_H, Q_RETRY_TOP, quranNoteTop, quranOffset } from '../../src/features/muslim-pane/layout.ts'
import { paneModel, quranLayout, textLines } from '../../src/features/muslim-pane/model.ts'
import { CLOSED_SETTINGS, CATEGORIES, DEFAULT_SETTINGS, SETTINGS_BODY_TOP, QURAN_SETTINGS_NOTE, QURAN_SETTINGS_NOTE_H, settingsBody } from '../../src/features/muslim-pane/settings.ts'
import { paneAlt, paneSvg, paletteCss } from '../../src/features/muslim-pane/view.ts'
import { FEATURE_ICONS } from '../../src/shared/icon/index.ts'

const NOW = 1_700_000_000_000
const feeds = {
  salah: {
    city: 'Munich',
    prays: [
      { pray: 'fajr' as const, at: NOW - 600_000, clock: '05:48' },
      { pray: 'dhuhr' as const, at: NOW - 100_000, clock: '12:58' },
      { pray: 'asr' as const, at: NOW + 4_320_000, clock: '15:42' },
      { pray: 'maghrib' as const, at: NOW + 14_400_000, clock: '18:21' },
      { pray: 'isha' as const, at: NOW + 20_000_000, clock: '19:52' },
    ],
    next: { pray: 'asr' as const, at: NOW + 4_320_000, clock: '15:42' },
    isAthan: true,
  },
  quran: { error: '', reciter: 'محمد صديق المنشاوي', surah: 'سورة البقرة', part: 'الربع ٥ - الآيات ١٥–٢٤ (١ من ٢)', segmented: true, status: 'يتلى الآن', isLive: true, elapsed: '12:03', total: '41:20', progress: 0.29, isPlaying: true, canPrev: true, canNext: true, repeat: 'off' as const, avatar: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="90" viewBox="0 0 96 90"></svg>', audioNote: '' },
  athkar: { set: 'evening' as const, canUndo: false, title: 'أَذْكَارُ الْمَسَاءِ', done: 4, total: 12, progress: 0.33, isDone: false },
}

test('playing settings show the muted note on every tab and detail face, shifting body targets by its height', () => {
  const enabled = { athan: false, quran: true, canPrev: true, canNext: true, athkar: true }
  for (const width of [240, 420]) for (const [category] of CATEGORIES) {
    const faces = category === 'prayer' ? ['main', 'methods', 'adjust', 'city'] as const : ['main'] as const
    for (const face of faces) {
      const settings = { ...DEFAULT_SETTINGS, state: { open: true, category, face, page: 0 } }
      const stopped = paneModel({ ...feeds, quran: { ...feeds.quran, isPlaying: false } }, NOW, width, 'orange', undefined, undefined, settings)
      const playing = paneModel(feeds, NOW, width, 'orange', undefined, undefined, settings)
      const off = quranLayout(stopped), on = quranLayout(playing)
      const normal = cardRects(stopped.folds, settings.state, settings.options, off)
      const active = cardRects(playing.folds, settings.state, settings.options, on)
      expect(active.settingsH - normal.settingsH).toBe(QURAN_SETTINGS_NOTE_H)
      expect(active.height - normal.height).toBe(QURAN_SETTINGS_NOTE_H)
      const first = settingsBody(width, settings).targets[0]!
      const target = (q: typeof on) => settingsBoxes(width, playing.folds, settings, q).find(b => b.act === first.act)!
      const a = target(off), b = target(on)
      expect(b.y0 - a.y0).toBe(QURAN_SETTINGS_NOTE_H)
      expect(b.y1 - a.y1).toBe(QURAN_SETTINGS_NOTE_H)
      expect(hitAt(width, (b.x0+b.x1)/2, (b.y0+b.y1)/2, enabled, 0, 0, playing.folds, settings, on)).toBe(first.act)
      expect(paneSvg(playing)).toContain(`<span class="setting-hint chrome-hint" style="top:${SETTINGS_BODY_TOP}px">${QURAN_SETTINGS_NOTE}</span>`)
      expect(paneSvg(playing)).toContain(`class="settings-body" style="top:${SETTINGS_BODY_TOP + QURAN_SETTINGS_NOTE_H}px"`)
      expect(paneSvg(stopped)).not.toContain(QURAN_SETTINGS_NOTE)
      expect(paneSvg(stopped)).toContain(`class="settings-body" style="top:${SETTINGS_BODY_TOP}px"`)
      // The tabs do not move with the body.
      expect(settingsBoxes(width, playing.folds, settings, on)[0]).toEqual(settingsBoxes(width, stopped.folds, settings, off)[0])
    }
  }
})

test('folded settings keep their original height during playback and terminal text routes the note through show', () => {
  const playing = paneModel(feeds, NOW, 420, 'orange')
  const stopped = paneModel({ ...feeds, quran: { ...feeds.quran, isPlaying: false } }, NOW, 420, 'orange')
  expect(paneSvg(playing)).not.toContain(QURAN_SETTINGS_NOTE)
  expect(cardRects(playing.folds, playing.settings.state, playing.settings.options, quranLayout(playing)).settingsH).toBe(56)
  const lines = textLines(playing, s => `SHOWN(${s})`)
  expect(lines[lines.indexOf('**SHOWN(الإعدادات)**') + 1]).toBe(`SHOWN(${QURAN_SETTINGS_NOTE})`)
  expect(textLines(stopped, s => s).join('\n')).not.toContain(QURAN_SETTINGS_NOTE)
  expect(textLines(paneModel({ ...feeds, quran: null }, NOW, 420, 'orange'), s => s).join('\n')).not.toContain(QURAN_SETTINGS_NOTE)
})

test('the picture draws the three cards at the fixed pane height', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 360, 'orange'))
  expect(svg).toContain(`height="${PANE_HEIGHT + 16}"`)
  expect(svg).toContain('الصلاة القادمة')
  expect(svg).toContain('العصر')
  expect(svg).toContain('<div class="nx-in ar" dir="rtl">بعد ١ س ١٢ د</div>')
  expect(svg).toContain('Munich')
  expect(svg).not.toContain('افتح المصحف')
  expect(svg).toContain('أَذْكَارُ الْمَسَاءِ')
  expect(svg.match(/class="pr done"/g)?.length).toBe(2)
  expect(svg.match(/class="pr next"/g)?.length).toBe(1)
  expect(svg).toContain('role="switch" aria-checked="true"')
})

for (const folded of [false, true]) {
  test(`the prayer city is only on the bottom line when ${folded ? 'folded' : 'open'}`, () => {
    const model = paneModel(feeds, NOW, 360, 'orange')
    model.folds = { ...model.folds, prayer: folded }
    const svg = paneSvg(model)
    const header = svg.match(/<div class="in dh"[^>]*>.*?<\/div>/)![0]
    expect(header).not.toContain('Munich')
    expect(header).toContain('<span class="dv"></span>')
    expect(header).toContain('<span class="fold">')
    expect(header).toContain(`aria-expanded="${!folded}"`)
    if (folded) {
      expect(svg).not.toContain('Munich')
      expect(svg).not.toContain('class="prayer-city"')
    } else {
      expect(svg).toContain('<div class="prayer-city">مواقيت <bdi>Munich</bdi></div>')
      expect(svg.indexOf('class="prayer-city"')).toBeGreaterThan(svg.indexOf('class="in athan'))
      expect(svg).toMatch(/\.prayer-city\{[^}]*text-align:center;font-size:12px;color:var\(--muted\);line-height:1/)
    }
  })
}

for (const [city, escaped] of [
  ['Munich, Germany', 'Munich, Germany'],
  ['القاهرة، مصر', 'القاهرة، مصر'],
  ['  <Munich> & "Germany"  ', '  &lt;Munich&gt; &amp; &quot;Germany&quot;  '],
]) {
  test(`the bottom line isolates and escapes the stored city: ${city}`, () => {
    const svg = paneSvg(paneModel({ ...feeds, salah: { ...feeds.salah, city: city! } }, NOW, 360, 'orange'))
    expect(svg).toContain(`<div class="prayer-city">مواقيت <bdi>${escaped}</bdi></div>`)
  })
}

test('a playing player shows Stop and a stopped one Play', () => {
  expect(paneSvg(paneModel(feeds, NOW, 360, 'orange'))).toContain('aria-label="Stop"')
  expect(paneSvg(paneModel({ ...feeds, quran: { ...feeds.quran, isPlaying: false } }, NOW, 360, 'orange'))).toContain('aria-label="Play"')
})

test('features that are not connected leave quiet notes, never a broken picture', () => {
  const svg = paneSvg(paneModel({ salah: null, quran: null, athkar: null }, NOW, 360, 'orange'))
  expect(svg).toContain('Choose a city first: /salah city')
  expect(svg).not.toContain('class="prayer-city"')
  expect(svg).not.toContain('مواقيت')
  expect(svg).toContain(`height="${PANE_HEIGHT}"`)
  expect(svg).toContain('--:--')
  expect(svg).toContain('Not ready: /athkar')
})

test('the main color comes from the shared palette, in both themes', () => {
  expect(paletteCss('.dp', 'orange')).toContain('--accent:#d97757')
  expect(paletteCss('.dp', 'orange')).toContain('--accent:#c8642d')
  expect(paletteCss('.dp', 'green')).toContain('--accent:#1a9466')
  expect(paneSvg(paneModel(feeds, NOW, 360, 'blue', 'light'))).toContain('class="dp theme-light"')
  expect(paneSvg(paneModel(feeds, NOW, 360, 'blue'))).toContain('class="dp"')
})

test('hover lights the hovered target only, and text is escaped', () => {
  const hovered = paneSvg(paneModel(feeds, NOW, 360, 'orange'), 'quran-pick-reciter')
  expect(hovered).toContain('hot')
  const bad = paneSvg(paneModel({ ...feeds, salah: { ...feeds.salah, city: '<b>&' } }, NOW, 360, 'orange'))
  expect(bad).toContain('&lt;b&gt;&amp;')
  expect(paneAlt(paneModel(feeds, NOW, 360, 'orange'))).toContain('سورة البقرة')
})

test('the pane is transparent and uses the shared Tajawal face', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 360, 'orange'))
  expect(svg).toContain('font-family:Tajawal')
  expect(svg).toContain('data:font/woff2;base64,')
  expect(svg).not.toContain('--panel')
  expect(svg).toMatch(/\.dp\{[^}]*background:transparent/)
  expect(svg).toMatch(/\.dcard\{[^}]*background:transparent/)
})

test('the header avatar gets a light-only drop shadow that .theme-dark cancels', () => {
  const css = paletteCss('.dp', 'orange'), shadow = 'filter:drop-shadow(0 1px 1.5px rgba(31,30,29,.35))'
  expect(css).toContain(`@media (prefers-color-scheme: light){.dp{`)
  expect(css).toContain(`.dp .pane-top svg{${shadow}}`)
  expect(css).toContain(`.dp.theme-light .pane-top svg{${shadow}}`)
  expect(css).toContain('.dp.theme-dark .pane-top svg{filter:none}')
  expect(css.slice(0, css.indexOf('@media'))).not.toContain('drop-shadow')
})

test('light and dark use their own consistent token sets and every element reads tokens', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 360, 'orange'))
  const css = paletteCss('.dp', 'orange')
  const dark = css.slice(0, css.indexOf('@media'))
  const light = css.slice(css.indexOf('@media'), css.indexOf('.dp.theme-light'))
  // Boundaries and interaction overlays use the mode's text RGB, with alpha.
  for (const token of ['--text:#eeede8', '--text-2:#c6c3bb', '--muted:#a6a299', '--dim:#969289', '--line:rgba(238,237,232,.13)', '--line-soft:rgba(238,237,232,.07)', '--hover:rgba(238,237,232,.04)', '--active:rgba(238,237,232,.07)']) expect(dark).toContain(token)
  for (const token of ['--text:#292824', '--text-2:#514e47', '--muted:#736f66', '--dim:#817c72', '--line:rgba(41,40,36,.14)', '--line-soft:rgba(41,40,36,.07)', '--hover:rgba(41,40,36,.04)', '--active:rgba(41,40,36,.07)']) expect(light).toContain(token)
  expect(svg).toContain('.dp.theme-light{--line:rgba(41,40,36,.14)')
  expect(svg).toContain('.dp.theme-dark{--line:rgba(238,237,232,.13)')
  // No pane theme is forced when none is given: the app's color scheme decides, as in the Quran pane.
  expect(svg).toContain('class="dp"')
  // Elements take colors only from tokens: titles (.dh, text), big time (.nx-t), rows (.drow), borders, buttons (.dbtn).
  const rules = svg.slice(svg.indexOf('*{box-sizing'), svg.indexOf('</style>'))
  expect(rules).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  expect(rules).not.toMatch(/rgba?\(|color-mix\(/)
  expect(rules).toMatch(/\.dp\{[^}]*color:var\(--text\)/)
  expect(rules).toMatch(/\.dcard\{[^}]*inset 0 0 0 1px var\(--line\)/)
  expect(rules).toMatch(/\.dcard\{[^}]*border-radius:12px;/)
  expect(rules).toMatch(/\.pr\{[^}]*border-radius:8px\}/)
  expect(rules).toMatch(/\.dbtn\{[^}]*background:transparent;box-shadow:inset 0 0 0 1px var\(--line\);color:var\(--text\);border-radius:10px/)
  expect(rules).toMatch(/\.pbar\{[^}]*background:var\(--line\)/)
})

for (const theme of ['light', 'dark'] as const) {
  for (const width of [240, 360]) {
    test(`${theme} at ${width}px uses transparent buttons, tabs and copy chip with neutral selection`, () => {
      const model = paneModel(feeds, NOW, width, 'orange', theme)
      model.settings = { ...model.settings, state: { ...CLOSED_SETTINGS, open: true } }
      const svg = paneSvg(model, 'settings:terminal')
      expect(svg).not.toContain('--raised')
      expect(svg).not.toContain('--card')
      expect(svg).toContain('class="dbtn primary" role="button" aria-label="أكمل')
      expect(svg).toContain('.dbtn.hot{background:var(--hover);color:var(--text)}')
      expect(svg).toMatch(/\.sc\.pill,\.sc\.value,\.sc\.inline\{background:transparent;box-shadow:inset 0 0 0 1px var\(--line\)/)
      expect(svg).toContain('class="sc value command hot"')
      expect(svg).toContain('<span class="value-text">/muslim terminal-arabic</span>')
      expect(svg).toMatch(/\.settings-tabs\{[^}]*border:1px solid transparent;border-bottom-color:var\(--line\);[^}]*background:transparent;overflow:visible/)
      expect(svg).toMatch(/\.setting-tab\{[^}]*background:transparent;color:var\(--muted\)/)
      expect(svg).toContain('.setting-tab[aria-selected=true]{color:var(--text);font-weight:700}')
      expect(svg).toMatch(/\.setting-tab\[aria-selected=true\]::after\{[^}]*height:2px;[^}]*background:var\(--text\)/)
      expect(svg.match(/role="tab" aria-selected="true"/g)).toHaveLength(1)
      expect(svg).toContain('.pr.next{background:var(--hover);color:var(--accent)')
      expect(svg).toContain('.sc.pill.on{background:var(--active);color:var(--text)')
      expect(svg).toContain('.list-choice.on{color:var(--text);background:var(--active)')
      expect(svg).toContain('.sc.copied{color:var(--text)}')
    })
  }
}

for (const folded of [false, true]) {
  test(`feature icons remain in prayer, Quran headers and settings tabs; athkar uses the horizon mark (${folded})`, () => {
    const model = paneModel(feeds, NOW, 360, 'orange')
    model.folds = { prayer: folded, quran: folded, athkar: folded }
    model.settings = { ...model.settings, state: { ...CLOSED_SETTINGS, open: true } }
    const svg = paneSvg(model)
    const headers = svg.match(/<div class="in dh"[^>]*>.*?<\/div>/g)!
    expect(headers.find(h => h.includes('<span class="ar">القرآن الكريم</span>'))).toContain(FEATURE_ICONS.qpane)
    expect(headers.find(h => h.includes('<span class="ar">الصلاة</span>'))).toContain(FEATURE_ICONS.sujoodreal)
    const tab = svg.match(/role="tab"[^>]*aria-label="الأذكار">.*?<\/svg>/)![0]
    expect(tab).toContain(FEATURE_ICONS.horizon)
    expect(svg).not.toContain('M20 14.5A8.2')
  })
}

for (const theme of ['light', 'dark'] as const) {
  for (const width of [240, 360, 420]) test(`athkar picker ${theme} ${width}: title, full menu, reset, undo and done state`, () => {
    const model = paneModel(feeds, NOW, width, 'orange', theme)
    const closed = paneSvg(model)
    expect(closed).toContain('class="dcard compact"')
    expect(closed).toContain('class="picker-title" role="button" aria-expanded="false"')
    expect(closed).not.toContain('role="menuitemradio"')
    expect(closed).toContain('aria-label="إعادة بدء')
    expect(closed.includes('<span>إعادة</span>')).toBe(width > 380)
    expect(closed).toContain('أكمل</span>')
    model.athkarMenu = true
    const open = paneSvg(model, 'athkar-set:after-salah')
    expect(open).toContain('class="dcard picker-open"')
    expect(open).toContain('height:208px')
    expect(open).toContain('class="in krow" style="top:158px;gap:')
    expect(open.match(/role="menuitemradio"/g)).toHaveLength(3)
    expect(open.match(/role="menuitemradio" aria-checked="true"/g)).toHaveLength(1)
    expect(open).toContain('أذكار بعد الصلاة')
    expect(open).toContain('<span class="tick">✓</span>')
    expect(open).toContain('M7 12.8C9.5 8.5')
    expect(open).toContain('M20 14.5A8.2')
    expect(open).toContain('class="menu-row hot"')
    expect(open).not.toMatch(/[٠-٩]\s*·|·\s*[٠-٩]/)
    if (model.athkar.isAvailable) model.athkar = { ...model.athkar, isDone: true, canUndo: true }
    const done = paneSvg(model)
    expect(done).toContain('class="dbtn reset undo')
    expect(done.includes('<span>تراجع</span>')).toBe(width > 380)
    expect(done).not.toContain('أكمل</span>')
    expect(done).not.toContain('ابدأ</span>')
    expect(done).toContain('أتممتَ وردك ✓')
    expect(done).not.toContain('✓ أتممتُها')
  })
}

test('settings uses the approved gear and exact four tab labels',()=>{
  const model=paneModel(feeds,NOW,240,'orange')
  model.settings={...model.settings,state:{...CLOSED_SETTINGS,open:true,category:'thikr'}}
  const svg=paneSvg(model)
  const settings=svg.slice(svg.indexOf('<section class="dcard settings-card"'))
  const header=settings.slice(0,settings.indexOf('<div class="settings-tabs"'))
  expect(header).toContain('M10.3 3h3.4l.5 2.3')
  expect(header).not.toContain('M4 7h9M17 7h3')
  const tabs=settings.slice(settings.indexOf('<div class="settings-tabs"'),settings.indexOf('<div class="settings-body"'))
  expect(tabs.match(/role="tab"/g)).toHaveLength(4)
  let last=-1
  for(const [,label] of CATEGORIES){
    const pos=tabs.indexOf(`aria-label="${label}"`)
    expect(pos).toBeGreaterThan(last);last=pos
  }
  expect(tabs).toContain('aria-label="الذكر"')
  expect(tabs).toContain('<span>الذكر</span>')
  expect(settings).toContain('Spinner (سطر العمل)')
  expect(svg).toContain('.setting-tab .ic{width:20px;height:20px}')
  expect(svg).not.toContain('width:24px;height:24px')
  expect(svg).toContain('font-size:11px;line-height:14px')
  expect(svg).not.toContain('setting-category')
})

test('the heading shows the full avatar beside مسلم and /muslim at the left edge', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 240, 'orange'))
  expect(svg).toContain('<div class="pane-top"><svg width="55.5" height="52"')
  expect(svg).toContain('.pane-top{position:absolute;right:20px;top:0px;height:52px;display:flex;align-items:center;')
  expect(svg).toContain('.pane-command{position:absolute;left:20px;top:17px;line-height:18px;')
  expect(svg).toContain('image-rendering:pixelated')
  expect(svg).toContain('<span>مُسلِم</span>')
  expect(svg).toContain('<div class="pane-command" dir="ltr"><bdi dir="ltr">/muslim</bdi></div>')
  expect(svg).toContain('<svg width="55.5" height="52" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 30" shape-rendering="crispEdges">')
})

test('the heading avatar is the chosen look: one short dark beard, the closed smile, no open mouth', () => {
  const top = paneSvg(paneModel(feeds, NOW, 240, 'orange')).split('<div class="pane-top">')[1]?.split('</svg>')[0] ?? ''
  expect(top).toContain('fill="#4A342A"')
  expect(top).not.toContain('#7A5A4A')
  expect(top).not.toContain('#E8736A')
  expect(top).toContain('<path fill="#1F1E1D" d="M13 16h4v1h-4zM12 15h1v1h-1zM17 15h1v1h-1z"/>')
})

const sheet = (list: 'reciter' | 'surah' | 'segment', count = 20) => {
  const model = paneModel(feeds, NOW, 360, 'orange')
  const rows = Array.from({ length: Math.min(8, count) }, (_, i) => ({ value: String(i), label: list === 'segment' ? `الربع ${i + 1} - الآيات ١–٧` : `سورة ${i + 1}`, number: String(i + 1), selected: i === 1 }))
  model.picker = { list, query: '', highlight: 1, scroll: 0, count, rows, dragging: false }
  return model
}

test('the Quran card is the player: title, start-from, reciter, times, five controls and a 96 wide avatar', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 360, 'orange'))
  for (const text of ['يتلى الآن', 'سورة البقرة', 'ابدأ من', 'الربع <bdi dir="ltr">٥</bdi> - الآيات', 'محمد صديق المنشاوي', 'الوقت تقريبي', 'المقطع', 'السورة']) expect(svg).toContain(text)
  for (const label of ['aria-label="اختيار السورة"', 'aria-label="اختيار القارئ"', 'aria-label="Previous"', 'aria-label="Next"', 'aria-label="تكرار المقطع"', 'aria-label="تكرار السورة"']) expect(svg).toContain(label)
  expect(svg).toContain('width="96"')
  expect(svg).toContain('.a-avatar{width:96px;height:90px')
  expect(svg).not.toContain('افتح المصحف')
})

test('a whole recording hides the start-from line and disables segment repeat', () => {
  const whole = paneSvg(paneModel({ ...feeds, quran: { ...feeds.quran, segmented: false, part: '' } }, NOW, 360, 'orange'))
  expect(whole).not.toContain('ابدأ من')
  expect(whole).toMatch(/aria-pressed="false" aria-disabled="true" aria-label="تكرار المقطع"/)
  expect(whole).toContain(`height="${PANE_HEIGHT}"`)
})

test('no «·» ever stands beside Arabic digits in the card', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 360, 'orange'))
  expect(svg).not.toMatch(/[٠-٩]\s*·|·\s*[٠-٩]/)
})

test('an open picker draws the sheet with head, search, rows, footer count and the hint', () => {
  for (const [list, title, placeholder] of [['reciter', 'اختر القارئ', 'ابحث عن قارئ أو رقم'], ['surah', 'اختر السورة', 'ابحث عن سورة أو رقمها'], ['segment', 'ابدأ من', 'ابحث عن موضع أو آية']] as const) {
    const svg = paneSvg(sheet(list))
    expect(svg).toContain(title)
    expect(svg).toContain('رجوع')
    expect(svg).toContain(placeholder)
    expect(svg).toContain('Use ↑ ↓ for scrolling')
    expect(svg).toContain('٢ / ٢٠')
    expect(svg).toContain(`height="${PANE_HEIGHT + 504 - 300}"`)
  }
  expect(paneSvg(sheet('segment'))).not.toMatch(/[٠-٩]\s*·|·\s*[٠-٩]/)
})

test('a short list has no scrollbar and a long one has', () => {
  expect(paneSvg(sheet('reciter', 3))).not.toContain('class="sbar')
  expect(paneSvg(sheet('reciter', 30))).toContain('class="sbar')
})

test('the athkar card keeps the horizon mark for every set, folded or open; set icons stay in the menu', () => {
  const horizon = FEATURE_ICONS.horizon
  for (const set of ['morning', 'evening', 'after-salah'] as const) for (const folded of [false, true]) {
    const model = paneModel({ ...feeds, athkar: { set, canUndo: false, title: 'أذكار', done: 0, total: 3, progress: 0, isDone: false } }, NOW, 420, 'orange', undefined, { prayer: false, quran: false, athkar: folded })
    const html = paneSvg(model, null)
    expect(html.split(horizon).length - 1).toBeGreaterThanOrEqual(folded ? 1 : 2)
  }
})

test('the athkar open menu keeps the per-set icons, and the card header and row keep the horizon', () => {
  const model = paneModel(feeds, NOW, 360, 'orange')
  model.athkarMenu = true
  const html = paneSvg(model, null)
  const menu = html.match(/<div class="in menu".*?<\/div><\/div>/)![0]
  expect(menu).not.toContain(FEATURE_ICONS.horizon)
  expect(menu).toContain('M7 12.8C9.5 8.5')
  expect(menu).toContain('M20 14.5A8.2')
  expect(html.match(/<section class="dcard picker-open".*?<\/section>/)![0].split(FEATURE_ICONS.horizon).length - 1).toBe(2)
})

test('the Quran card says «القرآن الكريم» and the athkar card «الأذكار» when folded, open or not', () => {
  for (const folded of [false, true]) {
    const html = paneSvg(paneModel(feeds, NOW, 360, 'orange', undefined, { prayer: folded, quran: folded, athkar: folded }), null)
    expect(html).toContain('<span class="ar">القرآن الكريم</span>')
    expect(html.includes('<span class="ar">الأذكار</span>')).toBe(folded)
    expect(html.includes('<span class="title ar">أَذْكَارُ الْمَسَاءِ</span>')).toBe(!folded)
    expect(html).not.toContain('<span class="ar">القرآن</span>')
  }
})

test('the fold chevron closes every card header the same way, folded or open', () => {
  for (const folded of [false, true]) {
    const html = paneSvg(paneModel(feeds, NOW, 360, 'orange', undefined, { prayer: folded, quran: folded, athkar: folded }), null)
    expect(html.match(/<span class="fold[^"]*"[^>]*>(<svg[^>]*>[^]*?<\/svg>)<\/span><\/div>/g)).toHaveLength(4)
  }
})

test('the athkar row says ابدأ with no counts, أكمل with some, and only «إعادة» plus the done note when done', () => {
  const at = (done: number, isDone = false) => paneSvg(paneModel({ ...feeds, athkar: { ...feeds.athkar, done, progress: done / 12, isDone } }, NOW, 420, 'orange'), null)
  expect(at(0)).toContain('>ابدأ</span>')
  expect(at(0)).not.toContain('>أكمل</span>')
  expect(at(4)).toContain('>أكمل</span>')
  expect(at(4)).toContain('✓ أتممتُها')
  expect(at(12, true)).not.toContain('✓ أتممتُها')
  expect(at(12, true)).not.toContain('>أكمل</span>')
  expect(at(12, true)).toContain('أتممتَ وردك ✓')
  expect(at(12, true)).toContain('<span>إعادة</span>')
})


test('one repetition of a triple thikr offers أكمل before any item is complete', () => {
  const reading = emptyReading()
  const thikr = listFor('morning').find(t => t.times === 3)!
  reading.counts[thikr.id] = 1
  const progress = overall('morning', reading)
  expect(progress).toBeGreaterThan(0)
  const svg = paneSvg(paneModel({ ...feeds, athkar: { ...feeds.athkar, done: 0, progress } }, NOW, 420, 'orange'))
  expect(svg).toContain('>أكمل</span>')
  expect(svg).not.toContain('>ابدأ</span>')
})


test('shared enabled slots disable Open for completed athkar and allow finishing an unfinished set', () => {
  const done = paneModel({ ...feeds, athkar: { ...feeds.athkar, isDone: true } }, NOW, 420, 'orange')
  expect(enabledOf(done).athkarDone).toBe(true)
  expect(enabledOf(done).athkarFinish).toBe(false)
  expect(enabledOf(paneModel(feeds, NOW, 420, 'orange')).athkarFinish).toBe(true)
  expect(enabledOf(paneModel({ salah: null, quran: null, athkar: null }, NOW, 420, 'orange')).athkarDone).toBe(false)
})
test('terminal next-prayer summary shapes its Arabic countdown through show', () => {
  const m = paneModel(feeds, NOW, 420, 'orange')
  const line = textLines(m, s => `shaped(${s})`).find(s => s.startsWith('Next:'))!
  expect(line).toContain(`· shaped(${m.prayer.until})`)
})

for (const surface of ['terminal', 'desktop'] as const) test(`${surface}: next-prayer text preserves the surface countdown`, () => {
  const m = paneModel(feeds, NOW, 420, 'orange')
  const line = textLines(m, s => terminalArabic(surface, 'reversed', s)).find(s => s.startsWith('Next:'))!
  expect(line).toContain(`· ${terminalArabic(surface, 'reversed', m.prayer.until)}`)
  if (surface === 'terminal') expect(line).not.toContain(m.prayer.until)
})

test('an OS without audio adds the note and «استمع في المتصفح ↗» under the controls, or under Retry, with hit tests matching', () => {
  const on = { athan: true, quran: true, canPrev: true, canNext: true, athkar: true, segmented: true }
  const note = 'الصوت غير مدعوم على Windows بعد'
  for (const width of [240, 360]) for (const error of ['', 'تعذّر سماع سورة البقرة، لم يبدأ الصوت. أعد المحاولة.']) {
    const plain = paneModel({ ...feeds, quran: { ...feeds.quran, error } }, NOW, width, 'orange')
    const model = paneModel({ ...feeds, quran: { ...feeds.quran, error, audioNote: note } }, NOW, width, 'orange')
    const q = quranLayout(model), r = cardRects(model.folds, model.settings.state, model.settings.options, q)
    expect(r.quranH - cardRects(plain.folds, plain.settings.state, plain.settings.options, quranLayout(plain)).quranH).toBe(Q_NOTE_EXTRA)
    const top = quranNoteTop(q)
    expect(top).toBe(Q_BASE_H + (error ? Q_ERROR_EXTRA : 0) + quranOffset(true))
    const svg = paneSvg(model)
    expect(svg).toContain(`top:${top}px;left:16px;right:16px;height:${Q_NOTE_H}px`)
    expect(svg).toContain(note)
    expect(svg).toContain(`top:${top + Q_BROWSER_DY}px;left:16px;right:16px;height:${Q_BROWSER_H}px"><span>استمع في المتصفح ↗</span>`)
    expect(paneSvg(plain)).not.toContain('استمع في المتصفح')
    const y0 = r.quranY + top + Q_BROWSER_DY
    // Every pixel of the frame and its slop press the button; the note line above it is inert.
    for (const y of [y0, y0 + Q_BROWSER_H / 2, y0 + Q_BROWSER_H, y0 - 4, y0 + Q_BROWSER_H + 4]) for (const x of [28, width / 2, width - 28]) expect(hitAt(width, x, y, on, 0, 0, model.folds, model.settings, q)).toBe('quran-browser')
    expect(hitAt(width, width / 2, r.quranY + top + Q_NOTE_H / 2, on, 0, 0, model.folds, model.settings, q)).toBe(null)
    expect(hitAt(width, width / 2, r.quranY + top + Q_NOTE_H / 2, on, 0, 0, plain.folds, plain.settings, quranLayout(plain))).not.toBe('quran-browser')
    if (error) {
      // Retry and the browser button are stacked more than one pointer cell apart.
      expect(y0 - (r.quranY + Q_RETRY_TOP + quranOffset(true) + Q_RETRY_H)).toBeGreaterThanOrEqual(24)
      expect(hitAt(width, width / 2, r.quranY + Q_RETRY_TOP + quranOffset(true) + Q_RETRY_H / 2, on, 0, 0, model.folds, model.settings, q)).toBe('quran-retry')
    }
  }
})
