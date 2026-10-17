<p align="center"><img src="https://github.com/abdelrahmanzied/claude-muslim/raw/main/.github/assets/readme-welcome.svg" width="320" alt="The Muslim crab says salam, then counts tasbih"></p>

<h1 align="center">muslim</h1>

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

Then run `/reload-plugins`. More ways to install: the [repository README](https://github.com/abdelrahmanzied/claude-muslim#install).

## Get started

| Command | |
| --- | --- |
| `/muslim` | Open the Muslim pane (desktop), or see your settings (terminal) |
| `/muslim help` | Every command |
| `/muslim demo` | See every feature play |
| `/muslim update` | Update to the latest version |
| `/muslim feedback` | Report a bug or send an idea |

[Changelog](https://github.com/abdelrahmanzied/claude-muslim/blob/main/CHANGELOG.md) · MIT License
