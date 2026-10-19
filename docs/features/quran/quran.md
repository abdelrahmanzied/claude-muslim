# Quran — recitation and recording quarters

A Quran recitation player in Claude Desktop. Small recordings play as whole remote MP3 tracks. Recordings at or above the conservative 24 MiB playback limit (below the host’s 26,214,400-byte limit) use quarter intersections from the same recording, started only by the user.

## Flow

1. The player lives only in the Muslim pane's «القرآن الكريم» card; there is no separate Quran pane. `/quran` with no arguments opens the Muslim pane on Desktop at that card (unfolding it if folded) and prepares the selected surah; on a terminal or any other surface it replies with a text status (reciter, surah, segment label if split, elapsed/total, playing or stopped, then `Playback runs in the Claude desktop app.`, Arabic through `plugin/src/shared/arabic`). The filtered reciters and all 114 authored surah names ship in `catalog-data.ts`, so the first pane draw and both lists are ready with an empty store and no catalog request. Show only complete (114 surahs) Hafs recordings (`rewaya_id === 1`). Each moshaf is a separate choice, including murattal and mujawwad by the same reciter.
2. The card is Client-drawn by the Muslim pane. The reciter, surah and segment fields open an in-card sheet with a search box and eight visible option rows. The full catalog is available without pages or a 64-option cap. Printable Arabic/Latin keys filter, Backspace deletes, Up/Down moves the highlight and scrolls, the scrollbar drags, Enter or a row click picks. Details of the card are in the Muslim pane spec and design.
3. The card shows a now-playing player: status, surah title, the avatar, reciter, a progress bar filling left to right, and separate LTR approximate elapsed and total times, with previous/next, play/stop and the two repeat controls (segment, surah).
4. Playback starts directly in the hook flow without awaiting the clip, using the same controller that Stop and replacement actions abort. Each clip also gets a 200ms watchdog created beside the play call; after a generation change it aborts inside its own timer callback, even if direct abort already marked the signal. The watchdog cancels when that clip settles. This follows the live invocation-context hypothesis; audible behavior must be checked on Desktop. Size checking and large-recording clip preparation precede playback. Whole-track duration lookup remains best effort and independent. Stop bypasses the action queue so pending recording preparation cannot delay it; an interrupted pending play does not start later. The pane toggle reads current playback state when pressed. Starting another track aborts the current one. Stop ends playback. A whole track’s natural end advances to the next available surah with the same recording; when none remains it stops and clears playback. A split segment advances to the next segment, then the next available surah. Next/Previous stay within the selected surah’s segments, then skip unavailable surahs without wrapping. A per-play generation and controller identity guard prevent a stopped, replaced or reloaded clip from advancing. Previous/next stay at 1/114 with a short reply. Controls remain available while stopped; play starts the selected whole track or quarter from its beginning.
5. Quran has no footer item on any surface: the Desktop footer holds only `☾ Muslim` and salah's prayer line, so the player is reached from `/quran` or the Muslim pane's Quran card. Closing the pane does not stop audio. Quran adds no AbovePrompt band.
6. While playing, a clock timer invalidates the drawing once per second; stopped playback has no Quran redraw timer. Elapsed is `clock.now() - startedAt`, approximate wall-clock time including startup/buffering, not the decoder's position. Total is `--:--` until found. Times use `mm:ss`, or `h:mm:ss` from one hour.

## Recording availability

The shipped `QURAN_SUPPORT` catalog is keyed by the selected recording's `reciter.key`. Only its `unavailable` entries are blocked; every other surah is playable. The surah dropdown and all search results hide those entries and show one dim, inactive unavailable-count note below the option viewport when the count is nonzero. The note is not an option, cannot be clicked or hovered, and is excluded from keyboard navigation and scrollbar counts. The recording dropdown is unchanged. A recording absent from the shipped catalog keeps all 114 surahs and the existing playback behavior.

Switching recordings or restoring a stored selection that is unavailable chooses the next higher available surah, otherwise the next lower. Switching while playing follows normal surah replacement; a stopped selection stays stopped. There is no toast. Manual next/previous and natural auto-advance skip unavailable surahs without wrapping; quarter navigation keeps its existing rules. The card's automatic-next hint names the same available target.

A segment is named everywhere (pane fields and options, the card's next/repeat lines, the Muslim pane) by one formatter, `plugin/src/features/quran/label.ts`: `الربع ٥ - الآيات ١٥–٢٤` with Arabic digits and the Arabic comma (never «·» beside Arabic digits), plus ` (١ من ٢)` when one quarter is cut into consecutive segments. The same player also lives in the Muslim pane's Quran card (see the muslim-pane spec); it uses the same picks and controls through the panel signal.

Repeat is one of three session states: off, `surah` or `segment` (`PluginState['muslim'].quranRepeat`; reset to off at session start). The card has two exclusive buttons: «السورة» (`/quran repeat` or the surah button) and «المقطع» (`/quran repeat segment` or the quarter button). Pressing one turns the other off; pressing the active one turns repeat off.
- `surah`: a whole file replays from the start; a split surah plays every quarter in order, then starts again from the first quarter. The hint names the next quarter, and on the last quarter (or a whole file) it reads «تكرار: سورة …».
- `segment`: the current quarter replays forever and the next quarter is never prefetched (the same quarter stays ready so the replay is gapless). The hint reads «تكرار: الربع … - الآيات …».
- The quarter button is always drawn but inactive (dim, `aria-disabled`, no hover, not clickable) while the selected surah plays whole, and `/quran repeat segment` then says it needs a split surah. If a whole surah starts while `segment` is on, repeat falls back to off; a stale `segment` on a whole surah reads as off.

Stop leaves repeat on; manual navigation never triggers it.

Explicit number/name picks, including slash commands and Client posts, refuse a known unavailable surah with «هذه السورة غير متاحة لهذا القارئ. اختر سورة أخرى أو قارئًا آخر.» using the existing dim pane/command error path. The check runs before any audio, size, timing, Range or duration request. Startup repairs restored selection without fetching recording metadata or resuming audio; pane rendering uses the same fallback read-only, and actions repair state before playback. Existing runtime size checks, timing errors and `CLIP_ERROR` remain necessary because the shipped catalog can become stale. Automatic support-catalog refresh is tracked in [issue #13](https://github.com/abdelrahmanzied/claude-muslim/issues/13).

## Commands

Runtime help follows the shared `Command | Description | Options` table; `/muslim` lists the selected recording as `Recording <number> (see /quran reciter)` in its `Feature | Description | State` table, keeping Arabic names outside tables. Main accents and the footer follow `/muslim color`; secondary text and artwork retain their designed colors.

| Command | Does |
| --- | --- |
| `/quran` | Desktop: open the Muslim pane at its Quran card. Terminal: text status (reciter, surah, time, state) |
| `/quran play <surah>` | Play with the current reciter; number 1–114 or Arabic name (الكهف / كهف) |
| `/quran stop` | Stop playback or pending preparation |
| `/quran repeat` | Toggle whole-surah repeat (turns quarter repeat off) |
| `/quran repeat segment` | Toggle repeating the current quarter of a split surah (turns surah repeat off) |
| `/quran retry` | Refresh size and timing metadata after a failure |
| `/quran next` · `/quran prev` | Play adjacent quarter for split recordings, otherwise next/previous available surah; do not wrap |
| `/quran reciter` | Numbered list of all filtered recordings |
| `/quran reciter <number or name>` | Remember choice; move to an available surah if needed, restarting if playing |
| `/quran help` | Usage table; unknown arguments show this too |

Names ignore tashkeel, hamza forms, leading `ال` and spaces. A reciter name shared by multiple recordings is ambiguous: use the full recording label or list number. Labels preserve the source's authored Arabic: `<reciter name> — <moshaf name after ' - ' if present>`. `/muslim help` includes Quran, `/muslim help quran` shows its table, and `/muslim` has a Quran row for current reciter.

Replies are short except the requested catalog/help. Recording preparation and playback failures appear as one dim error line in the Muslim pane's Quran card and as a command reply. Card actions run silently and redraw the pane; Quran playback errors never show toasts. The one settings-change note is `Quran stopped: changing a setting reloads the player.`; it appears only when a plugin setting write stops active playback or preparation before a reload. Since audio completes asynchronously, a play rejection updates Quran's visible command output only when playback was started by a slash command. Playback started from the card reports errors only in the card. No exception escapes the feature's hooks. Duration failures remain silent.

## Data and permission

[MP3Quran v3](https://www.mp3quran.net/api/v3) is keyless:

- Build-time reciters: `https://www.mp3quran.net/api/v3/reciters?language=ar`, filtered by `filterReciters`.
- Build-time authored surah names: `https://www.mp3quran.net/api/v3/suwar?language=ar` (114), validated and ordered by `readSurahs`.

These two endpoints are used only by `scripts/quran/support.ts`, never by the installed plugin. Runtime network access is limited to audio, size/Range/duration probes and ayah timing:

- Matching timing read: `https://www.mp3quran.net/api/v3/ayat_timing/reads`, resolved by exact `folder_url` equality with the selected recording server.
- Ayah timing: `https://www.mp3quran.net/api/v3/ayat_timing?surah=<surah>&read=<timingReadId>`.
- Track: the chosen moshaf's server plus the three-digit surah number and `.mp3`.

The [MP3Quran permission statement](https://www.mp3quran.net/eng/privacy) says: “we allow any visitor or developer to copy any material or use any link”. This is explicit developer permission to use their links, rather than a named software licence. It does not explicitly address redistributed edited audio. This feature prepares only local temporary cuts from the original link; it does not host a clip service.

## Persistence and duration

The player catalog comes only from the shipped `catalog-data.ts`; it updates with the plugin. It has no `fetchedAt`, store entry or refresh timer. Remembered recording choices and all other stored values remain in use.

| Value | Storage | Default |
| --- | --- | --- |
| Recording key `<reciterId>:<moshafId>` | `$.store` `quran.reciter` | Minshawi murattal, else first |
| Filtered recordings and 114 surah names | Shipped `catalog-data.ts` | Ready immediately, including an empty store; no catalog network request |
| Recording metadata keyed `<moshafKey>:<surah>` | `$.store` `quran.segmentCache` | Schema/map versions, recording names and IDs, surah/ayah count, source URL and validators, actual whole size, duration, timing read ID, segment ranges/times, frame-validated byte boundaries/checkpoints, `computedAt`, `updatedAt`, `sourceCheckedAt`; no audio |
| Duration numbers keyed `<moshafKey>:<surah>` | `$.store` `quran.durations` | Unknown; at most 120 recent entries |
| Current track (key, surah, start time, duration), selected surah, pane error and command-origin error | Declared session `$.state` | Stopped, 1, no error |

Duration lookup runs beside playback. Curl fetches bytes 0–131071 into temporary files under the OS temp folder (`$TMPDIR` or `/tmp`; `%TEMP%` on Windows, cleaned with `del`), `claude-muslim-quran/`; `$.fs.read(..., { as: 'bytes' })` returns base64 decoded without Node. Content-Range supplies total size. Skip ID3v2, find a valid Layer III frame (MPEG-1/2/2.5), use Xing/Info's frame count if present, otherwise estimate CBR duration from audio bytes and bitrate. Duration is approximate for VBR without Xing. The prefix is only metadata, never played, and removed after probing; cached values are small duration numbers, not audio. Without curl, valid headers or parseable bytes, total remains unknown. `$.http.fetch` supplies JSON and HEAD headers; its text body is not used for binary audio.

Verified finding supplied for this feature: a probe of 12 MP3Quran files from 6 reciters (including Minshawi 002, 8216 seconds) found no Xing, Info or VBRI header. The CBR estimate `(Content-Length − ID3v2 size) × 8 / first-frame bitrate` matched ffprobe within 0.03 seconds. The implementation retains Xing/Info support for other files but uses CBR when absent. Total size comes from the Content-Range total in the **same curl Range response**, not the prefix length or an assumed file length. Size checking now uses HEAD Content-Length first, with a validated 206 Range prefix fallback. Audio start includes the ID3v2 size (and any leading bytes before the first valid frame).

## Large-recording preparation

For v1, large surahs are split into hizb quarters at the MP3Quran ayah timings, mapped to MP3 frame boundaries. Drift can put a quarter edge mid-word for some reciters: measured examples are Minshawi surah 9 about 9 s late after ayah ~91, and Hudhaifi up to +30 s in surah 2 and +8.5 s in surah 9. This is accepted for v1. The next quarter continues from the same source byte boundary, with the small preceding MP3 reservoir context retained, so nothing is lost.

The fixed map ships as code in `plugin/src/features/quran/quarter-boundaries.ts`, under `QURAN_QUARTER_BOUNDARIES` and `QURAN_QUARTER_MAP_VERSION`. It contains surah and ayah numbers, no reader timestamps. Small files stay whole regardless of their number of quarters. A large file requires complete, ordered, nonoverlapping timing rows for that exact recording; the first segment includes the recording introduction and each quarter is clipped to the selected surah. Estimated oversize quarters are further divided at ayah boundaries with a 1MiB planning margin. Actual clip size is checked independently and must stay strictly below the host limit; an unsafe cut fails rather than being sent to the player.

Range requests fetch at most 2MiB into temporary files, verify status 206, Content-Range, body length and available recording validators, then remove the files. Scanning Layer III frames supplies actual byte offsets for CBR and VBR recordings. Up to 64 preceding frame records provide reusable seek checkpoints; a small amount of preceding frame context initializes the MP3 bit reservoir. This can add tens of milliseconds at a cut. Frame validation checks decodable byte ranges and size, not audible ayah alignment; timing drift remains accepted for v1. The final segment keeps remaining audio through the end of that surah file. Once frame-validated, segments reuse cached byte offsets. Each playback downloads its clip again; audio bytes are not stored in `$.store`.

`quran.segmentCache` is a separate key in the existing per-user plugin store, not a shipped cache and not a separate user-managed JSON file. It expires after seven days, rejects old schema/map versions or changed source URLs, and holds at most 120 plans with a conservative 1.5MB JSON budget to leave room for other features. Retry refreshes size and timings. Missing size shows the Claude 25MiB restriction, retry and alternate reader/surah choices. Large files with missing timings remain unavailable. Stop or replacement clears preparation immediately and late requests cannot start audio. The current bounded curl call may finish before cleanup; Stop never waits for it to finish.

## Limits

- Desktop is the only supported v1 playback surface. Commands are accepted everywhere; on other surfaces `/quran` replies with a text status ending `Playback runs in the Claude desktop app.`. All terminal Arabic uses the shared path; desktop text stays as authored.
- No seeking, pause/resume, persistent audio cache, separate ayah playback or guaranteed gapless transitions. Whole-surah and quarter repeat and sequential quarters are supported. No claim of inaudible quarter boundaries.
- Prayer time and salah’s athan moment leave recitation playing; no interaction with salah.
- Before every plugin-initiated `$.config.set`, the writer first checks that its exact config row exists. If it is missing, Quran keeps playing, nothing is saved or navigated, and the existing reply/toast channel says `Not changed: run /reload-plugins, then try again.` A thrown `no /config row` error after that check receives the same friendly message, with the writer's existing rollback. When the row exists, a shared transient signal stops active Quran playback or preparation and shows one toast: `Quran stopped: changing a setting reloads the player.` Nothing playing means no stop and no toast. The writer awaits the stop before saving. Changes outside the plugin (including `/config`) and other module reloads cannot be intercepted: they can still orphan a clip by losing its AbortController, leaving it audible until the surah ends. `session.start` clears stale tracking and never resumes or advances it.
- Duration probing uses the OS temporary folder and the verified Desktop curl behavior. The API types describe processes as CLI-only; duration-probe failures are silent. Large-recording playback needs curl Range requests; unavailable curl or rejected ranges show a feature error and retry.

## Embedded font

Tajawal Regular and Bold (google/fonts, OFL in `plugin/src/shared/font/fonts/OFL.txt`) are embedded via `@font-face` as WOFF2 data URIs in `plugin/src/shared/font/tajawal-embedded.ts` (shared with the Muslim pane). Full TTF base64 totals about 160 KB and cannot fit this build’s 100 KB Client tree limit; WOFF2 subsets (Basic Latin, Latin-1, the Arabic blocks, punctuation, arrows and shapes, every layout feature kept) are about 48 KB combined, which leaves room for the full Muslim pane. No font network request is needed.

## Design

[Quran design](quran-design.md): the player drawn inside the Muslim pane's Quran card, the text status on other surfaces; storage exception and surface fallback.

[Recording catalogs](quran-catalog.md): developer support audit, generated availability metadata, the shipped availability behavior, accepted v1 timing drift, and automatic support refresh tracked in issue #13.

## Files

| File | Holds |
| --- | --- |
| `install.tsx` | Hooks, `/quran` per surface, shipped catalog selection, playback, duration probing, feeds for the Muslim pane |
| `plugin/src/shared/quran-avatar/` | Embedded vector avatar with playback-linked motion and still pose |
| `card.ts` | Pure player model (status, times, progress, repeat, avatar clock) |
| `pane.ts` | Pure model for the Muslim pane's card feed, option lists and pick-message validation |
| `plugin/src/shared/font/` (`tajawal-embedded.ts`, `fonts/OFL.txt`, `index.ts`; shared with the Muslim pane) | Full Tajawal WOFF2 data and OFL licence |
| `catalog-data.ts` | Generated filtered recordings (`key`, `name`, `label`, `server`) and all 114 surah names in order; the sole runtime catalog |
| `catalog.ts` | Filtering, labels, command name matching, uncapped substring/number search, URL building |
| `mp3.ts` | Pure frame, ID3, Xing/CBR, Content-Range and base64 parsing |
| `quarter-boundaries.ts` | Shipped map version 1: 114 surahs, 240 quarters, 313 surah×quarter intersections, 6,236 ayahs; numeric ranges only, extracted from the AlQuran Cloud quarter map during research |
| `segments.ts` | Size limit, exact timing-read matching, timing validation, segment planning and bounded metadata cache |
| `segment-mp3.ts` | Actual Layer III frame scanning, reservoir context, byte checkpoints and portable base64 encoding |
| `availability.ts` | Pure support-catalog lookups, nearest/next available selection and Arabic unavailable-count agreement |
| `player.ts` | Command parser, generation-safe next-surah rule, time formatting, text progress bar |
| `help.ts` | Help table, shared with `/muslim help` |

The Quran card keeps the Mushaf book icon beside the heading «القرآن الكريم». The selected embossed Quran avatar sits inside the player and moves only while playback state is active; stop or failure returns it to a still pose. The lists retain search and keyboard navigation, with a drag scrollbar. The Muslim pane's `ui.scroll` hook never routes wheel ticks to a list.

## To verify live

With an empty plugin store, open the Muslim pane in Desktop and confirm the Quran card and both lists are filled without catalog requests. Select Minshawi and Al-Kahf, listen for continuous whole-track playback, stop, switch reciter while playing, verify `/quran` opens the pane at the Quran card and unfolds it, test natural-end advancement and stopping after surah 114. Verify card controls never show toasts and playback errors stay inside the card unless started by a slash command. Check no acoustic overlap on fast switching and search across both full lists, Enter/row selection, keyboard scrolling and readable sheets in narrow panes and each theme. Check the watchdog for both initial and auto-advanced clips. Confirm the terminal fallback (`/quran` status) and Arabic modes. Engine tests exercise hooks and trees; they do not prove sound or native paint.

## Muslim pane

The [Muslim pane](../muslim-pane/muslim-pane.md) is where this feature is drawn, on its «القرآن الكريم» card. This feature connects what that card shows (and what its buttons ask of it) through `plugin/src/shared/panel/signal.ts`; see the pane spec for the table.

`/quran` on Desktop does `$.ui.open({ id: 'muslim', title: '☾ Muslim', focus: true })`, unfolds the Quran card if the shared `paneFolds` state has it folded (Quran writes only that key and does not import the pane), and then does the silent inspection of the selected surah, retaining existing playback and selection. Quran connects on Muslim pane draws and input, so navigation works after a module reload. Desktop owns the shared mod-pane dock and focus grant; native tab activation remains a live verification step.


### Muslim pane settings connector

Quran also connects a read-only recording/selection/repeat feed, a recording-key selection action and an explicit session-repeat action. The pane routes through the existing Quran selection and repeat logic; reciter remains in `quran.reciter` and repeat in session state.

Pane failures carry their error through `PanelQuran`: one dim line inside the card, followed by «إعادة المحاولة». Retry uses the existing panel action channel and repeats the same failed recording, surah, segment and play/prepare intent, refreshing metadata. Retry, Stop, a new Play or a selection change clears the error. A command-origin error records the invocation's exact args and returned reply text; only a CommandOutput row matching both is replaced. Stop, help and unrelated rows keep their own replies.

## Release behavior

Arabic-Indic surah numbers work in `/quran play`, using the shared two-way digits helper. Every HTTP metadata fetch races a 15000 ms engine-clock sleep; a timeout aborts pending player work and shows one quiet retryable error. The API exposes no HTTP abort signal, so this ends the plugin’s wait, not the underlying host request. Retry starts fresh metadata work. Duration probes reuse the validated Range reader, its connection/file-size limits and OS temp cleanup. `quran.durations` keeps the 120 most recently learned duration numbers.

`session.start` exposes only `cwd`, `surface` and `isInteractive`, with no real-start/reload distinction in the authoritative API types. Repeat therefore resets to off on every module load, including a settings change. No temporary debug logging ships.
