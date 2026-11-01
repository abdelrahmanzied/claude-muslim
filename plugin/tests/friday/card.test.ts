import { expect, test } from 'claude-code/testing'

import { cardHeight, closeArea } from '../../src/shared/card/card.ts'
import { isOnPlay, kahfFrame, kahfSvg, playHitArea, type KahfCardProps } from '../../src/features/friday/card.ts'
import { KAHF_TITLE } from '../../src/features/friday/logic.ts'

const props = (canPlay: boolean): KahfCardProps => ({ isActive: true, now: 0, accent: 'orange', canPlay, width: 800, card: { ch: 8.4, lh: 20 } })
const VIEW = { hoverClose: false, hoverAction: false, columns: 0 }

test('the desktop card is the shared card holding the title and ▶', () => {
  const svg = kahfSvg(props(true), VIEW)
  expect(svg).toContain(KAHF_TITLE)
  expect(svg).toContain('▶')
  expect(svg).toContain('class="x xabs">×</span>')
  expect(svg).toContain('data:font/woff2;base64,')
  expect(kahfFrame(props(true)).height).toBe(cardHeight())
  expect(svg).toContain('class="play hot"'.replace(' hot', '')) // idle
  expect(kahfSvg(props(true), { ...VIEW, hoverAction: true })).toContain('class="play hot"')
})

test('without a ready player the card has no ▶ and nothing plays', () => {
  expect(kahfSvg(props(false), VIEW)).not.toContain('▶')
  expect(kahfSvg(props(false), VIEW)).toContain(KAHF_TITLE)
  const columns = 100
  const rows = 2
  const hits = Array.from({ length: columns }, (_, x) => isOnPlay(props(false), x, 1, columns, rows)).filter(Boolean)
  expect(hits).toEqual([])
})

test('▶ is its own target, apart from the ×', () => {
  const columns = 100
  const rows = 2
  const play = Array.from({ length: columns }, (_, x) => x).filter(x => isOnPlay(props(true), x, 1, columns, rows))
  expect(play.length).toBeGreaterThan(0)
  const frame = kahfFrame(props(true), columns)
  expect(playHitArea(frame).x0).toBeGreaterThan(closeArea(frame).x1)
})
