// DEMO BEGIN: Friday as a sequence in the real looks: the athan card named الجمعة (salah draws it), then the Al-Kahf card; no settings, store or saved state.
export const DEMO_MS = 5000
export const DEMO_TICK_MS = 500

export type DemoStep = 'athan' | 'alkahf'
export const DEMO_STEPS: readonly DemoStep[] = ['athan', 'alkahf']

// The step after `step`, or null at the end.
export const demoNext = (step: DemoStep): DemoStep | null => DEMO_STEPS[DEMO_STEPS.indexOf(step) + 1] ?? null

export const demoReply = (): string =>
  `**Friday demo:** the athan card with الجمعة, then the Al-Kahf card (${DEMO_MS / 1000} s). Each shows, then goes. Nothing is saved.`

// The Al-Kahf card is showing at `now`, for a card step started at `startedAt`.
export const demoShowing = (startedAt: number, now: number): boolean => now - startedAt < DEMO_MS
// DEMO END
