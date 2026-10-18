// Salah records its first setup answer; athkar uses it only for automatic opens.
export const REMIND_FROM_KEY = 'firstRun.remindFrom'
export const SETUP_LATER_KEY = 'salahSetupLater'

export const readRemindFrom = (raw: unknown): number | null =>
  typeof raw === 'number' && Number.isFinite(raw) ? raw : null

// Footer visibility is separate: salah currently always installs its setup card.
export const setupPending = (hasPlace: boolean, later: boolean, remindFrom: number | null, enabled = true): boolean =>
  enabled && !hasPlace && !later && remindFrom === null

export const mayOpenByItself = (pending: boolean, remindFrom: number | null, startedAt: number | null): boolean =>
  !pending && (remindFrom === null || (startedAt !== null && startedAt >= remindFrom))
