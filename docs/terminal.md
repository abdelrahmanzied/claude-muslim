# Terminal Arabic

This is the shared reference for Arabic shown by every feature on a terminal surface. Each feature routes its own Arabic text through `src/shared/arabic`; Claude's text and desktop rendering are left alone.

## Modes and defaults

Tashkeel is always removed from Arabic rendered on a terminal. Terminals draw marks poorly, and partial redraws can garble them. Tashkeel is a desktop-only choice controlled by `/muslim tashkeel`.

| Mode | Display treatment | Default terminal |
| --- | --- | --- |
| `plain` | Strip tashkeel only | `Apple_Terminal` and every other unlisted ID |
| `joined` | Strip tashkeel and apply contextual presentation forms; keep logical order | `WarpTerminal` |
| `reversed` | Strip tashkeel, shape, then reorder Arabic runs for visual RTL display | `WindowsConsole` |

A saved value that is not one of these three modes is treated as missing and the survey appears again for that terminal.

## First-run survey

The first time Claude Code opens with the plugin in a terminal ID with no saved answer, the first eligible AbovePrompt render shows:

```text
muslim · Terminal Arabic Setup · Which word is written correctly?
Some terminals break Arabic letters apart or reverse them — pick the one you can read.
1: بسم الله
2: <joined Arabic sample>
3: <reversed Arabic sample>
Press 1–3
```

The placeholders stand for Arabic-only samples transformed by their modes; actual rows have no Latin mode labels. Every Arabic sample is drawn with the same `Text` renderer used by thikr. The option order is fixed so the number keys always mean the same treatment.

Press 1–3 to save that mode for the current terminal. The plugin confirms with `muslim: Arabic for <termId> set — /muslim terminal-arabic to redo`. That terminal is not asked again automatically. A different terminal ID with no answer gets its own survey. `/muslim terminal-arabic` reopens the current terminal's survey at any time. Desktop never shows the survey.

Surveys wait while Claude is showing another survey. An unanswered terminal remains eligible after a module reload; the missing saved answer restores the automatic survey, and `arabicSurveyManualTerminal` in `$.state` keeps an explicitly reopened survey tied to its terminal.

`/muslim` shows a settings table on every surface. Its Terminal Arabic row shows this terminal's mode on a terminal, for example `joined for WarpTerminal`, or `plain (default, not chosen yet)` before an answer; on desktop it reads `terminal only`.

## Storage and reset

The terminal ID resolver checks these environment variables in order and uses the first match:

1. `TERM_PROGRAM` is used verbatim (`Apple_Terminal`, `WarpTerminal`, `iTerm.app`, `vscode`, `ghostty`, `WezTerm`, and other values remain valid IDs).
2. `TERMINAL_EMULATOR` is used verbatim (for example, `JetBrains-JediTerm`).
3. `__CFBundleIdentifier` is used verbatim (for example, `com.jetbrains.pycharm` or `com.mitchellh.ghostty`).
4. Presence of `WT_SESSION` gives `WindowsTerminal`.
5. `KONSOLE_VERSION` gives `Konsole`; `VTE_VERSION` gives `VTE`; `KITTY_WINDOW_ID` gives `kitty`; `ALACRITTY_WINDOW_ID` or `ALACRITTY_SOCKET` gives `Alacritty`.
6. `OS === 'Windows_NT'` gives `WindowsConsole`.
7. If none match, the ID is `unknown`.

Each ID gets its own answer; there is no prebuilt list of supported terminals to maintain. Only the built-in defaults need entries: Apple Terminal is `plain`, Warp is `joined`, Windows Console is `reversed`, and all other IDs (including `WindowsTerminal`) default to `plain`. Existing store entries keyed by `TERM_PROGRAM` remain valid because that source still takes priority and is used verbatim.

Claude Code persists the plugin store in:

```text
~/.claude/plugins/store/muslim_<source>.json
```

There is one file per plugin install source. For example, `--plugin-dir` uses an `inline` source file. The store key is `arabicTerminals`, an object mapping terminal IDs to modes:

```json
{
  "arabicTerminals": {
    "Apple_Terminal": "plain",
    "WarpTerminal": "joined"
  }
}
```

To ask again for one terminal, remove its property from `arabicTerminals`. To reset every terminal, remove the `arabicTerminals` property (or the install source's store file). Then open Claude Code again in that terminal.

Session state is declared in `types/index.d.ts`: `arabicSurveyManualTerminal` identifies the terminal whose survey was explicitly reopened, and `arabicTerminalMode` caches the current terminal's mode for thikr renders. Automatic survey visibility is reload-safe because an answer is not saved until a choice is made; after a module reload during the session, the missing terminal entry still makes the survey eligible. The old global `userConfig` field `arabicFix` was removed.

## Using the shared treatment in a feature

At draw time, each feature should first check that `e.surface === 'terminal'`, read the environment variables above through `$.env.get`, resolve the ID with the pure `terminalIdFromEnv(env)` function, look up the saved mode in `arabicTerminals` or use `defaultArabicMode(termId)`, then pass its authored display text through `terminalArabic(surface, mode, text)` from `src/shared/arabic/terminal.ts`. `terminalArabic` itself returns the input unchanged for non-terminal surfaces. Keep any helper that reads `$` in the same source file as the hook, as required by `CLAUDE.md`; the pure mode, ID, and transform functions are shared.

## Tashkeel

`/muslim tashkeel on | off — show or hide Arabic diacritics on desktop (the terminal never shows them)` defaults to on. The setting applies on desktop and every non-terminal surface only. Terminal Arabic always has tashkeel stripped, regardless of mode or setting. Stored/authored words are never changed.

## Athkar in the terminal

The athkar reader always draws the Frame look in the terminal. The Sky look is desktop only: `athkarStyle` applies to the desktop app, and `/athkar style` in a terminal answers that and changes nothing. The plugin-wide main color (`color`, `/muslim color`, default Claude orange) applies on both, from `src/shared/color/`. Its Arabic follows the shared treatment above, like every feature.

## Decisions and limits

- Modes are per terminal, rather than one value per machine, because Apple Terminal and Warp need different treatments on the same machine.
- The picker uses number-key `Button` rows and our own `Text` renderer. Claude's `AskUserQuestion` dialog and `Select` drew Arabic through a different path and could mislead users; `Select` also appeared as a one-line dropdown without taking focus.
- Fixed option order keeps keys 1–3 stable; the defaults do not reorder the survey.
- The first-run check survives module reloads because no answer is stored until the user chooses.
- A changing Arabic line can still be partially repainted incorrectly by Apple Terminal. The plugin API cannot force a complete terminal redraw. Reversed-mode text copied from a terminal is in visual order.

The per-terminal survey UI is specified in [the Arabic check design](features/arabic-fix/design.md). The thikr feature's use is described in [thikr docs](features/thikr/spec.md).
