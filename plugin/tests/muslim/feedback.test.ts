import { expect, test } from 'claude-code/testing'

import { COMMON_FIELDS, feedbackPrompt, issueUrl, kindByName, KINDS, REPO } from '../../src/feedback.ts'

test('every kind maps to its label and issue form', () => {
  expect(KINDS.map(kind => [kind.label, kind.file])).toEqual([
    ['bug', 'bug.yml'], ['enhancement', 'feature.yml'], ['idea', 'idea.yml'], ['content', 'content.yml'], ['feedback', 'feedback.yml'],
  ])
  expect(kindByName('feature request')?.label).toBe('enhancement')
  expect(kindByName('content')?.file).toBe('content.yml')
  expect(kindByName('nope')).toBeUndefined()
})

test('the link names the form and fills its fields, URL-encoded', () => {
  const url = issueUrl(kindByName('bug')!, 'Crash & burn', { what: 'it broke: "badly"', version: '1.2.3', surface: 'terminal', os: 'macOS', ignored: 'x' })
  expect(url).toBe(`https://github.com/${REPO}/issues/new?template=bug.yml&title=Crash%20%26%20burn&what=it%20broke%3A%20%22badly%22&version=1.2.3&surface=terminal&os=macOS`)
})

test('the prompt asks before sending and gates on an explicit yes', () => {
  const prompt = feedbackPrompt({ version: '9.9.9', surface: 'desktop', text: 'the pane is cut off' })
  expect(prompt).toContain('"""\nthe pane is cut off\n"""')
  expect(prompt).toContain('muslim version: 9.9.9')
  expect(prompt).toContain('Surface: desktop')
  expect(prompt).toContain('explicit yes')
  expect(prompt).toContain(`gh issue create --repo ${REPO} --label <label> --title <title> --body <body>`)
  expect(prompt).toContain('only after that yes'.replace('only', 'Only'))
  expect(prompt).toContain(`https://github.com/${REPO}/issues/new?template=<template>`)
  expect(prompt).toContain('never send, post or create anything without the explicit yes'.replace('never', 'Rules: never'))
  for (const kind of KINDS) expect(prompt).toContain(`label \`${kind.label}\`, template \`${kind.file}\``)
  for (const [id] of COMMON_FIELDS) expect(prompt).toContain(`\`${id}\``)
})

test('without text or a known surface the prompt says so', () => {
  const prompt = feedbackPrompt({ version: '1.0.0', surface: null, os: 'Windows' })
  expect(prompt).toContain('They wrote nothing after the command.')
  expect(prompt).toContain('unknown (ask)')
  expect(prompt).toContain('Operating system: Windows')
})
