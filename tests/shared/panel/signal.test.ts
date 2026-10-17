import { expect, test } from 'claude-code/testing'
import { connectQuranOptions, readQuranOptions, connectAthkar, connectPanelAction, connectQuran, connectSalah, readAthkar, readQuran, readSalah, resetPanel, runPanelAction } from '../../../src/shared/panel/signal.ts'

test('nothing connected reads as null and no action is taken', async () => {
  resetPanel()
  expect(readSalah(0)).toBeNull()
  expect(await readQuran()).toBeNull()
  expect(await readAthkar()).toBeNull()
  expect(await runPanelAction('quran-toggle')).toBe(false)
})

test('a connected reader and action are used, and a failing one never throws', async () => {
  resetPanel()
  let ran = 0
  connectPanelAction('quran-next', async () => { ran++ })
  connectPanelAction('quran-prev', async () => { throw new Error('x') })
  expect(await runPanelAction('quran-next')).toBe(true)
  expect(ran).toBe(1)
  expect(await runPanelAction('quran-prev')).toBe(false)
  connectSalah(() => { throw new Error('x') })
  expect(readSalah(1)).toBeNull()
  connectQuran(async () => { throw new Error('x') })
  expect(await readQuran()).toBeNull()
  connectAthkar(async () => ({ title: 't', done: 1, total: 2, progress: 0.5, isDone: false }))
  expect((await readAthkar())?.done).toBe(1)
  resetPanel()
})

test('picks carry a value to the owner; options are read by list and query and never throw', async () => {
  resetPanel()
  expect(await readQuranOptions('surah', '')).toEqual([])
  const got: (string | undefined)[] = []
  for (const a of ['quran-reciter', 'quran-surah', 'quran-segment', 'quran-repeat-surah', 'quran-repeat-segment'] as const) connectPanelAction(a, async v => { got.push(`${a}:${v}`) })
  expect(await runPanelAction('quran-surah', '18')).toBe(true)
  expect(await runPanelAction('quran-repeat-segment')).toBe(true)
  expect(got).toEqual(['quran-surah:18', 'quran-repeat-segment:undefined'])
  connectQuranOptions(async (list, query) => [{ value: '1', label: `${list}:${query}`, number: '1', selected: true }])
  expect(await readQuranOptions('reciter', 'ab')).toEqual([{ value: '1', label: 'reciter:ab', number: '1', selected: true }])
  connectQuranOptions(async () => { throw new Error('x') })
  expect(await readQuranOptions('surah', '')).toEqual([])
  resetPanel()
  expect(await readQuranOptions('surah', '')).toEqual([])
})
