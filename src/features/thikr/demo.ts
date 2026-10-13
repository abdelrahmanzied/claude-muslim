// Pure scenes and timing of the thikr demo; nothing here touches $, settings or saved state.
import { LONG, SALAWAT, STARTING, THINKING, WRITING } from './phrases.ts'
import type { Group } from './rotation.ts'

// Each phrase stays this long, whatever its length or the speed setting.
export const DEMO_STEP_MS = 1500
// The usage-limit line stays this long after the turn.
export const DEMO_LIMIT_MS = 3000
// The demo's prompt goes in this long after the reply (not from inside the command).
export const DEMO_SUBMIT_MS = 100
// Redraw rate while the turn plays.
export const DEMO_TICK_MS = 500

export const demoReply = (): string => '**Thikr demo:** playing. Claude runs a few short steps (about 30 s).'

// The demo starts its own turn: Claude runs these timed steps, one after the other,
// so the working line stays up long enough for every phrase (the sleeps add up to
// at least the phrase sequence; Claude's own request time comes on top).
export const DEMO_STEPS: readonly { command: string; description: string }[] = [
  { command: 'sleep 6; echo start', description: 'Thikr demo: a short step' },
  { command: 'sleep 14; echo long', description: 'Thikr demo: a long step' },
  { command: 'sleep 9; echo end', description: 'Thikr demo: a last step' },
]

export const DEMO_DONE = 'Thikr demo done.'

// command: what the user typed, `/thikr demo` or `/muslim demo`.
export const demoPrompt = (command = '/thikr demo'): string => [
  `This is the muslim mod's thikr demo, started by the user with ${command}. Do nothing else.`,
  'Run these Bash commands one at a time, in this order, each with exactly the description shown, and wait for each to finish before the next:',
  ...DEMO_STEPS.map(({ command, description }, i) => `${i + 1}. command: ${command} | description: ${description}`),
  `Then answer with exactly one short line: ${DEMO_DONE}`,
  'Do not read files, explain or add anything else.',
].join('\n')

export type DemoScene = { group: Group | 'salawat'; text: string; startsAt: number }

// Every moment in order: starting, thinking, writing, long, then one salawat.
export const demoScenes = (): readonly DemoScene[] => {
  const phrases: readonly (readonly [DemoScene['group'], string])[] = [
    ...STARTING.map(text => ['starting', text] as const),
    ...THINKING.map(text => ['thinking', text] as const),
    ...WRITING.map(text => ['writing', text] as const),
    ...LONG.map(text => ['long', text] as const),
    ['salawat', SALAWAT[0] ?? ''],
  ]

  return phrases.map(([group, text], i) => ({ group, text, startsAt: i * DEMO_STEP_MS }))
}

export const demoDuration = (): number => demoScenes().length * DEMO_STEP_MS

// The scene `elapsedMs` into the turn; the last one holds if the turn runs on.
export const demoSceneAt = (elapsedMs: number): DemoScene => {
  const scenes = demoScenes()

  return scenes[Math.min(scenes.length - 1, Math.max(0, Math.floor(elapsedMs / DEMO_STEP_MS)))]!
}
