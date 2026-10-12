# Quran — design

The Quran feature's visual means and surface scope, following [DESIGN.md](../../DESIGN.md). Behavior is in [quran.md](quran.md).

## Visual means

Two native Input search-and-pick blocks followed by the green now-playing card in a user-opened docked Pane. Each shows the selected reciter/surah above a search input, then at most six plain result Buttons. Empty queries collapse the list; Enter picks the first match. Results cover the full catalog without pagination or Select limits. Queries stay in declared session state and clear on picking. A dim no-results line explains an unmatched query.

The now-playing card is a desktop Client (`client.tsx`) rendering one Svg with a `foreignObject` of HTML/CSS. Its pure model, picture and hit testing live in `card.ts`, entirely inside Quran. Native search Inputs and plain result Buttons stay outside the picture for native keyboard focus; their selected lines use dim labels. This is a deliberate split between native choosing and the drawn player.

**Visual means and why:** native Box/Text/Button cannot express the agreed mockup's precise radius, typography, sizing, fill or icon buttons. The Client card uses a 14px rounded `#1f2b25` box with a `#2f4a3c` border, 12px green status, 26px/600 surah title, 13px reciter/Hafs attribution, 6px progress filling from right to left and a mono LTR time row. Previous/next are 46px circles; the middle is a 56px green circle with the dark play/stop icon. Arabic labels sit below the circles. Local pointer state draws lighter hover rings/fills. A dim next-surah line sits under the card. These authored hex greens and dark appearance follow the mockup and distinguish Quran from salah's orange, a stated exception to theme-only colors. System font stack: `'IBM Plex Sans Arabic', system-ui, sans-serif`; no downloaded fonts.

`<Client key="quran-card" module="./client.tsx" width="100%" props={model} />` mounts the picture. The Client reports its region size and posts pointer positions through `surface.post`; `ui.message { element: 'quran-card' }` validates them and hit-tests the circular targets, then runs the same dispatch used by commands. Stale-generation clicks and non-left clicks are ignored. Left/right keys choose adjacent surahs; Enter/space toggles using current playback state. Once-per-second hook redraws update model time/progress. Errors stay a dim native line; actions never show toasts.

The desktop footer is a plain native Button whose `Text color="success"` contains «۞» before its label. Idle: «۞ القرآن». Playing: `۞ <surah Arabic name> mm:ss` (`h:mm:ss` from an hour). A separate Svg passed engine tests but did not appear in live Desktop, so the visible text symbol replaces it. Pressing toggles `quran` using `$.ui.panes`, `$.ui.open` and `$.ui.close`, without changing audio. Quran's outer SessionMode hook stays before salah's, preserving `[Quran] [salah] [model]`. Salah is unchanged.

**Why:** listening is an explicit activity with choices and controls; the Pane keeps those together without interrupting Claude's transcript. No AbovePrompt band or automatic opening at startup. Natural ends continue to the next surah with the same recording, stopping after 114. Salah’s athan moment does not interrupt recitation.

## Surfaces

| Moment | Surface | Shows |
| --- | --- | --- |
| Footer idle/playing | Desktop SessionMode | Green native Button with ۞: القرآن or surah + approximate elapsed; toggles the docked pane |
| User opens player | Desktop docked Pane `quran` | Selected lines, native search Inputs and up to six result Buttons per list, Client-drawn rounded card with status, title/progress/icons, LTR times and hit-tested round controls; dim next hint |
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

The API has no pointer-cursor prop. The Client draws hover feedback; pointer shape remains host-controlled. Exact native picker styling, pane chrome and installed font availability remain host-controlled.

## Playback watchdog and temporary diagnostics

Every play invocation creates a 200ms `$.clock.every` beside its `$.audio.play` call. Stop/replacement still abort directly and bump generation; the old clip's own timer checks generation and calls its controller's abort from inside that timer callback. It does so even if a direct abort already marked the signal, and cancels when the play promise resolves or rejects. This addresses the live invocation-context hypothesis; engine tests do not prove audible stop. Duration work never blocks it.

`QURAN_DEBUG = true` temporarily enables serialized read/append/write diagnostics under the OS temp folder: `claude-muslim-quran/debug.log`. Keep the last 200 lines; log generation/surah/start path (command, pane, auto-advance), direct and watchdog aborts, resolved/rejected settlement, aborted flag and elapsed milliseconds. Failures are silent and logging never blocks playback. Set the one constant false later to disable it.

## Never

No seeking, pause/resume, audio cache, ayah splitting, chunking, unsolicited autoplay, OS notifications or generated religious text. The temporary Range prefix is duration metadata only and is removed after use.

## Demo scenes (planned)

When shared `/muslim demo` lands: stopped with Minshawi/Al-Fatiha selected; playing Al-Kahf with known duration; unknown total; catalog/play error; terminal fallback. Use a fake clock and mocked playback/catalog, changing no remembered choice.

## Checklist for a change

- [ ] Client-drawn green card and silent controls render on Desktop; no Quran toasts.
- [ ] Native controls and green footer Button render on Desktop; terminal has only the pane fallback through shared Arabic.
- [ ] Whole-surah audio, abort on stop/replacement, advance only on the active generation’s natural end; stop after 114.
- [ ] Redraw timer runs only while playing; per-clip watchdog cancels on settlement; elapsed remains explicitly approximate.
- [ ] No config reload from recording changes; all durable Quran data in store.
- [ ] Both full lists are searchable without pages; choosing clears the query. Catalog is reused for seven days and refreshes on demand, retaining stale data on failure; duration failure is silent.
- [ ] Engine gates pass; live sound and native paint verified separately.
