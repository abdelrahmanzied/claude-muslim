import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

import { readAdjust, readOptions, writeAdjust } from '../../src/config.ts'
import { countryName, readPlace, writePlace } from '../../src/features/salah/place.ts'

const MUNICH = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE' }

const salah = (args: string) => ({
  command: 'salah',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

describe('settings', () => {
  test('minutes read as six whole numbers, anything else 0', { options: { athkar: false } }, async () => {
    expect(readAdjust('0 0 0 5 0 -10')).toEqual({ fajr: 0, sunrise: 0, dhuhr: 0, asr: 5, maghrib: 0, isha: -10 })
    expect(readAdjust('3 x 99')).toEqual({ fajr: 3, sunrise: 0, dhuhr: 99, asr: 0, maghrib: 0, isha: 0 })
    expect(writeAdjust(readAdjust('0 0 0 90 0 -120'))).toBe('0 0 0 90 0 -120')
    expect(writeAdjust(readAdjust('1.5 - Infinity NaN'))).toBe('0 0 0 0 0 0')
    expect(writeAdjust(readAdjust(undefined))).toBe('0 0 0 0 0 0')
    expect(writeAdjust(readAdjust('1 2 3 4 5 6'))).toBe('1 2 3 4 5 6')
  })

  test('an unknown method is auto; a place off the globe or missing a part is unset', { options: { athkar: false } }, async () => {
    expect(readOptions({ salahMethod: 'tehran' }).salahMethod).toBe('auto')
    expect(readOptions({ salahPlace: 'Nowhere; 120, 10; Europe/Berlin; DE' }).salahPlace).toBe(undefined)
    expect(readOptions({ salahPlace: 'Munich; 48.14, 11.58; Europe/Berlin' }).salahPlace).toBe(undefined)
  })

  test('a place reads back as it was written', { options: { athkar: false } }, async () => {
    const place = { name: 'Munich, Germany', latitude: 48.14, longitude: 11.58, timeZone: 'Europe/Berlin', country: 'DE' }

    expect(readPlace(writePlace(place))).toEqual(place)
    expect(countryName('EG')).toBe('Egypt')
  })
})

test('/salah before setup says so', { options: { athkar: false } }, async $ => {
  const ran = await $.command.run(salah(''))

  expect(ran.text).toContain('Not set up yet. Run `/salah city`.')
})

test('/salah shows today\'s times and the settings as tables, each setting with what it is', { options: MUNICH }, async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-10T10:00:00Z') })
  const ran = await $.command.run(salah(''))

  expect(ran.text?.split('\n')[0]).toBe('**Muslim › Salah**')
  expect(ran.text).toContain('\n### Today in Munich, Germany\n\n| Pray | Time |')
  expect(ran.text).toContain('\n### Settings\n\n| Setting | Description | State |')
  expect(ran.text).toContain('| Fajr | 05:42 |')
  expect(ran.text).toContain('| **Dhuhr** · next | 13:02 |')
  expect(ran.text).toContain('| Isha | 20:12 |')
  expect(ran.text).toContain('| City | Where the times are calculated for | Munich, Germany |')
  expect(ran.text).toContain('| Method | How the times are calculated | Muslim World League (auto) |')
  expect(ran.text).toContain('| Show | The next pray under the prompt | `20` — only the 20 min before a pray, counting down |')
  expect(ran.text).toContain('| Adjust | Minutes moved to match your mosque | none |')
  expect(ran.text).toContain('/salah help')
})

test('show reads always, off or minutes, and the old salah mode and minutes; athan reads its old name', { options: { athkar: false } }, async () => {
  expect(readOptions({ salahShow: 'always' }).salahShow).toBe('always')
  expect(readOptions({ salahShow: 'off' }).salahShow).toBe('off')
  expect(readOptions({ salahShow: '90' }).salahShow).toBe(90)
  expect(readOptions({ salahShow: '0' }).salahShow).toBe(20)
  expect(readOptions({}).salahShow).toBe(20)
  expect(readOptions({ salah: 'always' }).salahShow).toBe('always')
  expect(readOptions({ salah: false }).salahShow).toBe('off')
  expect(readOptions({ salah: 'reminder', salahReminder: 45 }).salahShow).toBe(45)
  expect(readOptions({ salah: 'countdown' }).salahShow).toBe(20)
  expect(readOptions({ salahAthan: false }).salahAthan).toBe(false)
  expect(readOptions({ salahAdhan: false }).salahAthan).toBe(false)
  expect(readOptions({ salahAdhan: false, salahAthan: true }).salahAthan).toBe(true)
  expect(readOptions({}).salahAthan).toBe(true)
})

test('/salah show and athan save their settings and say what changed', { options: MUNICH }, async ($, on) => {
  const written: { key: string; value: unknown }[] = []
  on('config.set', async (_$, e) => (written.push({ key: e.key, value: e.value }), { value: e.value }))

  expect((await $.command.run(salah('show always'))).text).toBe('**Show:** `always` — next pray all day, counting down its last 20 min')
  expect((await $.command.run(salah('show 90'))).text).toBe('**Show:** `90` — only the 90 min before a pray, counting down')
  expect((await $.command.run(salah('show off'))).text).toBe('**Show:** `off` — hidden')
  expect((await $.command.run(salah('show'))).text).toContain('**Show:** `20` — only the 20 min before a pray')
  expect((await $.command.run(salah('show soon'))).text).toContain('Use `/salah show always`')
  expect((await $.command.run(salah('show 0'))).text).toContain('minutes from 1 to 720')
  expect((await $.command.run(salah('reminder 20'))).text).toContain('| `/salah show` |')
  await $.command.run(salah('athan off'))
  expect(written).toEqual([
    { key: 'muslim.salahShow', value: 'always' },
    { key: 'muslim.salahShow', value: '90' },
    { key: 'muslim.salahShow', value: 'off' },
    { key: 'muslim.salahAthan', value: false },
  ])
})

test('/salah adjust and method refuse what they cannot take', { options: MUNICH }, async ($, on) => {
  const written = settingsWriter(on)
  for (const args of ['adjust noon 5', 'adjust asr 1.5', 'adjust isha', 'adjust isha -', 'adjust asr nope', 'adjust asr Infinity']) {
    expect((await $.command.run(salah(args))).text).toBe('Use `/salah adjust <pray> <±min>`, e.g. `/salah adjust asr +5`.')
  }
  expect(written).toEqual([])
  expect((await $.command.run(salah('method tehran'))).text).toContain('Use `/salah method auto` or one of: mwl, egypt')
})

test('/salah adjust saves one pray\'s minutes', { options: MUNICH }, async ($, on) => {
  // Stands for the engine's settings writer.
  const written: { key: string; value: unknown }[] = []
  on('config.set', async (_$, e) => (written.push({ key: e.key, value: e.value }), { value: e.value }))

  expect((await $.command.run(salah('adjust Asr +5'))).text).toBe('**Adjust:** Asr +5 min')
  expect((await $.command.run(salah('adjust Asr +90'))).text).toBe('**Adjust:** Asr +90 min')
  expect((await $.command.run(salah('adjust isha -120'))).text).toBe('**Adjust:** Isha -120 min')
  expect(written).toEqual([
    { key: 'muslim.salahAdjust', value: '0 0 0 5 0 0' },
    { key: 'muslim.salahAdjust', value: '0 0 0 90 0 0' },
    { key: 'muslim.salahAdjust', value: '0 0 0 0 0 -120' },
  ])
})

// Stands for Claude reading a typed place.
const answerCities = (on: On, cities: unknown[]) => {
  const asked: string[] = []
  on('model.complete', async (_$, e) => {
    asked.push(e.prompt)

    const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

    return { value: { isAnswered: true as const, text: JSON.stringify({ cities }), usage } }
  })

  return asked
}

const settingsWriter = (on: On) => {
  const written: { key: string; value: unknown }[] = []
  on('config.set', async (_$, e) => (written.push({ key: e.key, value: e.value }), { value: e.value }))

  return written
}

const ALEXANDRIA_EG = { name: 'Alexandria, Egypt', country: 'EG', latitude: 31.2, longitude: 29.92, timeZone: 'Africa/Cairo' }
const ALEXANDRIA_US = { name: 'Alexandria, United States', country: 'US', latitude: 38.8, longitude: -77.05, timeZone: 'America/New_York' }

test('/salah city saves the one city Claude finds, with its country\'s method', async ($, on) => {
  const asked = answerCities(on, [{ name: 'Munich, Germany', country: 'DE', latitude: 48.14, longitude: 11.58, timeZone: 'Europe/Berlin' }])
  const written = settingsWriter(on)

  expect((await $.command.run(salah('city ميونخ'))).text).toBe('**City:** Munich, Germany · Muslim World League\nCheck today\'s times above the prompt.')
  expect(asked[0]).toContain('Place: ميونخ')
  expect(written).toEqual([{ key: 'muslim.salahPlace', value: 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE' }])
})

test('/salah city asks which one when the name is shared', { options: { athkar: false } }, async ($, on) => {
  answerCities(on, [ALEXANDRIA_EG, ALEXANDRIA_US])
  const written = settingsWriter(on)
  // Stands for the user picking in the dialog.
  on('tool.call', async (_$, e) => ({
    tool: e.tool,
    tool_use_id: e.tool_use_id,
    result: { questions: [], answers: { 'Which Alexandria?': 'Alexandria, Egypt' } },
  }) as never)

  expect((await $.command.run(salah('city Alexandria'))).text).toBe('**City:** Alexandria, Egypt · Egyptian General Authority of Survey\nCheck today\'s times above the prompt.')
  expect(written[0]?.value).toBe('Alexandria, Egypt; 31.2, 29.92; Africa/Cairo; EG')
})

test('/salah city with no match, or coordinates typed by hand', { options: { athkar: false } }, async ($, on) => {
  answerCities(on, [])
  const written = settingsWriter(on)

  expect((await $.command.run(salah('city Atlantis'))).text).toContain('No city found for "Atlantis"')
  expect((await $.command.run(salah('city 48.14, 11.58'))).text).toMatch(/^\*\*City:\*\* 48\.14, 11\.58 · /)
  expect(String(written[0]?.value)).toMatch(/^48\.14, 11\.58; 48\.14, 11\.58; /)
})

test('/salah help is a table of every subcommand; unknown words answer with it', { options: { athkar: false } }, async $ => {
  const help = (await $.command.run(salah('help'))).text

  expect(help).toContain('| Command | Description | Options |')
  for (const word of ['/salah help', '`always`', '`<minutes>`', '/salah athan', '/salah city', '/salah method', '`<pray> <±min>`']) {
    expect(help).toContain(word)
  }
  for (const gone of ['/salah setup', '/salah on', '/salah notify']) expect(help).not.toContain(gone)
  expect((await $.command.run(salah('banana'))).text).toBe(help)
  expect((await $.command.run(salah('on'))).text).toBe(help)
})
