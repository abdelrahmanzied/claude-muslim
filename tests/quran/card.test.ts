import { expect, test } from 'claude-code/testing'
import { CARD_HEIGHT, CONTROLS_Y, paletteCss, cardModel, cardSvg, controls, hitTest, isCardMessage, ornament, pointerPixels } from '../../src/features/quran/card.ts'
import type { QuranPlaying, QuranRepeat } from '../../types/index.d.ts'
import { toggleRepeat } from '../../src/features/quran/player.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'
import type { TrackSelection } from '../../src/features/quran/card.ts'
import { AUDIO_LIMIT_BYTES, timedSegments } from '../../src/features/quran/segments.ts'

const build = (surah = 18, durationMs: number | null = 10000, elapsed = 5000) => cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 1, { moshafKey: '10:21', surah, startedAt: 0, durationMs }, elapsed, 380, 7)
test('card model preserves authored choices, formats time, bounds progress and stops after 114', () => {
  const model = build()
  expect(model.title).toBe('سورة الكهف')
  expect(model.status).toBe('يتلى الآن')
  expect(model.reciter).toBe('محمد صديق المنشاوي · حفص عن عاصم')
  expect(model.elapsed).toBe('00:05')
  expect(model.total).toBe('00:10')
  expect(model.progress).toBe(0.5)
  expect(model.next).toBe('التالي تلقائي: Fixture 19')
  expect(model.generation).toBe(7)
  expect(build(18, null).total).toBe('--:--')
  expect(build(18, null).progress).toBe(0)
  expect(build(18, 1000).progress).toBe(1)
  expect(build(18, 10000, -500).progress).toBe(0)
  expect(build(114).next).toBe('بعد سورة الناس يتوقف التشغيل')
  expect(build(18, 8000000, 3661000).elapsed).toBe('1:01:01')
  const stopped = cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 100, 380, 8)
  expect(stopped.status).toBe('متوقف')
  expect(stopped.next).toContain('التالي تلقائي')
  expect(stopped.elapsed).toBe('00:00')
})
test('Client picture matches the mockup card, RTL progress, LTR times, circle controls and hover', () => {
  const svg = cardSvg(build(), 'toggle')
  for (const text of ['<foreignObject', 'var(--q-accent)', 'font-size:30px', 'font-weight:700', 'dir="ltr"', 'left:0', 'width:50%', 'primary hover', 'إيقاف', 'class="orn"', 'class="status"', 'السابق<', 'التالي<']) expect(svg).toContain(text)
  expect(svg.match(/role="button"/g)).toHaveLength(5)
  expect(cardSvg({ ...build(), title: '<&"' })).toContain('&lt;&amp;&quot;')
  expect(svg.length).toBeLessThan(131072)
})
test('hit testing uses actual circular targets, resized cell coordinates and ignores invalid/outside messages', () => {
  for (const width of [180, 380, 700]) for (const button of controls(width)) {
    expect(hitTest(width, button.x, button.y)).toBe(button.action)
    expect(hitTest(width, button.x + button.radius, button.y)).toBe(button.action)
    expect(hitTest(width, button.x + button.radius, button.y + button.radius)).toBe(null)
  }
  const pixel = pointerPixels(380, 20, CONTROLS_Y / CARD_HEIGHT * 20, 40, 20)
  expect(hitTest(380, pixel.x, pixel.y)).toBe('toggle')
  expect(hitTest(380, 0, 0)).toBe(null)
  const play = controls(380).find(b => b.action === 'toggle')!
  expect(hitTest(380, play.x, play.y + play.radius + 4)).toBe(null)
  expect(hitTest(380, play.x, play.y + play.radius + 4, 4, 5)).toBe('toggle')
  expect(hitTest(380, play.x, play.y + play.radius + 6, 4, 5)).toBe(null)
  expect(hitTest(380, play.x, play.y, -1, 0)).toBe(null)
  expect(hitTest(380, NaN, 0)).toBe(null)
  expect(isCardMessage({ act: 'pointer', x: 1, y: 1, width: 380, columns: 40, rows: 20, generation: 1, button: 'left' })).toBe(true)
  expect(isCardMessage({ act: 'pointer', x: 1, y: 1, width: 380, columns: 0, rows: 20, generation: 1, button: 'left' })).toBe(false)
  expect(isCardMessage({ act: 'pointer', x: NaN })).toBe(false)
})
test('avatar follows playback state and keeps its animation phase across clock redraws', () => {
  const active = cardSvg(build(18, 10000, 5500))
  expect(active).toContain('class="kbx-root running"')
  expect(active).toContain('--quran-time:-5.5s')
  expect(active).toContain('width="120" height="112.5"')
  expect(active).toContain('prefers-reduced-motion:reduce')
  expect(active).not.toContain('class="kbx-layer kbx-phase-a')
  const idle = cardSvg(cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 100, 380, 8))
  expect(idle).toContain('class="kbx-root idle"')
  expect(idle).toContain('--quran-time:-0s')
  expect(idle).toContain('.kbx-root.idle *{animation:none!important')
})
test('quarter boundary controls remain enabled across surahs and the last quarter names the next surah', () => {
  const segments = timedSegments(Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 })), 2, AUDIO_LIMIT_BYTES * 2)
  const selection: TrackSelection = { segments, selectedSegment: 0, durationMs: 286000, loading: null }
  const buildQuarter = (surah: number, index: number) => cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, surah, { moshafKey: '10:20', surah, startedAt: 0, durationMs: 1000, segmentIndex: index, segmentCount: segments.length }, 500, 380, 1, { ...selection, selectedSegment: index })
  expect(buildQuarter(2, 0).canPrev).toBe(true)
  expect(buildQuarter(2, 0).next).toBe('التالي: البقرة · المقطع ٢ · الآيات ٢٦–٤٣')
  expect(buildQuarter(2, segments.length - 1).canNext).toBe(true)
  expect(buildQuarter(2, segments.length - 1).next).toBe('التالي تلقائي: آل عمران')
  expect(buildQuarter(1, 0).canPrev).toBe(false)
  expect(buildQuarter(114, segments.length - 1).canNext).toBe(false)
  expect(buildQuarter(114, segments.length - 1).next).toBe('بعد سورة الناس يتوقف التشغيل')
  expect(cardSvg(buildQuarter(2, segments.length - 1)).match(/role="button"[^>]*aria-disabled="true"/g)).toBe(null)
})
test('two repeat buttons flank the row: quarter repeat at the left, surah repeat at the right, both smaller nonoverlapping targets', () => {
  for (const width of [180, 200, 296, 380, 700]) {
    const row = controls(width)
    expect(row.map(b => b.action).sort()).toEqual(['next', 'prev', 'repeat', 'repeat-segment', 'toggle'])
    const repeat = row.find(b => b.action === 'repeat')!, quarter = row.find(b => b.action === 'repeat-segment')!, prev = row.find(b => b.action === 'prev')!, next = row.find(b => b.action === 'next')!
    expect(repeat.radius).toBeLessThan(prev.radius)
    expect(quarter.radius).toBe(repeat.radius)
    expect(quarter.x).toBeLessThan(prev.x)
    expect(repeat.x).toBeGreaterThan(next.x)
    expect(hitTest(width, repeat.x, repeat.y)).toBe('repeat')
    expect(hitTest(width, quarter.x, quarter.y)).toBe('repeat-segment')
    for (const b of row) {
      expect(b.x - b.radius >= 0).toBe(true)
      expect(b.x + b.radius <= width).toBe(true)
      for (const other of row.filter(o => o !== b)) expect(Math.abs(b.x - other.x) > b.radius + other.radius).toBe(true)
    }
  }
})
const quarters = timedSegments(Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 })), 2, AUDIO_LIMIT_BYTES * 2)
const split = (repeat: QuranRepeat, index = 0, playing: QuranPlaying | null = null) => cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 2, playing, 0, 380, 1, { segments: quarters, selectedSegment: index, durationMs: 286000, loading: null }, repeat)
const whole = (repeat: QuranRepeat) => cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 0, 380, 1, undefined, repeat)
const button = (svg: string, label: string) => svg.match(new RegExp(`<div class="control[^"]*"[^>]*aria-label="${label}"[^>]*>`))![0]
test('surah repeat: pressed style, hover and hint; a whole surah and the last quarter name «تكرار: سورة …»', () => {
  const active = { ...build(), repeat: 'surah' as const, next: 'تكرار: سورة الكهف' }
  expect(cardSvg(active, 'repeat')).toContain('class="control primary hover" role="button" aria-label="تكرار السورة" aria-disabled="false" aria-pressed="true"')
  expect(cardSvg(active)).toContain('.control.primary{background:var(--q-accent);border-color:var(--q-accent);color:var(--q-on-primary)}')
  expect(cardSvg(build())).toContain('aria-label="تكرار السورة" aria-disabled="false" aria-pressed="false"')
  expect(cardSvg(build())).toContain('stroke="currentColor"')
  expect(whole('surah').next).toBe('تكرار: سورة الكهف')
  expect(split('surah', 0).next).toContain('التالي: البقرة · المقطع ٢')
  expect(split('surah', quarters.length - 1).next).toBe('تكرار: سورة البقرة')
})
test('quarter repeat is inactive for a whole surah and pressed only for «segment» on a split surah', () => {
  const inactive = button(cardSvg(whole('off')), 'تكرار المقطع')
  expect(inactive).toContain('aria-disabled="true"')
  expect(inactive).toContain('aria-pressed="false"')
  expect(inactive).not.toContain('primary')
  // A stale 'segment' value on a whole surah reads as off.
  expect(button(cardSvg(whole('segment')), 'تكرار المقطع')).toContain('aria-pressed="false"')
  expect(whole('segment').repeat).toBe('off')
  expect(whole('segment').next).toBe('التالي تلقائي: Fixture 19')
  const off = cardSvg(split('off'))
  expect(button(off, 'تكرار المقطع')).toContain('aria-disabled="false"')
  expect(button(off, 'تكرار المقطع')).toContain('aria-pressed="false"')
  const on = cardSvg(split('segment'))
  expect(button(on, 'تكرار المقطع')).toContain('class="control primary')
  expect(button(on, 'تكرار المقطع')).toContain('aria-pressed="true"')
  expect(button(on, 'تكرار السورة')).toContain('aria-pressed="false"')
  const surah = cardSvg(split('surah'))
  expect(button(surah, 'تكرار السورة')).toContain('aria-pressed="true"')
  expect(button(surah, 'تكرار المقطع')).toContain('aria-pressed="false"')
})
test('repeat modes are mutually exclusive in the pure rule and the hint names the quarter', () => {
  expect(toggleRepeat('off', 'surah')).toBe('surah')
  expect(toggleRepeat('surah', 'segment')).toBe('segment')
  expect(toggleRepeat('segment', 'surah')).toBe('surah')
  expect(toggleRepeat('surah', 'surah')).toBe('off')
  expect(toggleRepeat('segment', 'segment')).toBe('off')
  expect(split('segment', 7).next).toBe('تكرار: المقطع ٨ · الآيات ١٢٤–١٤١')
  expect(split('segment', 4, { moshafKey: '10:20', surah: 2, startedAt: 0, durationMs: 1000, segmentIndex: 4, segmentCount: 20 }).next).toContain('تكرار: المقطع ٥')
})
test('«الوقت تقريبي» sits dim under the times in both palettes', () => {
  const svg = cardSvg(build())
  expect(svg).toContain('<span>00:05</span><span>00:10</span></div><div class="hint">الوقت تقريبي</div>')
  expect(svg).toContain('.hint{position:absolute;left:0;right:0;top:233px;font-size:11px;line-height:16px;color:var(--q-dim)}')
})
test('repeat icons: two circling arrows, and the same arrows with a «1» for the quarter', () => {
  const svg = cardSvg(split('off'))
  const surah = svg.match(/aria-label="تكرار السورة"[^>]*><svg[^>]*>(.*?)<\/svg>/)![1]!
  const quarter = svg.match(/aria-label="تكرار المقطع"[^>]*><svg[^>]*>(.*?)<\/svg>/)![1]!
  expect(surah).toBe('<path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/>')
  expect(quarter).toBe(`${surah}<path d="M11 10h1v4"/>`)
})

const lightPalette = {
  '--q-bg': 'transparent', '--q-text': '#302f2a', '--q-title': '#302f2a', '--q-muted': '#79766c', '--q-dim': '#79766c', '--q-line': '#d9d6cd',
  '--q-accent': '#c8642d', '--q-soft': '#46443e', '--q-track': '#d9d6cd', '--q-control-border': '#d9d6cd', '--q-on-primary': '#ffffff', '--q-ornament-dim': '#c8642d',
  '--q-hover-border': '#c8642d', '--q-hover-bg': '#f3f1ec', '--q-dropdown-bg': '#fdfcf9', '--q-shadow': '0 10px 30px rgba(48,47,42,.14)', '--q-hot': '#f3f1ec', '--q-scrollbar': '#d9d6cd', '--q-label': '#46443e',
}
const darkPalette = {
  '--q-text': '#ece9e2', '--q-muted': '#98948b', '--q-line': '#393733', '--q-accent': '#d97757', '--q-soft': '#c6c3bb', '--q-track': '#393733', '--q-on-primary': '#ffffff', '--q-dropdown-bg': '#1f1e1d',
}
test('card colors are CSS variables with a dark default and a light palette under prefers-color-scheme', () => {
  const svg = cardSvg(build())
  const light = svg.match(/@media \(prefers-color-scheme: light\)\{\.quran\{([^}]+)\}\}/)![1]!
  for (const [name, value] of Object.entries(lightPalette)) expect(light).toContain(`${name}:${value}`)
  expect(svg).toContain('.quran{--q-bg:transparent')
  const dark = svg.match(/\.quran\{(--q-bg[^}]+)\}/)![1]!
  for (const [name, value] of Object.entries(darkPalette)) expect(dark).toContain(`${name}:${value}`)
  const root = svg.match(/\.quran\{(width[^}]+)\}/)![1]!
  expect(root).not.toMatch(/background(?:-color)?:/)
  expect(svg).toContain(`.card{position:relative;height:${CARD_HEIGHT}px}`)
  expect(svg).not.toContain('border-radius:14px')
  expect(svg).not.toContain('var(--q-card-bg)')
  expect(svg).not.toMatch(/(^|[;{\s])color-scheme\s*:/)
  const outside = svg.replace(paletteCss('.quran'), '').replace(/<svg[^>]*kbx-root[\s\S]*?<\/svg>/, '')
  expect(outside).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
  expect(svg).toContain('class="quran"')
  expect(cardSvg({ ...build(), theme: 'light' })).toContain('class="quran theme-light"')
  expect(cardSvg({ ...build(), theme: 'dark' })).toContain('.quran.theme-dark{')
})

test('the avatar gets a light-only drop shadow that .theme-dark cancels', () => {
  const css = paletteCss('.quran'), shadow = 'filter:drop-shadow(0 1px 1.5px rgba(31,30,29,.35))'
  expect(css).toMatch(/@media \(prefers-color-scheme: light\)\{[^@]*\.quran \.avatar\{filter:drop-shadow\(0 1px 1\.5px rgba\(31,30,29,\.35\)\)\}\}/)
  expect(css).toContain(`.quran.theme-light .avatar{${shadow}}`)
  expect(css).toContain('.quran.theme-dark .avatar{filter:none}')
  expect(css.slice(0, css.indexOf('@media'))).not.toContain('drop-shadow')
})

test('both palettes keep the dropdown opaque and give fields and search no fill of their own', () => {
  const palettes = Array.from(paletteCss('.pane').matchAll(/\.pane(?:\.theme-(?:light|dark))?\{([^}]+)\}/g), match => match[1]!)
  expect(palettes).toHaveLength(4)
  for (const [index, palette] of palettes.entries()) {
    expect(palette).toContain('--q-bg:transparent;')
    const dropdown = palette.match(/--q-dropdown-bg:([^;]+)/)![1]!
    expect(dropdown).toMatch(/^#[0-9a-f]{6}$/)
    expect(dropdown).toBe(index === 1 || index === 2 ? '#fdfcf9' : '#1f1e1d')
    expect(palette).not.toContain('--q-field-bg')
    expect(palette).not.toContain('--q-search-bg')
  }
})

test('every nested svg declares the SVG namespace, so Desktop draws the rosette and icons', () => {
  for (const svg of [ornament(65, 20), cardSvg(build())]) {
    const tags = svg.match(/<svg\b[^>]*>/g) ?? []
    expect(tags.length > 0).toBe(true)
    for (const tag of tags) expect(tag).toContain('xmlns="http://www.w3.org/2000/svg"')
  }
})
