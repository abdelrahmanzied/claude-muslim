# claude-muslim

A Claude Code mod for Muslim developers. While Claude works, its working line carries a short thikr, in Claude's own font and colors, in the terminal and the desktop app. It also brings morning, evening and after-salah athkar, prayer times with an athan moment, a Quran recitation player and a Muslim pane.

Every feature and command is in [plugin/README.md](plugin/README.md). To work on the mod, see [CONTRIBUTING.md](CONTRIBUTING.md).

This repository, `abdelrahmanzied/claude-muslim`, is the only official source of the `muslim` plugin and the `claude-muslim` marketplace. Copies elsewhere are not maintained by us.

## Install

Only the `plugin/` folder is installed; `--sparse` also keeps the download to that folder. All of these install the same mod, at the user scope, so it runs in every project, in the terminal and in the Claude desktop app.

**Inside a Claude Code session in the terminal:**

```
/plugin marketplace add abdelrahmanzied/claude-muslim --sparse .claude-plugin plugin
```

```
/plugin install muslim@claude-muslim
```

**From your shell** (outside Claude):

```bash
claude plugin marketplace add abdelrahmanzied/claude-muslim --sparse .claude-plugin plugin
```

```bash
claude plugin install muslim@claude-muslim
```

Then start Claude Code, or run `/reload-plugins` in a session that is already open.

**Inside any session, desktop app or terminal:** paste this prompt to Claude. It installs the mod, or updates it if it is already installed.

```text
Set up the Claude Code plugin "muslim" for all my sessions (user scope):
1. Run `claude plugin marketplace list`. If `claude-muslim` is not listed, run `claude plugin marketplace add abdelrahmanzied/claude-muslim --sparse .claude-plugin plugin`; otherwise run `claude plugin marketplace update claude-muslim`.
2. Run `claude plugin list`. If `muslim@claude-muslim` is not installed, run `claude plugin install muslim@claude-muslim --scope user`; otherwise run `claude plugin update muslim@claude-muslim`.
3. Show me what each step printed, then tell me to run /reload-plugins.
```

Run `/reload-plugins` when Claude asks, and the mod is active. `/muslim` shows the installed version and your settings.

## Feedback

`/muslim feedback` helps you report a bug, improve something that exists, ask for a new feature, correct the text of the Quran, athkar or thikr, or just send feedback. Claude drafts the GitHub issue, asks you to pick the kind and the feature, shows the draft and sends it only after you choose Send.

## Update

Inside a session, run `/muslim update`: it updates only muslim, tells you the new version and reloads plugins. Claude Code can also update muslim in the background: muslim turns that on for you the first time it runs, and `/muslim autoupdate off` turns it off for good. Or from a shell:

```bash
claude plugin marketplace update claude-muslim
```

```bash
claude plugin update muslim@claude-muslim
```

Then restart Claude Code, or run `/reload-plugins` in an open session. Pasting the prompt above does the same. `/muslim` shows the version you are running; [CHANGELOG.md](CHANGELOG.md) lists what changed.

## Uninstall

```bash
claude plugin uninstall muslim@claude-muslim
```

## License

MIT
