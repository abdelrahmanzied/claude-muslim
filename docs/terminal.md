# Terminal Arabic

This is the shared reference for Arabic shown by every feature on a terminal surface. Each feature routes its own Arabic text through `src/shared/arabic`; Claude's text and desktop rendering are left alone.

## Why treatments differ

Terminals handle Arabic differently. Apple Terminal orders and joins letters itself, but paints tashkeel poorly, so its default strips tashkeel only. Warp orders Arabic but does not join letters, so its default shapes letters and keeps logical order. Windows conhost and some Linux terminals need letters shaped and reordered into visual RTL order. Claude's desktop app renders Arabic itself.

| Mode | Display treatment | Use it when |
| --- | --- | --- |
| `none` | Keep authored text unchanged | The terminal handles Arabic shaping and tashkeel correctly; this is the default for unrecognized terminals. |
| `plain` | Strip tashkeel only | Apple Terminal handles ordering and joining but paints marks poorly. |
| `joined` | Strip tashkeel and apply contextual presentation forms; keep logical order | Warp orders text correctly but leaves letters unjoined. |
| `reversed` | Strip tashkeel, shape, then reorder Arabic runs for visual RTL display | The terminal needs both shaping and visual reordering, such as Windows conhost or some Linux terminals. |

Built-in defaults before a terminal has an answer are `plain` for `Apple_Terminal`, `joined` for `WarpTerminal`, `reversed` for `WindowsConsole`, and `none` for every other ID.

## First-run survey

The first time Claude Code opens with the plugin in a terminal ID with no saved answer, the first eligible AbovePrompt render shows:

```text
muslim · Terminal Arabic Setup · Which word is written correctly?
Some terminals break Arabic letters apart or reverse them — pick the one you can read.
1: بِسْمِ اللَّهِ
2: بسم الله
3: <joined Arabic sample>
4: <reversed Arabic sample>
Press 1–4
```

The placeholders stand for Arabic-only samples transformed by their modes; actual rows have no Latin mode labels. Every Arabic sample is drawn with the same `Text` renderer used by thikr. The option order is fixed so the number keys always mean the same treatment.

Press 1–4 to save that mode for the current terminal. The plugin confirms with `muslim: Arabic for <termId> set — /muslim terminal-arabic to redo`. That terminal is not asked again automatically. A different terminal ID with no answer gets its own survey. `/muslim terminal-arabic` reopens the current terminal's survey at any time. Desktop never shows the survey.

Surveys wait while Claude is showing another survey. An unanswered terminal remains eligible after a module reload; the missing saved answer restores the automatic survey, and `arabicSurveyManualTerminal` in `$.state` keeps an explicitly reopened survey tied to its terminal.

## Storage and reset

The terminal ID resolver checks these environment variables in order and uses the first match:

1. `TERM_PROGRAM` is used verbatim (`Apple_Terminal`, `WarpTerminal`, `iTerm.app`, `vscode`, `ghostty`, `WezTerm`, and other values remain valid IDs).
2. `TERMINAL_EMULATOR` is used verbatim (for example, `JetBrains-JediTerm`).
3. `__CFBundleIdentifier` is used verbatim (for example, `com.jetbrains.pycharm` or `com.mitchellh.ghostty`).
4. Presence of `WT_SESSION` gives `WindowsTerminal`.
5. `KONSOLE_VERSION` gives `Konsole`; `VTE_VERSION` gives `VTE`; `KITTY_WINDOW_ID` gives `kitty`; `ALACRITTY_WINDOW_ID` or `ALACRITTY_SOCKET` gives `Alacritty`.
6. `OS === 'Windows_NT'` gives `WindowsConsole`.
7. If none match, the ID is `unknown`.

Each ID gets its own answer; there is no prebuilt list of supported terminals to maintain. Only the built-in defaults need entries: Apple Terminal is `plain`, Warp is `joined`, Windows Console is `reversed`, and all other IDs (including `WindowsTerminal`) default to `none`. Existing store entries keyed by `TERM_PROGRAM` remain valid because that source still takes priority and is used verbatim.

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

`/muslim tashkeel on | off` controls diacritics for Arabic on every surface and defaults to on. Terminal modes 2–4 (`plain`, `joined`, and `reversed`) strip tashkeel for that terminal only; mode 1 (`none`) keeps it when the global setting is on. Global off strips it everywhere. On a terminal, the selected terminal mode applies on top of the global setting. Stored/authored words are never changed.

## Decisions and limits

- Modes are per terminal, rather than one value per machine, because Apple Terminal and Warp need different treatments on the same machine.
- The picker uses number-key `Button` rows and our own `Text` renderer. Claude's `AskUserQuestion` dialog and `Select` drew Arabic through a different path and could mislead users; `Select` also appeared as a one-line dropdown without taking focus.
- Fixed option order keeps keys 1–4 stable; the defaults do not reorder the survey.
- The first-run check survives module reloads because no answer is stored until the user chooses.
- A changing Arabic line can still be partially repainted incorrectly by Apple Terminal. The plugin API cannot force a complete terminal redraw. Reversed-mode text copied from a terminal is in visual order.

The per-terminal survey UI is specified in [the Arabic check design](features/arabic-fix-design.md). The thikr feature's use is described in [thikr docs](features/thikr.md).
