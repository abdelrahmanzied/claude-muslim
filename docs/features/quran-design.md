# Quran — design

The Quran feature's visual means and surface scope, following [DESIGN.md](../../DESIGN.md). Behavior is in [quran.md](quran.md).

## Visual means

The entire desktop pane body is one Client (`client.tsx`), rendering Svg/foreignObject HTML/CSS. `pane.ts` builds its pure model, dropdown state transitions, option filtering and hit testing; `card.ts` retains the playback card picture and control geometry. Nothing is copied or imported from another branch.

**Visual means and why:** native controls cannot draw the agreed mockup's typography, radius, fill and spacing consistently. Both picker fields and the player therefore live in the same picture. Labels are 12px `#8a857c`; rounded 8px fields use `#232120`, a `#3a3734` border, 14px `#e9e6df` values and a left-side «▾». Reciter values show `<reciter> · <moshaf>`; surah values show the Arabic-Indic number in an isolated LTR run and its authored name. Every Arabic line is RTL and right-aligned; times stay isolated LTR, with tabular digits. The green now-playing card keeps its 14px radius, 26px bold title, 6px RTL progress, round controls and hover states; a dim automatic-next line follows it. This dark green palette remains the stated exception to shared theme colors, distinct from salah's orange.

**Embedded font:** Tajawal is used throughout, with real 400 and 700 weights. The OFL licence is in `fonts/OFL.txt`. The full TTFs as base64 are about 160 KB, above the 100 KB Client tree bound (and the 131072-character Svg bound). `fonts-embedded.ts` contains lossless WOFF2 encodings of those same full fonts, retaining all glyphs: approximately 56 KB combined. Both faces are embedded as data URIs in `@font-face` inside the foreignObject style, without network font loading. WOFF2 is required to fit this build's limits.

**Dropdowns:** clicking a field opens an overlay directly below it. It contains a drawn search box with caret, up to eight visible 34px rows, a current-choice check/accent, row hover and highlight, and a “more” indicator. Empty search exposes the complete list: no pages and no Select limit. Arabic-normalized substring search keeps article letters; Arabic or Latin digits select exact surah numbers or reciter list numbers. Client-local state holds the open list, query, highlight and scroll. Printable keys append, Backspace deletes, Up/Down moves and scrolls the highlight, Enter picks, and a row click picks. Picking clears and closes the panel. Field toggle and outside clicks close it. The overlay intercepts clicks over the player below it.

**Focus and sizing:** the API says a click gives the Client focus and `surface.onKey` then receives keys. Escape returns focus to the app and never reaches the Client; there is no Client blur callback. Pane `isFocused` changes and the `ui.focus` hook supply reported focus loss, closing local panels through a model revision. The pointer API has no wheel event, so lists use Up/Down plus the visible “more” indicator. The Client reports columns/rows, maps cells to pixels (8.4px per desktop column, as the reference card does), and draws a stable 650px pane picture. Dropdowns overlay the card within that height rather than growing the Client region. App pane chrome, zoom and focus-event delivery remain host-controlled.

`<Client key="quran-card" module="./client.tsx" width="100%" props={model} />` mounts the full pane. Picks post `{ act: 'pick', list, value }` through `surface.post` to `ui.message`; the hooks validate the value against the authoritative cached catalog, then save/restart the reciter or play the surah using existing dispatch. Playback controls still use validated pointer hit testing or keyboard posts. Once-per-second props update elapsed/progress without resetting dropdown state. Errors are drawn dim inside the picture; actions never show toasts.

The desktop footer is a plain native Button whose `Text color="success"` contains «۞» before its label. Idle: «۞ القرآن». Playing: `۞ <surah Arabic name> mm:ss` (`h:mm:ss` from an hour). A separate Svg passed engine tests but did not appear in live Desktop, so the visible text symbol replaces it. Pressing toggles `quran` using `$.ui.panes`, `$.ui.open` and `$.ui.close`, without changing audio. Quran's outer SessionMode hook stays before salah's, preserving `[Quran] [salah] [model]`. Salah is unchanged.

**Why:** listening is an explicit activity with choices and controls; the Pane keeps those together without interrupting Claude's transcript. No AbovePrompt band or automatic opening at startup. Natural ends continue to the next surah with the same recording, stopping after 114. Salah’s athan moment does not interrupt recitation.

## Surfaces

| Moment | Surface | Shows |
| --- | --- | --- |
| Footer idle/playing | Desktop SessionMode | Green native Button with ۞: القرآن or surah + approximate elapsed; toggles the docked pane |
| User opens player | Desktop docked Pane `quran` | One full Client picture: dropdown fields/search overlays and rounded player card with hit-tested controls, RTL Arabic and embedded Tajawal; dim next hint |
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

**Stated exception to CLAUDE.md's “settings are userConfig” rule:** all durable Quran data—remembered recording, catalog and duration numbers—stays in `$.store` (`quran.reciter`, `quran.catalog`, `quran.durations`), not userConfig. `$.config.set` reloads the module and would cut playback continuity by losing the AbortController; an old clip may remain audible without a handle. Choosing a recording must not reload the module. No new userConfig fields are added. The `/muslim` row points to `/quran reciter`. Stop is the user's off action; there is no unsolicited playback or enabled switch. Loudness is controlled by the OS.

Playback state stays in the declared session contract; handles stay in the runtime only. On reload, existing `session.start` clears tracking and does not resume. A reload orphans the clip: the mod cannot stop it, and it ends with the surah, a documented v1 limitation.

The API has no pointer-cursor prop. The Client draws hover feedback; pointer shape remains host-controlled. Pane chrome and pointer shape remain host-controlled.

## Playback watchdog and temporary diagnostics

Every play invocation creates a 200ms `$.clock.every` beside its `$.audio.play` call. Stop/replacement still abort directly and bump generation; the old clip's own timer checks generation and calls its controller's abort from inside that timer callback. It does so even if a direct abort already marked the signal, and cancels when the play promise resolves or rejects. This addresses the live invocation-context hypothesis; engine tests do not prove audible stop. Duration work never blocks it.

`QURAN_DEBUG = true` temporarily enables serialized read/append/write diagnostics under the OS temp folder: `claude-muslim-quran/debug.log`. Keep the last 200 lines; log generation/surah/start path (command, pane, auto-advance), direct and watchdog aborts, resolved/rejected settlement, aborted flag and elapsed milliseconds. Failures are silent and logging never blocks playback. Set the one constant false later to disable it.

## Never

No seeking, pause/resume, audio cache, ayah splitting, chunking, unsolicited autoplay, OS notifications or generated religious text. The temporary Range prefix is duration metadata only and is removed after use.

## Demo scenes (planned)

When shared `/muslim demo` lands: stopped with Minshawi/Al-Fatiha selected; playing Al-Kahf with known duration; unknown total; catalog/play error; terminal fallback. Use a fake clock and mocked playback/catalog, changing no remembered choice.

## Checklist for a change

- [ ] Full Client pane, embedded Tajawal and silent dropdown/control picks render on Desktop; no Quran toasts.
- [ ] Full Client pane and green footer Button render on Desktop; terminal has only the pane fallback through shared Arabic.
- [ ] Whole-surah audio, abort on stop/replacement, advance only on the active generation’s natural end; stop after 114.
- [ ] Redraw timer runs only while playing; per-clip watchdog cancels on settlement; elapsed remains explicitly approximate.
- [ ] No config reload from recording changes; all durable Quran data in store.
- [ ] Both full lists open without pages; Up/Down scrolls, search filters, and choosing clears/closes the panel. Catalog is reused for seven days and refreshes on demand, retaining stale data on failure; duration failure is silent.
- [ ] Engine gates pass; live sound and native paint verified separately.
