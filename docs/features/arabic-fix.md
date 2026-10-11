# Terminal Arabic check

`/muslim terminal-arabic` opens the keyboard picker and updates `muslim.arabicFix` immediately when a sample is chosen:

| Value | Meaning |
| --- | --- |
| auto (default) | Detect: enable only for `TERM_PROGRAM === 'Apple_Terminal'` |
| on | The mod joins and reorders Arabic for terminals that cannot |
| off | The terminal shows logical Arabic itself |

In `/config`, the title is **Fix Arabic in the terminal** and the description
is: "auto detects terminals that can't show Arabic; on/off forces it. Terminal
only; the desktop is never changed."

The first eligible terminal prompt draws the picker directly in AbovePrompt. Row one shows `muslim` and the question. Below it are three vertical plain survey Buttons: hotkey `1` holds fixed `arabicVisual('سلام')` (`on`) or logical `سلام` (`off`), hotkey `2` holds the other sample, and hotkey `3` is **Not now** (`keep`). Each Arabic sample is a `Text` child, matching the thikr display path. The likely choice comes first (fixed for Apple Terminal in auto; logical for Warp/unknown in auto). The dim hint reads `Press 1, 2 or 3`.

Pressing 1 or 2 selects its sample. Pressing 3 selects Not now. Any pick hides the picker; Not now keeps the current mode. Selecting either sample hides it and immediately updates `muslim.arabicFix`; the toast reports the resulting mode and points to `/muslim terminal-arabic`. A denied setting reports why it was not changed.

The automatic picker is offered only in the first eligible terminal session on the machine. Its first eligible render stores that session ID; any selection stores `done`, and a later session skips it. The session `arabicFixPicking` state preserves an unanswered picker across module reloads. Surveys suppress the picker without consuming it, and desktop never draws it or reads/writes its store.

`/muslim terminal-arabic` reopens the same picker on demand without resetting the automatic first-run marker. On desktop it replies that the check is terminal only. Extra arguments return `Usage: /muslim terminal-arabic`. Users can also change the setting in `/config`.

Design: [arabic-fix-design.md](arabic-fix-design.md).

## Apple Terminal update investigation

**Result: the mod cannot reliably fix the reported partial-update corruption
with the public API in Claude Code 2.1.296.** The first frame is correctly
shaped; a new render also supplies correct fresh text. The remaining suspected
failure is between the host's cell-diff cursor writes and Apple Terminal's
rendering of those writes. This is consistent with the report that a full
redraw restores the text. Physical Apple Terminal cursor/glyph behavior has
not been measured here; do not mistake a render-tree test for terminal proof.

The following investigation is retained from the source branch. Its prayer
footer examples describe that investigation, not a surface shipped by this
thikr-only port.

### Width measurements

Measured the actual output of `arabicVisual` using macOS POSIX `wcswidth`,
with `LC_CTYPE=en_US.UTF-8`, and checked Unicode East Asian Width. All 151
unique presentation forms in the forms table are neutral-width and measure
one cell; none measured zero or two. Each isolated/final lam-alef form measures
one cell, although NFKC expands it into two letters.

| Input | Fixed output code points / POSIX cells |
| --- | --- |
| لا / لأ / لإ / لآ | 1 / 1 each |
| سلام | 3 / 3 (logical input has 4 code points) |
| ☾ العشاء ٠٣:٢٨ | 14 / 14 |
| ☾ العشاء ٠٣:٢٧ | 14 / 14 |
| حان وقت صلاة العصر | 17 / 17 (logical input has 18 code points) |

These are cell-width measurements, not pixel/glyph measurements in Apple
Terminal or measurements of the host's native segmenter. There is no evidence
here of a wide/narrow presentation-form counting defect to repair in the
mod. Padding by logical length would itself be wrong for lam-alef.

### Renderer evidence

Read the installed 2.1.296 renderer source in the local Claude executable
(`~/.local/share/claude/versions/2.1.296`), rather than assuming upstream Ink
matches this build:

- The width helper `ae` calls `Bun.stringWidth`; layout also has a native
  segmenter/paint path. The mod API exposes neither one's cell grid.
- `render` calls `yg` to diff the old/new packed screen cells. `W1` skips
  identical character/style entries. Changed cells are sent through `Ls`
  (cursor addressing) and `fv` (stdout characters). React keys are absent
  from this final comparison.
- The fixed countdown changes only cell index 4 from ٨ to ٧. Padding both
  outputs to 24 cells leaves exactly that same single-cell difference. A
  stable-width Box cannot force the unchanged Arabic cells to be resent.
- Re-keying Text can rebuild the React node, but the same resulting screen
  still goes through that cell comparison. No blank intermediate frame is
  guaranteed, so it does not request a complete segment rewrite either.
- An internal `forceFullReset()` exists, but is not exposed to mods.
  `$.ui.invalidate('ui.render')` only reruns cached hook results. The API's
  `$.ui.blit` repaints plugin Raster/Image content, not footer text, and
  offers no screen-reset option. See `EngineInterface.ui.invalidate` and
  `UiBlitInput` in `.claude-plugin/types/claude-code/index.d.ts`.

A reliable remedy needs a host renderer option to erase and rewrite an entire
Arabic run/row, or corrected host/terminal cursor handling for these runs.
The mod has no raw stdout/TTY access through this API; ANSI control injection,
blank-frame flicker, or changing color each tick would not be a reliable quiet
fix. Keep the desktop unchanged. No speculative padding or key workaround is
shipped, and the update bug remains unresolved in this build.

### Verification

Automated tests cover detection, explicit modes, the survey Button hotkeys and choices,
command validation, first-display persistence, option ordering, survey/desktop exclusion,
preservation of the underlying band, and fresh shaping on each thikr text change. They do
not execute the real terminal renderer's ANSI output.

- **Warp:** on a machine without the stored marker, check the muslim label,
  question, vertical hotkey Button rows and hint, with the logical sample first. Press 1;
  spinner/usage-limit/end text stays logical. The confirmation names the plugin
  and command. Reload and start a new session: no repeated check.
- **Apple Terminal:** expect the fixed sample first in auto. Verify joined
  Arabic on the first draw and while thikr rotates. Compare on/off/auto and a
  lam-alef phrase (لا إله إلا الله). Record any corruption until a full host
  redraw: the documented renderer update bug remains unresolved.
- **One session only:** leave the picker unanswered, redraw and reload in the
  same session: it stays visible. Start a new session: it never returns. Not now hides it and keeps the mode.
- **Both:** a survey hides the check without consuming an unseen check. Other
  band rows still work. Desktop has no check and keeps its original Arabic
  and tashkeel. Render-tree tests do not prove physical terminal bidi behavior.
