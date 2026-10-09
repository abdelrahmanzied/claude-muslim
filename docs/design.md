# Design — muslim mod

Three features, each shipped in its own PR:

| Feature | Command | Status |
| --- | --- | --- |
| Thikr line | `/thikr` | 0.2.0 |
| Morning and evening athkar | `/athkar` | planned |
| Salah | `/salah` | planned — issue #2 |

Cross-cutting issues: languages (#1), Arabic in terminals that don't shape (#3).

## Principles

- **Text only.** Claude's own font, size and colors. No drawing, so it works the same on Windows, macOS and Linux, in the terminal and the desktop app, and follows the theme and zoom.
- **Never translate or reword Claude's own text** (timer, token counts, hints). We only replace the words Claude lets a mod replace.
- **Authored religious text** with tashkeel, never generated at runtime.
- **Pure core, thin hooks.** Decisions are pure functions with unit tests; hooks only read `$`, call them, and draw.
- **Settings in `/config`** (`userConfig`); slash commands are shortcuts to the same settings.

## Thikr line (0.2.0)

While Claude works, its working word (the Spinner: "Thinking…", "Sauteing…") is replaced by a thikr phrase. Claude's glyph, color, animation, timer and `esc to interrupt` stay as they are.

### Moments and phrases

Each group plays in a fixed order, one phrase per `speed` seconds (default 3), starting from the first phrase whenever the moment changes.

| Moment | Spinner modes | Phrases |
| --- | --- | --- |
| Starting | first `requesting` of a turn | بسم الله · رب اشرح لي صدري ويسر لي أمري · رب يسر ولا تعسر |
| Thinking | `thinking`, `tool-input`, `tool-use`, later `requesting` | سبحان الله · الحمد لله · لا إله إلا الله · الله أكبر · لا حول ولا قوة إلا بالله العلي العظيم · سبحان الله وبحمده سبحان الله العظيم · أستغفر الله · رب زدني علما · اللهم علمنا ما ينفعنا · توكلت على الله · لا إله إلا أنت سبحانك إني كنت من الظالمين · اللهم إنك عفو تحب العفو فاعف عنا · ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار · يا حي يا قيوم برحمتك أستغيث |
| Writing | `responding` | اللهم صل على محمد |

Full text with tashkeel: `src/features/thikr/phrases.ts`.

### Special moments

- **End of turn** (terminal): Claude's past-tense word ("Baked") becomes تَمَّ بِحَمْدِ اللَّهِ; Claude's duration stays. `/thikr end off` restores Claude's word.
- **Usage limit**: when Claude stops with `rate_limit` and a usage window is at 100%, حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ shows above the prompt in Claude orange until that window resets (or the next turn, when the reset time is unknown). A passing throttle (no full window) shows nothing.

### Settings

| `/config` field | Command | Default |
| --- | --- | --- |
| `thikr` | `/thikr on` · `/thikr off` | on |
| `thikrSpeed` | `/thikr speed <1-60>` | 3 |
| `thikrTashkeel` | `/thikr tashkeel on` · `off` | on |
| `thikrEnd` | `/thikr end on` · `off` | on |

`/thikr` alone shows the current settings and help.

### To verify live

- Desktop: the phrase replaces the step text ("Editing app.ts"); confirm it reads well.
- End-of-turn line: how Claude joins the word and the duration (e.g. "… for 3s") in an RTL phrase.
- Arabic joining and direction per terminal: issue #3.
