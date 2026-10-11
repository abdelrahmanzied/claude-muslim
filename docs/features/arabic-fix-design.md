# Terminal Arabic check — design

Shared terminal display support, used by thikr; the rules in [DESIGN.md](../../DESIGN.md) apply. Behavior and renderer investigation are in [arabic-fix.md](arabic-fix.md).

- **Surface:** draw the picker in the terminal AbovePrompt render while the session picker terminal matches the current terminal ID. Return existing prompt rows too.
- **Question and identity:** row one shows `muslim` in Claude color and the dim question ` · Which line reads correctly in this terminal?`.
- **Picker:** five vertical `<Button plain hotkey="1|2|3|4|5">` rows in fixed order: none, plain, joined, reversed, Not now. Samples use `بِسْمِ اللَّهِ` transformed through the same pure mode functions as thikr and are nested `Text` children. The dim hint is `Press 1–5`.
- **Actions:** choices 1–4 save that mode under the current terminal ID; 5 saves its built-in default. Every choice hides the picker and toasts `muslim: Arabic for <termId> set — /muslim terminal-arabic to redo`.
- **Per terminal:** the store value `arabicTerminals` maps `TERM_PROGRAM` (or `unknown`) to a mode. Defaults are Apple Terminal `plain`, Warp `joined`, otherwise `none`. A saved terminal ID is skipped automatically; a different unanswered terminal ID gets its own survey. Session state keeps an unanswered picker visible across reloads.
- **Manual command:** `/muslim terminal-arabic` reopens the current terminal's picker, even after it has a saved answer.
- **Desktop:** never draw the picker or transform Arabic; the command replies that the check is terminal only. Surveys defer an unanswered check.

The install hook lives in `src/shared/arabic/install.tsx`.

## Demo (planned)

Fixed option order and hotkeys, Not now defaults, independent terminal IDs, manual reopen, survey suppression, reload persistence, and desktop with no picker.
