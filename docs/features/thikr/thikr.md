# Thikr line

While Claude works, a thikr phrase joins its working line (the Spinner). Claude's glyph, color, animation, timer and `esc to interrupt` stay as they are, and so does any information Claude shows:

| Surface | Claude shows | With thikr |
| --- | --- | --- |
| Both | a decorative verb, `Musing…`, `Sauteing…` | `سُبْحَانَ اللَّهِ` (no information, so it is dropped) |
| Desktop, using a tool | the step, `Editing app.ts` | `Editing app.ts · سُبْحَانَ اللَّهِ` (generic `Working` is dropped) |
| Both | a status message, `Compacting conversation` | `Compacting conversation · سُبْحَانَ اللَّهِ` |

## Moments and phrases

A turn opens with the starting phrases, then the thinking order plays through thinking and tools, and the writing pair while Claude writes the answer. While Claude waits on something long, the long group plays instead, and thinking returns when it ends.

| Moment | When | Phrases |
| --- | --- | --- |
| Starting | first `requesting` of a turn | بسم الله · توكلت على الله · رب اشرح لي صدري ويسر لي أمري · رب يسر ولا تعسر |
| Thinking | everything else: `thinking`, tools, later `requesting` | سبحان الله · الحمد لله · لا إله إلا الله · الله أكبر · لا حول ولا قوة إلا بالله العلي العظيم · سبحان الله وبحمده سبحان الله العظيم · أستغفر الله · اللهم صل على محمد |
| Writing | `responding` (Claude writes the answer) | رب زدني علما · اللهم علمنا ما ينفعنا |
| Long | compacting (`PreCompact` → `PostCompact`), a subagent at work (`Agent` tool call), or any tool running 10 s or more | لا إله إلا أنت سبحانك إني كنت من الظالمين · اللهم إنك عفو تحب العفو فاعف عنا · ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار · يا حي يا قيوم برحمتك أستغيث |

Each turn opens on a random starting phrase, never the one the last turn opened with, then plays the rest of the starting order. Each group loops in order and resumes where it left off when Claude moves between moments in the same turn, so short switches never replay the same first phrase.

## Salawat mode

`/thikr mode salawat` replaces every group (starting, thinking, writing, long) with one salawat on the Prophet ﷺ. A whole turn keeps the same one; the next turn takes the next, looping:

اللهم صل على محمد · اللهم صل وسلم على نبينا محمد · اللهم صل على محمد وعلى آل محمد · اللهم صل على محمد عبدك ورسولك · اللهم صل وسلم وبارك على سيدنا محمد

End of turn and usage limit keep their own phrases.

## Desktop step rows

A desktop step row (`Running a command 6s >`) keeps its words with the thikr after them (`Running a command · اللَّهُ أَكْبَرُ`). The desktop keeps a step's row up after its tool ends and during long runs, whatever mode it reports, so a word equal to the last step, or any word while a tool runs, counts as that step.

## Speed

- **auto** (default): each phrase stays for its reading time, 1 s + 0.5 s per word. سبحان الله stays 2 s; ربنا آتنا … 6.5 s.
- **fixed**: `/thikr speed <1-60>` gives every phrase the same seconds. `/thikr speed auto` goes back.

Full text with tashkeel: `src/features/thikr/phrases.ts`.

## Special moments

- **End of turn** (terminal): Claude's past-tense word ("Baked") becomes تَمَّ بِحَمْدِ اللَّهِ; Claude's duration stays. `/thikr end off` restores Claude's word.
- **Usage limit**: when Claude stops with `rate_limit` and a usage window is at 100%, حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ shows above the prompt in the shared main color (default Claude orange) until that window resets (or the next turn, when the reset time is unknown). A passing throttle (no full window) shows nothing.

## Settings

Main-color accents follow the plugin-wide `/muslim color orange | green | yellow | blue` setting through `src/shared/color/`, default Claude orange. Other colors stay as they are.

Terminal Arabic uses the shared three-mode behavior, and terminal output always strips tashkeel. The desktop-only tashkeel setting follows `/muslim tashkeel`; `/thikr tashkeel` was replaced by `/muslim tashkeel`. See [the Arabic check](../../terminal/terminal-arabic.md#checks) and the single [terminal Arabic reference](../../terminal/terminal-arabic.md).

| `/config` field | Command | Default |
| --- | --- | --- |
| `thikr` | `/thikr on` · `/thikr off` | on |
| `thikrSpeed` | `/thikr speed auto` · `/thikr speed <1-60>` | auto |
| `thikrEnd` | `/thikr end on` · `off` | on |
| `thikrMode` | `/thikr mode all` · `/thikr mode salawat` | all |

`/thikr` alone shows the current settings and help.

Tashkeel is controlled on desktop by [`/muslim tashkeel`](../../terminal/terminal-arabic.md#tashkeel); terminals always strip it.

## To verify live

- Desktop: step text and thikr side by side read well at narrow widths.
- End-of-turn line: how Claude joins the word and the duration (e.g. "… for 3s") in an RTL phrase.
- With `auto`, check joined RTL phrases in Warp and Terminal.app, with HH:MM digits unchanged. On an unidentified terminal without bidi/shaping, select `on`; use `off` when the terminal handles Arabic.

## Demo

The shared `/muslim demo` connects a transient signal to this same feature-local starter through a demo-only setup hook. It passes no engine handle across files and writes no state. It tracks its main turn id so unrelated or subagent completions cannot end the demo hold, and signals the shared runner when that hold has ended, so athkar starts after it. Its prompt names the command that started it: `/thikr demo` or `/muslim demo`.

`/thikr demo` plays every moment for videos or to preview them, and changes no settings, store or saved state. Claude draws its working line only while it works, so the demo starts a real turn of its own: it uses tokens and leaves a message in the transcript. The reply says `Thikr demo: playing. Claude runs a few short steps (about 30 s).` Claude then runs three timed Bash steps (`sleep 6`, `sleep 14` (a long step, over 10 s), `sleep 9`, each with a "Thikr demo: …" description) and answers with one short line. If Claude asks to approve the Bash commands, approve them to let the demo go on. During that turn:

1. The Spinner plays, a phrase every 1.5 s whatever the speed setting, the starting group, the thinking group, the writing group, the long group, then one salawat (the first of salawat mode's list). The last holds if the turn runs longer. The 28.5 s sequence runs from the turn's start, so time spent waiting to approve a command cuts into it.
2. At the end of the turn (terminal) the line says تَمَّ بِحَمْدِ اللَّهِ, even with `/thikr end off`.
3. After the turn the usage-limit line shows above the prompt for 3 s, then goes.

The demo then disarms itself; `/thikr demo` again plays it again. It plays with thikr off too. With no demo armed nothing changes. The prompt, steps, scenes and timing are in `src/features/thikr/demo.ts`; the runner is the `DEMO` blocks in `install.tsx`.

## Design

Text only, in Claude's font, size and colors: [thikr design](thikr-design.md).

## Files

| File | Holds |
| --- | --- |
| `src/features/thikr/install.tsx` | the hooks: spinner text, end of turn, usage limit, and the `/thikr` command |
| `src/features/thikr/phrases.ts` | the authored phrases with tashkeel: starting, thinking, writing, long, salawat, end of turn, usage limit |
| `src/features/thikr/rotation.ts` | pure logic: moment to group, phrase timing and speed, start pick, joining thikr to Claude's words |
| `src/features/thikr/limit.ts` | pure logic: when a usage limit ends, from the rate-limit windows |
| `src/features/thikr/demo.ts` | pure scenes and timing of `/thikr demo`: the demo prompt and its Bash steps, the phrase order, 1.5 s step, 3 s usage-limit hold, the reply |
