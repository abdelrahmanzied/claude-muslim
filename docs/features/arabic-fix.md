# Terminal Arabic check

`/muslim terminal-arabic` opens a per-terminal keyboard survey. Modes are stored in the machine-local `arabicTerminals` map, keyed by `TERM_PROGRAM` (or `unknown`):

| Mode | Treatment |
| --- | --- |
| `none` | Keep the authored text unchanged |
| `plain` | Strip tashkeel only |
| `joined` | Strip tashkeel and apply contextual presentation forms, keeping logical order |
| `reversed` | Strip tashkeel, shape, and reorder for a terminal that needs visual RTL text |

The built-in defaults for an unanswered terminal are Apple Terminal `plain`, Warp `joined`, and `none` for other terminal IDs. Desktop always uses `none`. There is no longer a global Arabic setting in `/config`.

The first AbovePrompt render for an unanswered terminal shows `muslim · Which line reads correctly in this terminal?` and five vertical plain survey Buttons. The fixed order is 1 none, 2 plain, 3 joined, 4 reversed, 5 Not now. Each sample uses `بِسْمِ اللَّهِ`, transformed through the same functions used by thikr and drawn as a `Text` child. The hint is `Press 1–5`.

Choosing 1–4 saves that mode for the current terminal. Not now saves the terminal's built-in default so it will not ask again. Every pick hides the survey and toasts `muslim: Arabic for <termId> set — /muslim terminal-arabic to redo`. A terminal ID already in the map is skipped automatically; a different unanswered ID gets its own survey. The session state keeps an unanswered survey visible across reloads. Surveys defer it without consuming it.

`/muslim terminal-arabic` reopens the current terminal's survey. On desktop it replies that the check is terminal only. Extra arguments return `Usage: /muslim terminal-arabic`.

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

Automated tests cover each transform, fixed survey order, per-terminal persistence, independent Apple Terminal and Warp answers, new terminal IDs, command reopen, desktop exclusion, and thikr rendering from the current terminal's cached mode. They do not execute the real terminal renderer's ANSI output.

- **Warp:** compare the four fixed samples; the default `joined` treatment keeps letters joined in logical order.
- **Apple Terminal:** the default `plain` treatment removes tashkeel while leaving Arabic ordering and shaping to the terminal.
- **Other terminals:** the default is `none`; choose `reversed` only where the terminal needs shaped visual RTL text.
- **Persistence:** Not now saves the current terminal's default. Reload and open a new session with the same terminal ID: no automatic survey. A terminal ID with no saved answer still gets its own survey. `/muslim terminal-arabic` reopens it.
- **Desktop:** no survey or Arabic transformation; render-tree tests do not prove physical terminal shaping behavior.
