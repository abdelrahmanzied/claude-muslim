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

### Prayer times (`/salah`)

The next prayer under the prompt (`☾ العصر ١٥:٥٩`), a countdown in the 20 minutes before it, and one notification. Calculated on your machine; on first use the mod offers the city of your time zone, or any city you type in any language, then shows today's times so you can match them to your mosque. Details: [docs/features/salah.md](docs/features/salah.md).

More features are planned: morning and evening athkar.

## Install

Pick whichever fits where you are. All three install the same mod, at the user scope, so it runs in every project, in the terminal and in the Claude desktop app.

**From your shell** (outside Claude):

```bash
claude plugin marketplace add abdelrahmanzied/claude-muslim
```

```bash
claude plugin install muslim@claude-muslim
```

Then start Claude Code, or run `/reload-plugins` in a session that is already open.

**Inside a Claude Code session in the terminal:**

```
/plugin install muslim --marketplace abdelrahmanzied/claude-muslim
```

Answer `y` to add the marketplace, then pick the user scope.

**Inside any session, desktop app or terminal:** paste this prompt to Claude. It installs the mod, or updates it if it is already installed.

```text
Set up the Claude Code plugin "muslim" for all my sessions (user scope):
1. Run `claude plugin marketplace list`. If `claude-muslim` is not listed, run `claude plugin marketplace add abdelrahmanzied/claude-muslim`; otherwise run `claude plugin marketplace update claude-muslim`.
2. Run `claude plugin list`. If `muslim@claude-muslim` is not installed, run `claude plugin install muslim@claude-muslim --scope user`; otherwise run `claude plugin update muslim@claude-muslim`.
3. Show me what each step printed, then tell me to run /reload-plugins.
```

Run `/reload-plugins` when Claude asks, and the mod is active. `/muslim` shows the installed version.

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
| `/salah` | Today's prayer times and help |
| `/salah setup` · `city <name>` | Pick your city, in any language |
| `/salah adjust` | Match today's times to your mosque, a minute at a time |
| `/salah method <name>` | `auto` (your country's own) or a named method |
| `/salah on` · `off` · `notify on` · `off` | The status line, and the notification before each prayer |
| `/muslim` | Show the installed version |

Every setting is also in `/config`.

## Update

**From your shell:**

```bash
claude plugin marketplace update claude-muslim
```

```bash
claude plugin update muslim@claude-muslim
```

Then restart Claude Code, or run `/reload-plugins` in an open session.

**Inside any session, desktop app or terminal:** paste the same prompt from [Install](#install). It updates the mod when it is already installed.

`/muslim` shows the version you are running; `CHANGELOG.md` lists what changed.

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
  features/<name>/   one folder per feature: install.tsx (hooks), phrases, pure logic
types/
  index.d.ts         $.state contract
tests/               *.test.ts, run by `claude plugin test .`
docs/features/       one spec per feature
```

## License

MIT
