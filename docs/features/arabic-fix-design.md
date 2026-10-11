# Terminal Arabic check — design

Shared terminal display support, used by thikr; the rules in [DESIGN.md](../../DESIGN.md) apply.
The behavior and renderer investigation are in [arabic-fix.md](arabic-fix.md).

- **Surface:** one AbovePrompt row, text in Claude's font and theme, only when
  `e.surface === 'terminal'` and `hasSurvey` is false. Preserve `next(e)` so
  other rows stack. No dialog, focus request, sound or timer.
- **Sample:** `سلام`, authored without marks, shown once as logical text
  (sample 1) and once after joining and reordering (sample 2). Separate Text
  runs keep sample labels and UI chrome outside the Arabic transformation.
- **Actions:** "1 looks right" sets off; "2 looks right" sets on; "Later"
  keeps the mode. The likely answer button comes first: Apple Terminal in auto
  suggests 2, Warp/unknown in auto suggest 1; explicit on/off suggest that mode.
  Sample numbers never change. No hotkeys: avoid conflicts with other prompt rows.
- **Quiet:** no row after any answer, including Later, across sessions and
  reloads on this machine. Store `arabicFixAnswered`; session state removes
  the row immediately and guards overlapping presses. Denied settings show a
  short toast and leave the check unanswered so the user can retry or defer.
- **Desktop:** never draw the check, read its store or detect its terminal;
  all existing desktop Arabic stays logical, with its authored marks.

This is shared display setup, so its install hook lives in
`src/shared/arabic/install.tsx`, alongside the shared display functions.

## Demo (planned)

Logical/fixed sample comparison with 1 first (Warp), 2 first (Apple Terminal),
Later dismissal, a survey suppressing the row, and desktop with no check.
