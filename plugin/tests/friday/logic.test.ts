import { expect, test } from 'claude-code/testing'

import { cardAt, alkahfDecision, alkahfStatus, alkahfWindow, ALKAHF_CARD_MS, ALKAHF_DELAY_MS, ALKAHF_TITLE, type AlkahfInput } from '../../src/features/friday/logic.ts'
import { dayKey } from '../../src/shared/friday/index.ts'

const at = (day: number, hour: number, minute = 0): number => new Date(2026, 10, day, hour, minute).getTime()
// Friday 2026-11-06: Dhuhr 12:00, Maghrib 17:00. The window is 12:30 to 17:00.
const TIMES = { dhuhr: at(6, 12), maghrib: at(6, 17) }
const input = (over: Partial<AlkahfInput> = {}): AlkahfInput => ({ now: at(6, 14), times: TIMES, enabled: true, shownDay: undefined, isBusy: false, ...over })

test('the card says the authored words and stays one minute', () => {
  expect(ALKAHF_TITLE).toBe('سورة الكهف')
  expect(ALKAHF_CARD_MS).toBe(60_000)
  expect(ALKAHF_DELAY_MS).toBe(30 * 60_000)
})

test('the window runs from Dhuhr + 30 minutes to Maghrib', () => {
  expect(alkahfWindow(TIMES)).toEqual({ from: at(6, 12, 30), until: at(6, 17) })
})

test('before the window nothing shows, in the morning included', () => {
  expect(alkahfDecision(input({ now: at(6, 6) }))).toBe('no')
  expect(alkahfDecision(input({ now: at(6, 12, 29) }))).toBe('no')
})

test('inside the window it shows, from the first minute to the last', () => {
  expect(alkahfDecision(input({ now: at(6, 12, 30) }))).toBe('show')
  expect(alkahfDecision(input({ now: at(6, 16, 59) }))).toBe('show')
})

test('at and after Maghrib it is over', () => {
  expect(alkahfDecision(input({ now: at(6, 17) }))).toBe('no')
  expect(alkahfDecision(input({ now: at(6, 21) }))).toBe('no')
})

test('once shown on this Friday, on any session, it does not show again', () => {
  expect(alkahfDecision(input({ shownDay: dayKey(at(6, 14)) }))).toBe('no')
  expect(alkahfDecision(input({ shownDay: dayKey(at(6, 14) - 7 * 86_400_000) }))).toBe('show')
})

test('another card above the prompt makes it wait, not skip', () => {
  expect(alkahfDecision(input({ isBusy: true }))).toBe('wait')
  expect(alkahfDecision(input({ isBusy: true, now: at(6, 17, 1) }))).toBe('no')
})

test('off setting, no saved city and other days never show it', () => {
  expect(alkahfDecision(input({ enabled: false }))).toBe('no')
  expect(alkahfDecision(input({ times: null }))).toBe('no')
  const thursday = { dhuhr: at(5, 12), maghrib: at(5, 17) }
  expect(alkahfDecision(input({ now: at(5, 14), times: thursday }))).toBe('no')
})

test('status names the day and whether it was shown', () => {
  expect(alkahfStatus(at(5, 14), undefined)).toBe('not Friday')
  expect(alkahfStatus(at(6, 14), undefined)).toBe('not shown yet today')
  expect(alkahfStatus(at(6, 14), dayKey(at(6, 14)))).toBe('shown today')
})

test('a session\'s card is gone after its time and on another day', () => {
  const card = { day: dayKey(at(6, 14)), until: at(6, 14) + ALKAHF_CARD_MS }
  expect(cardAt(card, at(6, 14) + 30_000)).toBe(card)
  expect(cardAt(card, at(6, 14, 2))).toBeNull()
  expect(cardAt(card, at(13, 14, 1))).toBeNull()
  expect(cardAt(null, at(6, 14))).toBeNull()
})
