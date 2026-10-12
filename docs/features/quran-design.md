# Quran — design

The Quran feature's visual means and surface scope, following [DESIGN.md](../../DESIGN.md). Behavior is in [quran.md](quran.md).

## Visual means

Text and native Select/Button controls in a user-opened docked Pane, plus a desktop footer chip. Reciter and surah selectors come first (with page selectors because the engine caps each Select at 64 options; 63 choices and one placeholder), then the active names (accent `color="claude"`) or dim «لا يوجد تشغيل», elapsed / total time and a fixed 24-cell `━` / `─` progress bar. Previous, play/stop and next share a row. Errors are one dim line. Use Claude's font and theme colors only, with no images, SVG, custom colors or animation.

The desktop footer chip is a plain native Button with `color="success"` text, visually distinct from salah’s `color="claude"` line. Idle: «القرآن». Playing: `<surah Arabic name> mm:ss` (`h:mm:ss` from an hour). Pressing reads `$.ui.panes()` and opens or closes `quran` with `$.ui.open` / `$.ui.close`; it does not change playback. The engine accepts Button inside SessionMode, verified by its render harness. Quran’s SessionMode hook is installed before salah’s: first registered is outermost, so prepending the chip to `next(e)` gives `[Quran] [salah] [model]`. Salah itself is unchanged.

**Why:** listening is an explicit activity with choices and controls; the Pane keeps those together without interrupting Claude's transcript. No AbovePrompt band or automatic opening at startup. Natural ends continue to the next surah with the same recording, stopping after 114. Salah’s athan moment does not interrupt recitation.

## Surfaces

| Moment | Surface | Shows |
| --- | --- | --- |
| Footer idle/playing | Desktop SessionMode | Green native Button: القرآن or surah + approximate elapsed; toggles the docked pane |
| User opens player | Desktop docked Pane `quran` | Native reciter/surah Select controls, text status/time/progress, Buttons |
| Non-desktop pane | Terminal, mobile, vscode Pane | Only dim «مشغّل القرآن متاح على تطبيق Claude للديسكتوب» |
| Commands/help/settings | Command reply on all surfaces | Short status or requested catalog/help; Quran row in `/muslim` |
| Playback failure after command | Quran CommandOutput and pane | Dim error line; short toast |
| Playing | Desktop footer chip and docked Pane | Clock-based approximate elapsed/progress, redraw once per second |
| AbovePrompt | All surfaces | No Quran band |
| Terminal footer | SessionMode | No Quran label; preserve other features |
| Stopped | Same desktop Pane | No Quran timer; play starts from beginning |

Desktop is the supported v1 surface, a stated scope exception to the shared cross-platform playback goal. Terminal Arabic follows `src/shared/arabic` and the saved per-terminal mode; desktop and other surfaces keep source text as authored. Use simple Latin digits consistently for select numbering and time, as permitted by the feature spec. Audio plays only when the user starts it.

## Settings exception

**Stated exception to CLAUDE.md's “settings are userConfig” rule:** all durable Quran data—remembered recording, catalog and duration numbers—stays in `$.store` (`quran.reciter`, `quran.catalog`, `quran.durations`), not userConfig. `$.config.set` reloads the module and would cut playback continuity by losing the AbortController; an old clip may remain audible without a handle. Choosing a recording must not reload the module. No new userConfig fields are added. The `/muslim` row points to `/quran reciter`. Stop is the user's off action; there is no unsolicited playback or enabled switch. Loudness is controlled by the OS.

Playback state stays in the declared session contract; handles stay in the runtime only. On reload, existing `session.start` clears tracking and does not resume. An orphaned clip may still sound, a documented v1 limitation.

## Never

No seeking, pause/resume, audio cache, ayah splitting, chunking, unsolicited autoplay, OS notifications or generated religious text. The temporary Range prefix is duration metadata only and is removed after use.

## Demo scenes (planned)

When shared `/muslim demo` lands: stopped with Minshawi/Al-Fatiha selected; playing Al-Kahf with known duration; unknown total; catalog/play error; terminal fallback. Use a fake clock and mocked playback/catalog, changing no remembered choice.

## Checklist for a change

- [ ] Native controls and green footer Button render on Desktop; terminal has only the pane fallback through shared Arabic.
- [ ] Whole-surah audio, abort on stop/replacement, advance only on the active generation’s natural end; stop after 114.
- [ ] Timer runs only while playing; elapsed remains explicitly approximate.
- [ ] No config reload from recording changes; all durable Quran data in store.
- [ ] Catalog refresh keeps stale data on failure; duration failure is silent.
- [ ] Engine gates pass; live sound and native paint verified separately.
