# Changelog

## Unreleased

- `/muslim` shows a settings table, the same on every surface: tashkeel, thikr, and terminal Arabic (this terminal's mode, or its default if not chosen yet; `terminal only` on desktop), each with the command that changes it.
- Terminal Arabic has three per-terminal modes: `plain` strips tashkeel, `joined` also applies presentation forms in logical order, and `reversed` also reorders Arabic runs for visual RTL display. Tashkeel is always stripped on terminal because terminals draw marks poorly and partial redraws can garble them.
- Defaults are Apple Terminal `plain`, Warp `joined`, Windows Console `reversed`, and `plain` for every other terminal ID. The first-run survey compares these treatments with hotkeys 1–3; invalid saved modes reopen the survey. `/muslim terminal-arabic` reopens it manually.
- `/muslim tashkeel on | off` controls Arabic diacritics on desktop and non-terminal surfaces only. `/thikr tashkeel` was replaced by `/muslim tashkeel`.
- Thikr spinner, end-of-turn, and usage-limit phrases all use the shared Arabic display path.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
