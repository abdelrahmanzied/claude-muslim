<p align="center"><img src=".github/assets/readme-welcome.svg" width="320" alt="The Muslim crab says salam, then counts tasbih"></p>

<h1 align="center">claude-muslim</h1>

<p align="center">A Claude Code mod for Muslim developers: thikr while Claude works, athkar, prayer times and the Quran, in the terminal and the desktop app.</p>

## Features

- **Thikr line** (`/thikr`): a short thikr in Claude's working line, in its own font and colors, and تَمَّ بِحَمْدِ اللَّهِ when a turn ends.
- **Athkar** (`/athkar`): the morning, evening and after-salah athkar from Hisn al-Muslim, in a reader above the prompt that counts with you.
- **Prayer times** (`/salah`): the next prayer under the prompt, a countdown, and an athan moment when it comes in. Calculated on your machine.
- **Quran** (`/quran`): a recitation player with Hafs recordings (desktop).
- **Muslim pane** (`/muslim`): today's prayers, the Quran player, athkar progress and every setting in one pane (desktop).

## Install

Inside Claude Code:

```
/plugin marketplace add abdelrahmanzied/claude-muslim --sparse .claude-plugin plugin
/plugin install muslim@claude-muslim
```

Then run `/reload-plugins`.

<details>
<summary>From your shell, or by asking Claude</summary>

```bash
claude plugin marketplace add abdelrahmanzied/claude-muslim --sparse .claude-plugin plugin
claude plugin install muslim@claude-muslim
```

Or paste this to Claude in any session:

```text
Set up the Claude Code plugin "muslim" for all my sessions (user scope):
1. Run `claude plugin marketplace list`. If `claude-muslim` is not listed, run `claude plugin marketplace add abdelrahmanzied/claude-muslim --sparse .claude-plugin plugin`; otherwise run `claude plugin marketplace update claude-muslim`.
2. Run `claude plugin list`. If `muslim@claude-muslim` is not installed, run `claude plugin install muslim@claude-muslim --scope user`; otherwise run `claude plugin update muslim@claude-muslim`.
3. Show me what each step printed, then tell me to run /reload-plugins.
```

</details>

## Get started

| Command | |
| --- | --- |
| `/muslim` | Open the Muslim pane (desktop), or see your settings (terminal) |
| `/muslim help` | Every command |
| `/muslim demo` | See every feature play |
| `/muslim update` | Update to the latest version |
| `/muslim feedback` | Report a bug or send an idea |

To remove it: `claude plugin uninstall muslim@claude-muslim`.

## More

- [CHANGELOG.md](CHANGELOG.md): what changed in each version.
- [CONTRIBUTING.md](CONTRIBUTING.md): how to work on the mod.
- This repository is the only official source of the `muslim` plugin. Copies elsewhere are not maintained by us.
- Some terminals don't join Arabic letters or show them right to left; `/muslim terminal-arabic` picks what works in yours.

MIT License
