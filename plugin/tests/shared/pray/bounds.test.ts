import { expect, test } from 'claude-code/testing'
import type { SalahAthkarTimes } from '../../../types'
import { athkarTimesAt, connectAthkarTimes } from '../../../src/shared/pray/bounds.ts'

test('prayer-day bounds are null before salah connects', () => {
  expect(athkarTimesAt(0)).toBeNull()
})

test('each read calls the connected provider with its current time', () => {
  const times: SalahAthkarTimes = { day: '2026-06-10', previousDay: '2026-06-09', fajr: 1, sunrise: 2, maghrib: 3, isha: 4, nextFajr: 5 }
  const calls: number[] = []
  connectAthkarTimes(at => { calls.push(at); return at === 10 ? times : null })
  expect(athkarTimesAt(10)).toBe(times)
  expect(athkarTimesAt(20)).toBeNull()
  expect(calls).toEqual([10, 20])
})

test('a later connection replaces the earlier provider', () => {
  const calls: string[] = []
  connectAthkarTimes(at => { calls.push(`old:${at}`); return null })
  connectAthkarTimes(at => { calls.push(`new:${at}`); return null })
  expect(athkarTimesAt(30)).toBeNull()
  expect(calls).toEqual(['new:30'])
})
