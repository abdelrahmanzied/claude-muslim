# claude-muslim

A Claude Code mod for Muslim developers. While Claude works, its working line carries a short thikr, in Claude's own font and colors, in the terminal and the desktop app.

## Features

### Thikr line (`/thikr`)

A thikr phrase joins Claude's working line (the spinner). Claude's step, timer and hints stay as they are.

| Moment | Phrases |
| --- | --- |
| Starting a request | بسم الله · توكلت على الله · رب اشرح لي صدري ويسر لي أمري · رب يسر ولا تعسر |
| Thinking and tools | سبحان الله · الحمد لله · لا إله إلا الله · الله أكبر · … · اللهم صل على محمد |
| Writing the answer | رب زدني علما · اللهم علمنا ما ينفعنا |
| Long waits (compacting, subagents, long commands) | لا إله إلا أنت سبحانك إني كنت من الظالمين · … |
| End of a turn | تَمَّ بِحَمْدِ اللَّهِ |
| Usage limit reached | حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ |

**Salawat mode:** `/thikr mode salawat` shows one salawat on the Prophet ﷺ for each whole request, a different one each request.

More features are planned: morning and evening athkar, and prayer times.

## Install

Claude Code installs plugins from a terminal. In a Claude Code terminal session, run:

```
/plugin install muslim --marketplace abdelrahmanzied/claude-muslim
```

1. Answer `y` to add the `claude-muslim` marketplace.
2. Pick a scope: **user** (recommended) turns it on in every project.
3. Set the options, or keep the defaults.

The mod is active right away. Installed at the user scope, it also runs in the Claude desktop app's Code tab.

## Use

| Command | What it does |
| --- | --- |
| `/thikr` | Show the current settings and help |
| `/thikr on` · `off` | Turn the thikr line on or off |
| `/thikr speed auto` | Each phrase stays for its reading time: 1 s + 0.5 s per word (default) |
| `/thikr speed <1-60>` | Every phrase stays the same number of seconds |
| `/thikr tashkeel on` · `off` | Show or hide diacritics |
| `/thikr end on` · `off` | تَمَّ بِحَمْدِ اللَّهِ at the end of a turn |
| `/thikr mode all` · `salawat` | Every group in turn, or one salawat per request |
| `/muslim` | Show the installed version |

Every setting is also in `/config`.

## Update

In a terminal, refresh the marketplace, then update the mod:

```bash
claude plugin marketplace update claude-muslim
```

```bash
claude plugin update muslim@claude-muslim
```

Then restart Claude Code, or run `/reload-plugins` in an open session. `/muslim` shows the version you are running; `CHANGELOG.md` lists what changed.

## Uninstall

```bash
claude plugin uninstall muslim@claude-muslim
```

## Known issues

- Some terminals don't join Arabic letters or show them right to left. The desktop app and most modern terminals do.

## Development

Run Claude Code with the mod loaded from this folder (hot-reloads on save):

```bash
claude --plugin-dir .
```

Check, test and type-check:

```bash
claude plugin validate .
claude plugin test .
npx tsc -p .
```

`.claude-plugin/types/` is written by Claude Code when it loads the mod; `tsc` needs it present (load the mod once first).

### Releasing

Users get an update only when the version changes. For each release:

1. Bump `version` in `.claude-plugin/plugin.json` and `VERSION` in `src/constants.ts`.
2. Add an entry to `CHANGELOG.md`.
3. Merge to `main`, then tag it: `claude plugin tag .`

## Project layout

```
.claude-plugin/
  plugin.json        mod manifest (name: muslim)
  marketplace.json   makes this repo installable as a marketplace
hooks/
  hooks.json         names the hooks module
  register.tsx       entry point: wires every feature
src/
  constants.ts       shared constants
  config.ts          typed userConfig options
  features/<name>/   one folder per feature: install.tsx (hooks), phrases and pure logic
types/
  index.d.ts         $.state contract
tests/               *.test.ts, run by `claude plugin test .`
```

## License

MIT
