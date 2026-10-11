// A markdown table of commands: | Command | What it does |.
// A command may hold `` ` · ` `` to show two spellings as two code spans.
export const commandTable = (rows: readonly (readonly [string, string])[]): string =>
  ['| Command | What it does |', '| --- | --- |', ...rows.map(([command, what]) => `| \`${command}\` | ${what} |`)].join('\n')
