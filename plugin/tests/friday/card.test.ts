import { expect, test } from 'claude-code/testing'

import { cardHeight, closeArea } from '../../src/shared/card/card.ts'
import { isOnPlay, kahfFrame, kahfLayout, kahfSvg, playArea, playHitArea, type KahfCardProps } from '../../src/features/friday/card.ts'
import { KAHF_BROWSER, KAHF_PLAY, KAHF_TITLE, kahfSubtitle } from '../../src/features/friday/logic.ts'

const props = (inBrowser: boolean, reciter = 'ماهر المعيقلي'): KahfCardProps => ({ isActive: true, now: 5000, startedAt: 2000, accent: 'orange', reciter, inBrowser, width: 800, card: { ch: 8.4, lh: 20 } })
const VIEW = { hoverClose: false, hoverAction: false, columns: 0, gone: 0 }

test('the desktop card is the shared card: the title in Ruqaa, the subtitle, the avatar and the pill', () => {
  const svg = kahfSvg(props(false), VIEW)
  expect(svg).toContain(`<div class="title">${KAHF_TITLE}</div>`)
  expect(svg).toContain('<div class="sub">يوم الجمعة · بصوت ماهر المعيقلي</div>')
  expect(svg).toContain(`>${KAHF_PLAY}</span>`)
  expect(svg).toContain('class="x xabs">×</span>')
  expect(svg).toContain('font-family: "Aref Ruqaa"')
  expect(svg).toContain('font-size: 28px')
  expect(svg).toContain('border: 1.5px solid var(--acc)')
  expect(svg).toContain('kbx-root running')
  expect(kahfFrame(props(false)).height).toBe(cardHeight())
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
  expect(kahfSvg(props(false, ''), VIEW)).toContain('<div class="sub">يوم الجمعة</div>')
  expect(kahfSvg(props(false, 'a<b'), VIEW)).toContain('بصوت a&lt;b')
})

test('the avatar moves from when the card appeared, and a redraw carries on', () => {
  expect(kahfSvg(props(false), VIEW)).toContain('--quran-time:-3s')
  expect(kahfSvg(props(false), { ...VIEW, gone: 500 })).toContain('--quran-time:-3.5s')
  // Reduced motion is the avatar's own rule.
  expect(kahfSvg(props(false), VIEW)).toContain('prefers-reduced-motion:reduce')
})

test('the parts keep apart: × then pill, avatar, text; the title shortens before anything overlaps', () => {
  for (const inBrowser of [false, true]) {
    const l = kahfLayout(inBrowser)
    expect(l.playLeft).toBeGreaterThan(closeArea(kahfFrame(props(inBrowser))).x1)
    expect(l.avatarLeft).toBeGreaterThan(l.playLeft + l.playWidth)
    expect(l.textLeft).toBeGreaterThanOrEqual(l.avatarLeft + l.avatarWidth)
    expect(l.avatarHeight).toBe(70)
    const svg = kahfSvg(props(inBrowser), VIEW)
    expect(svg).toContain(`calc(${l.textLeft}px + var(--ax, 0px))`)
    expect(svg).toContain('text-overflow: ellipsis')
    expect(svg).toContain('bottom: 0; width:')
  }
  expect(kahfLayout(true).playWidth).toBeGreaterThan(kahfLayout(false).playWidth)
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
    expect(area.x1 - area.x0).toBe(kahfLayout(inBrowser).playWidth)
    // The target's margin stops short of the avatar.
    expect(playHitArea(frame, inBrowser).x1).toBeLessThan(area.x0 + kahfLayout(inBrowser).avatarLeft - kahfLayout(inBrowser).playLeft)
  }
  const frame = kahfFrame(props(false), columns)
  expect(playHitArea(frame, true).x1).toBeGreaterThan(playHitArea(frame, false).x1)
})
