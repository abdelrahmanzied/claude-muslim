# Morning, evening and after-salah athkar — design

The athkar reader's own design. It adds to the shared base in [DESIGN.md](../../../DESIGN.md) and never contradicts it. What the feature does is in [athkar spec](athkar.md). Change a rule here first, then the code and its tests.

## Visual means: a drawn reader

The athkar reader is the one feature the person sits with, so it is drawn:

- **Client modules** (`plugin/src/features/athkar/reader.tsx` in the terminal, `plugin/src/features/athkar/card.tsx` on desktop) take clicks and keys and post each count to the hooks module. The desktop uses the shared card in `plugin/src/shared/card/` for its size, frame, ×, hover and lighting. The terminal reader is unchanged.
- **Svg** (desktop only) for the Sky look: a sky that follows the time of day with slow SMIL motion, drawn behind the reader. The terminal always uses the Frame look.
- **Hex colors** from `plugin/src/shared/color/` for the reader's plugin-wide main color (`/muslim color`, default Claude orange; orange, green, yellow, blue in light/dark shades; on the desktop the band emits both shades and the app's appearance picks with `prefers-color-scheme`, never Claude Code's `theme` config, see DESIGN.md), and feature-specific colors for the skies, since a theme key cannot be blended or placed on a sky.

Everything else (font, size) stays Claude's: the API sets neither, so the reader follows the app's zoom.

**Why:** reading a set of athkar with counts needs a place to sit, click and see progress; a text row cannot hold it. The terminal gets the same reader as text in the Frame look.

## Scope

- Desktop app and terminal only. No phone layouts or phone-width checks.
- Few settings, simple rules: on/off, style (sky or frame) and color. Nothing else is customizable.

## Surfaces

| Moment | Surface | What shows |
| --- | --- | --- |
| Reading | AbovePrompt band | The reader (Client module), folded or open |
| Settings | Command reply | `/athkar` status and help, one line per change |

The real AbovePrompt render yields the existing tree, just as for a hidden reading, while first-run automatic opening is quiet. The salah setup card stays visible. The shared pure first-run policy lives in `plugin/src/shared/pray/first-run.ts`; salah writes the first answer, athkar reads its store key and subscribes to `firstRunRemindFrom` and `salahSetupLater`. Pending follows the installed setup card, including with the footer off. Timer setup precedes the gate, so the next period still opens on time.

Only automatic selections are gated. Morning/evening need a period start at or after the first answer; after-salah uses the athan timestamp, not the delayed offer start. For periods, `mayOpenPeriod` tests whether the first boundary at or after the answer has passed, using bounds for answer minus 1 ms to include exact equality, including before Fajr and across midnight. No timestamp preserves existing-user behavior. Explicit commands (including reset), pane opens and matching `requested` signals bypass this automatic-opening check, but their drawing still waits for any visible setup form. Demos use their existing separate path and also yield to setup.

## Reading

- **Cover:** the title (أَذْكَارُ الصَّبَاحِ, أَذْكَارُ الْمَسَاءِ or أَذْكَارُ بَعْدَ الصَّلَاةِ) and the keys. Faded, it folds to one slim row (24px, the reading's folded height): the title on the right, a muted one-line hint (`click to start`, or `click to continue`) at the left, the × at the left edge and the thin progress line. The first click only opens it (full cover with the keys); the next starts the reading; neither counts.
- **Count:** click, Space or Enter adds one. Right click or Backspace takes one back, or goes to the thikr before at 0. ← next, → previous (Arabic reads right to left). Esc gives the prompt back. The band folds by itself once the person stops ([rules](#when-it-folds-collapse-rules)).
- **Passage name:** Quran items show their name beside the set position on desktop and in the terminal: آية الكرسي and the three short surahs (الإخلاص، الفلق، الناس). Duas have no passage name.
- **Count on the line:** no circles. The progress line along the bottom shows the whole set; a small pill on its glowing head shows the repetitions left on this thikr in Arabic-Indic digits (٣ then ٢, ١, ٠; ١ for a thikr said once), easing along with the head and kept clear of both ends of the line. The set position (e.g. ١٦ مِنْ ٢٢) sits small and muted at the line's left end. In the terminal the head is `` ٢ `` on the main color.
- **Progress:** Horizon glow, a soft line along the bottom filled from the right, its head pulsing slowly and easing forward on each count. The share per thikr is in [athkar spec](athkar.md#reading).

## Third set: after salah

The title is أَذْكَارُ بَعْدَ الصَّلَاةِ; the command is `/athkar after-salah`. This uses the same cover, counts, passage labels, progress, undo, ×, reset and two fixed heights as morning/evening. The sky follows the current prayer bounds (fixed clock hours without a saved place), including manual readings. The folded done note is `أَتْمَمْتَ وِرْدَكَ ✓`, with no promise of a next time; the open done row and finale keep the shared closing du’a and the hint `/athkar after-salah reset → to read again`. Finished in front of the person, after-salah keeps the band through the finale and the open done row, however it was started (athan card, automatic offer or command), and gives it back to morning/evening once the band rests.

One slot holds the current prayer's reading (`pray`, `at`), or the general reading with both null. A different prayer time clears counts, done and hidden state and starts on the cover. There is no history. The Fajr day boundary (05:00 without prayer times) also clears it; old days missing the slot are tolerated. The list is authored in Hisn al-Muslim chapter 25 ([hisn:66](https://sunnah.com/hisn:66)–[72](https://sunnah.com/hisn:72)); general readings use base counts, while Fajr/Maghrib carry their specified extras.

Prayer tracking depends on a saved place, independently of footer visibility (`/salah show off`). The offer starts at `salahLast.at + IN_MS`, using the shared athan duration (currently 15 minutes), even on terminal or when the athan card is disabled, closed early or never drawn. Separate one-shot timers wake drawing at this start and at `salahLast.at + 2 * IN_MS` (currently 30 minutes from the athan), including after a module reload. `offerEnd` shares the same `IN_MS` constant; `setAt` derives eligibility from the prayer timestamp, the slot counts and the clock, with no persisted expiry flag. An untouched automatic offer stops claiming the band at that end, even if morning/evening kept it waiting throughout. Any positive count before the deadline keeps the unfinished, visible reading until done, hidden or replaced by the next prayer. A matching athan-card request or a manual command/pane choice bypasses expiry. The pane retains manual access after expiry. Done/× immediately returns to the automatic morning/evening set. A new prayer clears the slot, discards a manual after-salah choice and starts the wait again; a manual morning/evening choice keeps its existing hold. No prayer times means no automatic offer; manual access remains available.

The desktop athan action **ابدأ أذكار بعد الصلاة** hands off immediately: salah closes its moment and writes `salahAfterSalahStart` with that prayer's identity. Athkar checks it against `salahLast`, unhides/resumes the reading (restarts if completed), and opens it lit, past the cover; the next count counts. The signal overrides a manual choice, survives a module reload for the same prayer, and cannot carry over to another prayer. The automatic offer after the normal deadline starts on the usual folded cover. The sky, reader layout and counting paths are unchanged; no setting or demo scene is added.

## Looks

| Look | Surface | Drawn as |
| --- | --- | --- |
| Sky (default) | desktop | A sky that follows saved prayer times (see below); without them, exactly dawn 4–6, sunrise 6–8, clear day 8–17, rose 17–18, blue hour 18–19, crescent 19–4. Rich motion: stars, sun, clouds, birds, shooting stars. Faded until clicked, then in color. |
| Frame | both (the only look in the terminal) | A main-color frame that breathes while reading. On the desktop its words, lines and fills follow the app's light or dark appearance (both palettes in the band's CSS, picked by `prefers-color-scheme`); in the terminal its words, dim text and lines are the theme keys `text`, `subtle` and `inactive`, and the frame breathes with the border's dim form. Those keys follow Claude Code's `/theme`, not the terminal's background, so a dark theme on a light terminal leaves the lit words pale; the `/athkar style` help row says to match `/theme` to the terminal. Skies keep their own colors (white words, dark on sunrise) in either appearance. |

With a saved salah place, the sky uses absolute prayer timestamps, independently of the selected reading: dawn from Fajr to Sunrise, sunrise until Sunrise + 2 hours, day until Maghrib − 1 hour, rose until Maghrib, blue hour until the earlier of Maghrib + 1 hour and Isha, then crescent until the next Fajr (including after midnight before Fajr). Sunrise comes from the same calculation and adjustments as salah. If it is missing, nonfinite or not strictly between Fajr and Maghrib, use Fajr + 1.5 hours.

`skyBoundaries` clamps sunrise into Fajr–Maghrib, rose's start between sunrise and Maghrib, and day's start to at most rose's start. Short days can have zero-length phases, never negative ones. Blue hour ends no earlier than Maghrib and no later than next Fajr; nonfinite Isha uses Maghrib + 1 hour. The existing minute redraw recalculates the sky from fresh bounds, so transitions appear within one minute. Fixed-sky demo scenes keep their authored skies; the after-salah demo uses the current sky through the same selector.

On every sky the pill is the main color with a white number. Sunrise takes dark words; every other sky white.

## Demo path

The shared `/muslim demo` connects a transient signal to this same feature-local starter through a demo-only setup hook. It passes no engine handle across files and writes no state. Started that way, it reports its end after its folded scene, so the next demo follows it.

The `/salah demo` continuation uses these same builders and `demoStep`, with the real `listFor('afterSalah', reading)` Fajr list in a disposable reading (`pray: 'fajr'`). It shows three readings in order: `66-istighfar` (1.2s, counts every 200ms to three), `69-tasbih` (3.6s, 100ms to 33) and `70-ikhlas` (1.2s, 200ms to three). It skips the readings between them using the existing disposable-counts technique. Reading totals 6.0s, followed by the real `FINALE_MS` (3.2s) and a 1.2s folded done row: 10.4s total. The sky follows the current prayer bounds (fixed clock hours without a saved place) and uses the configured accent and desktop style; terminal uses Frame. There is no new drawing path, command or saved state.

A demo-only command hook connects the `afterSalah` starter on the shared transient bus for both `/salah demo` and `/muslim demo`. Salah's start button, × or expiry closes its disposable athan and starts this continuation immediately. Athkar calls the supplied completion callback only after the folded done row, allowing salah to report its end to `/muslim demo`. A real athan waits until the continuation finishes, then returns untouched. Restarting the salah demo cancels the previous continuation. Demo input targets `athkar-demo` and cannot change the real reading, store or signals.

`/athkar demo [sky|frame]` plays the real builders. Sky has eight scenes
(33.2 seconds), with each of the six skies on a distinct reading scene:

| Sky scene | Id | Period | Length | Sky |
| --- | --- | --- | --- | --- |
| Ayat al-Kursi, with its authored note | 75 | morning | 5s | dawn |
| Short thikr | 83 | morning | 4s | sunrise |
| Long thikr | 84 | morning | 5s | day |
| Evening-only short thikr (3 repetitions) | 97 | evening | 4s | rose |
| Long thikr, with its authored evening wording | 77 | evening | 5s | bluehour |
| Last thikr, counting to ten | 98 | evening | 4s | crescent |
| Celebration: the real finale | finished | evening | `FINALE_MS` (3.2s) | crescent |
| Finished, folded to one line | finished | evening | 3s | crescent |

Frame keeps its six-scene morning story (24.2 seconds) on both surfaces:

| Frame scene | Id | Period | Length | Color |
| --- | --- | --- | --- | --- |
| Ayat al-Kursi, with its authored note | 75 | morning | 5s | orange |
| Short thikr | 83 | morning | 4s | green |
| Long thikr | 84 | morning | 5s | yellow |
| Last thikr, counting to ten | 98 | morning | 4s | blue |
| Celebration: the real finale | finished | morning | `FINALE_MS` (3.2s) | orange |
| Finished, folded to one line | finished | morning | 3s | green |

All reading scenes are open and lit. Their authored counts and real
positions are retained, including Kursi's full note from `data.ts`.
A disposable reading completes preceding items to skip ahead through the
set; its pill counts down and its overall progress glow slides. Kursi and
thikr 84 count once halfway through their 5 seconds; thikr 83 counts every
400 ms to its seven repetitions. Sky's evening-only thikr 97 counts every
800 ms to its three repetitions, and thikr 77 counts once halfway through
its 5 seconds using its evening wording from `data.ts`. Thikr 98 counts
every 300 ms to ten, holding its last count for the final second. Then the
desktop plays falling stars and the rising dua for `FINALE_MS`, followed by
the one-line finished band. Both stay on crescent and evening in Sky.
The terminal keeps Frame's own open done row, then folded done.
The command reply reports each style's real scene count and total duration.

Sky is desktop only; no-word playback uses the current style on desktop and
Frame in the terminal. Another demo command restarts playback; there is no
input handler, including for ×. It uses its own `athkar-demo` Client and a
separate render hook; the real render only yields its
place during playback. For standalone athkar previews, the desktop athan card keeps precedence. The demo
never changes the real reading, view or timers and never writes settings,
store or state. At the end the real band redraws normally. Scenes and timings
are pure in `demo.ts`; marked blocks in `install.tsx` hold only the demo path.

## Size

- **Fixed height.** The open reading, the cover, the finale and the done row are one height for every thikr, count and width: 77px on desktop. Faded, they fold to one 24px row. Only two sizes ever show: open and folded.
- **Width follows the window.** The band is as wide as the app's card above the prompt.
- **One desktop card at a time.** The athan card uses the same shared card and open size as this band. While it shows, it takes the band's place; closing it or reaching its time limit brings the band back with the reading kept. The terminal reader and minaret keep their existing behavior.
- **Fixed text size: 14px.** There is no size setting.
- **Long text shrinks to fit.** The text box is two lines of 14px. A thikr that does not fit shrinks just enough to fit the box, with no floor. In a very narrow window the words get small, but they never leave the box or cover the progress line. The band never grows taller.
- **The person owns the window.** A narrow window means smaller words; that is their choice, not a case the band works around.

## Clicks and keys

- The first click on a faded band only lights it; it never counts.
- On the cover, the next click opens the reading; it does not count either. After that, clicks count.
- The cover lists no Esc key: the mod never receives Esc (see rule 4).
- Click, Space or Enter counts. Right click or Backspace takes one back. ← next, → previous.
- × hides the band for this set (for the current prayer with after-salah) and keeps the reading. `/athkar` brings it back. `/athkar morning` · `evening` shows that period by the same cover and reading even outside its hours; the choice ends at ×.

## When it folds (collapse rules)

The band is lit while the person uses it, by mouse or keyboard, and folds by itself once they stop.

| # | Case | Rule |
| --- | --- | --- |
| 1 | The pointer leaves the band | Folds after 1 second. Coming back within that second keeps it open. |
| 2 | Counting by keys with the pointer off the band | Folds 3 seconds after the last key. Each key starts the 3 seconds again. |
| 3 | Typing in the prompt | Folds at once. |
| 4 | Esc | Gives the keyboard back to the prompt. The mod never receives Esc, so rule 2 folds the band 3 seconds after the last key. |
| 5 | A click anywhere else | The app sends mods no signal for it; rules 1 and 2 cover it. |
| 6 | No input at all | Folds after 90 seconds, as a backup. |
| 7 | × | Hides the band (see above). |

Counting by keys with the pointer on the band keeps it open until the pointer leaves (rule 1) or rule 6.

## End question

Before completion, next past the last item checks the whole period. If any item is not fully counted, show «أتممتَ الأذكار؟» and a small muted Arabic-digit count («٨ دون عدّ كامل»), with primary «نعم، أتممتُها» on the right and quiet «أكمل العدّ» on the left. This is UI chrome, not religious text. It uses the same layout, tokens and controls in Sky and Frame: the existing 77px open band and 24px folded row; no finale or completed progress while asking. Choice text shrinks with narrow widths. The folded row shows the question alone and a first press wakes it. Choice rectangles in `band.ts` also drive pointer hit testing: each choice takes its whole frame plus 4px each side (half the gap between them) and 8px above and below (`CHOICE_MARGIN`); other background clicks do nothing. A thin outline shows the selected choice.

The terminal draws the question, muted line and two native text buttons through the shared Arabic display path, and lists the keys. Tab/← selects; Enter/Space activates the selected choice; →/Backspace/right click returns to the last thikr. Since `ClientKeyEvent` has neither release nor repeat metadata, the key that entered the question cannot activate it until an explicit selection key; the other activation key works immediately. No timeout guesses a release.

«أكمل العدّ» finds the first incomplete item. «نعم، أتممتُها» and the pane's ✓ «أتممتُها» share `step(..., { act: 'finish' })`: fill all period counts and set `isDone`, then use the existing finale/done path. The question, selected choice and key latch are transient module view values scoped to day and period, never persisted. Demos retain their existing scenes and timings.

## End

- The finale (desktop): falling stars, and «تَقَبَّلَ اللَّهُ 🤲» rising centered at a fixed 18px. This short du’a greets the reader on finishing; it is not one of the authored athkar and has no source citation. The chosen closing greeting is an explicit exception to the shared no-emoji voice rule.
- After it, the done row: the same closing greeting, without a citation, on the right at 14px, like the reading (smaller only if the window is too narrow), the reset hint (`/athkar morning reset → to read again`) on the left.
- The closing du’a is always in the words' face (Tajawal), in the finale and the done row alike.
- Its color: on a sky, the words' color (white or dark, as the sky's text); on Frame, the main color (the frame's and the progress line's).
- The open done row's progress line is full with a ✓ in the pill at its head, so it reads as finished, not as one more thikr.
- Widths use the embedded Tajawal font for the words and a separate emoji allowance; tashkeel has no advance width. The terminal keeps 🤲, strips tashkeel and applies the shared Arabic mode. Its native `Text` handles wrapping/truncation and the emoji’s two-cell width; no string-length padding is used for the closing row.
- The hint marks the command apart from what it does with an arrow: `/athkar morning reset → to read again`.
- Faded, the done row folds to one slim row: أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الْمَسَاءُ after the morning, أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الصَّبَاحُ after the evening, no closing greeting. The finale (falling stars) never folds.

## Limits of the mod API

- The band always sits in the app's slot above the prompt; a mod cannot place it below the input or above the branch bar.
- No signal for a click elsewhere or for Esc (see rules 4 and 5).
- No cursor shape: the × shows its hover with a light disc instead of a pointer cursor.
- Hovering the desktop band (pointer enter) picks up another session's progress; the folded row's thin line may be one action behind until then. See *Sync between open sessions* in `athkar.md`.

## Reminder switches

The three reminders (`athkarMorning`, `athkarEvening`, `athkarAfterSalah`) change no drawing. They only decide whether the band opens by itself. The pane's الأذكار tab shows them as three switch rows above the look pills:
- «تذكير أذكار الصباح», «يظهر فوق خانة الكتابة من الفجر»;
- «تذكير أذكار المساء», «يظهر فوق خانة الكتابة من المغرب»;
- «تذكير أذكار بعد الصلاة», «يظهر ربع ساعة بعد كل أذان».

The terminal pane text lists them with `/athkar <set> on | off`.

## Checklist for a change

- [ ] The rule is changed here first, then the code and its tests.
- [ ] Only two heights ever show: open (77px) and folded (24px).
- [ ] Tests on `terminal` and `desktop`; the terminal shows no tashkeel, the desktop follows `/muslim tashkeel`.
- [ ] Religious text unchanged from `data.ts`.

## Period boundaries

With a saved salah place, morning runs from Fajr inclusive to Maghrib exclusive, and evening until the next Fajr. The saved day turns over at Fajr in the place’s time zone; after midnight before Fajr retains the previous evening. Without a place, retain 05:00–17:00 morning and 17:00–05:00 evening.

The whole day at a glance: the period, the sky and the after-salah offer, with prayer times and without.

| From | Until | Period | Sky | Without prayer times |
| --- | --- | --- | --- | --- |
| Fajr | Sunrise | morning | dawn | 04:00–06:00 dawn; morning from 05:00 |
| Sunrise | Sunrise + 2 h | morning | sunrise | 06:00–08:00 sunrise |
| Sunrise + 2 h | Maghrib − 1 h | morning | day | 08:00–17:00 day |
| Maghrib − 1 h | Maghrib | morning | rose | 17:00–18:00 rose; evening from 17:00 |
| Maghrib | min(Maghrib + 1 h, Isha) | evening | blue hour | 18:00–19:00 blue hour |
| that | next Fajr | evening (after midnight: the day before) | crescent | 19:00–04:00 crescent; day turns at 05:00 |

After each obligatory prayer, the automatic after-salah reading may take the band from prayer + `IN_MS` to prayer + `2 * IN_MS` (currently 15–30 minutes). Untouched at expiry, it gives the band back without a save. Once counted, it stays until done, closed or the next prayer; explicit athan-card, command and pane starts keep that same hold without expiry. If morning/evening is already being counted, after-salah waits only within its automatic offer window; finishing after that window never surfaces the untouched offer. A started reading is never cut off. Without prayer times there is no offer. Sunrise falls back to Fajr + 1.5 h when missing. On a short day the phases are cut, not scaled: dawn always keeps Fajr to Sunrise; the day phase goes first, then the sunrise phase shortens, and only on a very short day does rose start later than Maghrib − 1 h (see `skyBoundaries` above). Demos keep their authored skies.

Salah connects prayer-day bounds through `plugin/src/shared/pray/bounds.ts`: each read calculates current bounds and date keys from the current clock, configured place, method and adjustments. With no place it returns null. It is available before the first ticker publication and cannot retain yesterday’s bounds at midnight or after a settings reload. Athkar reads it for commands, input, drawing and timers, with the same bounds in timers as in hooks. A one-shot redraw wakes at the next Fajr/Maghrib; the existing minute ticker refreshes prayer-based or fixed-hour skies and handles clock changes. Manual choices, after-salah precedence and demos keep their rules.

Prayer bounds reuse a pure daily calculation cache, refreshed on the first read after the place’s date changes; a settings reload drops the cache.

## Muslim pane card

The pane's athkar card (set menu, progress row, «ابدأ/أكمل · ✓ أتممتُها · إعادة») is drawn by the Muslim pane; its look and sizes are in [the pane design](../muslim-pane/muslim-pane-design.md), its behaviour in [athkar.md](athkar.md). It never changes the band's 77px open and 24px folded heights or any religious text.

Input, pane actions, commands and timed advancement serialize their day read-modify-save operations in one transient queue. Each step reads after the preceding save; inner helpers never enqueue again. Rejections do not break the queue. Rendering stays read-only; deferred prayer-slot synchronization joins that same queue. Settings commands use the shared stop-before-reload rule in DESIGN.md.

Setup forms follow DESIGN.md's exclusive AbovePrompt rule. The reader, folded row, finish question and finale all yield to city setup, review and the terminal Arabic check. Their reading is retained; hiding does not open the reader or advance its current item. A pending automatic item advance is skipped while a form is open, without replaying that advance on return. Explicit opens are remembered and draw after the form closes.

## Release behavior

Only explicit `/athkar morning|evening|after-salah` picks hold the set for the session. Pane set choices hold only when they differ from the automatic `setAt` choice now. Bare `/athkar`, pane Open and resetting the current set unhide it without holding that choice; period transitions and automatic after-salah offers continue. The status table immediately shows the unhidden state. A begun, unfinished and visible after-salah reading takes precedence over a morning/evening reading in progress, including after reload. A begun reading remains visible even with a recorded first-setup cutoff. A null last-prayer signal at local midnight retains the prayer identity and counts until another obligatory prayer or the Fajr day boundary (05:00 without times). The finish question uses those same prayer-day bounds.

All reader timing uses `$.clock.now()`. The minute sky refresh runs only while the desktop sky band is drawn; frame, terminal, hidden and setup-covered bands have no sky interval. Explicit open and demo replies append `It shows once the setup above is answered.` while the shared setup decision withholds the band. Pure hit areas/glow live in `band.ts`, status/slot identity in `logic.ts`; digit conversion is shared. Unknown or old store shapes fall back to a fresh day without migration. `/athkar color` is listed in help and points to `/muslim color`.
