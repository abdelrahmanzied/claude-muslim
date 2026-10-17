import { expect, test } from 'claude-code/testing'

import { autoUpdateState, parseSettings, settingsPath, shouldSeed, statusReply, withAutoUpdate } from '../../src/autoupdate.ts'

const entry = (extra: object = {}) => ({
  theme: 'dark',
  extraKnownMarketplaces: {
    other: { source: { source: 'github', repo: 'a/b' } },
    'claude-muslim': { source: { source: 'github', repo: 'abdelrahmanzied/claude-muslim', sparsePaths: ['.claude-plugin', 'plugin'] }, ...extra },
  },
})

test('the settings file is found from CLAUDE_CONFIG_DIR, HOME or USERPROFILE', () => {
  expect(settingsPath({ config: '/c/dir/', home: '/h' })).toBe('/c/dir/settings.json')
  expect(settingsPath({ home: '/home/a/' })).toBe('/home/a/.claude/settings.json')
  expect(settingsPath({ profile: 'C:\\Users\\a' })).toBe('C:\\Users\\a/.claude/settings.json')
  expect(settingsPath({ home: ' ' })).toBeUndefined()
})

test('only a JSON object is accepted', () => {
  expect(parseSettings('{"a":1}')).toEqual({ ok: true, data: { a: 1 } })
  expect(parseSettings('{"a":')).toMatchObject({ ok: false })
  expect(parseSettings('')).toMatchObject({ ok: false })
  expect(parseSettings('[1]')).toMatchObject({ ok: false })
})

test('the state is read off the marketplace entry', () => {
  expect(autoUpdateState({})).toBe('missing')
  expect(autoUpdateState({ extraKnownMarketplaces: { other: {} } })).toBe('missing')
  expect(autoUpdateState(entry())).toBe('default')
  expect(autoUpdateState(entry({ autoUpdate: true }))).toBe('on')
  expect(autoUpdateState(entry({ autoUpdate: false }))).toBe('off')
  expect(autoUpdateState(entry({ autoUpdate: 'yes' }))).toBe('default')
})

test('seeding applies only while the user never chose', () => {
  expect(shouldSeed(entry())).toBe(true)
  expect(shouldSeed(entry({ autoUpdate: false }))).toBe(false)
  expect(shouldSeed(entry({ autoUpdate: true }))).toBe(false)
  expect(shouldSeed({})).toBe(false)
})

test('the edit changes one key and keeps every other, with 2-space JSON and a newline', () => {
  const before = entry()
  const text = withAutoUpdate(before, true)!
  expect(text.endsWith('}\n')).toBe(true)
  expect(text).toContain('\n  "theme": "dark"')
  const after = JSON.parse(text)
  expect(after.theme).toBe('dark')
  expect(after.extraKnownMarketplaces.other).toEqual(before.extraKnownMarketplaces.other)
  expect(after.extraKnownMarketplaces['claude-muslim']).toEqual({ ...before.extraKnownMarketplaces['claude-muslim'], autoUpdate: true })
  expect(JSON.parse(withAutoUpdate(after, false)!).extraKnownMarketplaces['claude-muslim'].autoUpdate).toBe(false)
})

test('a missing entry is never created', () => {
  expect(withAutoUpdate({ theme: 'dark' }, true)).toBeUndefined()
  expect(withAutoUpdate({ extraKnownMarketplaces: { other: {} } }, true)).toBeUndefined()
})

test('the status reply names the state and the usage', () => {
  expect(statusReply('on')).toBe('Auto-update on. Usage: /muslim autoupdate on | off')
  expect(statusReply('default')).toContain('off (not chosen yet)')
  expect(statusReply('missing')).toContain('not available')
  expect(statusReply('unknown')).toContain('could not read')
})
