# Quran — design

The Quran feature's visual means, design principles and surface scope, following [DESIGN.md](../../DESIGN.md). Behavior is in [quran.md](quran.md).

The [recording catalog design](quran-catalog.md) covers developer audits and the shipped support catalog. The pane hides unavailable surahs and shows one dim unavailable-count note.

## Visual means

The entire desktop pane body is one Client (`client.tsx`), rendering Svg/foreignObject HTML/CSS. `pane.ts` builds its pure model, dropdown state transitions, option filtering and hit testing; `card.ts` retains the playback picture and control geometry; `avatar.ts` draws the avatar. Shared color helpers supply main accents.

**Visual means and why:** native controls cannot draw the selected design's typography, radius, fill and spacing consistently, so the heading, picker fields, optional quarter picker and player live in one picture. The selected design is the «integrated / clear / madinah» direction of the Quran design lab: the pane has no panel of its own (transparent root, no card or border around the player), so it sits directly on the host surface in both app themes. The terminal and other surfaces get only the dim fallback line (see Surfaces).

## Design principles

Each rule says what it serves, so a later change can keep the intent when values move. Pane width is W, the player is W − 40 wide, and every value below is in px.

### 1. Layout and vertical rhythm

One right-aligned reading column with 20px side margins, read top to bottom as: identity, choice, now playing, controls, what comes next. Each block has one job and the blocks are spaced by fixed steps instead of boxes, so the pane needs no panel or divider chrome.
- Heading, 0–65: Mushaf book icon (22, 1.7 stroke, main color) beside the bold «القرآن الكريم» on the right; the 12 LTR `/quran` command label at the left, always visible at every width (11 at W ≤ 300). The title keeps a 0.12em optical drop so it sits on the icon's centre line.
- Rosette rule, 65–90 (see 2).
- Fields, one every 90: reciter at 135, surah at 225, and «ابدأ من» (quarter) at 315 only for split surahs. A field is a 12 muted label 26 above a 46 box. The quarter field adds an 11 muted note «المقطع N من M داخل سورة …» and shifts the player down by 118. Choices come before playback so the player always reads as the result of what is chosen above it.
- Player, from 293 (751 total height whole, 869 split): top block 12–137, reciter line 149, progress 192, times 210, approximate-time hint 233, controls centred on 287 with captions beneath, closing rosette 369, next/repeat line 405, 12 bottom margin. The player lives inside the pane's own column and never draws a surface of its own.
- Height follows content: wrapped errors and the retry control grow the picture so they stay reachable; dropdowns overlay rather than push.

### 2. Rosette rules

A thin rule with an eight-point rosette marks a change of purpose, not decoration. There are exactly two: under the heading (identity | choices) and above the next/repeat line (controls | what happens after). The rule is an 18 rosette (stroke 1.8 in its 40 viewBox, so the outline keeps its weight) in the shared main color between two 1px arms (80% opacity) that fade to nothing toward the page edge and start from the rosette's own dimmer colour (`--q-ornament-dim`), so it recedes behind content. Never add a third rule inside a block, and never use it as a box border. It is built by `ornament()` in `card.ts`.

### 3. Type scale, Tajawal, RTL and LTR

- Tajawal throughout, real 400 and 700 weights; bold is for the heading and the surah title only. Arabic is the designed language, so Arabic lines get the larger sizes and no mixed-script fallback look.
- Scale: heading 23 (20 at W ≤ 370, 18 at W ≤ 300); surah title 30 (25 at W ≤ 370, 22 at W ≤ 280); field value 14; reciter/riwaya line 13; status, field labels, next line and unavailable note 12; times 14 monospace; quarter line, «الوقت تقريبي» hint, segment note and captions 10–11.
- Every Arabic line is RTL and right-aligned. Times, `/quran` and numeric runs are isolated LTR so digits never reorder: the elapsed time sits at the left and the total at the right of the progress bar, which fills from the left, like a clock and unlike the text. Surah values show the Arabic-Indic number in an isolated LTR run and its authored name; reciter values show `<reciter> · <moshaf>`.
- Arabic is shown as authored on desktop; nothing is shaped, reordered or reworded here.
- **Embedded font:** the OFL licence is in `fonts/OFL.txt`. The full TTFs as base64 are about 160 KB, above the 100 KB Client tree bound (and the 131072-character Svg bound). `fonts-embedded.ts` holds lossless WOFF2 encodings of those same full fonts, all glyphs retained, about 56 KB combined, embedded as data URIs in `@font-face` inside the foreignObject style with no network loading. WOFF2 is required to fit this build's limits.

### 4. Palette tokens, light and dark

Colors exist only as CSS variables from `paletteCss()` in `card.ts`; no component names a hex. Dark is the default; light applies under `prefers-color-scheme: light` (the desktop app theme, not the CLI theme) or is forced with `theme-light` / `theme-dark`. The pane and player backgrounds are transparent (`--q-bg`), so the host surface shows through in both; only the dropdown and search keep opaque backgrounds, because they float over content.

| Role | Token | Dark | Light |
| --- | --- | --- | --- |
| Text and title | `--q-text`, `--q-title` | `#ece9e2` | `#302f2a` |
| Muted and dim: field labels, hints, notes, `/quran`, «▾» | `--q-muted`, `--q-dim` | `#98948b` | `#79766c` |
| Field fill | `--q-field-bg` | `#252321` | `#f9f7f2` |
| Hairlines, progress track, control border | `--q-line`, `--q-track`, `--q-control-border` | `#393733` | `#d9d6cd` |
| Main accent: status, fill, rosette, selection, filled buttons | `--q-accent` | Shared dark shade | Shared light shade |
| Player secondary text, icons, captions | `--q-soft`, `--q-label`, `--q-icon` | `#c6c3bb` | `#46443e` |
| Rosette arm | `--q-ornament-dim` | Shared dark shade | Shared light shade |
| Hover and highlight fill | `--q-hover-bg`, `--q-hot` | `#23221f` | `#f3f1ec` |
| Dropdown, search | `--q-dropdown-bg`, `--q-search-bg` | `#252321`, `#1c1b19` | `#fdfcf9`, `#f5f3ee` |

Main accents, hover borders, primary hover and rosette arms use `src/shared/color/` and `/muslim color` (default Claude orange), with the shared shade for each theme. White (`--q-on-primary`) sits on filled controls. Secondary text, muted fills and the supplied artwork retain their designed colors. Both themes must be checked on every change.

### 5. Avatar

The embossed Quran avatar is the player's face and its state indicator: it sits at the left of the status/title block (the end of the row opposite the reading start), 120 wide above W 370, 95 at W ≤ 370 and smaller when narrower (never below 48). It moves only while playback is active and is still in every other state: stopped, preparing and failed. Reduced-motion preferences also stop it. `avatar.ts` preserves the supplied artwork, drops its permanently hidden duplicate layer to fit the Client payload limit and enables CSS motion only while active. Negative animation delays follow the elapsed clock so one-second redraws keep the phase. "Active" starts once the audio request is made, because the API exposes no audible-start event.

### 6. Control row

The row is LTR and centred on 287: previous (40), play/stop (59, filled main color, white icon), next (40), with 10 captions «السابق»، «تشغيل/إيقاف»، «التالي» beneath. Play is the only large filled control so the main action is unmistakable; manual previous/next on split surahs read «المقطع السابق / التالي» and dim to 35% when nothing remains in that direction.

Two 34 round repeat buttons flank it, matching the design: the quarter repeat «المقطع» (`aria-label` «تكرار المقطع») at the outer left and the surah repeat «السورة» («تكرار السورة») at the outer right, each with its caption underneath. Icons are the standard glyphs: two circling arrows for the surah, the same arrows plus a small «1» for the quarter (the «1» means "this one piece").
- **States:** off is outlined in the line colour with the soft icon; on is filled main color with a white icon and `aria-pressed="true"`; hover outlines in the main color with the hover fill. Hover is drawn by the Client because the API has no pointer-cursor prop.
- **Exclusion:** state is `off` | `surah` | `segment`, so at most one repeat is on. Pressing one turns the other off; pressing the active one turns repeat off. This keeps the pressed look truthful: what is lit is exactly what will happen.
- **Inactive:** the quarter button is always drawn so the row never reflows, but while the surah plays whole it is 35% opaque with `aria-disabled="true"`, no hover and no hit. A stale quarter repeat on a whole surah reads as off and is reset to off when that surah starts.
- All buttons are hit-tested as circles using the same geometry that draws them. A pointer without `fine` is a whole cell snapped to its center, so the cell's half-extent is slack (see Focus and sizing).

### 7. Dim hints

Secondary information is quiet text in `--q-dim` (muted in both themes), never a toast, a coloured chip or a new element type.
- «الوقت تقريبي» (11), directly under the times at 233, because the clock is approximate and the numbers must not look exact.
- The next/repeat line (12, up to two lines, under the closing rosette): names the next quarter or surah, or «تكرار: المقطع … · الآيات …» / «تكرار: سورة …» when repeat is on; it names the available target, never one that will be skipped.
- The unavailable-surah note (below) and the quarter segment note.
- Errors are drawn dim inside the picture with a retry control; actions never show toasts.

### 8. Dropdowns

Fields open an overlay 8 below themselves that covers the player. It holds a drawn search box with caret, up to eight visible 34 rows (46 for quarters, with a two-line value: segment number, ayah range, approximate duration), a current-choice check and accent edge, row hover and highlight, and a «more» indicator. The overlay is opaque with a shadow (`--q-shadow`) so it reads as above the pane, and it intercepts clicks over the player beneath it. Empty search exposes the available surahs or the full recording list, with no pages. Arabic-normalized substring search keeps article letters; Arabic or Latin digits select exact surah numbers or reciter list numbers. Client-local state holds the open list, query, highlight and scroll. Printable keys append, Backspace deletes, Up/Down moves and scrolls the highlight, Enter picks, a row click picks; picking clears and closes, and a field toggle or outside click closes. A thin main-color 6 thumb sits on an 8 left track, with a 14 drawn region and 16 hit area, a 24 minimum height, position and size following the filtered row count. Dragging scales pointer movement to the full list and clamps at both ends; clicking the track jumps. A drag measures the pointer in rows times the pixels-per-row frozen at the press (not the current row count, which the host may change by one while the picture is swapped), and a move that leaves the scroll and highlight unchanged does not redraw the picture. Pointer capture lasts until release, including outside the Client; query changes, closing, picking and reported focus loss clear the drag. Lists of eight or fewer rows hide the bar. The quarter field appears only after a large recording has valid timing metadata; the player then adds the selected segment's ayah range, and preparing shows a status and a stop control with the avatar still. Failures wrap inside the picture and expose «إعادة المحاولة».

### 9. Desktop rendering constraints

The pane is one SVG image whose foreignObject holds XHTML, and Desktop parses it as XML, so the picture must be well-formed and self-contained.
- Every nested `<svg>` (rosette, control icons, heading icon, avatar) carries `xmlns="http://www.w3.org/2000/svg"`; without it XML parsing puts it in the XHTML namespace and it silently disappears. HTML previews hide this, and a card test enforces it.
- The root `<div>` declares `xmlns="http://www.w3.org/1999/xhtml"`; no external assets, fonts, images or network requests: the font and avatar are embedded.
- Size limits: Svg source at most 131072 characters and Client tree under 100 KB; tests assert the sizes.
- Positions are absolute pixels from the constants shared by `pane.ts`, `card.ts` and tests, so a layout change is made once.
- Hover feedback is drawn; pointer shape, pane chrome and zoom stay host-controlled.

### 10. Narrow widths

The minimum pane width is 240. Narrow panes scale instead of wrapping the control row: heading 20 then 18, `/quran` always visible (11 at W ≤ 300; the heading is capped to end 8 before the label and ellipsizes rather than overlap it), surah title 25 then 22, avatar shrinking to 48, and the control row scales by `min(1, (W − 44) / 259)` with captions down to 9 so the five circles and their captions always fit in one row (full size from about W 303). Long values truncate with an ellipsis; the next line wraps to two lines. Dropdowns keep their row heights at every width.

**Focus and sizing:** the API says a click gives the Client focus and `surface.onKey` then receives keys. Escape returns focus to the app and never reaches the Client; there is no Client blur callback. Pane `isFocused` changes and the `ui.focus` hook supply reported focus loss, closing local panels through a model revision. The Client pointer API has no wheel event. A `ui.scroll` hook routes person-origin wheel/trackpad movement to a cumulative model revision, consumed by the Client to scroll filtered rows. Event coordinates use the current pane offset; when Desktop omits coordinates, Client metadata reports whether the pointer is over the overlay, including search and empty areas. Leaving, closing, picking and reported focus loss clear that routing. Each accepted tick moves one row, with a 120ms rate limit for trackpad bursts. Live Desktop testing found that the host only dispatches while its own viewport can move; intercepting it can cause host movement and prevents reverse ticks at its edge. Wheel behavior is therefore not a completed native fix. The experimental overflow/centering wrapper and diagnostic probes were removed. Up/Down navigation remains available. The Client reports columns/rows, maps cells to pixels (8.4px per desktop column, as the reference card does). Desktop gives no `fine` position, so the pointer is a whole cell (about 8 by 19px) snapped to its center; `paneHit` takes the cell's half-extent as slack and hits a field, the retry button or a control circle when the cell overlaps it, the nearest to the center winning, so the bottom edge of a field (just under its ▾) works. The open overlay still owns the pixels its center falls on, label and gap cells claim nothing, and a `fine` pointer uses zero slack. The pointer post carries `coarse` so the hook repeats the same test, and draws a 751px whole-recording picture or an 869px segmented picture, plus any wrapped error/retry space. Dropdowns overlay the card within that height rather than growing the Client region. App pane chrome, zoom and focus-event delivery remain host-controlled.

`<Client key="quran-card" module="./client.tsx" width="100%" props={model} />` mounts the full pane. Picks post `{ act: 'pick', list, value }` through `surface.post` to `ui.message`; the hooks validate the value against the authoritative cached catalog, then save/restart the reciter or play the surah using existing dispatch. Playback controls still use validated pointer hit testing or keyboard posts. Once-per-second props update elapsed/progress without resetting dropdown state. Errors are drawn dim inside the picture; actions never show toasts.

The desktop footer is a plain native Button whose Text uses the shared main color (`claude` for orange, shared theme shade otherwise) and contains «۞» before its label. Idle: «۞ القرآن». Playing: `۞ <surah Arabic name> mm:ss` (`h:mm:ss` from an hour). A separate Svg passed engine tests but did not appear in live Desktop, so the visible text symbol replaces it. Pressing toggles `quran` using `$.ui.panes`, `$.ui.open` and `$.ui.close`, without changing audio. Quran's outer SessionMode hook stays before salah's, preserving `[Quran] [salah]` order. Placement belongs to the Desktop: the mod only fills the `SessionMode` slot. Before the Desktop app 2.37 redesign (the Claude Code engine and API stayed at 2.1.295) the slot sat before the model name on one row; the redesigned footer (observed live, model, effort and context ring on a first row) draws our items on a second row under those controls, right-aligned, and its native Button chrome draws the chip's text in the Button's own foreground, so the main color applies to the salah line (plain Text) but was not seen on the chip. The API offers no control over either, so the design does not depend on them.

**Scaling.** The Desktop footer shrinks its own items as the window narrows (design-system tokens and hidden labels); our items sit in a strip outside that, and the mod API has no size, density, font or icon prop for Text, Button or Svg. What a hook can read is `e.viewport.columns` (the chat column in code-font cells, re-sent and re-drawn on resize, documented in the types). The chip therefore sheds words in tiers (pure logic in `src/features/quran/footer.ts`, tests in `tests/quran/footer.test.ts`): `full` (≥ 60 columns, or unmeasured) «۞ القرآن» / «۞ surah mm:ss»; `time` (40–59) «۞ القرآن» idle or «۞ mm:ss» playing; `glyph` (< 40, or the docked pane is open) «۞». The 60 and 40 are tuning values, not the host's breakpoints (not exposed). Desktop 2.37 draws a Button from its `label` only and ignores its children, so the label is the visible text, and the Text child repeats it for a Desktop that draws children. Trade-off: while shrunk, the chip's accessible name is the shrunk text; the full text is not kept apart (there is no separate accessible-name prop), and the host's own tooltip shows the strip's full text only when it overflows. The salah item is plain Text that already inherits the strip's font, so it is unchanged. Live check needed: shrink the window and the chip should lose words at the tiers above; with the pane closed and a wide window, whether Desktop keeps the row under the controls (then nothing more can be done from the mod) or puts it back inline.

**Why:** listening is an explicit activity with choices and controls; the Pane keeps those together without interrupting Claude's transcript. No AbovePrompt band or automatic opening at startup. Whole-track natural ends continue to the next available surah with the same recording, stopping when none remains. Split segments continue within the surah and then to the next available surah; previous/next skip unavailable surahs when crossing surah boundaries. Salah’s athan moment does not interrupt recitation.

## Unavailable-surah note

For a known recording with unavailable surahs, its surah overlay adds exactly one 34px row below the eight-option viewport and above the existing position indicator. It uses 12px Tajawal and the existing `--q-dim` variable in both light and dark palettes, including `prefers-color-scheme`; it adds no background. The fields, option row sizes, scrollbar viewport and pane dimensions are unchanged. Arabic remains authored RTL text; Arabic-Indic numeric runs are isolated LTR, with no shaping or reordering.

The row has no option role, selected state, highlight, hover background or action. CSS disables pointer events; hit testing treats its pixels as inert panel space so clicks cannot reach the player beneath. Option navigation and scrollbar geometry count only playable search results. The note remains visible during search and is absent at zero; it never appears in the recording dropdown.

Its text forms are: 1 → «سورة واحدة غير متاحة لهذا القارئ»; 2 → «سورتان غير متاحتين لهذا القارئ»; 3–10 → «N سور غير متاحة لهذا القارئ»; 11+ → «N سورة غير متاحة لهذا القارئ», with `N` in Arabic-Indic digits. The pure `unavailableNote` function owns and tests this agreement.

## Surfaces

| Moment | Surface | Shows |
| --- | --- | --- |
| Footer idle/playing | Desktop SessionMode | Native Button with ۞: القرآن or surah + approximate elapsed (main color where the Desktop honors it); words shed by chat-column width (full, time, «۞»), «۞» alone while the pane is open; toggles the docked pane |
| User opens player | Desktop docked Pane `quran` | One full Client picture: dropdown fields/search overlays and a card-less player with hit-tested controls (two repeat buttons), RTL Arabic and embedded Tajawal; dim hints |
| Non-desktop pane | Terminal, mobile, vscode Pane | Only dim «مشغّل القرآن متاح على تطبيق Claude للديسكتوب» |
| Commands/help/settings | Command reply on all surfaces | Short status or requested catalog/help; Quran row in `/muslim` |
| Playback failure after command | Quran CommandOutput and pane | Dim error line; command output only for playback started by a command |
| Playback failure after pane action | Desktop pane | Dim error line only; no toast or command-row rewrite |
| Playing | Desktop footer chip and docked Pane | Clock-based approximate elapsed/progress, redraw once per second |
| AbovePrompt | All surfaces | No Quran band |
| Terminal footer | SessionMode | No Quran label; preserve other features |
| Stopped | Same desktop Pane | No redraw timer; per-clip watchdog ends when its play promise settles; play starts from beginning |

Desktop is the supported v1 surface, a stated scope exception to the shared cross-platform playback goal. Terminal Arabic follows `src/shared/arabic` and the saved per-terminal mode; desktop and other surfaces keep source text as authored. Use simple Latin digits consistently for result numbering and time, as permitted by the feature spec. Audio plays only when the user starts it.

## Settings exception

**Stated exception to CLAUDE.md's “settings are userConfig” rule:** all durable Quran data—remembered recording, catalog, duration numbers and recording segment metadata—stays in `$.store` (`quran.reciter`, `quran.catalog`, `quran.durations`, `quran.segmentCache`), not userConfig. `$.config.set` reloads the module and would cut playback continuity by losing the AbortController; an old clip may remain audible without a handle. Choosing a recording must not reload the module. No new userConfig fields are added. The `/muslim` feature row shows the selected recording in the shared status-table shape; `/muslim help quran` and `/quran help` use the shared help-table shape, including `/quran reciter`. Stop is the user's off action; there is no unsolicited playback or enabled switch. Loudness is controlled by the OS.

Playback state stays in the declared session contract; handles stay in the runtime only. On reload, existing `session.start` clears tracking and does not resume. A reload orphans the clip: the mod cannot stop it, and it ends with the surah, a documented v1 limitation.

The API has no pointer-cursor prop. The Client draws hover feedback; pointer shape remains host-controlled. Pane chrome and pointer shape remain host-controlled.

## Playback watchdog and temporary diagnostics

Every play invocation creates a 200ms `$.clock.every` beside its `$.audio.play` call. Stop/replacement still abort directly and bump generation; the old clip's own timer checks generation and calls its controller's abort from inside that timer callback. It does so even if a direct abort already marked the signal, and cancels when the play promise resolves or rejects. This addresses the live invocation-context hypothesis; engine tests do not prove audible stop. Duration work never blocks it.

`QURAN_DEBUG = false` disables diagnostics for v1. Setting it to `true` temporarily enables serialized read/append/write diagnostics under the OS temp folder: `claude-muslim-quran/debug.log`. Keep the last 200 lines; log generation/surah/start path (command, pane, auto-advance), direct and watchdog aborts, resolved/rejected settlement, aborted flag and elapsed milliseconds. Failures are silent and logging never blocks playback. Return the constant to `false` after live diagnosis.

## Never

No seeking, pause/resume, persistent audio cache, separate ayah clips, gapless sequencing, unsolicited autoplay, OS notifications or generated religious text. Large recordings use MP3Quran timing boundaries from the original MP3, with possible mid-word edges accepted for v1; temporary Range files are removed after reading. The fixed quarter map ships separately from per-user timing/byte metadata.

## Demo scenes (planned)

Quran demo is deferred to a separate task and is not included in the shared sequence. Planned scenes: stopped with Minshawi/Al-Fatiha selected; playing Al-Kahf with known duration; unknown total; catalog/play error; terminal fallback. Use a fake clock and mocked playback/catalog, changing no remembered choice.

## Checklist for a change

- [ ] Full Client pane, embedded Tajawal and silent dropdown/control picks render on Desktop; no Quran toasts.
- [ ] Full Client pane and main-color footer Button render on Desktop; terminal has only the pane fallback through shared Arabic.
- [ ] Whole-surah audio, abort on stop/replacement, advance only on the active generation’s natural end; stop after 114.
- [ ] Redraw timer runs only while playing; per-clip watchdog cancels on settlement; elapsed remains explicitly approximate.
- [ ] No config reload from recording changes; all durable Quran data in store.
- [ ] Both full lists open without pages; Up/Down scrolls, search filters, and choosing clears/closes the panel. Catalog is reused for seven days and refreshes on demand, retaining stale data on failure; duration failure is silent.
- [ ] Every `<svg>` nested in the pane or card (rosette, control icons, avatar) carries `xmlns="http://www.w3.org/2000/svg"`. Desktop draws the pane as an SVG image parsed as XML, so a nested `<svg>` without it falls into the XHTML namespace and silently disappears; HTML preview renders hide this. A card test checks it.
- [ ] Engine gates pass; live sound and native paint verified separately.

Native Desktop validation on macOS confirmed both drag scrollbars reach the last rows and return to the first rows while the Pane remains stationary. Surah search for 18 returns Al-Kahf and hides the scrollbar. Drag input is quantized by the host cell coordinates; engine tests also cover release outside the Client, search and selection after dragging. This validates the drag control, not mouse-wheel behavior or other operating systems.
