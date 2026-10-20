import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { ATHKAR_QUIET } from './fixtures/config.ts'

const commands = ['thikr', 'salah', 'athkar', 'quran', 'muslim'] as const
const MUNICH = 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE'
const run = (command: string, args = '') => ({
  command, args, origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

function setup(on: On, surface: 'terminal' | 'desktop', mode = 'plain') {
  mock.clock(on, { now: Date.parse('2026-06-20T12:00:00Z') })
  mock.env(on, {})
  mock.store(on, { arabicTerminals: { unknown: mode } })
  on('session.surface', async () => ({ value: surface }))
  on('session.surfaces', async () => ({ value: [surface] }))
  on('settings.read', async () => ({ value: {} }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('http.fetch', { init: { method: 'HEAD' } }, async () => ({
    value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' },
  }))
}

for (const surface of ['terminal', 'desktop'] as const) {
  for (const command of commands) for (const args of ['', 'help']) {
    // /quran has no subcommands: no help table of its own (see /muslim help quran).
    if (command === 'quran' && args === 'help') continue
    // Bare /muslim opens the pane on desktop by design (register.test.ts).
    if (surface === 'desktop' && command === 'muslim' && args === '') continue
    test(`${surface}: /${command}${args ? ` ${args}` : ''} table contract`, {
      options: { ...ATHKAR_QUIET, salahPlace: MUNICH },
    }, async ($, on) => {
      setup(on, surface)
      const reply = (await $.command.run(run(command, args))).text!
      // Bare /quran is the exception: a sentence on a terminal, not a table.
      if (command === 'quran' && args === '') {
        expect(reply).not.toMatch(/^\| --- \|/m)
        if (surface === 'desktop') {
          expect(reply).toBe('Muslim pane opened at القرآن الكريم (desktop only).')
        } else {
          expect(reply).toBe('Quran is a desktop feature: open the Muslim pane in the Claude desktop app.')
        }
      } else {
        expect(reply).toMatch(/^\| --- \|/m)
      }
    })
  }

  test(`${surface}: /salah without a city reports setup instead of a table`, {
    options: { ...ATHKAR_QUIET },
  }, async ($, on) => {
    setup(on, surface)
    const reply = (await $.command.run(run('salah'))).text!
    expect(reply).toBe('Not set up yet. Run `/salah city`.\n\nTo change a setting or see every option: `/salah help`')
    expect(reply).not.toMatch(/^\| --- \|/m)
  })
}

for (const mode of ['plain', 'joined', 'reversed']) {
  test(`terminal ${mode}: every help and status table contains no Arabic letters`, {
    options: { ...ATHKAR_QUIET, salahPlace: 'ميونخ، ألمانيا; 48.14, 11.58; Europe/Berlin; DE' },
  }, async ($, on) => {
    setup(on, 'terminal', mode)
    for (const command of commands) for (const args of ['', 'help']) {
      if (command === 'quran' && args === 'help') continue
      const reply = (await $.command.run(run(command, args))).text!
      expect(reply).toBeTruthy()
      const rows = reply.split('\n').filter(line => line.startsWith('|'))
      if (command !== 'quran') expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) expect(row).not.toMatch(/[؀-ۿﭐ-﷿ﹰ-﻿]/)
      if (command === 'salah' && args === '') {
        expect(reply).toContain('### Today in ميونخ، ألمانيا')
        expect(reply).toContain('| City | Where the times are calculated for | 48.14, 11.58 |')
      }
    }
  })
}
