import { expect, test } from 'claude-code/testing'

import { REST_PX, closeArea, frameOf } from '../../src/shared/card/card.ts'
import { isOnPlay, kahfFrame, kahfInner, kahfLayout, kahfSvg, playArea, playHitArea, type KahfCardProps } from '../../src/features/friday/card.ts'
import { KAHF_BROWSER, KAHF_PLAY, KAHF_TITLE, kahfSubtitle } from '../../src/features/friday/logic.ts'

const props = (inBrowser: boolean, reciter = 'ماهر المعيقلي'): KahfCardProps => ({ isActive: true, now: 5000, startedAt: 2000, accent: 'orange', reciter, inBrowser, width: 800, card: { ch: 8.4, lh: 20 } })
const VIEW = { hoverClose: false, hoverAction: false, columns: 0, gone: 0 }

test('the desktop card is the shared card at the folded row: title in Ruqaa, subtitle inline, the avatar and the pill', () => {
  const svg = kahfSvg(props(false), VIEW)
  expect(svg).toContain(`<span class="title">${KAHF_TITLE}</span>`)
  expect(svg).toContain('<span class="sub">يوم الجمعة · بصوت ماهر المعيقلي</span>')
  expect(svg).toContain(`>${KAHF_PLAY}</span>`)
  expect(svg).toContain('class="x xabs">×</span>')
  expect(svg).toContain('font-family: "Aref Ruqaa"')
  expect(svg).toContain('font-size: 17px')
  expect(svg).toContain('kbx-root running')
  // The athkar frame look's classes, a row like the folded one, and no border or clipping of its own.
  expect(svg).toContain('class="band line compact bg-frame al-breathe kahf rest active"')
  const row = svg.slice(svg.indexOf('.band.band.kahf'), svg.indexOf('.kahf .text'))
  expect(row).not.toMatch(/overflow|border:|position/)
  expect(svg).not.toMatch(/\.kahf[^\n]*position: absolute/)
  expect(kahfFrame(props(false)).height).toBe(REST_PX)
  expect(kahfFrame(props(false)).isFolded).toBe(true)
  expect(svg).toContain('class="play"')
  expect(kahfSvg(props(false), { ...VIEW, hoverAction: true })).toContain('class="play hot"')
  expect(kahfSvg(props(false), { ...VIEW, hoverClose: true })).toContain('class="x xabs hot">×</span>')
})

test('Windows and Linux: the pill reads «↗ افتح في المتصفح»; macOS reads «▶ استمع»', () => {
  expect(kahfSvg(props(true), VIEW)).toContain(`>${KAHF_BROWSER}</span>`)
  expect(kahfSvg(props(true), VIEW)).not.toContain(KAHF_PLAY)
  expect(kahfSvg(props(false), VIEW)).not.toContain(KAHF_BROWSER)
  expect(KAHF_PLAY).toBe('▶ استمع')
  expect(KAHF_BROWSER).toBe('↗ افتح في المتصفح')
})

test('the subtitle names the reciter last used, or only the day before the Quran is ready', () => {
  expect(kahfSubtitle('ماهر المعيقلي')).toBe('يوم الجمعة · بصوت ماهر المعيقلي')
  expect(kahfSubtitle('')).toBe('يوم الجمعة')
  expect(kahfSvg(props(false, ''), VIEW)).toContain('<span class="sub">يوم الجمعة</span>')
  expect(kahfSvg(props(false, 'a<b'), VIEW)).toContain('بصوت a&lt;b')
})

test('the avatar moves from when the card appeared, and a redraw carries on', () => {
  expect(kahfSvg(props(false), VIEW)).toContain('--quran-time:-3s')
  expect(kahfSvg(props(false), { ...VIEW, gone: 500 })).toContain('--quran-time:-3.5s')
  // Reduced motion is the avatar's own rule.
  expect(kahfSvg(props(false), VIEW)).toContain('prefers-reduced-motion:reduce')
})

test('the parts keep apart in the flow: × then pill, avatar, text; the subtitle shortens before the title, and the title before anything overlaps', () => {
  for (const inBrowser of [false, true]) {
    const l = kahfLayout(inBrowser)
    expect(l.pillLeft).toBeGreaterThan(closeArea(kahfFrame(props(inBrowser))).x1)
    expect(l.avatarLeft).toBeGreaterThan(l.pillLeft + l.pillWidth)
    expect(l.textLeft).toBeGreaterThanOrEqual(l.avatarLeft + l.avatarWidth)
    expect(l.avatarHeight).toBeLessThanOrEqual(l.inner)
    expect(l.pillHeight).toBeLessThanOrEqual(l.inner)
    const svg = kahfSvg(props(inBrowser), VIEW)
    // The row's padding takes the shell's own extra, as the athkar folded row does.
    expect(svg).toContain('padding: var(--ay, 0px) calc(14px + var(--ax, 0px)) var(--ay, 0px) calc(34px + var(--ax, 0px))')
    expect(svg).toContain('text-overflow: ellipsis')
    expect(svg).toContain('flex: 0 100 auto')
    expect(svg).toContain(`--row: ${l.inner}px`)
  }
  expect(kahfLayout(true).pillWidth).toBeGreaterThan(kahfLayout(false).pillWidth)
})

test('the pill is its own target, apart from the × and the avatar, and follows its width', () => {
  const columns = 100
  const rows = 2
  for (const inBrowser of [false, true]) {
    const play = Array.from({ length: columns }, (_, x) => x).filter(x => isOnPlay(props(inBrowser), x, 1, columns, rows))
    expect(play.length).toBeGreaterThan(0)
    const frame = kahfFrame(props(inBrowser), columns)
    expect(playHitArea(frame, inBrowser).x0).toBeGreaterThan(closeArea(frame).x1)
    const area = playArea(frame, inBrowser)
    expect(area.x1 - area.x0).toBe(kahfLayout(inBrowser).pillWidth)
    // The target's margin stops short of the avatar.
    expect(playHitArea(frame, inBrowser).x1).toBeLessThan(area.x0 + kahfLayout(inBrowser).avatarLeft - kahfLayout(inBrowser).pillLeft)
  }
  const frame = kahfFrame(props(false), columns)
  expect(playHitArea(frame, true).x1).toBeGreaterThan(playHitArea(frame, false).x1)
})

// The content can never outgrow the card: one inner height, from the shell, that every part stays within.
test('every part is no taller than the row, and the band is its picture less the shell\'s padding, for any cell', () => {
  for (const lh of [14, 16, 20, 24, 26, 30, 40]) {
    const p: KahfCardProps = { ...props(false), card: { ch: 8.4, lh } }
    const frame = kahfFrame(p)
    const box = frameOf(frame)
    const inner = kahfInner(frame)
    // The picture less its padding around the band holds the band's padding, frame and row.
    expect(inner).toBeGreaterThan(0)
    expect(inner + 2 * box.addY + 3).toBeLessThanOrEqual(box.height - 2 * box.padY)
    for (const inBrowser of [false, true]) {
      const l = kahfLayout(inBrowser, inner)
      expect(Math.max(l.avatarHeight, l.pillHeight, l.textHeight)).toBeLessThanOrEqual(inner)
      const svg = kahfSvg({ ...p, inBrowser }, VIEW)
      expect(svg).toContain(`--row: ${inner}px`)
      // The one band: the picture's width and height, border-box, no negative margin, every child capped.
      expect(svg).toContain('width: 100%; height: 100%; min-height: 0; box-sizing: border-box;')
      expect(svg).toContain('.kahf > * { max-height: var(--row); min-height: 0; }')
      expect(svg.slice(svg.indexOf('.band.band.kahf'))).not.toMatch(/margin|position: absolute/)
      expect(svg).toContain(`height="${box.height}"`)
    }
  }
  // Without the desktop's card the shell's own 1px padding and the frame are all it takes.
  const plain = { ...props(false), card: undefined as never }
  expect(kahfInner(kahfFrame(plain))).toBe(REST_PX - 2 - 3)
})
