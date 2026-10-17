# Changelog

## Unreleased

- GitHub issue forms in `.github/ISSUE_TEMPLATE/`: bug report, feature request, idea, content correction (Quran, athkar, thikr, translations) and general feedback, each asking for the muslim version, the surface and the OS; blank issues are off. They use the labels `bug`, `enhancement`, `idea`, `content` and `feedback`.

- `/muslim autoupdate on | off` turns Claude Code's background update of the `claude-muslim` marketplace on or off; alone it shows the state, and `/muslim` has an Auto-update row. The first time muslim runs it turns auto-update on by itself (changing only `extraKnownMarketplaces["claude-muslim"].autoUpdate` in your user `settings.json`, never creating the entry and never writing a file that is not valid JSON), records that in the store and never does it again, so `off` stays off. Honors `CLAUDE_CONFIG_DIR`. Listed in `/muslim help`.

- `/muslim update` updates muslim from inside a session: it runs `claude plugin update muslim@claude-muslim --json` (only this plugin, 2-minute limit), replies `muslim vX → vY. Reloading plugins.` with the changelog link, `muslim vX is the latest.`, or `Not updated: <reason>` with the shell command to run, and reloads plugins by itself after an update (a toast asks you to run `/reload-plugins` if that is refused). Needs `claude` on your PATH. Listed in `/muslim help`.

- The installed plugin now lives in `plugin/` (manifest, `hooks/`, `src/`, `types/`, `tests/`, README, LICENSE). Add the marketplace with `--sparse .claude-plugin plugin` so only `plugin/` is downloaded and installed, without `docs/`, `scripts/` and the dev-only root files (tests ship inside `plugin/`). No behaviour change. The README is split into a short root README, `plugin/README.md` (features and commands) and `CONTRIBUTING.md`. The author name is now Abdelrahman Abozied, with contact and homepage links in the manifests.

- Docs: the Quran design keeps only what is Quran's own and points to the Muslim pane design for the rest; athkar and pane docs note the after-salah wait, the shared titles and the athkar title menu. CLAUDE.md now requires every shared design-system change to update `DESIGN.md` or the desktop pane design in the same commit.

- Athkar: after-salah no longer cuts off a morning or evening reading you are counting; it waits until that reading is done or closed. The athan card's start button still opens it at once.

- Muslim pane: `/muslim pane demo` plays a 10-second tour on desktop (the cards unfold one by one, the Quran card plays without sound, the athkar fill to done, then everything folds back and the pane returns to how it was); `/muslim demo` ends with it (skipped on a terminal). Nothing is saved.

- Quran: the standalone Quran pane («۞ القرآن الكريم» tab) is gone; the player lives only in the Muslim pane's Quran card. `/quran` opens the Muslim pane at that card and unfolds it; on a terminal it replies with a text status (reciter, surah, segment, time, playing or stopped) and `Playback runs in the Claude desktop app.`. The other `/quran` subcommands are unchanged.

- Muslim pane: the Quran card's header reads «القرآن الكريم» (was «القرآن»), folded or open, and so does the terminal text fallback.

- Muslim pane: the athkar card header matches the other cards: icon, title (the set name with its menu chevron when open, just «الأذكار» when folded), fraction, and the fold chevron at the left end in both states. Reset moved to the progress row, which now reads «ابدأ» or «أكمل» (replacing «Open»), «✓ أتممتُها» and «إعادة» (↺, «تراجع» for 8 seconds after a reset); done shows «أتممتَ وردك ✓» and «إعادة». The row's button text is 12px and the buttons shrink to icons on narrow panes. The card's header and progress row use the original athkar mark (`horizon`) for every set; the sun, moon and prayer icons stay only in the title menu's rows.

- Muslim pane: fix «a tree serializing to more than 100000 characters» with the full Quran card. The embedded Tajawal is subset to Latin, Arabic and punctuation (layout features kept), both avatars draw their pixel runs as paths (same art), the Quran avatar drops CSS for sprites it never shows, and the open picker sheet leaves the hidden avatar out. A test keeps the full pane under 96,000 characters.

- Muslim pane: choose morning, evening or after-salah athkar from the title menu, with reset and an 8-second undo.

- Muslim pane: the Quran card is the full player: status, the surah as a picker button, the reciter avatar, «ابدأ من» for split recordings, the reciter row, progress with times, and repeat-segment, previous, play/stop, next and repeat-surah. Reciter, surah and segment lists open as an in-card sheet with search, eight rows, a drag scrollbar and arrow-key navigation. «افتح المصحف» is gone. The list logic moved to `src/shared/picker/`.

- Quran: segments are named `الربع ٥ - الآيات ١٥–٢٤` (with ` (١ من ٢)` when a quarter is cut in several) everywhere, the Quran pane, its next/repeat lines, the Muslim pane and the terminal text; no more «·» beside Arabic digits.

- Athkar: the end question («أتممتَ الأذكار؟») also covers athkar after salah, and the Muslim pane's athkar card follows the set the band shows by itself (morning, evening or after salah), with prayer-based periods. The Muslim pane docs move to `docs/features/muslim-pane/`, like every feature.

- Muslim pane: cards use a 12px corner radius like Claude Desktop's own cards (was 19px); the next-prayer row inside uses 8px.

- Muslim pane: the next-prayer countdown is Arabic with Arabic digits, like the time above it (`بعد ٦ س ٥٥ د`, `بعد ١٢ د`, `بعد أقل من دقيقة`), instead of `in 6h 55m`.

- Quran pane: the reciter, surah and quarter boxes and the list search box are transparent with a thin hairline, matching the Muslim pane; the dropdown keeps its shadow, and its dark background now matches the host surface (`#1f1e1d`) instead of a lighter grey slab; the orange row highlights stay.

- Muslim pane: apply the approved light/dark system with transparent hairline buttons and copy chips, text-only Open, previous/next circles with a light ring, neutral underline tabs and text-color hover/selection overlays; keep geometry and typography.

- Muslim pane: the Athan row reads «الأذان».

- Muslim pane: the heading reads «مُسلِم» with tashkeel (damma on the mim, kasra on the lam).

- Light mode: the Muslim pane and Quran pixel-art avatars get a soft drop shadow (`drop-shadow(0 1px 1.5px rgba(31,30,29,.35))`) so they stand out on the light card; dark mode is unchanged.

- Quran pickers are the in-card dropdown again, with no wheel scrolling: the plugin never holds the pane to scroll a list, so the pane no longer shakes. The list moves by search, ↑ ↓ and the scrollbar; its one-line footer says “Use ↑ ↓ for scrolling”. The pointer and the arrows share one highlight, tinted lightly with the main color; the chosen row is tinted more strongly.

- Muslim pane settings: label with an Arabic description under it, switches beside their label, centered color dots, the terminal-arabic command as a one-press copy button, no subheader, switches that flip at once (a denied write clears only its own pending value), a 28px gap between rows with no space left by a hidden stepper line, a «تم النسخ ✓» confirmation for 2 seconds after the copy button, 20px settings tab icons, a card only as tall as its visible rows, and no Quran tab (its reciter and repeat live in `/quran` and the Quran pane). The pane title is «☾ Muslim». The end-of-turn switch left the pane settings (it only changes a terminal line; `/thikr end` still does). The athkar settings preview box is gone. The Quran «۞» chip left the Desktop footer: it now holds only ☾ Muslim and the prayer line. The color dots sit on their label's line, like the switches. The Quran card's Open full player button reads «افتح المصحف». The Quran pane no longer shakes while scrolling: wheel ticks that cannot move the window are not redrawn, and the size report no longer redraws the picture (the open list still scrolls).

- Muslim pane: the Athan label and other icon rows sit on their icon's line, and settings rows have more space between label, controls, hint and the next row.

- Muslim pane: the footer keeps one button, `☾ Muslim` (the Arabic trial button is removed).

- Muslim pane: the prayer card shows its city on a quiet bottom line («مواقيت <city>») instead of the title row.

- Muslim pane: the prayer icon is the original flat sujood drawing again, raised to sit on the text line.

- The main color "gold" is now called "yellow"; the old saved value still works.

- Muslim pane: unify typography on 12/14/16/20/24px (11px settings tab labels for the 240px minimum), start the heading at the picture's top edge (the Desktop adds its own space above it), and trial `☾ Muslim` and `☾ مسلم` footer buttons for the user to pick one.

- Muslim pane: smaller text to match Desktop panels (baseline sizes kept in git at `126e2bd`) and balanced athkar buttons.

- Muslim pane settings: the color choices are small round dots with a ring on the chosen one, and the tab strip loses its empty space under the labels (60px, one-line labels).

- Muslim pane: show the full avatar at 36px tall (approximately 38.4px wide), with both heading labels vertically centered; the row starts at 12px and cards at 56px.

- Muslim pane: the sujood icon is redrawn taller to fill its box (the sunrise icon with its rising arrow is kept as approved); card header icons are 20px and sit on the same line as the title and its value.

- Muslim pane: the space above the heading matches the bottom margin (12px to the avatar), not 18px.

- Icons are one standard set (DESIGN.md §3 Icons, `src/shared/icon/`): the Muslim pane's prayer, Quran and athkar cards now show the same icons as their settings tabs (realistic sujood, the Quran mushaf, sunrise-sunset).

- Muslim pane: a heading row above the cards with the Muslim avatar's head at 24px beside «مسلم», spaced like the Quran pane's title, and `/muslim` always shown at the left edge.

- Muslim pane: replace settings category accordion rows with one fixed, non-scrolling RTL tab strip, عام first, using the approved sliders, realistic sujood, Quran mushaf, horizon and Spinner-bead icons. Use the toothed gear for the settings header and the same mushaf for the Quran card; retain all settings/detail controls and migrate old null-category state safely. Terminal settings follow the same order and «الذكر» label.

- Fix the athan card not appearing at prayer time on desktop when the timer ticked late (a reload, a busy turn): the moment is now due for the same 15 minutes the footer keeps «حان وقت», ends 15 minutes after the prayer's time, and the footer's draw asks for a tick when it shows the call but the card never started. Never replays (`athanShown`).

- Muslim pane: the prayer card and the «الصلاة» settings row use a minaret line icon; the crescent stays the symbol of Muslim as a whole.

- Muslim pane settings say «العربية في Terminal»: the word Terminal stays in English.

- Quran pane tab reads «۞ القرآن الكريم» on desktop, matching its footer chip and sitting beside the Muslim tab's moon.

- Add the Muslim pane’s folded «الإعدادات» accordion with all 13 plugin settings, Quran reciter and session repeat controls, paged lists, city handoff and terminal command summary.

- Add explicit athkar completion for people who count off-screen: next past the last thikr asks «أتممتَ الأذكار؟» when any counts are incomplete, with confirm/resume choices in Sky, Frame and the terminal. Confirm fills every period count and plays the existing finale; resume finds the first incomplete item. Add the same ✓ «أتممتُها» action beside Open in the Muslim pane so its fraction/bar agree with the band. Keep the question transient, guard counting-key repeat, normalize older completed readings and cover completion, input, persistence and pane synchronization with regression tests.

- Fix Muslim pane Open full player: reconnect Quran without waiting for the footer and open/raise its existing `quran` tab with a focus request in the shared Desktop mod-pane dock before queued catalog/recording work. Keep Muslim open and avoid a second initialization open; handle unplaced results. Add regression coverage for first/repeated opens, coarse pointers, missing catalog/footer and pending preparation.

- Fix Muslim pane wheel/trackpad jitter over the Quran reciter and surah rows: skip Desktop scroll redraws when the body cannot move, and remove unused Client size polling that redrew the picture on changing row measurements. Real overflow still scrolls through the host; add pure scroll and engine regression tests.

- Athkar: «لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ…» follows Hisn al-Muslim 92 and 93: 100 times in the morning (93) and 10 times in the evening (92), instead of 100 in both.
- Athkar after salah: remove Hisn al-Muslim 73, «اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا…», from the Fajr list (the morning athkar keep their own copy). Fajr now has 11 items; the `/salah demo` after-salah story drops its `73` scene and ends on the last real item, so it is 10.4 s (6.0 s readings, 3.2 s finale, 1.2 s folded).

- Athkar after salah: the order now follows Sheikh Ibn Baz's fatwa (https://binbaz.org.sa/fatwas/9879): istighfar, salam, 67, 68, the ten tahlils after Fajr and Maghrib, tasbih and tahlil, Ayat al-Kursi, then the three Quls. Text and counts are unchanged.

- Add Hisn al-Muslim 96, «أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ» 100 times, to the morning athkar only (the book says 100 times during the day), after 95 and before 97.

- `/athkar help`: morning, evening and after-salah share one row, `/athkar morning` · `evening` · `after-salah`, each with what it opens.

- Rule: every typed command, subcommand and option is in its feature's help table in the same commit, and a name is the same in the command, the code and the docs.

- Docs: athkar design has one table of the whole day: period, sky and after-salah offer, with prayer times and without.

- Follow saved salah times for the desktop athkar sky, using real Sunrise and Isha with a sunrise fallback and ordered short-day phases; keep the exact fixed sky hours without prayer times.

- Follow Fajr/Maghrib for morning/evening athkar and turn the saved day at Fajr when a salah place is set; keep 05:00/17:00 without prayer times.

- Replace the morning, evening and after-salah reader’s closing verse with «تَقَبَّلَ اللَّهُ 🤲», a short greeting outside the authored athkar, without a citation. Keep the emoji in the terminal and update desktop width metrics.

- Docs: each feature now has its own folder `docs/features/<feature>/` (`<feature>.md`, `<feature>-design.md`, and `<feature>-content.md` for the religious text it shows); `docs/content.md` is split into per-feature content files. Terminal Arabic (the shared guide and the `/muslim terminal-arabic` check) is one file, `docs/terminal/terminal-arabic.md`, since it is a platform doc and not a feature.

- Extend `/salah demo` from the athan moment into a fast Fajr after-salah reading using the real reader: 6.0 s of counts, the full 3.2 s finale and 1.2 s folded done. The demo card shows its start button; start, × and expiry all continue to athkar. `/muslim demo` waits for the whole flow, with no saved-state changes.

- Add Athkar after salah to the shared reader, with prayer-specific counts, one current reading slot, manual commands and an automatic offer from prayer time plus the shared athan card duration (currently 15 minutes) when a place is saved, including with `/salah show off`. The desktop athan text action «ابدأ أذكار بعد الصلاة ←», white beside × on the left and accented on hover, closes the card and starts that prayer's reading immediately; × waits for the original deadline. The offer stays until done, hidden or the next prayer, with no expiry timer. Prayer tracking continues without the footer, countdown or athan.

- `/athkar morning` · `evening` opens that period's reader above the prompt even outside its hours, un-hides it, and counts to it; the choice holds for the session until the other period is picked or × hides the band. A finished period replies with its reset hint. `reset` is unchanged and the help row says both.

- Quran pane secondary text, icons, captions and hover fills use warm neutrals instead of a fixed green, so they sit with any `/muslim color` main color (orange by default) and match the Desktop panel; the main color stays on the status dot, play button, progress fill and rosettes.

- Muslim pane is transparent (no panel fill, light or dark) like the Quran pane, uses the same 20px side margin, and draws in Tajawal throughout. The embedded Tajawal moved to `src/shared/font/`, shared by both panes; the Quran pane looks unchanged. A new `☾` chip at the left of the Desktop footer opens and closes the Muslim pane. Card titles gain an icon in the main color (moon, book, sun or sunset), the meta sits at the far end and a fold chevron ends the row; pressing the title row now folds and unfolds the card, kept in the session. Light mode no longer mixes in dark tokens: the pane follows the app's color scheme like the Quran pane instead of Claude Code's theme row.

- Add the Muslim pane, `/muslim pane`: a docked Desktop pane titled «Muslim» that sits as a tab beside the Quran pane, with three cards in the style of the Desktop's own session panel. Prayer: the city, the next prayer large in the main color with its time and countdown, today's five prays marked done / next / upcoming, and an Athan switch (the `salahAthan` setting). Quran: reciter, surah, progress with elapsed and total, previous / play-stop / next and Open full player. Athkar: the period's title, how many are done of the total, a progress bar and Open for the reader. The terminal gets the same as plain text. Features connect their data and actions through transient links in `src/shared/panel/` and never import each other; the shared card pointer maths moves to `src/shared/card/pointer.ts` for new panes.

- Quran rosette rules draw a smaller 18px rosette with a matching stroke, so the dividers recede behind the content.

- Quran dropdown fields, retry and player controls now respond across the whole pointer cell on Desktop. Desktop reports the pointer as a whole cell (about 8 by 19px) snapped to its center, so a click in the bottom few pixels of a field, just under the ▾ arrow, fell outside it and did nothing. Hit testing now treats the cell's half-extent as slack when no sub-cell position is reported, hitting the target the cell overlaps and the nearest one when several do; the open dropdown still owns its pixels and exact pointers are unchanged.

- Quran footer chip sheds words as the chat column narrows, like the Desktop footer's own items: full text from 60 columns, time only from 40, «۞» alone below that or while the pane is open. Desktop 2.37 draws a Button from its label alone, so the label now carries the visible text (it was drawn in full, white, and never shrank). The mod API has no size, font or icon prop, so width tiers from `viewport.columns` are the closest available; the salah item is plain Text and unchanged.

- Quran adopts the shared three-column help and feature-status tables and `/muslim color` for its pane accents and footer; keep availability repair, playback and repeat modes. Quran demo remains deferred.
- Quran hides surahs the selected recording cannot play, using the shipped support catalog, with one dim note counting them; reciter switches, next/previous, auto-advance, commands and restored state move to the nearest available surah without network work.
- Quran pane follows the selected design: rosette rules, fields every 90px, avatar beside the title, transparent background in both themes, Tajawal throughout and the «الوقت تقريبي» hint. Repeat has three states (`off`, `surah`, `segment`) with two mutually exclusive buttons; surah repeat plays every quarter then starts over, quarter repeat replays the current quarter and is inactive for whole surahs; add `/quran repeat segment`. Nested SVGs declare their namespace so Desktop draws the rosette.
- Add the developer-only Quran support audit, pure availability classifier and offline catalog checks. Automatic support-catalog refresh is tracked in [issue #13](https://github.com/abdelrahmanzied/claude-muslim/issues/13).

- Quran checks recording size before playback, keeps small surahs whole and adds a searchable quarter selector for large recordings. It matches MP3Quran timing metadata to the exact recording and splits at those ayah timings for v1; timing drift can put quarter edges mid-word for some reciters, which is accepted. Adjacent quarters retain all source audio. Runtime scanning verifies actual MP3 frame cuts under the Claude audio limit, stores bounded per-user metadata under `quran.segmentCache`, cleans temporary ranges, and prevents stopped preparation from starting late. Quarter navigation stays within the selected surah; add `/quran retry`.

- Quran aligns its custom heading text with the Mushaf icon and adds a thin draggable scrollbar to both searchable dropdowns; lists remain inside the fixed pane picture. Native wheel dispatch remains unresolved.

- Quran keeps the `/quran` heading label visible at every pane width; the title shortens instead. Dragging a dropdown scrollbar freezes its pointer scale at the press and skips redraws that change nothing, so a flickering host row count no longer shakes the list.

- Quran draws the entire desktop pane in its Client: styled dropdowns with complete catalogs, inline search, keyboard scrolling, current/hover marks and overlays above the player. Embed both full Tajawal weights using lossless WOFF2 to fit engine limits; RTL Arabic and isolated Arabic-Indic option numbers follow the design system. The picture's accessibility text names both surah and quarter repeat with their current states.

- Quran playback starts directly in the hook flow; Stop immediately aborts the active signal even during catalog refresh, and the pane toggle reads current state. A per-clip 200ms watchdog also aborts from the playback invocation. Keep bounded diagnostic logging available with `QURAN_DEBUG = false` for v1. Reload can orphan a clip until it ends.

- Add `/quran`: a desktop recitation player with complete Hafs recording and surah selectors, play/stop, previous/next, approximate time/progress, a footer chip in the shared main color that toggles the docked pane, and a remembered reciter. Natural ends advance to the next available surah with the same recording, stopping when none remains; stopped/replaced plays cannot advance. Pane actions redraw silently, show no toasts and report playback errors in the pane; playback started by a slash command can also update its command reply. Loudness is controlled by the OS. MP3Quran provides the catalog and remote tracks; best-effort MP3 duration metadata is cached without audio. Includes terminal fallback, help/settings integration, docs and tests.

- DESIGN.md: "Quiet by default" now means silent animations and reminders; audio the user starts (such as a recitation) is allowed.

- `/muslim demo` plays the thikr, athkar and salah demos in order without overlap: each demo reports its own end and the next starts 0.1 s later; it knows no demo's length or values, needs no city, and the thikr prompt then says `/muslim demo`. Feature-local demo signals replace self-command calls, which skip muslim's own hooks. The reply explains thikr's token and transcript cost; a repeat says it is already playing. The shared runner is removable demo code and changes no settings, store or saved state.
- `/thikr demo` plays by itself: it starts a real turn (tokens, and a message in the transcript) in which Claude runs three timed Bash sleeps (about 30 s), so the Spinner plays every group in order, a phrase every 1.5 s (starting, thinking, writing, long, then one salawat), the terminal end-of-turn line says تَمَّ بِحَمْدِ اللَّهِ even with `/thikr end off`, then the usage-limit line shows above the prompt for 3 s and the demo disarms itself. It plays with thikr off, changes no settings or saved state, and leaves normal behavior untouched when not armed.
- The athan moment now shows, folds (desktop after one minute; terminal after its rise), and closes after 15 minutes or ×; reopened or pointer-used desktop cards share the athkar band's rest rules (leave 1 s, keys off-card 3 s, idle 90 s, outside focus after a 600 ms press grace); reopening and reloads preserve its original expiry, and `/salah demo` previews Fajr at 05:00 without a city in disposable local state (desktop open 5 s, terminal rise 3.01 s; folded 3 s, then gone). Two selectors reuse the existing drawing paths and restore any real athan untouched; demo input, timers and playback never write real salah atoms. The folded row keeps the call on the right, like the athkar band's title.
- `/athkar demo [sky|frame]` shows all six desktop skies on distinct reading scenes: morning Kursi (75), short (83) and long (84) athkar, then evening short (97), long (77, evening wording) and last thikr (98, counting to ten). Sky has eight scenes in 33.2 seconds, ending with the real finale and folded done on crescent in the evening. Frame keeps its six morning scenes, colors and 24.2-second timing on either surface. Each reply reports its style's scene count and duration. Playback uses its own drawing path, restarts on demand and never changes the real reading, view, timers or saved state.
- Share the desktop card's size, frame, ×, hover, lighting and input between the athkar band and athan card. The athan takes the band's place while it shows; closing it or expiry brings the reading back. Keep the terminal reader and minaret unchanged.
- One shape for every settings and help reply: `/muslim`, `/thikr`, `/athkar` and `/salah` show `| Setting | Description | State |` under a line pointing to their help; every `help` shows `| Command | Description | Options |`, each option with what it does. `/thikr help` is new; `/muslim` lists each feature's main state and the shared settings.
- Make the main color plugin-wide with `/muslim color orange | green | yellow | blue` (default Claude orange), shared by athkar, salah, thikr's usage-limit line and the terminal Arabic survey label. `/athkar color` now points to `/muslim color`. Orange text keeps Claude's theme key; other colors use shared light/dark shades.

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
- `/salah demo` replaces `/salah athan demo` and shows the athan moment now, a fixed Fajr at 05:00, replying `**Salah demo:** athan · Fajr 05:00` like the other demos, without changing settings: the card on the desktop, the minaret in the terminal.
- `/salah athan test` shows the athan moment now for the next prayer without changing settings: the card on the desktop, the minaret in the terminal.
  Historical entry retained from feat/quran; the current command is `/salah demo`, as described above.
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

- Athkar: Sky is desktop only; the terminal always shows the Frame look, and `/athkar style` there changes nothing.
- Athkar follow the shared Arabic path: the plugin-wide `/muslim tashkeel` on desktop, and in the terminal no tashkeel and this terminal's mode (`/muslim terminal-arabic`), for the title, text, passage name, position and end.
- `/athkar help` shows the command table; `/muslim help athkar` too, and `/muslim` lists athkar in its settings table.
- Morning and evening athkar: a reader above the prompt for Hisn al-Muslim 75–98, morning 05:00–17:00 and evening 17:00–05:00. Counts come from the data file only (91 and 92 a hundred, 98 ten); 92 and 93 are one thikr.
- Cover with the title and the keys (two columns, no Esc). Click, Space or Enter counts; right click or Backspace takes one back; ← next, → previous. The first click on a faded band only lights it; the cover's next click opens the reading. Moves on 650 ms after a thikr's last count.
- Quran passages show their name beside the set position (آية الكرسي, سورة الإخلاص, الفلق, الناس), on desktop and in the terminal.
- Progress: a horizon glow along the bottom; the repetitions left ride its head in a small pill; the set position sits at its left end.
- Size: one open height, 77px, for the cover, reading, finale and done row; faded, each folds to one 24px row. Text at a fixed 14px that shrinks only to fit its two-line box, with no floor. No size setting.
- Folds by itself: 1 s after the pointer leaves, 3 s after the last key with the pointer off the band, at once when typing in the prompt, and after 90 s with no input.
- End: on desktop stars fall and ﴿رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ﴾ rises centered with — البقرة ١٢٧ at 18px. Then the done row: the verse at 14px, `/athkar <period> reset → to read again`, and a ✓ on the full line's head. Folded: أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الْمَسَاءُ (or الصَّبَاحُ). The verse takes the words' color on a sky, the main color on Frame.
- Looks: Sky (default), a sky that follows the time of day on desktop and its plain color in the terminal; Frame, a main-color frame. Main color orange, green, yellow or blue.
- Reading saved per day (05:00 to 05:00) and period; × hides the band and keeps it. `/athkar`: status, on/off, style, color, `morning|evening reset`. Settings also in `/config`.
- Thikr line: the usage-limit thikr also shows as soon as a response reports a full usage window.

## 0.2.0

- Thikr line: tasabih join Claude's working line: starting phrases, then a thinking order through tools, a writing pair while Claude answers, and a long group while compacting, a subagent works, or a tool runs 10 s or more. Starting phrase random per turn. Speed auto (1 s + 0.5 s per word) by default, or fixed seconds. Claude's step text on desktop and any status message stay, with the thikr after them; the terminal's decorative verb is replaced.
- End of turn: تَمَّ بِحَمْدِ اللَّهِ.
- Usage limit: حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ above the prompt in Claude orange until the limit resets.
- Salawat mode: `/thikr mode salawat` shows one salawat for each whole turn, a different one each turn.
- `/thikr` command: on/off, speed, tashkeel, end, mode. Settings also in `/config`.

## 0.1.0

- Project scaffold: manifest, marketplace, hooks entry, state contract, tests.
