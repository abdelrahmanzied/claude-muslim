# Quran — design

The Quran feature's visual means, design principles and surface scope, following [DESIGN.md](../../../DESIGN.md). Behavior is in [quran spec](quran.md).

The [recording catalog design](quran-catalog.md) covers developer audits, the shipped player catalog and support metadata. The reciter and surah lists are ready on the first pane draw with an empty store and no catalog network call. The pane hides unavailable surahs and shows one dim unavailable-count note.

## Visual means

The player is drawn only inside the Muslim pane's «القرآن الكريم» card (one Client, design and geometry in [muslim-pane-design.md](../muslim-pane/muslim-pane-design.md)); there is no standalone Quran pane. This feature builds the pure model (`pane.ts`, `card.ts`) and the segment label (`label.ts`) and passes them through the panel signal; the avatar (`avatarSvg`, 96 wide) lives in `plugin/src/shared/quran-avatar/`. Shared color helpers supply main accents.

**Visual means and why:** native controls cannot draw the selected design's typography, radius, fill and spacing consistently, so the picker fields, optional segment picker and player live in one picture. The terminal and other surfaces get one sentence from `/quran`: it is a desktop feature (see Surfaces).

## Design principles

The card's geometry, type scale, palette and picker sheet are the Muslim pane's ([muslim-pane-design.md](../muslim-pane/muslim-pane-design.md)). What stays Quran's own:

- **Avatar as state.** The Quran avatar (`plugin/src/shared/quran-avatar/`) is the player's face and its state indicator. It moves only while playback is active (from the audio request, since the API has no audible-start event) and is still when stopped, preparing or failed, and under reduced motion. Negative animation delays follow the elapsed clock, so redraws keep the phase. It draws pixel runs as paths to stay inside the Client tree limit.
- **Controls.** Play/stop is the only filled control, so the main action is unmistakable. Previous/next dim when nothing remains in that direction. Repeat is one state, `off` | `surah` | `segment`: pressing one turns the other off, pressing the lit one turns repeat off, so what is lit is exactly what will happen. The segment repeat is always drawn (no reflow) but dimmed and not hit on a whole surah; a stale segment repeat resets when a whole surah starts.
- **Quiet playback hints.** «الوقت تقريبي» under the times, because the clock is approximate. Unavailable surahs and errors are dim text inside the card, with «إعادة المحاولة» on failure.
- **Lists.** Reciter, surah and segment lists show everything with no pages. Search is Arabic-normalized substring (article letters kept); Arabic or Latin digits pick exact surah or reciter numbers. Segments are named by one formatter, `الربع ٥ - الآيات ١٥–٢٤`. The segment list appears only once a large recording has valid timing metadata.
- **Well-formed picture.** Desktop parses the pane as XML: every nested `<svg>` carries `xmlns="http://www.w3.org/2000/svg"` (without it, it silently disappears), and the font and avatar are embedded, with no network assets. A test checks both.

**No footer item.** The footer is one shared slot sized by Desktop and holds only `☾ Muslim` and salah's prayer line. Quran's `SessionMode` hook only reconnects the panel feeds and returns `next(e)` unchanged.

**`/quran` per surface.** With no arguments: on Desktop it opens the Muslim pane (`$.ui.open({ id: 'muslim', title: '☾ Muslim', focus: true })`), unfolds the Quran card if the shared `paneFolds` state has it folded (Quran writes that one key and does not import the pane) and silently inspects the selected surah; the reply is «Muslim pane opened at القرآن الكريم (desktop only).». Anywhere else (terminal, mobile, vscode) it replies exactly `Quran is a desktop feature: open the Muslim pane in the Claude desktop app.` with no status text and no Arabic. There are no `/quran` subcommands (`play`, `stop`, `next`, `prev`, `reciter`, `repeat`, `repeat segment`, `retry`, `help` were removed for v0.1.0): `/quran <anything>` is the same as bare `/quran` on its surface, and the pane's Quran card is the player.

**Why:** listening is an explicit activity with choices and controls; the Pane keeps those together without interrupting Claude's transcript. No AbovePrompt band or automatic opening at startup. Whole-track natural ends continue to the next available surah with the same recording, stopping when none remains. Split segments continue within the surah and then to the next available surah; previous/next skip unavailable surahs when crossing surah boundaries. Salah’s athan moment does not interrupt recitation.

## Unavailable-surah note

For a known recording with unavailable surahs, its surah overlay adds exactly one 34px row below the eight-option viewport and above the existing position indicator. It uses 12px Tajawal and the existing `--q-dim` variable in both light and dark palettes, including `prefers-color-scheme`; it adds no background. The fields, option row sizes, scrollbar viewport and pane dimensions are unchanged. Arabic remains authored RTL text; Arabic-Indic numeric runs are isolated LTR, with no shaping or reordering.

The row has no option role, selected state, highlight, hover background or action. CSS disables pointer events; hit testing treats its pixels as inert panel space so clicks cannot reach the player beneath. Option navigation and scrollbar geometry count only playable search results. The note remains visible during search and is absent at zero; it never appears in the recording dropdown.

Its text forms are: 1 → «سورة واحدة غير متاحة لهذا القارئ»; 2 → «سورتان غير متاحتين لهذا القارئ»; 3–10 → «N سور غير متاحة لهذا القارئ»; 11+ → «N سورة غير متاحة لهذا القارئ», with `N` in Arabic-Indic digits. The pure `unavailableNote` function owns and tests this agreement.

## Surfaces

| Moment | Surface | Shows |
| --- | --- | --- |
| Footer | SessionMode | Nothing on any surface; the Muslim pane is the way in |
| `/quran` on Desktop | Muslim pane | Opens at the «القرآن الكريم» card, unfolded |
| User plays | Muslim pane's Quran card | The player drawn by the Muslim pane's Client, hit-tested controls (two repeat buttons), RTL Arabic and embedded Tajawal; dim hints |
| `/quran` elsewhere | Terminal, mobile, vscode command reply | `Quran is a desktop feature: open the Muslim pane in the Claude desktop app.` |
| Help/settings | Command reply on all surfaces | `/muslim help quran` (one row: `/quran`); Quran row in `/muslim` says desktop only |
| Pane open failure from `/quran` | Quran CommandOutput | Dim error line for the matching invocation (exact args and returned reply text) |
| Playback failure after card action | Muslim pane's Quran card | One dim error line and «إعادة المحاولة»; no toast or command-row rewrite |
| Playing | The Muslim pane's Quran card | Clock-based approximate elapsed/progress, redraw once per second |
| AbovePrompt | All surfaces | No Quran band |
| Stopped | Muslim pane's Quran card | No redraw timer; per-clip watchdog ends when its play promise settles; play starts from beginning |

Desktop is the supported v1 surface, a stated scope exception to the shared cross-platform playback goal. Terminal Arabic follows `plugin/src/shared/arabic` and the saved per-terminal mode; desktop and other surfaces keep source text as authored. Use simple Latin digits consistently for result numbering and time, as permitted by the feature spec. Audio plays only when the user starts it.

## Settings exception

**Stated exception to CLAUDE.md's “settings are userConfig” rule:** all durable Quran data—remembered recording, duration numbers and recording segment metadata—stays in `$.store` (`quran.reciter`, `quran.durations`, `quran.segmentCache`), not userConfig. `$.config.set` reloads the module and would cut playback continuity by losing the AbortController; an old clip may remain audible without a handle. Choosing a recording must not reload the module. The player catalog is imported from shipped `catalog-data.ts`; unknown store values are ignored. No new userConfig fields are added. The `/muslim` feature row shows Quran as desktop only in the shared English-only status table; `/muslim help quran` and `/quran help` use the shared help-table shape, including `/quran reciter`. Arabic recording labels stay authored in the numbered list and player. Stop is the user's off action; there is no unsolicited playback or enabled switch. Loudness is controlled by the OS.

Playback state stays in the declared session contract; handles stay in the runtime only. On reload, existing `session.start` clears tracking and does not resume. All plugin-initiated config writes first await the shared transient stop-before-reload connector. If playback or preparation is active, Quran stops and shows the single note `Quran stopped: changing a setting reloads the player.`; otherwise it does nothing. External `/config` changes and other reloads cannot be intercepted and may still orphan a clip until the surah ends.

The API has no pointer-cursor prop. The Client draws hover feedback; pointer shape remains host-controlled. Pane chrome and pointer shape remain host-controlled.

## Playback watchdog

Every play invocation creates a 200ms `$.clock.every` beside its `$.audio.play` call. Stop/replacement still abort directly and bump generation; the old clip's own timer checks generation and calls its controller's abort from inside that timer callback. It does so even if a direct abort already marked the signal, and cancels when the play promise resolves or rejects. This addresses the live invocation-context hypothesis; engine tests do not prove audible stop. Duration work never blocks it.

## Never

No seeking, pause/resume, persistent audio cache, separate ayah clips, gapless sequencing, unsolicited autoplay, OS notifications or generated religious text. Large recordings use MP3Quran timing boundaries from the original MP3, with possible mid-word edges accepted for v1; temporary Range files are removed after reading. The fixed quarter map ships separately from per-user timing/byte metadata.

## Demo scenes (planned)

Quran demo is deferred to a separate task and is not included in the shared sequence. Planned scenes: stopped with Minshawi/Al-Fatiha selected; playing Al-Kahf with known duration; unknown total; playback error; terminal fallback (the `/quran` sentence). Use the shipped catalog, a fake clock and mocked playback, changing no remembered choice.

## Checklist for a change

- [ ] The Muslim pane's Quran card, embedded Tajawal and silent picks render on Desktop; no playback-error toasts (only the settings-reload stop note) and no footer item; a terminal gets the desktop-only `/quran` sentence.
- [ ] Whole-surah audio, abort on stop/replacement, advance only on the active generation’s natural end; stop after 114.
- [ ] Redraw timer runs only while playing; per-clip watchdog cancels on settlement; elapsed remains explicitly approximate.
- [ ] No config reload from recording changes; remembered choices and playback metadata in store, catalog shipped in code.
- [ ] Both full lists open without pages; Up/Down scrolls, search filters, and choosing clears/closes the panel. Both lists and the initial player model use shipped data with no fetch or catalog-cache state; duration failure is silent.
- [ ] Every `<svg>` nested in the card (control icons, avatar) carries `xmlns="http://www.w3.org/2000/svg"`. Desktop draws the pane as an SVG image parsed as XML, so a nested `<svg>` without it falls into the XHTML namespace and silently disappears; HTML preview renders hide this. A card test checks it.
- [ ] Engine gates pass; live sound and native paint verified separately.

Native Desktop validation on macOS confirmed both drag scrollbars reach the last rows and return to the first rows while the Pane remains stationary. Surah search for 18 returns Al-Kahf and hides the scrollbar. Drag input is quantized by the host cell coordinates; engine tests also cover release outside the Client, search and selection after dragging. This validates the drag control, not mouse-wheel behavior or other operating systems.

## Opening the card

`/quran` (no arguments) and the Muslim pane's own toggle are the only ways in; see **`/quran` per surface** above. Quran connects on Muslim pane render/input even if the footer has not drawn. It never closes/recreates the pane, starts audio, or changes the picture. Desktop manages the dock and focus.


### Muslim pane settings connector

Quran also connects a read-only recording/selection/repeat feed, a recording-key selection action and an explicit session-repeat action. The pane routes through the existing Quran selection and repeat logic; reciter remains in `quran.reciter` and repeat in session state.

In light mode only, the pixel-art avatar carries `filter: drop-shadow(0 1px 1.5px rgba(31,30,29,.35))` (light media query and `.theme-light`; `.theme-dark` sets `filter:none`) so it stands out on the light card; dark mode and the art are unchanged.

The pane feed carries error text unchanged. The card adds a single dim 12px line and a real «إعادة المحاولة» button below the controls, with drawing and hit testing sharing layout constants in the Muslim pane. Retry refreshes the failed recording and preserves its surah, segment and play/prepare intent. Retry, Stop, new Play and selection changes clear the error; desktop Arabic stays authored. Details and geometry belong to the Muslim pane design.

Settings follow the preflight order in DESIGN.md: check the exact config row before changing pending UI state or stopping playback. A missing row leaves the player running and uses the existing command reply or settings toast with the short reload-plugins message. A missing-row error during the subsequent write maps to that same message and preserves rollback.

## Release behavior

Arabic-Indic surah numbers work in the pane's surah search, using the shared two-way digits helper. Every HTTP metadata fetch races a 15000 ms engine-clock sleep; a timeout aborts pending player work and shows one quiet retryable error. The API exposes no HTTP abort signal, so this ends the plugin’s wait, not the underlying host request. Retry starts fresh metadata work. Duration probes reuse the validated Range reader, its connection/file-size limits and OS temp cleanup. `quran.durations` keeps the 120 most recently learned duration numbers.

`session.start` exposes only `cwd`, `surface` and `isInteractive`, with no real-start/reload distinction in the authoritative API types. Repeat therefore resets to off on every module load, including a settings change. No temporary debug logging ships.
