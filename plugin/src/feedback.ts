// `/muslim feedback`: the prompt that makes Claude draft a GitHub issue with the person and
// file it only after an explicit yes. Pure: no `$`; the submit happens in hooks/register.tsx.
// The kinds, labels, files and field ids mirror .github/ISSUE_TEMPLATE/.

export const REPO = 'abdelrahmanzied/claude-muslim'
export const FEEDBACK_SUBMIT_MS = 500
export const FEEDBACK_USAGE = 'Usage: /muslim feedback [what you want to tell us]'

export type Field = readonly [id: string, label: string]
export type Kind = { name: string; label: string; file: string; fields: readonly Field[] }

// Asked of every form. The feature is a choice the person makes; the rest are filled in automatically.
export const COMMON_FIELDS: readonly Field[] = [
  ['feature', 'Feature'],
  ['version', 'muslim version'],
  ['surface', 'Surface'],
  ['os', 'Operating system'],
]

export const FEATURES: readonly string[] = ['thikr', 'athkar', 'salah', 'quran', 'Muslim pane', '/muslim commands and settings', 'other or new']

// The label each feature adds (the issue-labels workflow does the same from the form).
export const FEATURE_LABELS: Readonly<Record<string, string>> = {
  thikr: 'thikr', athkar: 'athkar', salah: 'salah', quran: 'quran', 'Muslim pane': 'pane', '/muslim commands and settings': 'muslim',
}

export const KINDS: readonly Kind[] = [
  { name: 'bug', label: 'bug', file: 'bug.yml', fields: [['what', 'What happened?'], ['expected', 'What did you expect?'], ['steps', 'Steps to reproduce']] },
  { name: 'improvement', label: 'enhancement', file: 'improvement.yml', fields: [['improve', 'What should be improved?'], ['why', 'Why?']] },
  { name: 'new feature', label: 'idea', file: 'idea.yml', fields: [['feature_idea', 'What is the new feature?'], ['why', 'Why?']] },
  { name: 'content correction', label: 'content', file: 'content.yml', fields: [['where', 'Where is it?'], ['wrong', 'What is wrong?'], ['source', 'Source']] },
  { name: 'feedback', label: 'feedback', file: 'feedback.yml', fields: [['feedback', 'Your feedback']] },
]

export const kindByName = (name: string): Kind | undefined => KINDS.find(kind => kind.name === name || kind.label === name)

// A link to the issue form with its fields filled in. An issue form fills from field ids in
// the query; a `body` parameter is ignored by forms.
export const issueUrl = (kind: Kind, title: string, values: Readonly<Record<string, string>>): string => {
  const query = [`template=${kind.file}`, `title=${encodeURIComponent(title)}`]
  for (const [id] of [...kind.fields, ...COMMON_FIELDS]) {
    const value = values[id]
    if (value !== undefined && value !== '') query.push(`${id}=${encodeURIComponent(value)}`)
  }

  return `https://github.com/${REPO}/issues/new?${query.join('&')}`
}

const forms = (): string =>
  KINDS.map(kind => `- ${kind.name}: label \`${kind.label}\`, template \`${kind.file}\`, fields ${[...kind.fields, ...COMMON_FIELDS].map(([id, label]) => `\`${id}\` (${label})`).join(', ')}`).join('\n')

export type FeedbackContext = { version: string; surface: string | null; os?: string; text?: string }

export const feedbackPrompt = ({ version, surface, os, text }: FeedbackContext): string => {
  const said = text?.trim()
  return [
    `The person ran /muslim feedback to send feedback about the muslim mod to its GitHub repository ${REPO}.`,
    said ? `What they wrote after the command (their words, use them as they are):\n"""\n${said}\n"""` : 'They wrote nothing after the command.',
    '',
    'Do this, in order:',
    `1. Ask which kind it is and which feature it is about with your multiple-choice question tool (AskUserQuestion), unless it is already clear from what they wrote. Kind options: ${KINDS.map(kind => kind.name).join(', ')}. Feature options: ${FEATURES.join(', ')}. Ask for any other detail the kind needs (free text) one short question at a time.`,
    '2. Draft the issue: a short plain title and a body in the shape of that kind\'s issue form, one section per field written as `### <field label>` then a blank line and the answer, in the order below (the Feature section included, with the chosen option as written). Fill the last three fields yourself:',
    `   - muslim version: ${version}`,
    `   - Surface: ${surface ?? 'unknown (ask)'} (terminal or desktop)`,
    `   - Operating system: ${os ?? 'the one you are running on, from your environment (macOS, Windows or Linux)'}`,
    '3. Show the person the full draft (title, body, labels), then ask for the send decision with your multiple-choice question tool, with the options "Send", "Change it" and "Don\'t send". Only "Send" is a yes. Anything else means do not send: for "Change it" ask what to change, update the draft and ask again.',
    `4. Only after "Send", run: gh issue create --repo ${REPO} --label <kind label> --label <feature label, if any> --label <surface label> --title <title> --body <body>. The feature label is ${Object.entries(FEATURE_LABELS).map(([name, label]) => `${name} -> ${label}`).join(', ')}; none for "other or new". The surface label is the surface above (terminal or desktop); leave it out if the surface is neither. Pass the title and body safely (for example from a temporary file with --body-file), and tell the person the issue link when it is created.`,
    `5. If gh is missing, or \`gh auth status\` says it is not signed in, do not send anything. Give a ready link instead: https://github.com/${REPO}/issues/new?template=<template>&title=<title>&<field id>=<answer> with one <field id>=<answer> pair per field, including feature=<feature>, every value URL-encoded. (Issue forms read the field ids, not a body parameter.) Say that they open it and press Submit.`,
    '',
    'The kinds, their labels, templates and field ids:',
    forms(),
    '',
    'Rules: never send, post or create anything without the "Send" from step 3. Put nothing in the issue except what the person wrote and the chosen feature and the three filled fields; add no personal data, paths, usernames, settings or logs they did not give. Do nothing else in this task.',
  ].join('\n')
}
