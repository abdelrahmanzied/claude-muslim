# Design system — muslim mod

The rules every feature follows. Read this before designing a new feature; the per-feature specs live in `docs/design.md`.

## 1. Principles

1. **Claude stays Claude.** We add a layer of thikr to Claude's interface; we never redesign it. Claude's own text (timer, token counts, `esc to interrupt`, tool output) is never translated, reworded or hidden.
2. **Text only.** Everything is plain text in Claude's own font, size and colors. No SVG, images, custom fonts or drawing. It must look right on Windows, macOS and Linux, in the terminal and the desktop app, follow the user's theme and scale with zoom. **One exception: the athkar reader** (see Exceptions).
3. **Quiet by default.** A reminder, never an interruption. Nothing blocks work, steals focus, plays sound, or appears more than once for the same moment.
4. **Authentic content.** Every phrase is authored data with tashkeel and, where it has one, a source (Quran ayah or Hisn al-Muslim number). Nothing is generated at runtime. Display may strip tashkeel; it never changes words.
5. **No scores.** We never count the user's worship, show streaks, rewards or guilt. Counting exists only where the user counts themselves (athkar reader), and stays private on their machine.
6. **One feature, one switch.** Every feature can be turned off on its own, in `/config` and by its command. Off means its hooks do nothing.
7. **Desktop app and terminal only.** Phones and other surfaces are out of scope: no mobile layouts, no phone-width checks, in the mod or in any reference page.

## 2. Surfaces we use

Pick the lightest surface that does the job. Each comes from the mod API (`/plugin-authoring` types are the reference).

| Surface | What it is | Use for | Example |
| --- | --- | --- | --- |
| Spinner | Claude's working line | Short phrase while Claude works; rewrite `word`/`message`/`suffix` only | Thikr line |
| TurnDuration | Line closing a turn (terminal) | One short phrase; keep Claude's duration | تَمَّ بِحَمْدِ اللَّهِ |
| AbovePrompt band | Rows above the input | A suggestion or notice that needs to be seen; at most one line unless it is a reader | Usage limit, after-prayer suggestion, athkar reader |
| Status line | `$.ui.status`, under the prompt | Always-on, glanceable fact; plain text, no color | Next prayer time |
| Toast | `$.ui.toast` | One-off confirmation after an action | "speed 3s" (prefer command reply) |
| Notification | `$.ui.notify` | Only for time-critical moments the user opted into | Prayer time |
| Command reply | `command.run` → `{ text }` | Status, help, changing settings | `/thikr` |

Not used: custom Panes for passive content, Images, Raster. Svg and Client modules only in the athkar reader.

### Exceptions: the athkar reader

The athkar reader is the one feature the person sits with, so it is drawn:

- **Client module** (`src/features/athkar/reader.tsx`) for the reader: it takes clicks and keys, keeps the cover and the active look, and posts each count to the hooks module. Terminal and desktop.
- **Svg** (desktop only) for the Sky look: a sky that follows the time of day with slow SMIL motion, drawn behind the reader. The terminal and the Frame look use a plain background color.
- **Hex colors** for the reader's main color (orange, green, gold, blue, in a light and a dark shade) and the skies, since a theme key cannot be blended or placed on a sky.

Everything else (font, size) stays Claude's: the API sets neither, so the reader follows the app's zoom.

The reader's own rules (fixed size, counts, clicks and keys, when it folds) are in [docs/athkar-design.md](docs/athkar-design.md).

## 3. Color

Use theme keys, never hex, so every theme (light, dark, color-blind, ANSI) stays correct.

| Role | Theme key | Use |
| --- | --- | --- |
| Thikr / accent | `claude` | Our phrases in bands; matches the spinner (`rgb(215,119,87)` in the default themes) |
| Body | `text` | Long Arabic text in the athkar reader |
| Secondary | `subtle` / `dimColor` | Sources, counts, hints |
| Done | `success` | Only for "completed" states the user caused (e.g. finished a reader section) |

Never use `error` or `warning` for religious text.

## 4. Typography and Arabic

- **Font and size:** Claude's. We cannot and do not change them.
- **Tashkeel:** on by default; each feature respects a `…Tashkeel` setting through `display(text, tashkeel)`.
- **Direction:** a line that starts with Arabic is read right to left by the surface. When Claude's own Latin text or numbers sit in the same line, keep them as a separate run (e.g. a separator `·`), and never convert Claude's numbers.
- **Our numbers** (counts, times we compute) use Arabic-Indic digits (`١٥:٢٤`, `٢/٣`) inside Arabic lines.
- **Length:** spinner and band phrases fit one line at 80 columns. Longer texts (athkar) live only in the reader, never truncated.
- **Terminals that don't shape Arabic:** tracked in issue #3; don't work around it per feature.

## 5. Voice

- Arabic for religious content; English for UI chrome (commands, help, settings) until languages land (issue #1).
- Commands answer in one short line: what changed (`speed 3s`), or why not (`Speed is auto, or a whole number of seconds from 1 to 60.`).
- No exclamation marks, emoji or praise in UI text.

## 6. Commands and settings

- One command per feature, named in Arabic transliteration with the `th` spelling: `/thikr`, `/athkar`, `/salah`. `/muslim` shows the version.
- Shape: `/<feature>` = status + help; `/<feature> on|off`; `/<feature> <setting> <value>`.
- Every setting is a `userConfig` field named `<feature><Setting>` (`thikrSpeed`), so it also appears in `/config`. Commands change it with `$.config.set({ key: 'muslim.<field>' })`.
- Defaults are chosen so a new user needs no setup, except where the feature cannot work without input (prayer location).

## 7. Time-based behavior

- Compute from the local clock and timezone; prayer times are calculated locally, no network.
- A timed moment (before prayer, after prayer, usage limit) appears once, clears itself when its moment passes, and survives `/clear` and reloads through `$.state` / `$.store`.
- Timers run only while needed (e.g. the spinner ticker only during a turn).

## 8. Code shape for a new feature

```
src/features/<feature>/
  install.ts(x)   hooks only: read $, call pure functions, draw
  phrases.ts      authored text (or data.ts)
  *.ts            pure logic, no $
tests/<feature>/  unit tests for pure logic + engine tests on terminal and desktop
```

Wire it in `hooks/register.tsx` (`install<Feature>(on, settings)`), register its command there, add its fields to `plugin.json` `userConfig` and `src/config.ts`, declare any `$.state` values in `types/index.d.ts`.

## 9. New feature checklist

- [ ] Fits the principles above; uses the lightest surface.
- [ ] Spec added to `docs/design.md` (moments, phrases with sources, settings).
- [ ] Phrases reviewed by a person; sources noted.
- [ ] Off switch in `/config` and the command; off leaves Claude untouched.
- [ ] Colors via theme keys; tashkeel setting respected.
- [ ] Tests on `terminal` and `desktop`; `claude plugin validate`, `claude plugin test`, `tsc` pass.
- [ ] Tried live in a terminal and the desktop app.
- [ ] `CHANGELOG.md` and version bumped.
