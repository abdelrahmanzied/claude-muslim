<p align="center">
  <img src=".github/assets/readme-welcome.svg" width="320" alt="The Muslim crab says salam, then counts tasbih">
</p>

<h1 align="center">claude-muslim</h1>

<p align="center">
  Thikr, athkar, prayer times and the Quran, inside Claude Code.<br>
  In the terminal and the desktop app.
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#install">Install</a> ·
  <a href="#get-started">Get started</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

## Features

| | Feature | What it does |
| :---: | --- | --- |
| 📿 | **Thikr line** · `/thikr` | A short thikr in Claude's working line while it works, and تَمَّ بِحَمْدِ اللَّهِ when a turn ends. |
| 🌅 | **Athkar** · `/athkar` | Morning, evening and after-salah athkar from Hisn al-Muslim, in a reader above the prompt that counts with you. |
| 🕌 | **Prayer times** · `/salah` | The next prayer under the prompt, a countdown, and an athan moment when it comes in. Calculated on your machine. |
| 📖 | **Quran** · `/quran` | A recitation player with complete Hafs recordings. Desktop. |
| ☾ | **Muslim pane** · `/muslim` | Today's prayers, the Quran player, athkar progress and every setting in one pane. Desktop. |

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

> [!NOTE]
> Some terminals don't join Arabic letters or show them right to left. `/muslim terminal-arabic` picks what works in yours.

## Contributing

Ideas, bugs and fixes are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Security problems go to [SECURITY.md](SECURITY.md), never a public issue.

This repository is the only official source of the `muslim` plugin. Copies elsewhere are not maintained by us.

## License

[MIT](LICENSE)
