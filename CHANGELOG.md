# Changelog

## 0.3.0

- Morning and evening athkar: a reader above the prompt for Hisn al-Muslim 75–98, morning 05:00–17:00 and evening 17:00–05:00. A cover with the keys, folded to one slim row with a short hint while faded, then click, Space or Enter to count, right click or Backspace to take one back, ← → to move. The repetitions left ride on the progress line's head as a small pill. Moves on after a thikr's last count. 92 and 93 are one thikr with a 10 | 100 choice, as are 91 and 98.
- Sky look (default): on desktop a sky that follows the time of day with slow motion; a plain sky color in the terminal. Sand and Outline looks. Main color orange, green, gold or blue.
- Horizon glow progress, by thikr with partial counts. ﴿رَبَّنَا تَقَبَّلْ مِنَّا﴾ at the end, with falling stars on desktop.
- Reading saved per day and period; × hides the band and keeps it. `/athkar` command: on/off, style, color, `morning|evening reset`.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
