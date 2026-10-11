# Design — muslim mod

Three features, each shipped in its own PR:

| Feature | Command | Status |
| --- | --- | --- |
| Thikr line | `/thikr` | 0.2.0 |
| Morning and evening athkar | `/athkar` | 0.3.0 |
| Salah | `/salah` | planned — issue #2 |

Cross-cutting issues: languages (#1), Arabic in terminals that don't shape (#3).

## Principles

- **Text only.** Claude's own font, size and colors. No drawing, so it works the same on Windows, macOS and Linux, in the terminal and the desktop app, and follows the theme and zoom.
- **Never translate or reword Claude's own text** (timer, token counts, hints). We only replace the words Claude lets a mod replace.
- **Authored religious text** with tashkeel, never generated at runtime.
- **Pure core, thin hooks.** Decisions are pure functions with unit tests; hooks only read `$`, call them, and draw.
- **Settings in `/config`** (`userConfig`); slash commands are shortcuts to the same settings.

## Thikr line (0.2.0)

While Claude works, a thikr phrase joins its working line (the Spinner). Claude's glyph, color, animation, timer and `esc to interrupt` stay as they are, and so does any information Claude shows:

| Surface | Claude shows | With thikr |
| --- | --- | --- |
| Both | a decorative verb, `Musing…`, `Sauteing…` | `سُبْحَانَ اللَّهِ` (no information, so it is dropped) |
| Desktop, using a tool | the step, `Editing app.ts` | `Editing app.ts · سُبْحَانَ اللَّهِ` (generic `Working` is dropped) |
| Both | a status message, `Compacting conversation` | `Compacting conversation · سُبْحَانَ اللَّهِ` |

### Moments and phrases

A turn opens with the starting phrases, then the thinking order plays through thinking and tools, and the writing pair while Claude writes the answer. While Claude waits on something long, the long group plays instead, and thinking returns when it ends.

| Moment | When | Phrases |
| --- | --- | --- |
| Starting | first `requesting` of a turn | بسم الله · توكلت على الله · رب اشرح لي صدري ويسر لي أمري · رب يسر ولا تعسر |
| Thinking | everything else: `thinking`, tools, later `requesting` | سبحان الله · الحمد لله · لا إله إلا الله · الله أكبر · لا حول ولا قوة إلا بالله العلي العظيم · سبحان الله وبحمده سبحان الله العظيم · أستغفر الله · اللهم صل على محمد |
| Writing | `responding` (Claude writes the answer) | رب زدني علما · اللهم علمنا ما ينفعنا |
| Long | compacting (`PreCompact` → `PostCompact`), a subagent at work (`Agent` tool call), or any tool running 10 s or more | لا إله إلا أنت سبحانك إني كنت من الظالمين · اللهم إنك عفو تحب العفو فاعف عنا · ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار · يا حي يا قيوم برحمتك أستغيث |

Each turn opens on a random starting phrase, never the one the last turn opened with, then plays the rest of the starting order. Each group loops in order and resumes where it left off when Claude moves between moments in the same turn, so short switches never replay the same first phrase.

### Salawat mode

`/thikr mode salawat` replaces every group (starting, thinking, writing, long) with one salawat on the Prophet ﷺ. A whole turn keeps the same one; the next turn takes the next, looping:

اللهم صل على محمد · اللهم صل وسلم على نبينا محمد · اللهم صل على محمد وعلى آل محمد · اللهم صل على محمد عبدك ورسولك · اللهم صل وسلم وبارك على سيدنا محمد

End of turn and usage limit keep their own phrases.

### Desktop step rows

A desktop step row (`Running a command 6s >`) keeps its words with the thikr after them (`Running a command · اللَّهُ أَكْبَرُ`). The desktop keeps a step's row up after its tool ends and during long runs, whatever mode it reports, so a word equal to the last step, or any word while a tool runs, counts as that step.

### Speed

- **auto** (default): each phrase stays for its reading time, 1 s + 0.5 s per word. سبحان الله stays 2 s; ربنا آتنا … 6.5 s.
- **fixed**: `/thikr speed <1-60>` gives every phrase the same seconds. `/thikr speed auto` goes back.

Full text with tashkeel: `src/features/thikr/phrases.ts`.

### Special moments

- **End of turn** (terminal): Claude's past-tense word ("Baked") becomes تَمَّ بِحَمْدِ اللَّهِ; Claude's duration stays. `/thikr end off` restores Claude's word.
- **Usage limit**: when Claude stops with `rate_limit` and a usage window is at 100%, حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ shows above the prompt in Claude orange until that window resets (or the next turn, when the reset time is unknown). A passing throttle (no full window) shows nothing.

### Settings

| `/config` field | Command | Default |
| --- | --- | --- |
| `thikr` | `/thikr on` · `/thikr off` | on |
| `thikrSpeed` | `/thikr speed auto` · `/thikr speed <1-60>` | auto |
| `thikrTashkeel` | `/thikr tashkeel on` · `off` | on |
| `thikrEnd` | `/thikr end on` · `off` | on |
| `thikrMode` | `/thikr mode all` · `/thikr mode salawat` | all |

`/thikr` alone shows the current settings and help.

## Morning and evening athkar (0.3.0)

A reader above the prompt for the morning athkar (05:00 to 17:00) and the evening athkar (17:00 to 05:00), from Hisn al-Muslim 75 to 98 (`src/features/athkar/data.ts`). 93 is the same words as 92, so they are one thikr. Counts come only from the data file: 91 and 92 a hundred, 98 ten.

### Reading

- **Cover:** the title (أَذْكَارُ الصَّبَاحِ or أَذْكَارُ الْمَسَاءِ) and the keys. Faded, it folds to one slim row (24px, the reading's folded height): the title on the right, a muted one-line hint (`click to start`, or `click to continue`) at the left, the × at the left edge and the thin progress line. The first click only opens it (full cover with the keys); the next starts the reading; neither counts.
- **Count:** click, Space or Enter adds one. Right click or Backspace takes one back, or goes to the thikr before at 0. ← next, → previous (Arabic reads right to left). Esc gives the prompt back.
- **Count on the line:** no circles. The progress line along the bottom shows the whole set; a small pill on its glowing head shows the repetitions left on this thikr in Arabic-Indic digits (٣ then ٢, ١, ٠; ١ for a thikr said once), easing along with the head and kept clear of both ends of the line. The set position (e.g. ١٦ مِنْ ٢٢) sits small and muted at the line's left end. In the terminal the head is `` ٢ `` on the main color.
- **Sizes (desktop):** the open reading and the cover are one fixed height for every thikr, 77px at the default 14px size (it follows only the text size). The words fit their box at your size, or shrink just enough, to a floor of 9px; the cover's title and keys fit the width the same way. Faded, the reading and the cover fold to one row (24px); the done row is 56px.
- **Moves on** by itself 650 ms after a thikr's last count.
- **Progress:** Horizon glow, a soft line along the bottom filled from the right, its head pulsing slowly and easing forward on each count. Each thikr is an equal share, partial counts included: `Σ min(count / times, 1) / n`.
- **End:** ﴿رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ﴾ — البقرة ١٢٧ on the right, `/athkar morning reset to read again` on the left, and on desktop stars fall across the sky. A click hides it.
- **×** hides the band and keeps the reading; `/athkar` brings it back.
- **Saved** per day and period in `$.store`. A day runs 05:00 to 05:00, so evening athkar read after midnight still count for that evening. A new day starts fresh; a finished period does not show again that day.

### Looks

| Look | Surface | Drawn as |
| --- | --- | --- |
| Sky (default) | desktop | A sky that follows the clock: dawn 4–6, sunrise 6–8, clear day 8–17, rose 17–18, blue hour 18–19, crescent 19–4. Rich motion: stars, sun, clouds, birds, shooting stars. Faded until clicked, then in color. |
| Sky | terminal | The same sky's color as a plain background. |
| Outline | both | A main-color outline; the frame breathes while reading. |

On every sky the pill is the main color with a white number. Sunrise takes dark words; every other sky white.

### Settings

| `/config` field | Command | Default |
| --- | --- | --- |
| `athkar` | `/athkar on` · `off` | on |
| `athkarStyle` | `/athkar style sky` · `outline` | sky |
| `athkarColor` | `/athkar color orange` · `green` · `gold` · `blue` | orange |
| `athkarSize` | `/athkar size 12` … `28` | 14 |

`/athkar morning reset` · `/athkar evening reset` start that period again. `/athkar` shows the status and help.

Not settable: the font (Tajawal in the design) and the text size. The mod API sets neither; the reader uses Claude's font and follows the app's zoom.

### To verify live

- Athkar: the sky picture's size behind the reader on desktop (it is sized from an estimate of the cell size), right click on desktop, and Arabic alignment in the reader.

- Desktop: step text and thikr side by side read well at narrow widths.
- End-of-turn line: how Claude joins the word and the duration (e.g. "… for 3s") in an RTL phrase.
- Arabic joining and direction per terminal: issue #3.
