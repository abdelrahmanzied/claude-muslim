# Quran — design

The Quran feature's visual means and surface scope, following [DESIGN.md](../../DESIGN.md). Behavior is in [quran.md](quran.md).

## Visual means

Two native Input search-and-pick blocks followed by the green now-playing card in a user-opened docked Pane. Each shows the selected reciter/surah above a search input, then at most six plain result Buttons. Empty queries collapse the list; Enter picks the first match. Results cover the full catalog without pagination or Select limits. Queries stay in declared session state and clear on picking. A dim no-results line explains an unmatched query.

The card uses Box column layout, padding, gap, `borderStyle="round"`, `borderColor="#2f4a3c"` and `backgroundColor="#1f2b25"`. Status is «يتلى الآن» or «متوقف» in `#7fc3a0`; an SVG title renders large bold «سورة <name>». Reciter and «حفص عن عاصم» use `#b9d8c7`. The thin rounded SVG progress track uses `#2f4a3c`, filling from right to left in `#7fc3a0`. Elapsed and total occupy opposite ends of a row with explicit LTR isolation. The automatic-next hint sits dim below the card.

**Visual means and why:** SVG supplies the title size, rounded progress and circular previous/play-stop/next icons that native Text and Button props cannot express. These authored hex greens follow the agreed mockup and distinguish recitation from salah's orange; this is the feature's stated exception to theme-only colors. Native Buttons retain Arabic labels and host interaction. Their children permit only Text or strings, so each decorative SVG icon sits above its corresponding plain Button rather than inside it. The middle icon is larger and filled green. Box has no explicit radius prop, so the supported rounded border style is used; exact card radius and native button shape/fill remain host-controlled. Errors are one dim line. Pane actions never show toasts; redraw is their feedback.

The desktop footer chip is a Box holding a 14px open-book stroke Svg (`#7fc3a0`) followed by a plain native Button with `color="success"` text, visually distinct from salah’s `color="claude"` line. Idle: «القرآن». Playing: `<surah Arabic name> mm:ss` (`h:mm:ss` from an hour). Pressing reads `$.ui.panes()` and opens or closes `quran` with `$.ui.open` / `$.ui.close`; it does not change playback. The engine accepts Svg alongside Button inside SessionMode, verified by its render harness. Quran’s SessionMode hook is installed before salah’s: first registered is outermost, so prepending the chip to `next(e)` gives `[Quran] [salah] [model]`. Salah itself is unchanged.

**Why:** listening is an explicit activity with choices and controls; the Pane keeps those together without interrupting Claude's transcript. No AbovePrompt band or automatic opening at startup. Natural ends continue to the next surah with the same recording, stopping after 114. Salah’s athan moment does not interrupt recitation.

## Surfaces

| Moment | Surface | Shows |
| --- | --- | --- |
| Footer idle/playing | Desktop SessionMode | Green open-book SVG plus native Button: القرآن or surah + approximate elapsed; toggles the docked pane |
| User opens player | Desktop docked Pane `quran` | Selected lines, native search Inputs and up to six result Buttons per list, green card with status, SVG title/progress/icons, LTR times and Arabic Buttons; dim next hint |
| Non-desktop pane | Terminal, mobile, vscode Pane | Only dim «مشغّل القرآن متاح على تطبيق Claude للديسكتوب» |
| Commands/help/settings | Command reply on all surfaces | Short status or requested catalog/help; Quran row in `/muslim` |
| Playback failure after command | Quran CommandOutput and pane | Dim error line; command output only for playback started by a command |
| Playback failure after pane action | Desktop pane | Dim error line only; no toast or command-row rewrite |
| Playing | Desktop footer chip and docked Pane | Clock-based approximate elapsed/progress, redraw once per second |
| AbovePrompt | All surfaces | No Quran band |
| Terminal footer | SessionMode | No Quran label; preserve other features |
| Stopped | Same desktop Pane | No Quran timer; play starts from beginning |

Desktop is the supported v1 surface, a stated scope exception to the shared cross-platform playback goal. Terminal Arabic follows `src/shared/arabic` and the saved per-terminal mode; desktop and other surfaces keep source text as authored. Use simple Latin digits consistently for result numbering and time, as permitted by the feature spec. Audio plays only when the user starts it.

## Settings exception

**Stated exception to CLAUDE.md's “settings are userConfig” rule:** all durable Quran data—remembered recording, catalog and duration numbers—stays in `$.store` (`quran.reciter`, `quran.catalog`, `quran.durations`), not userConfig. `$.config.set` reloads the module and would cut playback continuity by losing the AbortController; an old clip may remain audible without a handle. Choosing a recording must not reload the module. No new userConfig fields are added. The `/muslim` row points to `/quran reciter`. Stop is the user's off action; there is no unsolicited playback or enabled switch. Loudness is controlled by the OS.

Playback state stays in the declared session contract; handles stay in the runtime only. On reload, existing `session.start` clears tracking and does not resume. A reload orphans the clip: the mod cannot stop it, and it ends with the surah, a documented v1 limitation.

The API has no pointer-cursor prop on Box, Button or other pane controls; cursor styling remains host-controlled.

## Never

No seeking, pause/resume, audio cache, ayah splitting, chunking, unsolicited autoplay, OS notifications or generated religious text. The temporary Range prefix is duration metadata only and is removed after use.

## Demo scenes (planned)

When shared `/muslim demo` lands: stopped with Minshawi/Al-Fatiha selected; playing Al-Kahf with known duration; unknown total; catalog/play error; terminal fallback. Use a fake clock and mocked playback/catalog, changing no remembered choice.

## Checklist for a change

- [ ] Green SVG card and silent native controls render on Desktop; no Quran toasts.
- [ ] Native controls and green footer Button render on Desktop; terminal has only the pane fallback through shared Arabic.
- [ ] Whole-surah audio, abort on stop/replacement, advance only on the active generation’s natural end; stop after 114.
- [ ] Timer runs only while playing; elapsed remains explicitly approximate.
- [ ] No config reload from recording changes; all durable Quran data in store.
- [ ] Both full lists are searchable without pages; choosing clears the query. Catalog is reused for seven days and refreshes on demand, retaining stale data on failure; duration failure is silent.
- [ ] Engine gates pass; live sound and native paint verified separately.
