import { expect, test } from 'claude-code/testing'

import { COMMON_FIELDS, FEATURES, feedbackPrompt, issueUrl, kindByName, KINDS, markerLine, REPO, VIA_LABEL } from '../../src/feedback.ts'

test('every kind maps to its label and issue form', () => {
  expect(KINDS.map(kind => [kind.label, kind.file])).toEqual([
    ['bug', 'bug.yml'], ['enhancement', 'improvement.yml'], ['idea', 'idea.yml'], ['content', 'content.yml'], ['feedback', 'feedback.yml'],
  ])
  expect(kindByName('improvement')?.label).toBe('enhancement')
  expect(kindByName('content')?.file).toBe('content.yml')
  expect(kindByName('new feature')?.label).toBe('idea')
  expect(kindByName('nope')).toBeUndefined()
})

test('the link names the form and fills its fields, URL-encoded', () => {
  const url = issueUrl(kindByName('bug')!, 'Crash & burn', { what: 'it broke: "badly"', version: '1.2.3', feature: 'salah', surface: 'terminal', os: 'macOS', ignored: 'x' })
  expect(url).toBe(`https://github.com/${REPO}/issues/new?template=bug.yml&title=Crash%20%26%20burn&what=it%20broke%3A%20%22badly%22&feature=salah&version=1.2.3&surface=terminal&os=macOS`)
})

test('the prompt asks before sending and gates on an explicit yes', () => {
  const prompt = feedbackPrompt({ version: '9.9.9', surface: 'desktop', text: 'the pane is cut off' })
  expect(prompt).toContain('"""\nthe pane is cut off\n"""')
  expect(prompt).toContain('muslim version: 9.9.9')
  expect(prompt).toContain('Surface: desktop')
  expect(prompt).toContain('AskUserQuestion')
  expect(prompt).toContain('"Send", "Change it" and "Don\'t send"')
  expect(prompt).toContain('Only "Send" is a yes')
  for (const feature of FEATURES) expect(prompt).toContain(feature)
  expect(prompt).toContain('interface language -> language')
  expect(prompt).toContain(`gh issue create --repo ${REPO} --label <kind label> --label via-plugin --label <feature label, if any> --label <surface label> --title <title> --body <body>`)
  expect(prompt).toContain('Only after "Send"')
  expect(prompt).toContain(`https://github.com/${REPO}/issues/new?template=<template>`)
  expect(prompt).toContain('feature=<feature>')
  expect(prompt).toContain('Rules: never send, post or create anything without the "Send"')
  for (const kind of KINDS) expect(prompt).toContain(`label \`${kind.label}\`, template \`${kind.file}\``)
  for (const [id] of COMMON_FIELDS) expect(prompt).toContain(`\`${id}\``)
})

test('without text or a known surface the prompt says so', () => {
  const prompt = feedbackPrompt({ version: '1.0.0', surface: null, os: 'Windows' })
  expect(prompt).toContain('They wrote nothing after the command.')
  expect(prompt).toContain('unknown (ask)')
  expect(prompt).toContain('Operating system: Windows')
})

test('every issue ends with the marker line, in the gh path and in the link fallback', () => {
  expect(VIA_LABEL).toBe('via-plugin')
  expect(markerLine('bug')).toBe('Sent with /muslim feedback (kind: bug)')
  const prompt = feedbackPrompt({ version: '1.0.0', surface: 'terminal' })
  expect(prompt).toContain('the very last line of the body is always exactly Sent with /muslim feedback (kind: <kind label>)')
  expect(prompt).toContain('(for example Sent with /muslim feedback (kind: bug))')
  expect(prompt).toContain("as the last line of the value of the kind's last free-text field")
})
