# Quran — recitation and recording quarters

A Quran recitation player in Claude Desktop. Small recordings play as whole remote MP3 tracks. Recordings at or above the conservative 24 MiB playback limit (below the host’s 26,214,400-byte limit) use quarter intersections from the same recording, started only by the user.

## Flow

1. `/quran` opens the pane titled «القرآن الكريم». On first need, fetch the reciters and surah names from MP3Quran v3. Show only complete (114 surahs) Hafs recordings (`rewaya_id === 1`). Each moshaf is a separate choice, including murattal and mujawwad by the same reciter.
2. The whole desktop pane is Client-drawn. Rounded dropdown fields show the current reciter/moshaf and surah; clicking opens an overlay with a search box and eight visible option rows. The full catalog is available without pages or a 64-option cap. Printable Arabic/Latin keys filter, Backspace deletes, Up/Down moves the highlight and scrolls, Enter or a row click picks. The Client pointer API has no wheel event. The Pane hook can route forwarded ticks using coordinates or Client overlay hover, but current Desktop dispatch depends on its own viewport moving; full comfortable bidirectional wheel scrolling remains unresolved. Empty queries show all available choices. Field toggles, outside clicks and reported focus loss close the panel; picks clear and close it. The hook validates every posted pick against the cached catalog. Arabic substring matching ignores tashkeel, hamza forms and spaces but retains article letters. Latin and Arabic-Indic digits match exact surah or reciter-list numbers. Picking a surah checks its size: small recordings play, while large recordings reveal the searchable «ابدأ من» field and wait for a segment choice; picking a reciter saves it and restarts the playing surah, moving to an available surah if needed. Default remains Minshawi's Hafs murattal (`https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/`), else the first complete Hafs recording; initial surah is 1.
3. The docked pane shows a now-playing player drawn straight on the pane (no card): status, large SVG surah title, the avatar, reciter and Hafs attribution, a progress bar filling left to right, and separate LTR approximate elapsed and total times. The desktop Client renders it as Svg/foreignObject HTML/CSS, with clickable 40px previous/next circles, a 59px filled play/stop circle, two 34px repeat circles (quarter at the left end of the row, surah at the right end), Arabic captions and hover feedback; a dim next/repeat line sits below a rosette rule. Dropdowns overlay the player; a large recording adds 118px for the quarter selector. The pane also grows to fit wrapped errors and a retry control. Layout and colors for both themes are in [quran-design.md](quran-design.md). Tajawal is embedded at weights 400/700, all Arabic is right-aligned RTL, and our numbers inside Arabic lines use Arabic-Indic digits with LTR isolation. Playback uses the audio API’s default gain. Loudness is controlled by the OS.
4. Playback starts directly in the hook flow without awaiting the clip, using the same controller that Stop and replacement actions abort. Each clip also gets a 200ms watchdog created beside the play call; after a generation change it aborts inside its own timer callback, even if direct abort already marked the signal. The watchdog cancels when that clip settles. This follows the live invocation-context hypothesis; audible behavior must be checked on Desktop. Size checking and large-recording clip preparation precede playback. Whole-track duration lookup remains best effort and independent. Stop bypasses the action queue so a pending catalog refresh cannot delay it; an interrupted pending play does not start later. The pane toggle reads current playback state when pressed. Starting another track aborts the current one. Stop ends playback. A whole track’s natural end advances to the next available surah with the same recording; when none remains it stops and clears playback. A split segment advances to the next segment, then the next available surah. Next/Previous stay within the selected surah’s segments, then skip unavailable surahs without wrapping. A per-play generation and controller identity guard prevent a stopped, replaced or reloaded clip from advancing. Previous/next stay at 1/114 with a short reply. Controls remain available while stopped; play starts the selected whole track or quarter from its beginning.
5. Quran has no footer item on any surface: the Desktop footer holds only `☾ Muslim` and salah's prayer line, so the pane opens from `/quran` or the Muslim pane (its card and **Open full player**). An earlier «۞» footer chip was removed. Closing the pane does not stop audio. Quran adds no AbovePrompt band.
6. While playing, a clock timer invalidates the drawing once per second; stopped playback has no Quran redraw timer. Elapsed is `clock.now() - startedAt`, approximate wall-clock time including startup/buffering, not the decoder's position. Total is `--:--` until found. Times use `mm:ss`, or `h:mm:ss` from one hour.

## Recording availability

The shipped `QURAN_SUPPORT` catalog is keyed by the selected recording's `reciter.key`. Only its `unavailable` entries are blocked; every other surah is playable. The surah dropdown and all search results hide those entries and show one dim, inactive unavailable-count note below the option viewport when the count is nonzero. The note is not an option, cannot be clicked or hovered, and is excluded from keyboard navigation and scrollbar counts. The recording dropdown is unchanged. A recording absent from the shipped catalog keeps all 114 surahs and the existing playback behavior.

Switching recordings or restoring a stored selection that is unavailable chooses the next higher available surah, otherwise the next lower. Switching while playing follows normal surah replacement; a stopped selection stays stopped. There is no toast. Manual next/previous and natural auto-advance skip unavailable surahs without wrapping; quarter navigation keeps its existing rules. The card's automatic-next hint names the same available target.

Repeat is one of three session states: off, `surah` or `segment` (`PluginState['muslim'].quranRepeat`; reset to off at session start). The card has two exclusive buttons: «السورة» (`/quran repeat` or the surah button) and «المقطع» (`/quran repeat segment` or the quarter button). Pressing one turns the other off; pressing the active one turns repeat off.
- `surah`: a whole file replays from the start; a split surah plays every quarter in order, then starts again from the first quarter. The hint names the next quarter, and on the last quarter (or a whole file) it reads «تكرار: سورة …».
- `segment`: the current quarter replays forever and the next quarter is never prefetched (the same quarter stays ready so the replay is gapless). The hint reads «تكرار: المقطع … · الآيات …».
- The quarter button is always drawn but inactive (dim, `aria-disabled`, no hover, not clickable) while the selected surah plays whole, and `/quran repeat segment` then says it needs a split surah. If a whole surah starts while `segment` is on, repeat falls back to off; a stale `segment` on a whole surah reads as off.

Stop leaves repeat on; manual navigation never triggers it.

Explicit number/name picks, including slash commands and Client posts, refuse a known unavailable surah with «هذه السورة غير متاحة لهذا القارئ. اختر سورة أخرى أو قارئًا آخر.» using the existing dim pane/command error path. The check runs before catalog refresh or any audio, size, timing, Range or duration request. Startup repairs restored selection without fetching recording metadata or resuming audio; pane rendering uses the same fallback read-only, and actions repair state before playback. Existing runtime size checks, timing errors and `CLIP_ERROR` remain necessary because the shipped catalog can become stale. Automatic support-catalog refresh is tracked in [issue #13](https://github.com/abdelrahmanzied/claude-muslim/issues/13).

## Commands

Runtime help follows the shared `Command | Description | Options` table; `/muslim` lists the selected recording in its `Feature | Description | State` table. Main accents and the footer follow `/muslim color`; secondary text and artwork retain their designed colors.

| Command | Does |
| --- | --- |
| `/quran` | Open the desktop player pane |
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

Replies are short except the requested catalog/help. Catalog and network failures appear as one dim error line in the pane and as a command reply. Pane actions run silently and redraw the pane; Quran never shows toasts. Since audio completes asynchronously, a play rejection updates Quran's visible command output only when playback was started by a slash command. Playback started from the pane reports errors only in the pane. No exception escapes the feature's hooks. Duration failures remain silent.

## Data and permission

[MP3Quran v3](https://www.mp3quran.net/api/v3) is keyless:

- Reciters: `https://www.mp3quran.net/api/v3/reciters?language=ar`.
- Authored surah names: `https://www.mp3quran.net/api/v3/suwar?language=ar` (114).
- Matching timing read: `https://www.mp3quran.net/api/v3/ayat_timing/reads`, resolved by exact `folder_url` equality with the selected recording server.
- Ayah timing: `https://www.mp3quran.net/api/v3/ayat_timing?surah=<surah>&read=<timingReadId>`.
- Track: the chosen moshaf's server plus the three-digit surah number and `.mp3`.

The [MP3Quran permission statement](https://www.mp3quran.net/eng/privacy) says: “we allow any visitor or developer to copy any material or use any link”. This is explicit developer permission to use their links, rather than a named software licence. It does not explicitly address redistributed edited audio. This feature prepares only local temporary cuts from the original link; it does not host a clip service.

## Persistence and duration

The catalog is fetched at most weekly after a successful fetch, on pane opening or command demand, with no background polling. Failed refreshes retain the old catalog and can retry on later demand.

| Value | Storage | Default |
| --- | --- | --- |
| Recording key `<reciterId>:<moshafId>` | `$.store` `quran.reciter` | Minshawi murattal, else first |
| Filtered catalog with `fetchedAt` | `$.store` `quran.catalog` | Fetch on first need; reuse for 7 days; refresh when the pane opens or a command needs it; retain old catalog on refresh failure |
| Recording metadata keyed `<moshafKey>:<surah>` | `$.store` `quran.segmentCache` | Schema/map versions, recording names and IDs, surah/ayah count, source URL and validators, actual whole size, duration, timing read ID, segment ranges/times, frame-validated byte boundaries/checkpoints, `computedAt`, `updatedAt`, `sourceCheckedAt`; no audio |
| Duration numbers keyed `<moshafKey>:<surah>` | `$.store` `quran.durations` | Unknown |
| Current track (key, surah, start time, duration), selected surah, pane error and command-origin error | Declared session `$.state` | Stopped, 1, no error |

Duration lookup runs beside playback. Curl fetches bytes 0–131071 into temporary files under the OS temp folder (`$TMPDIR` or `/tmp`; `%TEMP%` on Windows, cleaned with `del`), `claude-muslim-quran/`; `$.fs.read(..., { as: 'bytes' })` returns base64 decoded without Node. Content-Range supplies total size. Skip ID3v2, find a valid Layer III frame (MPEG-1/2/2.5), use Xing/Info's frame count if present, otherwise estimate CBR duration from audio bytes and bitrate. Duration is approximate for VBR without Xing. The prefix is only metadata, never played, and removed after probing; cached values are small duration numbers, not audio. Without curl, valid headers or parseable bytes, total remains unknown. `$.http.fetch` supplies JSON and HEAD headers; its text body is not used for binary audio.

Verified finding supplied for this feature: a probe of 12 MP3Quran files from 6 reciters (including Minshawi 002, 8216 seconds) found no Xing, Info or VBRI header. The CBR estimate `(Content-Length − ID3v2 size) × 8 / first-frame bitrate` matched ffprobe within 0.03 seconds. The implementation retains Xing/Info support for other files but uses CBR when absent. Total size comes from the Content-Range total in the **same curl Range response**, not the prefix length or an assumed file length. Size checking now uses HEAD Content-Length first, with a validated 206 Range prefix fallback. Audio start includes the ID3v2 size (and any leading bytes before the first valid frame).

## Large-recording preparation

For v1, large surahs are split into hizb quarters at the MP3Quran ayah timings, mapped to MP3 frame boundaries. Drift can put a quarter edge mid-word for some reciters: measured examples are Minshawi surah 9 about 9 s late after ayah ~91, and Hudhaifi up to +30 s in surah 2 and +8.5 s in surah 9. This is accepted for v1. The next quarter continues from the same source byte boundary, with the small preceding MP3 reservoir context retained, so nothing is lost.

The fixed map ships as code in `src/features/quran/quarter-boundaries.ts`, under `QURAN_QUARTER_BOUNDARIES` and `QURAN_QUARTER_MAP_VERSION`. It contains surah and ayah numbers, no reader timestamps. Small files stay whole regardless of their number of quarters. A large file requires complete, ordered, nonoverlapping timing rows for that exact recording; the first segment includes the recording introduction and each quarter is clipped to the selected surah. Estimated oversize quarters are further divided at ayah boundaries with a 1MiB planning margin. Actual clip size is checked independently and must stay strictly below the host limit; an unsafe cut fails rather than being sent to the player.

Range requests fetch at most 2MiB into temporary files, verify status 206, Content-Range, body length and available recording validators, then remove the files. Scanning Layer III frames supplies actual byte offsets for CBR and VBR recordings. Up to 64 preceding frame records provide reusable seek checkpoints; a small amount of preceding frame context initializes the MP3 bit reservoir. This can add tens of milliseconds at a cut. Frame validation checks decodable byte ranges and size, not audible ayah alignment; timing drift remains accepted for v1. The final segment keeps remaining audio through the end of that surah file. Once frame-validated, segments reuse cached byte offsets. Each playback downloads its clip again; audio bytes are not stored in `$.store`.

`quran.segmentCache` is a separate key in the existing per-user plugin store, not a shipped cache and not a separate user-managed JSON file. It expires after seven days, rejects old schema/map versions or changed source URLs, and holds at most 120 plans with a conservative 1.5MB JSON budget to leave room for other features. Retry refreshes size and timings. Missing size shows the Claude 25MiB restriction, retry and alternate reader/surah choices. Large files with missing timings remain unavailable. Stop or replacement clears preparation immediately and late requests cannot start audio. The current bounded curl call may finish before cleanup; Stop never waits for it to finish.

## Temporary debug log

`QURAN_DEBUG = false` in `install.tsx` disables diagnostics for v1. Setting it to `true` for live diagnosis writes the last 200 diagnostic lines to `${TMPDIR}/claude-muslim-quran/debug.log` on macOS/Linux (fallback `/tmp/claude-muslim-quran/debug.log`), or `${TEMP}/claude-muslim-quran/debug.log` on Windows. It logs each play's generation, surah and path (`command`, `pane`, `auto-advance`), abort caller, watchdog abort, and resolved/rejected settlement with aborted flag and elapsed milliseconds. Appends are serialized and best effort; they never block playback or show UI errors. Return the constant to `false` after live diagnosis. This file holds diagnostics, not audio.

## Limits

- Desktop is the only supported v1 playback surface. Commands are accepted everywhere; the non-desktop pane shows only «مشغّل القرآن متاح على تطبيق Claude للديسكتوب». All terminal Arabic uses the shared path; desktop text stays as authored.
- No seeking, pause/resume, persistent audio cache, separate ayah playback, gapless quarter sequencing or looping. No claim of inaudible quarter boundaries.
- Prayer time and salah’s athan moment leave recitation playing; no interaction with salah.
- A module reload orphans a playing clip by losing the AbortController. The mod cannot stop that clip; it ends with the surah. `session.start` clears stale playback tracking and never resumes or advances it. Avoid changing other userConfig while playing.
- Duration probing uses the OS temporary folder and the verified Desktop curl behavior. The API types describe processes as CLI-only; duration-probe failures are silent. Large-recording playback needs curl Range requests; unavailable curl or rejected ranges show a feature error and retry.

## Embedded font

Tajawal Regular and Bold (google/fonts, OFL in `src/shared/font/fonts/OFL.txt`) are embedded via `@font-face` as lossless WOFF2 data URIs in `src/shared/font/tajawal-embedded.ts` (shared with the Muslim pane). Full TTF base64 totals about 160 KB and cannot fit this build’s 100 KB Client tree limit; full WOFF2 versions retain every glyph at about 56 KB combined. No font network request is needed.

## Design

[Quran design](quran-design.md): one full Client-drawn pane with embedded Tajawal, dropdown overlays and hit-tested controls; storage exception and surface fallback.

[Recording catalogs](quran-catalog.md): developer support audit, generated availability metadata, the shipped availability behavior, accepted v1 timing drift, and automatic support refresh tracked in issue #13.

## Files

| File | Holds |
| --- | --- |
| `install.tsx` | Hooks, catalog persistence, playback, duration probing, pane |
| `avatar.ts` | Embedded vector avatar with playback-linked motion and still pose |
| `card.ts` | Pure Client model, SVG/HTML/CSS picture, message validation and circular hit testing |
| `client.tsx` | Desktop drawing thread, local dropdown state, region size, focus/typing, hover and posts |
| `pane.ts` | Pure full-pane model, option windows, dropdown geometry and HTML/CSS/SVG |
| `src/shared/font/` (`tajawal-embedded.ts`, `fonts/OFL.txt`, `index.ts`; shared with the Muslim pane) | Full Tajawal WOFF2 data and OFL licence |
| `catalog.ts` | Filtering, labels, command name matching, uncapped substring/number search, URL building |
| `mp3.ts` | Pure frame, ID3, Xing/CBR, Content-Range and base64 parsing |
| `quarter-boundaries.ts` | Shipped map version 1: 114 surahs, 240 quarters, 313 surah×quarter intersections, 6,236 ayahs; numeric ranges only, extracted from the AlQuran Cloud quarter map during research |
| `segments.ts` | Size limit, exact timing-read matching, timing validation, segment planning and bounded metadata cache |
| `segment-mp3.ts` | Actual Layer III frame scanning, reservoir context, byte checkpoints and portable base64 encoding |
| `availability.ts` | Pure support-catalog lookups, nearest/next available selection and Arabic unavailable-count agreement |
| `player.ts` | Command parser, generation-safe next-surah rule, time formatting, text progress bar |
| `help.ts` | Help table, shared with `/muslim help` |

The desktop pane places the Mushaf book icon beside its custom Tajawal heading. The selected 120px embossed Quran avatar sits inside the player and moves only while playback state is active; stop or failure returns it to a still pose. Both dropdowns retain search and keyboard navigation, with a thin left-side scrollbar for dragging in either direction or clicking the track. Short filtered lists hide it. The custom heading text uses an optical baseline adjustment while its Mushaf icon and command label keep their positions. The Pane’s `ui.scroll` hook routes forwarded mouse/trackpad ticks, but native Desktop testing has not established reliable bidirectional wheel scrolling.

## To verify live

Open the pane in Desktop, select Minshawi and Al-Kahf, listen for continuous whole-track playback, stop, switch reciter while playing, verify `/quran` and the Muslim pane open it, test natural-end advancement and stopping after surah 114. Verify pane controls never show toasts and playback errors stay inside the pane unless started by a slash command. Check no acoustic overlap on fast switching and search across both full lists, Enter/row selection, keyboard scrolling and readable dropdowns in narrow panes and each theme. Temporarily enable diagnostics to check the watchdog for both initial and auto-advanced clips, and the drawn card and hover feedback against the mockup. Confirm the terminal fallback and Arabic modes. Check open/close, focus loss and embedded Tajawal in the full pane. Engine tests exercise hooks and trees; they do not prove sound or native paint.

Native Desktop validation on macOS confirmed both drag scrollbars reach the last rows and return to the first rows while the Pane remains stationary. Surah search for 18 returns Al-Kahf and hides the scrollbar. Desktop pointer events are whole cells, so clicks on a field, the retry button or a control count anywhere the cell overlaps the target (a click on the field's bottom edge opens it); the open dropdown still owns its pixels. Drag input is quantized by the host cell coordinates. The pixels one reported row stands for are frozen when the bar is pressed, so a row count that flickers by one while the picture is swapped cannot move the list under a still pointer, and a move that changes nothing redraws nothing. A report of the list shaking up and down during a drag on Desktop (macOS laptop) is covered by these two rules in tests; the host-side causes (the pane window moving under the held pointer) are not provable offline and need a live check. Engine tests also cover release outside the Client, search and selection after dragging. This validates the drag control, not mouse-wheel behavior or other operating systems.

## Muslim pane

The [Muslim pane](muslim-pane.md) shows this feature on its own card. This feature connects what that card shows (and what its buttons ask of it) through `src/shared/panel/signal.ts`; see the pane spec for the table.

Open full player in Muslim opens `quran` with its authored title and `focus: true` before queued catalog or recording inspection, whether or not it is already open. Quran connects on Muslim pane draws and input as well as the footer, so navigation works before the footer/catalog is ready and after a module reload. Initialization uses the existing silent open path without a second pane open; existing playback/selection is retained. Desktop owns the shared mod-pane dock and focus grant; native tab activation remains a live verification step.


### Muslim pane settings connector

Quran also connects a read-only recording/selection/repeat feed, a catalog-load action, a recording-key selection action and an explicit session-repeat action. The pane routes through the existing Quran selection and repeat logic; reciter remains in `quran.reciter` and repeat in session state.
