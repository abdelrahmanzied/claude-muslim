import { expect, test } from 'claude-code/testing'
import { emptyDay, finishReading } from '../../src/features/athkar/logic.ts'
import { canUndoReset, resetReading, resetSnapshot, setNamed, undoReset, UNDO_MS } from '../../src/features/athkar/reset.ts'

for (const set of ['morning', 'evening', 'afterSalah'] as const) {
  for (const done of [false, true]) test(`${set} reset restores ${done ? 'completed' : 'partial'} counts and state only inside 8 seconds`, () => {
    const base = emptyDay('2026-10-17')
    const reading = { ...base[set], index: 3, counts: { '75': 1 }, isHidden: true }
    const day = { ...base, [set]: done ? finishReading(set, reading) : reading }
    const snapshot = resetSnapshot(day, set, 100)
    const reset = resetReading(day, set)
    expect(reset[set]).toMatchObject({ index: 0, counts: {}, isDone: false, isHidden: false })
    expect(canUndoReset(snapshot, reset, set, 100)).toBe(true)
    expect(undoReset(snapshot, reset, set, 100 + UNDO_MS - 1)).toEqual(day)
    expect(undoReset(snapshot, reset, set, 100 + UNDO_MS)).toBe(reset)
    expect(undoReset(snapshot, { ...reset, day: '2026-10-18' }, set, 101).day).toBe('2026-10-18')
    expect(canUndoReset(snapshot, reset, set === 'morning' ? 'evening' : 'morning', 101)).toBe(false)
    expect(canUndoReset(snapshot, reset, set, 99)).toBe(false)
    day[set].counts['75'] = 9
    expect(snapshot.reading.counts['75']).toBe(1)
  })
}

test('after-salah undo cannot restore another prayer slot, including lost prayer times', () => {
  const day = emptyDay('d')
  day.afterSalah = { ...day.afterSalah, pray: 'fajr', at: 10 }
  const snapshot = resetSnapshot(day, 'afterSalah', 20)
  expect(resetReading(day, 'afterSalah').afterSalah).toMatchObject({ pray: 'fajr', at: 10 })
  for (const slot of [{ pray: 'dhuhr' as const, at: 10 }, { pray: 'fajr' as const, at: 11 }, { pray: null, at: null }]) {
    expect(canUndoReset(snapshot, { ...day, afterSalah: { ...day.afterSalah, ...slot } }, 'afterSalah', 21)).toBe(false)
  }
})

test('public set names validate exactly, including the command spelling after-salah', () => {
  expect(setNamed('morning')).toBe('morning')
  expect(setNamed('evening')).toBe('evening')
  expect(setNamed('after-salah')).toBe('afterSalah')
  for (const value of ['afterSalah', 'Morning', '', 'morning reset', null, undefined, {}, 1]) expect(setNamed(value)).toBeUndefined()
})
