// Reset/undo is transient; the snapshot never enters the saved day.
import { sameSlot, emptyReading, type AthkarSet, type Day, type Reading } from './logic.ts'

export const UNDO_MS = 8000
// The command and signal boundary both validate the public spelling here.
export const setNamed = (value: unknown): AthkarSet | undefined => value === 'after-salah' ? 'afterSalah' : value === 'morning' || value === 'evening' ? value : undefined
export type ResetSnapshot = { day: string; set: AthkarSet; at: number; reading: Reading }
export const resetSnapshot = (day: Day, set: AthkarSet, now: number): ResetSnapshot => ({ day: day.day, set, at: now, reading: { ...day[set], counts: { ...day[set].counts } } })
export const canUndoReset = (snapshot: ResetSnapshot | undefined, day: Day, set: AthkarSet, now: number): boolean =>
  !!snapshot && snapshot.day === day.day && snapshot.set === set && now >= snapshot.at && now < snapshot.at + UNDO_MS
  && (set !== 'afterSalah' || sameSlot(snapshot.reading, day.afterSalah))
export const resetReading = (day: Day, set: AthkarSet): Day => ({ ...day, [set]: { ...day[set], ...emptyReading() } })
export const undoReset = (snapshot: ResetSnapshot | undefined, day: Day, set: AthkarSet, now: number): Day =>
  canUndoReset(snapshot, day, set, now) ? { ...day, [set]: { ...snapshot!.reading, counts: { ...snapshot!.reading.counts } } } : day
