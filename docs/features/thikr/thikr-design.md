# Thikr line — design

The thikr line's own design. It adds to the shared base in [DESIGN.md](../../../DESIGN.md) and never contradicts it. What the feature does is in [thikr spec](thikr.md).

## Visual means: text only

Thikr is text only. This follows the shared text-only requirement.

- **Claude's own font and size.** No custom fonts, no font size or weight changes.
- **Shared main color.** Phrases in bands use the shared main color (`claude` for orange, light/dark hex otherwise); hints use `dimColor`. Never `error` or `warning`.
- **No drawing.** No SVG, images, raster, Client modules or panes.
- **No animation of our own.** The phrase changes in place at its reading speed; Claude's glyph keeps its own animation.
- **The same everywhere.** Windows, macOS and Linux, terminal and desktop app, every theme and zoom. No surface gets a richer version.

**Why:** the line sits inside Claude's working line many times a day. It must feel like part of Claude, never compete with Claude's own information, and never look different between machines.

## Surfaces

| Moment | Surface | What changes |
| --- | --- | --- |
| Claude works | Spinner | The words Claude lets a mod replace (`word`, `message`, `suffix`); glyph, timer and `esc to interrupt` stay |
| Desktop step row | Spinner | The thikr follows the step's words after ` · ` |
| End of turn (terminal) | TurnDuration | Claude's past-tense word becomes تَمَّ بِحَمْدِ اللَّهِ; the duration stays |
| Usage limit | AbovePrompt band | One line in the shared main color (`claude` for orange, light/dark hex otherwise) until the window resets |
| Settings | Command reply | `/thikr` status and help, one line per change |

## Demo

The shared `/muslim demo` connects a transient signal to this same feature-local starter through a demo-only setup hook. It passes no engine handle across files and writes no state. It tracks its main turn id so unrelated or subagent completions cannot end the demo hold, and signals the shared runner when that hold has ended, so athkar starts after it. Its prompt names the command that started it: `/thikr demo` or `/muslim demo`.

`/thikr demo` uses the same surfaces and the same text-only means. Claude's Spinner draws only while Claude works, so the demo submits a fixed prompt that starts a real turn (it uses tokens and leaves a message in the transcript), in which Claude runs three timed `sleep` steps. The real Spinner, the terminal `TurnDuration` and the `AbovePrompt` usage-limit row play with the real Arabic and color code, just faster. It adds no drawing, animation or color of its own, writes no settings, store or saved state (its armed and playing state is module-local), and when no demo is armed its hooks pass through. Prompt, scenes and timing: `plugin/src/features/thikr/demo.ts`; runner: the marked `DEMO` blocks in `install.tsx`.

## Text

- Terminal rendering and tashkeel behavior follow the shared [terminal Arabic guide](../../terminal/terminal-arabic.md). The shared [Arabic check](../../terminal/terminal-arabic.md#design) is terminal-only and hidden during surveys.

- Phrases are authored with tashkeel in `plugin/src/features/thikr/phrases.ts`; the desktop-only [`/muslim tashkeel` setting](../../terminal/terminal-arabic.md#tashkeel) controls desktop display.
- Every phrase fits one line at 80 columns next to Claude's own text.
- Claude's text and ours are separate runs joined by ` · `, so each keeps its own direction.
- Claude's own numbers (timer, tokens) are never converted.

## Checklist for a change

- [ ] Still text only: no drawing, fonts or animation added.
- [ ] Main-color text uses the shared palette; other text keeps its theme colors.
- [ ] Looks the same in the terminal and the desktop app (tests on both surfaces).
- [ ] Claude's own words and numbers untouched.

The main color is the shared `/muslim color` setting, default Claude orange. It changes only existing main-color accents; Claude's spinner keeps its own color.
