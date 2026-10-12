import { expect, test } from 'claude-code/testing'
import { CARD_HEIGHT, cardModel, cardSvg, controls, hitTest, isCardMessage, pointerPixels } from '../../src/features/quran/card.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

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
  expect(stopped.next).toBe('')
  expect(stopped.elapsed).toBe('00:00')
})
test('Client picture matches the mockup card, RTL progress, LTR times, circle controls and hover', () => {
  const svg = cardSvg(build(), 'toggle')
  for (const text of ['<foreignObject', 'border-radius:14px', '#1f2b25', '#2f4a3c', '#7fc3a0', 'font-size:26px', 'font-weight:600', 'dir="ltr"', 'right:0', 'width:50%', 'primary hover', 'إيقاف']) expect(svg).toContain(text)
  expect(svg.match(/role="button"/g)).toHaveLength(3)
  expect(cardSvg({ ...build(), title: '<&"' })).toContain('&lt;&amp;&quot;')
  expect(svg.length).toBeLessThan(131072)
})
test('hit testing uses actual circular targets, resized cell coordinates and ignores invalid/outside messages', () => {
  for (const width of [180, 380, 700]) for (const button of controls(width)) {
    expect(hitTest(width, button.x, button.y)).toBe(button.action)
    expect(hitTest(width, button.x + button.radius, button.y)).toBe(button.action)
    expect(hitTest(width, button.x + button.radius, button.y + button.radius)).toBe(null)
  }
  const pixel = pointerPixels(380, 20, 250 / CARD_HEIGHT * 20, 40, 20)
  expect(hitTest(380, pixel.x, pixel.y)).toBe('toggle')
  expect(hitTest(380, 0, 0)).toBe(null)
  expect(hitTest(380, NaN, 0)).toBe(null)
  expect(isCardMessage({ act: 'pointer', x: 1, y: 1, width: 380, columns: 40, rows: 20, generation: 1, button: 'left' })).toBe(true)
  expect(isCardMessage({ act: 'pointer', x: 1, y: 1, width: 380, columns: 0, rows: 20, generation: 1, button: 'left' })).toBe(false)
  expect(isCardMessage({ act: 'pointer', x: NaN })).toBe(false)
})
