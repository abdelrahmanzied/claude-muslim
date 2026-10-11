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

On the first terminal prompt, even with auto detection, one small row compares
`سلام` unchanged (1) with its fixed form (2). "1 looks right" sets off;
"2 looks right" sets on. The likely answer is the first button, without
renumbering the samples. "Later" keeps the current mode. Any choice is saved
as `arabicFixAnswered: true` in the plugin's machine-local `$.store`, so it is
never asked again on that machine. Later users can change the mode through the
command or `/config`. A denied setting does not consume the check.

The row yields to surveys and never appears on desktop; neither event consumes
an unanswered check. No released settings require migration.

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
first-run persistence and Later, ordering, survey/desktop exclusion, preservation
of the underlying band, and fresh shaping on each thikr text change. They do
not execute the real terminal renderer's ANSI output.

- **Warp:** on a machine without the stored answer, check both samples and
  the likely "1 looks right" button first. Pick 1; check spinner/usage-limit/end
  text and digit order, reload and start a new session: no repeated check.
  Try Later on a fresh store: it also dismisses permanently without a mode
  write. `/muslim arabic-fix auto` and off should use logical Arabic in Warp.
- **Apple Terminal:** expect "2 looks right" first in auto; pick 2. Verify
  joined Arabic at first draw, then watch several rotating thikr phrases and transitions between
  working moments; resize and restore the
  window too. Record whether corruption remains until a full host redraw.
  This is a check of the documented unresolved renderer bug, not a claim that
  the mod now fixes it. Compare on/off/auto, including a lam-alef phrase (لا إله إلا الله).
- **Both:** a survey hides the check without answering it; closing it brings
  the unanswered row back. The usage-limit band and other rows still work. At
  80 columns the row remains short. Desktop has no Arabic check and keeps
  its original Arabic and tashkeel.
