# Changelog

## 0.3.0

- Morning and evening athkar: a reader above the prompt for Hisn al-Muslim 75–98, morning 05:00–17:00 and evening 17:00–05:00. Counts come from the data file only (91 and 92 a hundred, 98 ten); 92 and 93 are one thikr.
- Cover with the title and the keys (two columns, no Esc). Click, Space or Enter counts; right click or Backspace takes one back; ← next, → previous. The first click on a faded band only lights it; the cover's next click opens the reading. Moves on 650 ms after a thikr's last count.
- Quran passages show their name beside the set position (آية الكرسي, سورة الإخلاص, الفلق, الناس), on desktop and in the terminal.
- Progress: a horizon glow along the bottom; the repetitions left ride its head in a small pill; the set position sits at its left end.
- Size: one open height, 77px, for the cover, reading, finale and done row; faded, each folds to one 24px row. Text at a fixed 14px that shrinks only to fit its two-line box, with no floor. No size setting.
- Folds by itself: 1 s after the pointer leaves, 3 s after the last key with the pointer off the band, at once when typing in the prompt, and after 90 s with no input.
- End: on desktop stars fall and ﴿رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ﴾ rises centered with — البقرة ١٢٧ at 18px. Then the done row: the verse at 14px, `/athkar <period> reset → to read again`, and a ✓ on the full line's head. Folded: أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الْمَسَاءُ (or الصَّبَاحُ). The verse takes the words' color on a sky, the main color on Frame.
- Looks: Sky (default), a sky that follows the time of day on desktop and its plain color in the terminal; Frame, a main-color frame. Main color orange, green, gold or blue.
- Reading saved per day (05:00 to 05:00) and period; × hides the band and keeps it. `/athkar`: status, on/off, style, color, `morning|evening reset`. Settings also in `/config`.
- Thikr line: the usage-limit thikr also shows as soon as a response reports a full usage window.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
