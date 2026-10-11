# Terminal Arabic check — design

Shared terminal display support, used by thikr; the rules in [DESIGN.md](../../DESIGN.md) apply.
The behavior and renderer investigation are in [arabic-fix.md](arabic-fix.md).

- **Surface:** two short AbovePrompt rows, only on `terminal` without a survey.
  Preserve `next(e)` so other rows stack. Plain text in Claude's font and theme;
  no dialog, focus request, sound or visible timer.
- **Identity and question:** row 1 is `muslim` in `color="claude"`, followed by
  dim ` · Which Arabic word reads correctly here?` in a separate Text run.
- **Samples:** row 2 has three plain buttons separated by gaps. Logical `سلام`
  and `arabicVisual('سلام')` each appear alone in their button label: no sample
  numbers, Latin words or extra marks mixed into the Arabic. The third button
  is dim `Not now`. No hotkeys, to avoid conflicts with other prompt rows.
- **Order:** the likely sample comes first: fixed for Apple Terminal in auto,
  logical for Warp/unknown in auto; explicit on/off follows the selected mode.
- **Actions:** logical sets off, fixed sets on, Not now keeps the mode. Any
  press hides the check, even if a setting is denied. Confirmation toasts name
  `muslim`, the resulting mode, and `/muslim arabic-fix`; denials explain why
  nothing changed and point to the same command.
- **One session:** store the current `$.session.id()` as
  `arabicFixShownIn` on first display. Match it on redraws and module reloads;
  a later session ID skips the check. Any button press stores `done` and marks
  `arabicFixAnswered` in session state before a setting change can reload the
  module. `arabicFixBusy` guards overlapping presses.
  `arabicFixBusy` guards overlapping presses.
- **Desktop:** never draw the check, read/write its store or detect its terminal;
  all existing desktop Arabic stays logical, with its authored marks.

The install hook lives in `src/shared/arabic/install.tsx`.

## Demo (planned)

Logical sample first (Warp), fixed first (Apple Terminal), Not now dismissal,
a survey suppressing the check, a new session after no answer, and desktop
with no check.
