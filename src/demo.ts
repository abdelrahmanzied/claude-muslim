// DEMO BEGIN: pure shared sequence; removing this file removes no feature logic.
import { demoDuration as athkarDuration } from './features/athkar/demo.ts'
import { demoDuration as salahDuration } from './features/salah/demo.ts'

export const DEMO_START_MS = 100
export const DEMO_GAP_MS = 100
// The real finale is private to athkar's install.tsx; keep the §8 demo timing
// here rather than changing that core file to expose it. Engine tests check
// the actual band has gone before the next demo starts.
const FINALE_MS = 3200

export const DEMO_STEPS = ['thikr', 'athkar', 'salah'] as const

// The no-argument athkar command selects frame on terminals and the configured
// desktop look elsewhere. Read the feature's own timing, including its finale.
export const demoTiming = (surface: string, style: 'sky' | 'frame') => ({
  // Thikr signals the end of its usage-limit hold; then a short gap.
  afterThikrMs: DEMO_GAP_MS,
  athkarMs: athkarDuration(surface === 'terminal' ? 'frame' : style, FINALE_MS),
  // `/salah demo`: the card opens 5 s on desktop; the minaret rises in the terminal.
  salahMs: salahDuration(surface),
})

export const demoReply = (): string =>
  '**Muslim demo:** playing. Thikr (a real turn, about 30 s), then athkar, then /salah demo (the athan moment). The thikr part uses tokens and leaves a message in the transcript.'
// DEMO END
