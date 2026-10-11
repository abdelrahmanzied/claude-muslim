# Design — muslim mod

Three features, each shipped in its own PR:

| Feature | Command | Status |
| --- | --- | --- |
| Thikr line | `/thikr` | 0.2.0 |
| Morning and evening athkar | `/athkar` | planned |
| Salah | `/salah` | planned — issue #2 |

Cross-cutting issues: languages (#1), Arabic in terminals that don't shape (#3; see the [terminal Arabic guide](terminal.md)).

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
- **Usage limit**: when Claude stops with `rate_limit` and a usage window is at 100%, حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ shows above the prompt in Claude orange until that window resets (or the next turn, when the reset time is unknown). A passing throttle (no full window) shows nothing.

### Settings

| `/config` field | Command | Default |
| --- | --- | --- |
| `thikr` | `/thikr on` · `/thikr off` | on |
| `thikrSpeed` | `/thikr speed auto` · `/thikr speed <1-60>` | auto |
| `thikrEnd` | `/thikr end on` · `off` | on |
| `thikrMode` | `/thikr mode all` · `/thikr mode salawat` | all |

`/thikr` alone shows the current settings and help.

Tashkeel is a desktop-only choice controlled by [`/muslim tashkeel`](terminal.md#tashkeel); terminal Arabic always strips it.

### To verify live

- Desktop: step text and thikr side by side read well at narrow widths.
- End-of-turn line: how Claude joins the word and the duration (e.g. "… for 3s") in an RTL phrase.
- Arabic joining and direction per terminal: issue #3.
