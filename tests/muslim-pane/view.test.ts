import { expect, test } from 'claude-code/testing'
import { PANE_HEIGHT } from '../../src/features/muslim-pane/layout.ts'
import { paneModel } from '../../src/features/muslim-pane/model.ts'
import { CLOSED_SETTINGS, CATEGORIES } from '../../src/features/muslim-pane/settings.ts'
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
  quran: { reciter: 'محمد صديق المنشاوي', surah: 'سورة البقرة', part: 'المقطع ٣ من ١٦', elapsed: '12:03', total: '41:20', progress: 0.29, isPlaying: true, canPrev: true, canNext: true },
  athkar: { title: 'أَذْكَارُ الْمَسَاءِ', done: 4, total: 12, progress: 0.33, isDone: false },
}

test('the picture draws the three cards at the fixed pane height', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 360, 'orange'))
  expect(svg).toContain(`height="${PANE_HEIGHT}"`)
  expect(svg).toContain('الصلاة القادمة')
  expect(svg).toContain('العصر')
  expect(svg).toContain('in 1h 12m')
  expect(svg).toContain('Munich')
  expect(svg).toContain('افتح المصحف');expect(svg).not.toContain('Open full player')
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
  expect(svg).toContain('Athkar are off: /athkar on')
})

test('the main color comes from the shared palette, in both themes', () => {
  expect(paletteCss('.dp', 'orange')).toContain('--accent:#d97757')
  expect(paletteCss('.dp', 'orange')).toContain('--accent:#c8642d')
  expect(paletteCss('.dp', 'green')).toContain('--accent:#1a9466')
  expect(paneSvg(paneModel(feeds, NOW, 360, 'blue', 'light'))).toContain('class="dp theme-light"')
  expect(paneSvg(paneModel(feeds, NOW, 360, 'blue'))).toContain('class="dp"')
})

test('hover lights the hovered target only, and text is escaped', () => {
  const hovered = paneSvg(paneModel(feeds, NOW, 360, 'orange'), 'quran-open')
  expect(hovered).toContain('wide dbtn hot')
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

test('light and dark use their own consistent token sets and every element reads tokens', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 360, 'orange'))
  const css = paletteCss('.dp', 'orange')
  const dark = css.slice(0, css.indexOf('@media'))
  const light = css.slice(css.indexOf('@media'), css.indexOf('.dp.theme-light'))
  // Dark: light text, dark hairlines. Light: dark text, soft hairlines, light raised buttons.
  for (const token of ['--text:#ecebe6', '--muted:#8f8c83', '--line:#3a3834', '--raised:#2a2926']) expect(dark).toContain(token)
  for (const token of ['--text:#1f1e1b', '--muted:#77746a', '--line:#d9d6cc', '--raised:#ecebe4']) expect(light).toContain(token)
  expect(paneSvg(paneModel(feeds, NOW, 360, 'orange', 'light'))).toContain('.dp.theme-light{--card:#fffdf8;--line:#d9d6cc')
  expect(paneSvg(paneModel(feeds, NOW, 360, 'orange', 'dark'))).toContain('.dp.theme-dark{--card:#232220;--line:#3a3834')
  // No pane theme is forced when none is given: the app's color scheme decides, as in the Quran pane.
  expect(svg).toContain('class="dp"')
  // Elements take colors only from tokens: titles (.dh, text), big time (.nx-t), rows (.drow), borders, buttons (.dbtn).
  const rules = svg.slice(svg.indexOf('*{box-sizing'), svg.indexOf('</style>'))
  expect(rules).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  expect(rules).toMatch(/\.dp\{[^}]*color:var\(--text\)/)
  expect(rules).toMatch(/\.dcard\{[^}]*inset 0 0 0 1px var\(--line\)/)
  expect(rules).toMatch(/\.dbtn\{[^}]*background:var\(--raised\);color:var\(--text\)/)
  expect(rules).toMatch(/\.pbar\{[^}]*background:var\(--line\)/)
})

for (const folded of [false, true]) {
  test(`daily card headers use their settings tab fragments when ${folded ? 'folded' : 'open'}`, () => {
    const model = paneModel(feeds, NOW, 360, 'orange')
    model.folds = { prayer: folded, quran: folded, athkar: folded }
    model.settings = { ...model.settings, state: { ...CLOSED_SETTINGS, open: true } }
    const svg = paneSvg(model)
    const headers = svg.match(/<div class="in dh"[^>]*>.*?<\/div>/g)!
    // The Quran card keeps its icon; it has no settings tab.
    expect(headers.find(h => h.includes('<span class="ar">القرآن</span>'))).toContain(FEATURE_ICONS.qpane)
    expect(svg).not.toContain('aria-label="القرآن"')
    for (const [category, key] of [['prayer', 'sujoodreal'], ['athkar', 'horizon']] as const) {
      const label = CATEGORIES.find(c => c[0] === category)![1]
      const head = headers.find(h => h.includes(`<span class="ar">${category === 'athkar' ? feeds.athkar.title : label}</span>`))!
      const tab = svg.match(new RegExp(`role="tab"[^>]*aria-label="${label}">.*?</svg>`))![0]
      expect(head).toContain(FEATURE_ICONS[key])
      expect(tab).toContain(FEATURE_ICONS[key])
    }
  })

  for (const title of ['أَذْكَارُ الصَّبَاحِ', 'أَذْكَارُ الْمَسَاءِ', null]) {
    test(`athkar use horizon in the header, row and tab: ${title ?? 'off'}, ${folded ? 'folded' : 'open'}`, () => {
      const model = paneModel({ ...feeds, athkar: title === null ? null : { ...feeds.athkar, title } }, NOW, 360, 'orange')
      model.folds = { ...model.folds, athkar: folded }
      model.settings = { ...model.settings, state: { ...CLOSED_SETTINGS, open: true } }
      const svg = paneSvg(model)
      const head = svg.match(/<div class="in dh"[^>]*>.*?<\/div>/g)![2]!
      const tab = svg.match(/role="tab"[^>]*aria-label="الأذكار">.*?<\/svg>/)![0]
      expect(head).toContain(FEATURE_ICONS.horizon)
      expect(tab).toContain(FEATURE_ICONS.horizon)
      if (!folded) {
        const row = svg.match(/<div class="in krow"[^>]*>.*?<\/svg>/)![0]
        expect(row).toContain(FEATURE_ICONS.horizon)
      }
    })
  }
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
  expect(svg).toContain('<div class="pane-top"><svg width="38.4" height="36"')
  expect(svg).toContain('.pane-top{position:absolute;right:20px;top:0px;height:36px;display:flex;align-items:center;')
  expect(svg).toContain('.pane-command{position:absolute;left:20px;top:9px;line-height:18px;')
  expect(svg).toContain('image-rendering:pixelated')
  expect(svg).toContain('<span>مسلم</span>')
  expect(svg).toContain('<div class="pane-command" dir="ltr"><bdi dir="ltr">/muslim</bdi></div>')
  expect(svg).toContain('<svg width="38.4" height="36" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 30" shape-rendering="crispEdges">')
})
