# Morning, evening and after-salah athkar — design

The athkar reader's own design. It adds to the shared base in [DESIGN.md](../../../DESIGN.md) and never contradicts it. What the feature does is in [athkar spec](athkar.md). Change a rule here first, then the code and its tests.

## Visual means: a drawn reader

The athkar reader is the one feature the person sits with, so it is drawn:

- **Client modules** (`src/features/athkar/reader.tsx` in the terminal, `src/features/athkar/card.tsx` on desktop) take clicks and keys and post each count to the hooks module. The desktop uses the shared card in `src/shared/card/` for its size, frame, ×, hover and lighting. The terminal reader is unchanged.
- **Svg** (desktop only) for the Sky look: a sky that follows the time of day with slow SMIL motion, drawn behind the reader. The terminal always uses the Frame look.
- **Hex colors** from `src/shared/color/` for the reader's plugin-wide main color (`/muslim color`, default Claude orange; orange, green, gold, blue in light/dark shades), and feature-specific colors for the skies, since a theme key cannot be blended or placed on a sky.

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

## Reading

- **Cover:** the title (أَذْكَارُ الصَّبَاحِ, أَذْكَارُ الْمَسَاءِ or أَذْكَارُ بَعْدَ الصَّلَاةِ) and the keys. Faded, it folds to one slim row (24px, the reading's folded height): the title on the right, a muted one-line hint (`click to start`, or `click to continue`) at the left, the × at the left edge and the thin progress line. The first click only opens it (full cover with the keys); the next starts the reading; neither counts.
- **Count:** click, Space or Enter adds one. Right click or Backspace takes one back, or goes to the thikr before at 0. ← next, → previous (Arabic reads right to left). Esc gives the prompt back. The band folds by itself once the person stops ([rules](#when-it-folds-collapse-rules)).
- **Passage name:** Quran items show their name beside the set position on desktop and in the terminal: آية الكرسي and the three short surahs (الإخلاص، الفلق، الناس). Duas have no passage name.
- **Count on the line:** no circles. The progress line along the bottom shows the whole set; a small pill on its glowing head shows the repetitions left on this thikr in Arabic-Indic digits (٣ then ٢, ١, ٠; ١ for a thikr said once), easing along with the head and kept clear of both ends of the line. The set position (e.g. ١٦ مِنْ ٢٢) sits small and muted at the line's left end. In the terminal the head is `` ٢ `` on the main color.
- **Progress:** Horizon glow, a soft line along the bottom filled from the right, its head pulsing slowly and easing forward on each count. The share per thikr is in [athkar spec](athkar.md#reading).

## Third set: after salah

The title is أَذْكَارُ بَعْدَ الصَّلَاةِ; the command is `/athkar after-salah`. This uses the same cover, counts, passage labels, progress, undo, ×, reset and two fixed heights as morning/evening. The sky follows the current hour, including manual readings. The folded done note is `أَتْمَمْتَ وِرْدَكَ ✓`, with no promise of a next time; the open done row and finale keep the shared end verse and the hint `/athkar after-salah reset → to read again`.

One slot holds the current prayer's reading (`pray`, `at`), or the general reading with both null. A different prayer time clears counts, done and hidden state and starts on the cover. There is no history. The 05:00 day boundary also clears it; old days missing the slot are tolerated. The list is authored in Hisn al-Muslim chapter 25 ([hisn:66](https://sunnah.com/hisn:66)–[73](https://sunnah.com/hisn:73)); general readings use base counts, while Fajr/Maghrib carry their specified extras.

Prayer tracking depends on a saved place, independently of footer visibility (`/salah show off`). The offer starts at `salahLast.at + IN_MS`, using the shared athan duration (currently 15 minutes), even on terminal or when the athan card is disabled, closed early or never drawn. A timer only wakes the drawing at this start; there is no end timer. Once offered, morning/evening wait until after-salah is done, hidden or replaced by the next prayer. Done/× immediately returns to the clock's set. A new prayer clears the slot, discards a manual after-salah choice and starts the wait again; a manual morning/evening choice keeps its existing hold. No prayer times means no automatic offer; manual access remains available.

The desktop athan action **ابدأ أذكار بعد الصلاة** hands off immediately: salah closes its moment and writes `salahAfterSalahStart` with that prayer's identity. Athkar checks it against `salahLast`, unhides/resumes the reading (restarts if completed), and opens it lit, past the cover; the next count counts. The signal overrides a manual choice, survives a module reload for the same prayer, and cannot carry over to another prayer. The automatic offer after the normal deadline starts on the usual folded cover. The sky, reader layout and counting paths are unchanged; no setting or demo scene is added.

## Looks

| Look | Surface | Drawn as |
| --- | --- | --- |
| Sky (default) | desktop | A sky that follows the clock: dawn 4–6, sunrise 6–8, clear day 8–17, rose 17–18, blue hour 18–19, crescent 19–4. Rich motion: stars, sun, clouds, birds, shooting stars. Faded until clicked, then in color. |
| Frame | both (the only look in the terminal) | A main-color frame that breathes while reading. |

On every sky the pill is the main color with a white number. Sunrise takes dark words; every other sky white.

## Demo path

The shared `/muslim demo` connects a transient signal to this same feature-local starter through a demo-only setup hook. It passes no engine handle across files and writes no state. Started that way, it reports its end after its folded scene, so the next demo follows it.

The `/salah demo` continuation uses these same builders and `demoStep`, with the real `listFor('afterSalah', reading)` Fajr list in a disposable reading (`pray: 'fajr'`). It shows eight readings in order: `66-istighfar` (1.2s, counts every 200ms), `66-salam` (1.2s, 400ms), `69-tasbih` (3.6s, 100ms to 33), each of `70-ikhlas`, `70-falaq`, `70-nas` (1.2s, 200ms to three), `72` (1.6s, 100ms to ten), and `73` (1.2s, 400ms). It skips the intervening long passages using the existing disposable-counts technique. Reading totals 12.4s, followed by the real `FINALE_MS` (3.2s) and a 1.2s folded done row: 16.8s total. The sky follows the current hour and uses the configured accent and desktop style; terminal uses Frame. There is no new drawing path, command or saved state.

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
| Long thikr | 84 | morning | 5s | gold |
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
separate render hook even with athkar off; the real render only yields its
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

## End

- The finale (desktop): falling stars, and the end verse ﴿رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ﴾ rising centered with — البقرة ١٢٧, at a fixed 18px.
- After it, the done row: the verse and — البقرة ١٢٧ on the right at 14px, like the reading (smaller only if the window is too narrow), the reset hint (`/athkar morning reset → to read again`) on the left.
- The end verse is always in the words' face (Tajawal), in the finale and the done row alike.
- Its color: on a sky, the words' color (white or dark, as the sky's text); on Frame, the main color (the frame's and the progress line's).
- The open done row's progress line is full with a ✓ in the pill at its head, so it reads as finished, not as one more thikr.
- The hint marks the command apart from what it does with an arrow: `/athkar morning reset → to read again`.
- Faded, the done row folds to one slim row: أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الْمَسَاءُ after the morning, أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الصَّبَاحُ after the evening, no verse. The finale (falling stars) never folds.

## Limits of the mod API

- The band always sits in the app's slot above the prompt; a mod cannot place it below the input or above the branch bar.
- No signal for a click elsewhere or for Esc (see rules 4 and 5).
- No cursor shape: the × shows its hover with a light disc instead of a pointer cursor.

## Checklist for a change

- [ ] The rule is changed here first, then the code and its tests.
- [ ] Only two heights ever show: open (77px) and folded (24px).
- [ ] Tests on `terminal` and `desktop`; the terminal shows no tashkeel, the desktop follows `/muslim tashkeel`.
- [ ] Religious text unchanged from `data.ts`.
