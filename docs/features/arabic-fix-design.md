# Terminal Arabic check — design

Shared terminal display support, used by thikr; the rules in [DESIGN.md](../../DESIGN.md) apply. Behavior and renderer investigation are in [arabic-fix.md](arabic-fix.md).

- **Surface:** draw the picker in the terminal AbovePrompt render while session state `arabicFixPicking` is true. Return existing prompt rows too.
- **Question and identity:** row one shows `muslim` in Claude color and the dim question ` · Which Arabic word reads correctly in this terminal?`.
- **Picker:** three vertical `<Button plain hotkey="1|2|3">` rows: fixed Arabic (`on`), logical Arabic (`off`), and Not now (`keep`). Put the likely mode first: fixed for Apple Terminal in auto, logical for Warp/unknown in auto. Arabic samples are nested `Text` children so they use the thikr text renderer. The dim hint is `Press 1, 2 or 3`.
- **Keys:** pressing 1 or 2 selects its sample; 3 keeps the current mode. Any pick hides the picker.
- **Actions:** any pick hides the picker. Store `arabicFixShownIn: done` for the automatic first-run check. Values on/off update `muslim.arabicFix`; keep leaves it unchanged. Toasts name the mode and `/muslim terminal-arabic`.
- **One session:** initial picker state is visible in the first eligible terminal session. Store that session ID on first display; a later session skips the automatic picker. Session state keeps an unanswered picker visible across module reloads. `/muslim terminal-arabic` sets the picker visible without resetting the marker.
- **Desktop:** never draw the picker or read/write its first-run store; the command replies that the check is terminal only. Surveys do not consume an unseen check.

The install hook lives in `src/shared/arabic/install.tsx`.

## Demo (planned)

Apple Terminal and other terminal option ordering, hotkey selection, Not now, manual reopen after first-run, survey suppression, later-session exclusion, and desktop with no picker.
