# Design system — muslim mod

The shared base every feature follows, and the index to each feature's own design. Each feature owns its design: its spec is `docs/features/<feature>.md` and its design (surfaces, visual means, requirements) is `docs/features/<feature>-design.md`. Read this before designing a new feature, then the docs of the features you touch.

## Feature index

| Feature | Command | Spec | Design |
| --- | --- | --- | --- |
| Thikr line | `/thikr` | [thikr.md](docs/features/thikr.md) | [thikr-design.md](docs/features/thikr-design.md): text only |
| Morning and evening athkar | `/athkar` | [athkar.md](docs/features/athkar.md) | [athkar-design.md](docs/features/athkar-design.md): a drawn reader (Client module, desktop Svg sky) |
| Salah | `/salah` | [salah.md](docs/features/salah.md) | [salah-design.md](docs/features/salah-design.md): text, richer athan moment |
| Terminal Arabic check ([shared guide](docs/terminal.md)) | `/muslim terminal-arabic` | [arabic-fix.md](docs/features/arabic-fix.md) | [arabic-fix-design.md](docs/features/arabic-fix-design.md) |

Everything below is shared by every feature. A feature's doc may add to it, never contradict it.

## 1. Principles

1. **Claude stays Claude.** We add a layer of thikr to Claude's interface; we never redesign it. Claude's own text (timer, token counts, `esc to interrupt`, tool output) is never translated, reworded or hidden.
2. **Quiet by default.** A reminder, never an interruption. Nothing blocks work, steals focus, plays sound, or appears more than once for the same moment.
3. **Authentic content.** Every phrase is authored data with tashkeel and, where it has one, a source (Quran ayah or Hisn al-Muslim number). Nothing is generated at runtime. Display may strip tashkeel; it never changes words.
4. **No scores.** We never count the user's worship, show streaks, rewards or guilt. Counting exists only where the user counts themselves (athkar reader), and stays private on their machine.
5. **One feature, one switch.** Every feature can be turned off on its own, in `/config` and by its command. Off means its hooks do nothing.
6. **Each feature owns its visual means.** Text in Claude's font, size and colors is the default. A feature may use richer means (images, SVG, animation) only where its design doc says so and why. Anything drawn must work on every surface the feature targets, with a text fallback in the terminal when the richer surface is desktop-only, and must follow the theme and zoom.

## 2. Surfaces

Pick the lightest surface that does the job. Each comes from the mod API (`/plugin-authoring` types are the reference). Each feature's design doc states which surfaces and visual means it uses and why.

| Surface | What it is | Use for | Example |
| --- | --- | --- | --- |
| Spinner | Claude's working line | Short phrase while Claude works; rewrite `word`/`message`/`suffix` only | Thikr line |
| TurnDuration | Line closing a turn (terminal) | One short phrase; keep Claude's duration | تَمَّ بِحَمْدِ اللَّهِ |
| AbovePrompt band | Rows above the input | A suggestion, notice or glanceable fact that needs to be seen; at most one line unless it is a reader. Each feature's hook keeps what `next(e)` returns and adds its own row, so rows stack | Usage limit, athkar reader |
| SessionMode | Mode labels at the right of the prompt footer, before the model name (terminal and desktop) | A glanceable fact as plain text beside the engine's labels; the hook keeps `next(e)` and adds its own | Prayer line |
| Status line | `$.ui.status`, under the prompt | Always-on, glanceable fact; plain text, no color | Not used by a feature yet (the prayer line is in SessionMode) |
| Toast | `$.ui.toast` | One-off confirmation after an action, or a timed reminder inside the app | "speed 3s" (prefer command reply) |
| Notification | `$.ui.notify` | Not used: OS banners show in meetings and screen shares; use a band row or a toast | — |
| Command reply | `command.run` → `{ text }` | Status, help, changing settings | `/thikr` |

Richer surfaces (Pane, Image, Svg, Raster, Client modules) are chosen per feature in its design doc, not here. Passive content does not get a Pane.

Desktop cards above the prompt use `src/shared/card/` for their size, frame, ×, hover, lighting and input. Each feature supplies its content. Only one of these cards shows at a time: the athan card takes the athkar band's place until it closes or expires. Terminal surfaces are unchanged.

The shared card in `src/shared/card/card.ts` also holds the leave, key-rest, idle and focus-grace timings.

## 3. Color

The main color is one plugin-wide setting: `/muslim color orange | green | gold | blue`, default Claude orange. Every feature takes it from `src/shared/color/`; features never define their own palette. Orange text keeps the `claude` theme key so every Claude theme stays exact. Other main colors use the shared light/dark hex shade for the current theme; drawn surfaces use the shared hex palette. Text that is not already in the main color and Claude's own text and spinner keep their colors.

| Role | Theme key | Use |
| --- | --- | --- |
| Thikr / accent | Shared main color (`claude` for orange) | Our phrases in bands; matches the spinner (`rgb(215,119,87)` in the default themes) |
| Body | `text` | Long Arabic text in the athkar reader |
| Secondary | `subtle` / `dimColor` | Sources, counts, hints |
| Done | `success` | Only for "completed" states the user caused (e.g. finished a reader section) |

Never use `error` or `warning` for religious text.

## 4. Typography and Arabic

- **Font and size:** Claude's. We cannot and do not change them.
- **Tashkeel:** desktop-only setting, on by default; terminal display always strips tashkeel regardless of this setting.
- **Direction:** a line that starts with Arabic is read right to left by the surface. When Claude's own Latin text or numbers sit in the same line, keep them as a separate run (e.g. a separator `·`), and never convert Claude's numbers.
- **Our numbers** (counts, times we compute) use Arabic-Indic digits (`١٥:٢٤`, `٢/٣`) inside Arabic lines.
- **Length:** spinner and band phrases fit one line at 80 columns. Longer texts (athkar) live only in the reader, never truncated.
- **Terminal Arabic:** every feature's Arabic on a terminal goes through `src/shared/arabic`; see the [terminal guide](docs/terminal.md) for modes, persistence, survey, and limits.

## 5. Voice

- Arabic for religious content; English for UI chrome (commands, help, settings) until languages land (issue #1).
- Commands answer in one short line: what changed (`speed 3s`), or why not (`Speed is auto, or a whole number of seconds from 1 to 60.`).
- No exclamation marks, emoji or praise in UI text.

## 6. Commands and settings

- One command per feature, named in Arabic transliteration with the `th` spelling: `/thikr`, `/athkar`, `/salah`. Shape: `/<feature> on|off`; `/<feature> <setting> <value>`.
- Every reply that shows settings or help has the same shape, built with `src/table.ts`, the same on every surface:
  - **Status** (`/<feature>`, `/muslim`): the title (`**Muslim › Thikr**`), then one line pointing to help (`To change a setting or see every option: /thikr help`), then a table `| Setting | Description | State |`: what each setting is in a few English words, and its value now. No commands in the status table.
  - **Help** (`/<feature> help`): the title (`**Muslim › Thikr › Help**`), then a table `| Command | Description | Options |`. The command stands alone (`/thikr speed`); Options lists each value and what it does, separated by ` · `, with `(default)` and `DESKTOP ONLY` beside the value they belong to; `—` when there are none.
  - **`/muslim`**: one row per feature (`| Feature | Description | State |`, its main state only), then the shared settings (color, tashkeel, terminal Arabic). Each feature's other settings stay in its own `/<feature>`. `/muslim help` shows the shared commands, then every feature's help table; `/muslim help <feature>` one of them.
- Shared settings (`color`, `tashkeel`) use their own names; feature settings are `userConfig` fields named `<feature><Setting>` (`thikrSpeed`), so it also appears in `/config`. Commands change it with `$.config.set({ key: 'muslim.<field>' })`.
- Defaults are chosen so a new user needs no setup, except where the feature cannot work without input (prayer location).

## 7. Time-based behavior

- Compute from the local clock and timezone; prayer times are calculated locally, no network.
- A timed moment (before prayer, after prayer, usage limit) appears once, clears itself when its moment passes, and survives `/clear` and reloads through `$.state` / `$.store`.
- Timers run only while needed (e.g. the spinner ticker only during a turn).

## 8. Demo

Each feature has its own demo subcommand and `src/features/<feature>/demo.ts` for pure scenes and timing (no `$`, plain unit tests). Its small engine runner stays in `install.ts(x)` with its atoms. A demo plays the real UI on demand and only drives drawing: no settings, store or saved-state changes. Salah uses `/salah athan demo`; a shared `/muslim demo` may later play them all.

## 9. Code shape for a new feature

```
src/features/<feature>/
  install.ts(x)   hooks only: read $, call pure functions, draw
  phrases.ts      authored text (or data.ts)
  *.ts            pure logic, no $
tests/<feature>/  unit tests for pure logic + engine tests on terminal and desktop
docs/features/<feature>.md          the feature's spec
docs/features/<feature>-design.md   the feature's design
```

Wire it in `hooks/register.tsx` (`install<Feature>(on, settings)`), register its command there, add its fields to `plugin.json` `userConfig` and `src/config.ts`, declare any `$.state` values in `types/index.d.ts`.

## 10. New feature checklist

- [ ] Fits the shared base above; uses the lightest surface that does the job.
- [ ] `docs/features/<feature>-design.md` written: surfaces, visual means, why, and the fallback where a surface is desktop-only; linked from the index above and from the spec's Design section.
- [ ] Spec added to `docs/features/<feature>.md` (moments, phrases with sources, settings).
- [ ] Phrases reviewed by a person; sources noted.
- [ ] Off switch in `/config` and the command; off leaves Claude untouched.
- [ ] Main color via the shared module, other colors via theme keys; desktop tashkeel setting respected and terminal tashkeel stripped.
- [ ] Tests on `terminal` and `desktop`; `claude plugin validate`, `claude plugin test`, `tsc` pass.
- [ ] Demo subcommand and pure `demo.ts` for the feature's real UI; no settings, store or saved-state changes.
- [ ] Tried live in a terminal and the desktop app.
- [ ] Change notes added to `CHANGELOG.md` (see CLAUDE.md).
