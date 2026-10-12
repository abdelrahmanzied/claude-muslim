# Quran — whole-surah recitation

A Quran recitation player in Claude Desktop. v1 plays one whole surah as one continuous remote MP3 track, started only by the user.

## Flow

1. `/quran` opens the pane titled «القرآن الكريم». On first need, fetch the reciters and surah names from MP3Quran v3. Show only complete (114 surahs) Hafs recordings (`rewaya_id === 1`). Each moshaf is a separate choice, including murattal and mujawwad by the same reciter.
2. The whole desktop pane is Client-drawn. Rounded dropdown fields show the current reciter/moshaf and surah; clicking opens an overlay with a search box and eight visible option rows. The full catalog is available without pages or a 64-option cap. Printable Arabic/Latin keys filter, Backspace deletes, Up/Down moves the highlight and scrolls, Enter or a row click picks. The Client pointer API has no wheel event. Empty queries show all choices. Field toggles, outside clicks and reported focus loss close the panel; picks clear and close it. The hook validates every posted pick against the cached catalog. Arabic substring matching ignores tashkeel, hamza forms and spaces but retains article letters. Latin and Arabic-Indic digits match exact surah or reciter-list numbers. Picking a surah plays it; picking a reciter saves it and restarts the playing surah. Default remains Minshawi's Hafs murattal (`https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/`), else the first complete Hafs recording; initial surah is 1.
3. The docked pane shows a green now-playing card: status, large SVG surah title, reciter and Hafs attribution, an SVG progress bar filling right to left, and separate LTR approximate elapsed and total times. The desktop Client renders the rounded card as Svg/foreignObject HTML/CSS, with clickable 46px previous/next circles and a 56px filled play/stop circle, Arabic labels and hover feedback; a dim automatic-next hint appears below the card. Dropdowns overlay the card within the fixed-height picture. Tajawal is embedded at weights 400/700, all Arabic is right-aligned RTL, and our numbers inside Arabic lines use Arabic-Indic digits with LTR isolation. Playback uses the audio API’s default gain. Loudness is controlled by the OS.
4. Playback starts directly in the hook flow without awaiting the clip, using the same controller that Stop and replacement actions abort. Each clip also gets a 200ms watchdog created beside the play call; after a generation change it aborts inside its own timer callback, even if direct abort already marked the signal. The watchdog cancels when that clip settles. This follows the live invocation-context hypothesis; audible behavior must be checked on Desktop. Duration lookup runs independently. Stop bypasses the action queue so a pending catalog refresh cannot delay it; an interrupted pending play does not start later. The pane toggle reads current playback state when pressed. Starting another track aborts the current one. Stop ends playback. A natural end advances to the next surah with the same recording; after 114 it stops and clears playback. A per-play generation and controller identity guard prevent a stopped, replaced or reloaded clip from advancing. Previous/next stay at 1/114 with a short reply. Controls remain available while stopped; play starts the selected surah from the beginning.
5. Desktop has a green «۞» symbol inside the native footer Button before salah’s orange prayer line, both before the model. Idle it reads «القرآن»; while playing it reads the authored surah name and approximate elapsed time. Pressing toggles the `quran` pane using the engine’s pane list and close API. Closing the pane does not stop audio. Quran adds no AbovePrompt band and no terminal footer label.
6. While playing, a clock timer invalidates the drawing once per second; stopped playback has no Quran redraw timer. Elapsed is `clock.now() - startedAt`, approximate wall-clock time including startup/buffering, not the decoder's position. Total is `--:--` until found. Times use `mm:ss`, or `h:mm:ss` from one hour.

## Commands

| Command | Does |
| --- | --- |
| `/quran` | Open the desktop player pane |
| `/quran play <surah>` | Play with the current reciter; number 1–114 or Arabic name (الكهف / كهف) |
| `/quran stop` | Stop |
| `/quran next` · `/quran prev` | Play adjacent surah with the same reciter; do not wrap |
| `/quran reciter` | Numbered list of all filtered recordings |
| `/quran reciter <number or name>` | Remember choice; restart current surah if playing |
| `/quran help` | Usage table; unknown arguments show this too |

Names ignore tashkeel, hamza forms, leading `ال` and spaces. A reciter name shared by multiple recordings is ambiguous: use the full recording label or list number. Labels preserve the source's authored Arabic: `<reciter name> — <moshaf name after ' - ' if present>`. `/muslim help` includes Quran, `/muslim help quran` shows its table, and `/muslim` has a Quran row for current reciter.

Replies are short except the requested catalog/help. Catalog and network failures appear as one dim error line in the pane and as a command reply. Pane actions run silently and redraw the pane; Quran never shows toasts. Since audio completes asynchronously, a play rejection updates Quran's visible command output only when playback was started by a slash command. Playback started from the pane reports errors only in the pane. No exception escapes the feature's hooks. Duration failures remain silent.

## Data and permission

[MP3Quran v3](https://www.mp3quran.net/api/v3) is keyless:

- Reciters: `https://www.mp3quran.net/api/v3/reciters?language=ar`.
- Authored surah names: `https://www.mp3quran.net/api/v3/suwar?language=ar` (114).
- Track: the chosen moshaf's server plus the three-digit surah number and `.mp3`.

The [MP3Quran permission statement](https://www.mp3quran.net/eng/privacy) says: “we allow any visitor or developer to copy any material or use any link”. This is explicit developer permission to use their links, rather than a named software licence.

## Persistence and duration

The catalog is fetched at most weekly after a successful fetch, on pane opening or command demand, with no background polling. Failed refreshes retain the old catalog and can retry on later demand.

| Value | Storage | Default |
| --- | --- | --- |
| Recording key `<reciterId>:<moshafId>` | `$.store` `quran.reciter` | Minshawi murattal, else first |
| Filtered catalog with `fetchedAt` | `$.store` `quran.catalog` | Fetch on first need; reuse for 7 days; refresh when the pane opens or a command needs it; retain old catalog on refresh failure |
| Duration numbers keyed `<moshafKey>:<surah>` | `$.store` `quran.durations` | Unknown |
| Current track (key, surah, start time, duration), selected surah, pane error and command-origin error | Declared session `$.state` | Stopped, 1, no error |

Duration lookup runs beside playback. Curl fetches bytes 0–131071 into temporary files under the OS temp folder (`$TMPDIR` or `/tmp`; `%TEMP%` on Windows, cleaned with `del`), `claude-muslim-quran/`; `$.fs.read(..., { as: 'bytes' })` returns base64 decoded without Node. Content-Range supplies total size. Skip ID3v2, find a valid Layer III frame (MPEG-1/2/2.5), use Xing/Info's frame count if present, otherwise estimate CBR duration from audio bytes and bitrate. Duration is approximate for VBR without Xing. The prefix is only metadata, never played, and removed after probing; cached values are small duration numbers, not audio. Without curl, valid headers or parseable bytes, total remains unknown. `$.http.fetch` is used only for JSON because its body is text.

Verified finding supplied for this feature: a probe of 12 MP3Quran files from 6 reciters (including Minshawi 002, 8216 seconds) found no Xing, Info or VBRI header. The CBR estimate `(Content-Length − ID3v2 size) × 8 / first-frame bitrate` matched ffprobe within 0.03 seconds. The implementation retains Xing/Info support for other files but uses CBR when absent. Total size comes from the Content-Range total in the **same curl Range response**, not the prefix length or an assumed file length. A HEAD Content-Length could also supply a total if available, but v1 makes no separate HEAD request. Audio start includes the ID3v2 size (and any leading bytes before the first valid frame).

## Temporary debug log

`QURAN_DEBUG = true` in `install.tsx` writes the last 200 diagnostic lines to `${TMPDIR}/claude-muslim-quran/debug.log` on macOS/Linux (fallback `/tmp/claude-muslim-quran/debug.log`), or `${TEMP}/claude-muslim-quran/debug.log` on Windows. It logs each play's generation, surah and path (`command`, `pane`, `auto-advance`), abort caller, watchdog abort, and resolved/rejected settlement with aborted flag and elapsed milliseconds. Appends are serialized and best effort; they never block playback or show UI errors. Turn the one constant off after live diagnosis. This file holds diagnostics, not audio.

## Limits

- Desktop is the only supported v1 playback surface. Commands are accepted everywhere; the non-desktop pane shows only «مشغّل القرآن متاح على تطبيق Claude للديسكتوب». All terminal Arabic uses the shared path; desktop text stays as authored.
- No seeking, pause/resume, offline audio cache, ayah splitting, chunking, looping.
- Prayer time and salah’s athan moment leave recitation playing; no interaction with salah.
- A module reload orphans a playing clip by losing the AbortController. The mod cannot stop that clip; it ends with the surah. `session.start` clears stale playback tracking and never resumes or advances it. Avoid changing other userConfig while playing.
- Duration probing uses the OS temporary folder and the verified Desktop curl behavior. The API types describe processes as CLI-only; failures are silent and do not prevent URL playback.

## Embedded font

Tajawal Regular and Bold (google/fonts, OFL in `fonts/OFL.txt`) are embedded via `@font-face` as lossless WOFF2 data URIs in `fonts-embedded.ts`. Full TTF base64 totals about 160 KB and cannot fit this build’s 100 KB Client tree limit; full WOFF2 versions retain every glyph at about 56 KB combined. No font network request is needed.

## Design

[Quran design](quran-design.md): one full Client-drawn pane with embedded Tajawal, dropdown overlays and hit-tested controls; storage exception and surface fallback.

## Files

| File | Holds |
| --- | --- |
| `install.tsx` | Hooks, catalog persistence, playback, duration probing, pane |
| `card.ts` | Pure Client model, SVG/HTML/CSS picture, message validation and circular hit testing |
| `client.tsx` | Desktop drawing thread, local dropdown state, region size, focus/typing, hover and posts |
| `pane.ts` | Pure full-pane model, option windows, dropdown geometry and HTML/CSS/SVG |
| `fonts-embedded.ts`, `fonts/OFL.txt` | Full Tajawal WOFF2 data and OFL licence |
| `catalog.ts` | Filtering, labels, command name matching, uncapped substring/number search, URL building |
| `mp3.ts` | Pure frame, ID3, Xing/CBR, Content-Range and base64 parsing |
| `player.ts` | Command parser, generation-safe next-surah rule, time formatting, text progress bar |
| `help.ts` | Help table, shared with `/muslim help` |

## To verify live

Open the pane in Desktop, select Minshawi and Al-Kahf, listen for continuous whole-track playback, stop, switch reciter while playing, verify the footer chip opens/closes the pane, test natural-end advancement and stopping after surah 114. Verify pane controls never show toasts and playback errors stay inside the pane unless started by a slash command. Check no acoustic overlap on fast switching and search across both full lists, Enter/row selection, keyboard scrolling and readable dropdowns in narrow panes and each theme. Check watchdog diagnostics for both initial and auto-advanced clips, and the drawn card and hover feedback against the mockup. Confirm the terminal fallback and Arabic modes. Check open/close, focus loss and embedded Tajawal in the full pane. Engine tests exercise hooks and trees; they do not prove sound or native paint.
