# Changelog

## Unreleased

- Terminal detection now derives per-terminal IDs from `TERM_PROGRAM`, emulator and platform environment markers, with `WindowsConsole` defaulting to reversed Arabic. Any detected ID gets its own stored answer; no supported-terminal registry is needed.
- Per-terminal Arabic setup now applies to every feature's Arabic shown on a terminal: none, tashkeel-stripped, joined logical order, and joined visual RTL order. Defaults are Apple Terminal plain, Warp joined, and none for other terminals. The AbovePrompt survey compares all four treatments with fixed hotkeys 1–4; 5 saves the built-in default. Each terminal ID is remembered independently; `/muslim terminal-arabic` reopens the current terminal's survey. Desktop remains unchanged.

- Shared terminal Arabic rendering for thikr with transformations tailored and saved per terminal.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
