// DEMO BEGIN: pure shared sequence; the order only. Each demo reports its own end.
export const DEMO_START_MS = 100
export const DEMO_GAP_MS = 100

export const DEMO_STEPS = ['thikr', 'athkar', 'salah'] as const

export const demoReply = (): string =>
  '**Muslim demo:** playing. Thikr (a real turn, about 30 s), then athkar, then /salah demo (the athan moment). The thikr part uses tokens and leaves a message in the transcript.'
// DEMO END
