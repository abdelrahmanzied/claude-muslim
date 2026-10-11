# Terminal Arabic check

`/muslim arabic-fix on | off | auto` changes `muslim.arabicFix`:

| Value | Meaning |
| --- | --- |
| auto (default) | Detect: enable only for `TERM_PROGRAM === 'Apple_Terminal'` |
| on | The mod joins and reorders Arabic for terminals that cannot |
| off | The terminal shows logical Arabic itself |

In `/config`, the title is **Fix Arabic in the terminal** and the description
is: "auto detects terminals that can't show Arabic; on/off forces it. Terminal
only; the desktop is never changed."

The first eligible terminal prompt shows two short rows. The first identifies
`muslim` in Claude's accent color and asks, in dim text,
" · Which Arabic word reads correctly here?" The second has three buttons:
logical `سلام`, its fixed form, and dim "Not now". Each sample is alone in its
button label, with no digits or Latin mixed into the Arabic. The likely sample
comes first: fixed for Apple Terminal in auto, logical for Warp/unknown in auto;
explicit on/off follows the selected mode.

Press logical to set off, fixed to set on, or Not now to keep the mode. Any
press hides the check, including a denied setting. A confirmation toast says
`muslim: Arabic fix on — change with /muslim arabic-fix` (using the resulting
mode); a denial reports why the setting was not changed and the same command.

The check appears in only one session on the machine. On its first display,
`$.store.set('arabicFixAnswered', true)` immediately consumes the machine-local
check, even if no button is ever pressed. Session state keeps it visible until
a press, across redraws and reloads. Because drawing cannot write session state,
a zero-delay clock callback records `arabicFixShown`; a temporary flag bridges
the first draw until that callback runs. No visible timer is used. Next session
never asks again, whether answered or not. Existing stored answers stay consumed.

Surveys suppress the check without consuming it, and desktop never draws it or
reads/writes its store. Users can always change the mode through the command or
`/config`. No released settings require migration.

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

Automated tests cover detection, explicit modes, command validation/denial,
first-display persistence and Not now, ordering, survey/desktop exclusion, preservation
of the underlying band, and fresh shaping on each thikr text change. They do
not execute the real terminal renderer's ANSI output.

- **Warp:** on a machine without the stored marker, check the muslim label,
  question and isolated sample buttons, with the logical sample first. Press it;
  spinner/usage-limit/end text stays logical. The confirmation names the plugin
  and command. Reload and start a new session: no repeated check.
- **Apple Terminal:** expect the fixed sample first in auto. Verify joined
  Arabic on the first draw and while thikr rotates. Compare on/off/auto and a
  lam-alef phrase (لا إله إلا الله). Record any corruption until a full host
  redraw: the documented renderer update bug remains unresolved.
- **One session only:** leave the check unanswered, redraw and reload in the
  same session: it stays visible. Start a new session: it never returns. Not now
  hides it without changing the mode and confirms how to change it later.
- **Both:** a survey hides the check without consuming an unseen check. Other
  band rows still work. Desktop has no check and keeps its original Arabic
  and tashkeel. Render-tree tests do not prove physical terminal bidi behavior.
