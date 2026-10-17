// The shared shape of every command reply that shows settings or help.
// Status (`/x`): a title, the hint to `/x help`, then | Setting | Description | State |.
// Help (`/x help`): a title, then | Command | Description | Options |, the command
// alone in the first column and each option with what it does in the last.

export type HelpRow = readonly [command: string, description: string, options: string]
export type StatusRow = readonly [name: string, description: string, state: string]

export const helpTable = (rows: readonly HelpRow[]): string =>
  ['| Command | Description | Options |', '| --- | --- | --- |', ...rows.map(([command, description, options]) => `| \`${command}\` | ${description} | ${options || '—'} |`)].join('\n')

export const statusTable = (rows: readonly StatusRow[], first = 'Setting'): string =>
  [`| ${first} | Description | State |`, '| --- | --- | --- |', ...rows.map(row => `| ${row.join(' | ')} |`)].join('\n')

// Under every status title: where to change a setting and see every option.
export const helpHint = (command: string): string => `To change a setting or see every option: \`${command} help\``

// The host puts `muslim: ` before the first line, so the title goes there, not a table.
export const helpReply = (feature: string, rows: readonly HelpRow[]): string => `**Muslim › ${feature} › Help**\n\n${helpTable(rows)}`
