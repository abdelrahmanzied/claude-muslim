import type { ConfigRow } from 'claude-code'

// Existing-install rows; individual missing-row tests override this list.
export const configRows: ConfigRow[] = [
  'muslim.paneButton',
  'muslim.thikr',
  'muslim.thikrSpeed',
  'muslim.tashkeel',
  'muslim.thikrEnd',
  'muslim.thikrMode',
  'muslim.athkarMorning',
  'muslim.athkarEvening',
  'muslim.athkarAfterSalah',
  'muslim.athkarStyle',
  'muslim.color',
  'muslim.salahShow',
  'muslim.salahAthan',
  'muslim.salahPlace',
  'muslim.salahMethod',
  'muslim.salahAdjust',
].map(key => ({
  key, label: key, kind: 'text', value: '', provider: { plugin: 'muslim', tier: 'core' }, isLocked: false,
}))

// All three athkar reminders off: athkar opens nothing by itself, for tests of other features.
export const ATHKAR_QUIET = { athkarMorning: false, athkarEvening: false, athkarAfterSalah: false } as const
