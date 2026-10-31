// Developer tool only: Node 24. Builds the fixed scenes the picture tests draw,
// from the plugin's real pure builders (never from copies of their CSS) and the
// fixed inputs in plugin/tests/fixtures/drawings.ts.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { athan, band, pane, settings, textSample } from '../../plugin/tests/fixtures/drawings.ts'

export type Scene = { name: string; svg: string; width: number; height: number; scheme: 'dark' | 'light' }

const photo = readFileSync(resolve('plugin/src/features/salah/assets/haram.jpg')).toString('base64')

const size = (svg: string) => ({ width: Number(/ width="([\d.]+)"/.exec(svg)![1]), height: Number(/ height="([\d.]+)"/.exec(svg)![1]) })
const scene = (name: string, svg: string, scheme: 'dark' | 'light' = 'dark'): Scene => ({ name, svg, scheme, ...size(svg) })

export const scenes = (): Scene[] => [
  scene('athkar-folded-nas', band({ isActive: false })),
  scene('athkar-folded-nas-light', band({ isActive: false }), 'light'),
  scene('athkar-open-nas', band({})),
  scene('athkar-cover-open', band({ phase: 'cover', hasBegun: false })),
  scene('athkar-cover-folded', band({ phase: 'cover', isActive: false })),
  scene('athan-open', athan(photo, false)),
  scene('athan-folded', athan(photo, true)),
  scene('pane-420', pane(420, 'dark')),
  scene('pane-420-light', pane(420, 'light'), 'light'),
  scene('pane-240', pane(240, 'dark')),
  ...(['general', 'prayer', 'athkar', 'thikr'] as const).map(c => scene(`pane-settings-${c}`, pane(420, 'dark', settings(c)))),
  scene('pane-settings-prayer-methods', pane(420, 'dark', settings('prayer', 'methods'))),
  scene('pane-settings-prayer-adjust', pane(420, 'dark', settings('prayer', 'adjust'))),
  scene('pane-settings-athkar-240', pane(240, 'dark', settings('athkar'))),
  scene('pane-surah-picker', pane(420, 'dark', undefined, true)),
  scene('text-sample', textSample()),
  scene('text-sample-light', textSample(), 'light'),
]
