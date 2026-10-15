import { expect, test } from 'claude-code/testing'
import { PANE_HEIGHT } from '../../src/features/muslim-pane/layout.ts'
import { paneModel } from '../../src/features/muslim-pane/model.ts'
import { CLOSED_SETTINGS, CATEGORIES } from '../../src/features/muslim-pane/settings.ts'
import { paneAlt, paneSvg, paletteCss } from '../../src/features/muslim-pane/view.ts'

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
  expect(svg).toContain('Open full player')
  expect(svg).toContain('أَذْكَارُ الْمَسَاءِ')
  expect(svg.match(/class="pr done"/g)?.length).toBe(2)
  expect(svg.match(/class="pr next"/g)?.length).toBe(1)
  expect(svg).toContain('role="switch" aria-checked="true"')
})

test('a playing player shows Stop and a stopped one Play', () => {
  expect(paneSvg(paneModel(feeds, NOW, 360, 'orange'))).toContain('aria-label="Stop"')
  expect(paneSvg(paneModel({ ...feeds, quran: { ...feeds.quran, isPlaying: false } }, NOW, 360, 'orange'))).toContain('aria-label="Play"')
})

test('features that are not connected leave quiet notes, never a broken picture', () => {
  const svg = paneSvg(paneModel({ salah: null, quran: null, athkar: null }, NOW, 360, 'orange'))
  expect(svg).toContain('Choose a city first: /salah city')
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

test('the prayer card header uses the minaret icon, not the crescent', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 360, 'orange'))
  expect(svg).toContain('M9.5 10v11M14.5 10v11')
  expect(svg).not.toContain('M20 14.5A8.2 8.2 0 019.5 4')
})

test('settings uses the approved gear, Quran mushaf, and exact five tab labels',()=>{
  const model=paneModel(feeds,NOW,240,'orange')
  model.settings={...model.settings,state:{...CLOSED_SETTINGS,open:true,category:'thikr'}}
  const svg=paneSvg(model)
  const settings=svg.slice(svg.indexOf('<section class="dcard settings-card"'))
  const header=settings.slice(0,settings.indexOf('<div class="settings-tabs"'))
  expect(header).toContain('M10.3 3h3.4l.5 2.3')
  expect(header).not.toContain('M4 7h9M17 7h3')
  for(const folded of [false,true]){
    const picture=paneSvg({...model,folds:{...model.folds,quran:folded}})
    const quranHeader=picture.match(/<div class="in dh"[^>]*>.*?<\/div>/g)!.find(head=>head.includes('<span class="ar">القرآن</span>'))!
    expect(quranHeader).toContain('M12 5v15M12 5C8.72 2.54 5.44 3')
    expect(quranHeader).not.toContain('M12 6c-2-1.5-5-2-8-2')
  }
  const tabs=settings.slice(settings.indexOf('<div class="settings-tabs"'),settings.indexOf('<div class="settings-body"'))
  expect(tabs.match(/role="tab"/g)).toHaveLength(5)
  let last=-1
  for(const [,label] of CATEGORIES){
    const pos=tabs.indexOf(`aria-label="${label}"`)
    expect(pos).toBeGreaterThan(last);last=pos
  }
  expect(tabs).toContain('aria-label="الذكر"')
  expect(tabs).toContain('<span>الذكر</span>')
  expect(settings).toContain('Spinner</bdi> (سطر العمل)')
  expect(svg).toContain('width:24px;height:24px')
  expect(svg).toContain('font-size:11px;line-height:14px')
  expect(svg).not.toContain('setting-category')
})

test('the heading shows the avatar head beside مسلم and /muslim at the left edge', () => {
  const svg = paneSvg(paneModel(feeds, NOW, 240, 'orange'))
  expect(svg).toContain('<div class="pane-top"><svg width="24" height="24"')
  expect(svg).toContain('<span>مسلم</span>')
  expect(svg).toContain('<div class="pane-command" dir="ltr"><bdi dir="ltr">/muslim</bdi></div>')
  expect(svg).toContain('<svg width="24" height="24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"')
})
