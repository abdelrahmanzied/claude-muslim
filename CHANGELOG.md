# Changelog

## Unreleased

- Quran hides surahs the selected recording cannot play, using the shipped support catalog, with one dim note counting them; reciter switches, next/previous, auto-advance, commands and restored state move to the nearest available surah without network work.
- Quran pane follows the selected design: rosette rules, fields every 90px, avatar beside the title, transparent background in both themes, Tajawal throughout and the «الوقت تقريبي» hint. Repeat has three states (`off`, `surah`, `segment`) with two mutually exclusive buttons; surah repeat plays every quarter then starts over, quarter repeat replays the current quarter and is inactive for whole surahs; add `/quran repeat segment`. Nested SVGs declare their namespace so Desktop draws the rosette.
- Add the developer-only cuts script, its offline benchmark and pure cut helpers (pause search with local offset alignment); the generated cuts file is an empty placeholder and playback does not use it yet.

- Add the developer-only Quran support audit, pure availability classifier, offline catalog checks and the two-script catalog design; catalog-driven playback UI and silence cuts are planned separately.

- Quran checks recording size before playback, keeps small surahs whole and adds a searchable quarter selector for large recordings. It matches MP3Quran timing metadata to the exact recording, verifies actual MP3 frame cuts under the Claude audio limit, stores bounded per-user metadata under `quran.segmentCache`, cleans temporary ranges, and prevents stopped preparation from starting late. Quarter navigation stays within the selected surah; add `/quran retry`.

- Quran aligns its custom heading text with the Mushaf icon and adds a thin draggable scrollbar to both searchable dropdowns; lists remain inside the fixed pane picture. Native wheel dispatch remains unresolved.

- Quran now draws the entire desktop pane in its Client: styled dropdowns with complete catalogs, inline search, keyboard scrolling, current/hover marks and overlays above the player. Embed both full Tajawal weights using lossless WOFF2 to fit engine limits; RTL Arabic and isolated Arabic-Indic option numbers follow the design system. Playback watchdog, debug logging and footer are unchanged.

- Quran adds a per-clip 200ms stop watchdog in the playback invocation and temporary bounded debug logging. The desktop player card is now Client-drawn HTML/CSS in Svg, matching the rounded green mockup with hit-tested round controls and hover feedback; native searchable pickers remain. The footer uses the green ۞ text symbol because its separate SVG was not visible live.

- Quran playback starts directly in the hook flow; Stop immediately aborts the active signal even during catalog refresh, and the pane toggle reads current state. Replace paged selectors with search across all recordings and surahs, six result rows and Enter selection. Add the open-book SVG beside the desktop footer chip; document clips orphaned by reload.

- Quran pane now follows the green card design with a large surah title, SVG progress and control icons, compact selector pagination, LTR times and an automatic-next hint. Pane actions redraw silently; Quran no longer shows toasts, and pane playback errors do not rewrite slash command replies.

- Add `/quran`: a desktop whole-surah recitation player with complete Hafs recording and surah selectors, play/stop, previous/next, approximate time/progress, a green desktop footer chip that toggles the docked pane, and a remembered reciter. Natural ends advance with the same recording, stopping after surah 114; stopped/replaced plays cannot advance. Loudness is controlled by the OS. MP3Quran provides the catalog and remote tracks; best-effort MP3 duration metadata is cached without audio. Includes terminal fallback, help/settings integration, docs and tests.

- DESIGN.md: "Quiet by default" now means silent animations and reminders; audio the user starts (such as a recitation) is allowed.
- `/muslim` shows a settings table, the same on every surface: tashkeel, thikr, and terminal Arabic (this terminal's mode, or its default if not chosen yet; `terminal only` on desktop), each with the command that changes it.
- Terminal Arabic has three per-terminal modes: `plain` strips tashkeel, `joined` also applies presentation forms in logical order, and `reversed` also reorders Arabic runs for visual RTL display. Tashkeel is always stripped on terminal because terminals draw marks poorly and partial redraws can garble them.
- Defaults are Apple Terminal `plain`, Warp `joined`, Windows Console `reversed`, and `plain` for every other terminal ID. The first-run survey compares these treatments with hotkeys 1–3; invalid saved modes reopen the survey. `/muslim terminal-arabic` reopens it manually.
- `/muslim tashkeel on | off` controls Arabic diacritics on desktop and non-terminal surfaces only. `/thikr tashkeel` was replaced by `/muslim tashkeel`.
- Thikr spinner, end-of-turn, and usage-limit phrases all use the shared Arabic display path.

- Salah's footer line and minaret label use the per-terminal Arabic setting.
- Restore the desktop athan card’s isolated view; keep its appearance, close action and terminal minaret.

- Fix: after a `/salah show` change the footer kept the last setting's line (still shown with `show 20` far from a pray; missing after `off` then `always`); the line is now worked out from the clock as it is drawn.
- Fix: hiding the pray line hid nothing, because the old line was cleared during drawing (refused); it is now hidden at once and cleared after the draw.
- `/salah show always | <minutes> | off` is the one command for the pray line: all day (counting down its last 20 min), only that many minutes before a pray (default 20, counting down), or hidden. It replaces `/salah always | reminder | off` and `/salah reminder <min>`; the settings `salah` and `salahReminder` become `salahShow`, and saved values carry over. Every `/salah` reply is short markdown saying what changed; `/salah help` and `/muslim help <feature>` open with a title so their table renders.
- `/salah` shows today's times and the settings as two tables; each setting names the command that changes it.
- Code, commands, settings titles and help say "pray", never "prayer" (the vendored athan library is unchanged).
- The prayer line in the footer is bold.
- `/salah adjust` accepts any whole number of minutes; saved settings and the review form no longer cap adjustments at ±60.
- Fix the athan moment being hidden when tested before the prayer display first appears; keep the desktop card and terminal minaret unchanged.
- `/salah athan test` shows the athan moment now for the next prayer without changing settings: the card on the desktop, the minaret in the terminal.
- Desktop athan card: when a prayer comes in (`salahAthan`) the desktop shows a full-width card above the prompt, built like the athkar band, with a photo of the Haram behind «حان وقت صلاة المغرب» and the time in Arabic digits and a × to close; it stays until closed or the call's 15 minutes end. The minaret is terminal only.
- Athan card polish: a sharper photo (a wide strip cut from a larger original), a × on a round dark disc that reads over the photo. No entrance animation: the desktop draws the card as a still picture, so a fade-in froze on its first, invisible frame.
- Prayer times (`/salah`): calculated on the machine with the vendored athan library (from [adhan-js](https://github.com/batoulapps/adhan-js)), no location service or API. The first prompt after install offers the city named by the time zone, or any city typed in any language (Claude reads it into coordinates). Each country's official Sunni method, else Muslim World League; Asr by the majority.
- Review form: today's times with − and + per prayer to match the user's mosque.
- Pray line: `salahShow` is `always` (next prayer all day), minutes (default 20: only that many minutes before a prayer) or `off`. A live mm:ss countdown (`☾ العصر ١٩:٤٢`, updated every second, 30 s ticks outside the window) in the countdown window, and حان وقت صلاة … for 15 minutes once a prayer is in (`salahAthan`). Sunrise is in today's times only. No toast when the window starts and never an OS notification: the footer line is the only notice.
- `/salah` commands: `help` (a table), `show always` · `<minutes>` · `off`, `athan on` · `off`, `city` (replaces `setup`), `method`, `adjust`. `/muslim help [feature]` shows the command tables.
- Athan moment (terminal and desktop): when a prayer comes in and `salahAthan` is on, a text minaret rises row by row above the prompt for about 3 seconds beside «حان وقت صلاة العصر», once per prayer, never during a survey; the status line keeps the call for 15 minutes.
- Thikr before a prayer: inside the countdown window the first phrase of each thikr turn is حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د (prayer and whole minutes left); salah shares the window through `$.state` `salahWindow`. Salawat mode shows it first too.
- Settings in `/config`: `salahShow`, `salahAthan`, `salahPlace`, `salahMethod`, `salahAdjust`. The call setting is spelled athan (`salahAthan`); a saved `salahAdhan` is still read.
- Prayer line placement: the prayer line (`☾ العصر ١٥:٥٩`, the live countdown, `حان وقت صلاة العصر`) moves from the status line to the prompt footer's mode labels (`SessionMode`), before the model name, as plain text in Claude orange, in the terminal and the desktop app (not an AbovePrompt row: the desktop draws that as a card). The setup and review rows and the minaret moment stay above the prompt.
- The prayer line's timer now starts from the first draw of the footer or the band and a redraw asked at session start, so the countdown no longer freezes after `/salah off` then `/salah reminder 60`.
- The live countdown now starts the second the reminder window opens (a timer for that moment) instead of on the next 30 s tick.
- The mod clears the old status-line entry (`muslim ☾ …`) at session start, so a hot reload no longer leaves it next to the model name.
- Shared prayer helpers (names, digits, the prayer line text) moved to `src/shared/pray/`; thikr no longer imports salah's folder.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
