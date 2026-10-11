# Changelog

## Unreleased

- First-run terminal Arabic check: two rows identify muslim and offer isolated Arabic sample buttons plus Not now. Remember first display, ask in one session only, and confirm each press with the command for changing the mode later. Desktop unchanged.

- Shared terminal Arabic fix: contextual joining and visual RTL order for thikr, `/muslim arabic-fix on | off | auto`, and a machine-local first-run comparison. Auto enables only for Apple Terminal; desktop stays unchanged.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
