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
| Usage limit reached | حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ |

**Salawat mode:** `/thikr mode salawat` shows one salawat on the Prophet ﷺ for each whole request, a different one each request.

### Morning and evening athkar (`/athkar`)

A reader above the prompt for the morning athkar (05:00–17:00) and the evening athkar (17:00–05:00), from Hisn al-Muslim. Click, Space or Enter to count; right click or Backspace to take one back; ← → to move. It moves on by itself after each thikr, and your reading is saved for the day. On desktop it sits on a sky that follows the time of day. Details: [docs/features/athkar.md](docs/features/athkar.md).

### Prayer times (`/salah`)

The next prayer under the prompt (`☾ العصر ١٥:٥٩`) all day, or only the minutes before it (20 by default), with a live mm:ss countdown (`☾ العصر ١٩:٤٢`) and, when it comes in, a small minaret that rises above the prompt for about 3 seconds, then folds to one line with a × (on the desktop app, a photo card that folds to a slim row after a minute); it closes by itself after 15 minutes, and the footer shows `حان وقت صلاة …` (no toast, no OS notification). Calculated on your machine; on first use the mod offers the city of your time zone, or any city you type in any language, then shows today's times so you can match them to your mosque. While Claude works inside that window, the thikr turn opens with `حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د`. Details: [docs/features/salah.md](docs/features/salah.md).

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

Run `/reload-plugins` when Claude asks, and the mod is active. `/muslim` shows the installed version and your settings.

## Use

| Command | What it does |
| --- | --- |
| `/thikr` | Show the current settings |
| `/thikr help` | Table of every `/thikr` command |
| `/thikr on` · `off` | Turn the thikr line on or off |
| `/thikr speed auto` | Each phrase stays for its reading time: 1 s + 0.5 s per word (default) |
| `/thikr speed <1-60>` | Every phrase stays the same number of seconds |
| `/thikr end on` · `off` | تَمَّ بِحَمْدِ اللَّهِ at the end of a turn |
| `/thikr mode all` · `salawat` | Every group in turn, or one salawat per request |
| `/athkar` | Show today's athkar status and help, and show the athkar again if hidden |
| `/athkar help` | Table of every `/athkar` command |
| `/athkar on` · `off` | Turn the athkar on or off |
| `/athkar morning reset` · `evening reset` | Read that period again from the start |
| `/athkar style sky` · `frame` | The look on desktop: a sky that follows the time of day (default), or plain. The terminal always shows the frame |
| `/athkar demo` · `demo sky` · `demo frame` | Play the looks in motion, for videos or to preview them; nothing is saved |
| `/muslim color` · `color orange` · `green` · `gold` · `blue` | Show or change the main color of the whole mod (default: Claude orange) |
| `/salah` | Place, method and mode, then today's prayer times |
| `/salah help` | Table of every `/salah` command |
| `/salah city` · `city <name or lat, lng>` | Pick your city by question, or by name in any language |
| `/salah adjust` | Match today's times to your mosque, a minute at a time |
| `/salah method <name>` | `auto` (your country's own) or a named method |
| `/salah show always` · `<minutes>` · `off` | Show the next pray all day, only that many minutes before it (e.g. `show 20`), or hide it |
| `/salah athan on` · `off` | `حان وقت صلاة …` when a prayer comes in |
| `/salah athan demo` | Play the athan moment now, in a few seconds; nothing is saved |
| `/muslim` | Version and a table of every setting, its value and the command that changes it |
| `/muslim tashkeel on` · `off` | Show or hide Arabic diacritics on desktop (the terminal never shows them) |
| `/muslim terminal-arabic` | Choose how Arabic shows in this terminal |
| `/muslim help` · `help <feature>` | Command tables of every feature, or one (`thikr`, `athkar`, `salah`) |

Every setting is also in `/config`. The shared `color` setting changes existing main-color accents across athkar, salah, thikr's usage-limit line and the terminal Arabic survey label. Orange text follows Claude's theme; other choices use light/dark shades.

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

`/muslim` shows the version you are running and your settings; `CHANGELOG.md` lists what changed.

## Uninstall

```bash
claude plugin uninstall muslim@claude-muslim
```

## Known issues

- Some terminals don't join Arabic letters or show them right to left. The desktop app and most modern terminals do.

## Develop and release

### Run your copy

A dev copy replaces the installed `muslim@claude-muslim` in that session only. It can be any of these:

- `--plugin-dir`
- `CLAUDE_CODE_PLUGIN_DIRS`
- a session's `~/.claude/dev-mods/<session-id>/muslim` link

The debug log then says `Plugin "muslim" from --plugin-dir overrides installed version`, and only `muslim@inline` loads. There is no conflict and no double hooks. Every other session keeps running the installed copy.

In a terminal, from the worktree:

```bash
claude --plugin-dir .
```

In the desktop app, link the worktree into the session's dev-mods folder:

```bash
ln -s <worktree> ~/.claude/dev-mods/<session-id>/muslim
```

Or ask Claude in that session to load `/plugin-authoring` and link it. Edits load after the turn ends, or on `/reload-plugins`.

Tested on Claude Code 2.1.296.

### Check

Install the dev dependency (TypeScript) once:

```bash
npm install
```

Then validate, test and type-check in one go:

```bash
npm run check
```

`.claude-plugin/types/` is written by Claude Code when it loads the mod. `tsc` needs it, so load the mod once first.

The pre-push hook runs the same check. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

### Work on several features at once

Use one worktree and one session per feature. Sessions don't load each other's code.

- The link belongs to that session ID. It survives restarting or resuming that session. A new session needs a new link.
- Old `dev-mods/<id>` folders stay behind. You can delete them.
- The installed copy is at user scope, so it is active in every session with no dev copy. Usually you don't need to disable it, because the dev copy already overrides it.
- To disable it for one folder only, run this from that folder:

```bash
claude plugin disable muslim@claude-muslim --scope local
```

Disabling it at user scope affects all sessions.

What dev sessions share:

- Options. They live in `~/.claude/settings.json` under `pluginConfigs["muslim@inline"]`. All dev copies share them. The installed copy has its own entry.
- `$.store`, such as the athkar daily progress. It is kept across sessions, so it is likely shared by all copies named `muslim`.

Don't put `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json` for this. It applies to every session, so all sessions would run that one worktree.

### Try it as a user

Open a session with no dev link, for example in the main worktree. It runs the installed copy.

```bash
claude plugin list
```

That shows the installed version. `/muslim` shows the running version. Bump the version on the feature branch so you can tell the copies apart.

Updates arrive only after the version changes on GitHub `main` and the user runs `claude plugin update`.

### Test the installed form before pushing (untested)

A folder marketplace is read live. Our `marketplace.json` source is `./`. But the name `claude-muslim` is already taken by the GitHub marketplace. Remove it first:

```bash
claude plugin marketplace remove claude-muslim
```

```bash
claude plugin marketplace add <folder>
```

Afterwards, remove the folder one and add the GitHub one back.

### Release

Users get an update only when the version changes. For each release:

1. Bump `version` in `.claude-plugin/plugin.json` and `VERSION` in `src/constants.ts`.
2. Add an entry to `CHANGELOG.md`.
3. Merge to `main`.
4. Tag it:

```bash
claude plugin tag .
```

5. Push `main`. This is the step that makes it reach users.
6. Check that it arrives:

```bash
claude plugin update muslim@claude-muslim
```

Then run `/reload-plugins`.

### When the wrong code loads

Nothing warns you about these:

- No dev link in the session. The installed copy runs, with the same commands.
- A link points at the wrong worktree. Check with `ls -l ~/.claude/dev-mods/*/muslim`.
- A dev-mods folder holds a copied folder instead of a link. The code is stale.
- `CLAUDE_CODE_PLUGIN_DIRS` is set in global settings.
- An old marketplace has the same plugin name (`muslim-mod-dev`). Remove it:

```bash
claude plugin marketplace remove muslim-mod-dev
```

- You forgot the version bump. Users never get the update.

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
