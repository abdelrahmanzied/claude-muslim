# Morning, evening and after-salah athkar

A reader above the prompt for the morning athkar (Fajr to Maghrib) and the evening athkar (Maghrib to the next Fajr) when a salah place is saved; without prayer times, morning remains 05:00 to 17:00 and evening 17:00 to 05:00, from Hisn al-Muslim 75 to 98 (`plugin/src/features/athkar/data.ts`). 92 and 93 are the same words: 92 (10 times) is in the evening, 93 (100 times, «إذا أصبح») in the morning.

## Athkar after salah

The third set, **Athkar after salah** (أَذْكَارُ بَعْدَ الصَّلَاةِ), is said after the salam of an obligatory prayer. Its authored data is in `plugin/src/features/athkar/after-salah.ts`, from Hisn al-Muslim chapter 25, [hisn:66–72](https://sunnah.com/hisn:66) (through [hisn:72](https://sunnah.com/hisn:72)). The order follows Sheikh Ibn Baz's fatwa ([binbaz.org.sa/fatwas/9879](https://binbaz.org.sa/fatwas/9879)): `66-istighfar`, `66-salam`, `67`, `68`, `72` (Fajr and Maghrib), `69-tasbih`, `69-tahlil`, `71`, the three Quls (`70-*`). Arabic wording is kept exactly as authored.

- `/athkar after-salah` opens the same reader anytime, unhides it and holds the manual choice until ×, another set choice, the next prayer or reload. `/athkar after-salah reset` starts it again at the cover. A finished set replies with its shared reset hint.
- Salah alone publishes `salahLast`: today's last obligatory prayer and its timestamp in the configured place, excluding sunrise and yesterday's Isha. With no place or before today's Fajr, it is null. A saved place keeps tracking even with `/salah show off`, so hiding the footer does not disable the automatic after-salah offer. Athkar only reads the atom; there are no imports between features.
- With a known prayer, use that prayer's list at any time today. Fajr and Maghrib have the three Quls three times each and hisn:72 ten times. With no known prayer use the general list: items without `only`, at their base counts.
- The day contains **one** `afterSalah` reading slot, with `pray` and `at` (`null` for a general reading). A new prayer timestamp replaces it with a fresh, visible reading. There is no history or per-prayer completion ledger. Losing prayer times selects a fresh general slot. The Fajr athkar day boundary (05:00 without prayer times) resets all three slots; older saved days missing the third slot load it empty.
- Without a manual set choice, offer after-salah from the prayer timestamp plus the shared athan duration: `IN_MS` in `plugin/src/shared/pray/line.ts` (`CARD_MS` in salah), currently 15 minutes. This is the same deadline whether the desktop card stays open, is closed with ×, or never appears (terminal, athan off, show off, late session or missing photo). A one-shot start timer redraws at that deadline; there is no offer expiry timer.
- If the morning or evening reading is already being counted (begun, not done, not hidden) when that deadline comes, after-salah waits and takes the band once it is done or closed with ×, so a reading is never cut off. **ابدأ أذكار بعد الصلاة** on the athan card still starts it at once.
- On the desktop athan card, **ابدأ أذكار بعد الصلاة** closes the athan moment immediately and starts this prayer's reader lit and opened, skipping the cover and ready to count. Salah writes `salahAfterSalahStart: { pray, at } | null`; athkar reads it and accepts only a match for `salahLast`. It resumes an unfinished slot, unhides it, and restarts a completed slot. This explicit action replaces any manual set choice. The real button is absent with athkar off; the demo always includes it.
- Once offered, the reader stays until done, hidden with ×, or replaced by the next obligatory prayer (and the normal day boundary still applies). Done or × returns immediately to morning/evening. The next prayer resets the one slot and begins the same delay again; an earlier button request cannot start it early. Manual after-salah selection also ends on that new prayer. Explicit morning/evening choices retain their existing session hold. Without prayer times there is no automatic offer.
- Counting, undo, navigation, progress, hide, reset, done hint and status use the same paths for all three sets. The sky follows the current prayer bounds (fixed clock hours without a saved place). The desktop athan card keeps precedence.

## Reading

- **Cover:** the title (أَذْكَارُ الصَّبَاحِ, أَذْكَارُ الْمَسَاءِ or أَذْكَارُ بَعْدَ الصَّلَاةِ) and the keys. The first click only opens it; the next starts the reading; neither counts.
- **Count:** click, Space or Enter adds one. Right click or Backspace takes one back, or goes to the thikr before at 0. ← next, → previous (Arabic reads right to left). Esc gives the prompt back.
- **Moves on** by itself 650 ms after a thikr's last count.
- **Passage name:** Quran items show their name beside the set position: آية الكرسي and the three short surahs (الإخلاص، الفلق، الناس). Duas have none.
- **Progress:** each thikr is an equal share, partial counts included: `Σ min(count / times, 1) / n`.
- **Period:** prayer times pick it when a place is saved, otherwise the clock picks it unless `/athkar morning` or `/athkar evening` chose one (see Settings); every count, key and click goes to the period shown.
- **×** hides the band and keeps the reading; `/athkar` brings it back.
- **Saved** per day and period in `$.store`. A day runs Fajr to Fajr in the saved place’s time zone (05:00 to 05:00 without prayer times), so evening athkar read after midnight still count for that evening. A new day starts fresh; a finished period does not show again that day.
- **End question:** next past the last thikr finishes automatically only when every thikr is fully counted. Otherwise the reader replaces the thikr with «أتممتَ الأذكار؟», the number not fully counted in Arabic digits («٨ دون عدّ كامل»), primary «نعم، أتممتُها» and quiet «أكمل العدّ». Confirming fills every count from the period's authored `times` and sets `isDone`; resuming returns to the first thikr not fully counted. Back/previous returns to the last thikr without changing counts. The same completion action is available as ✓ «أتممتُها» in the Muslim pane, for people who count on their fingers.
- **Question state:** transient `FinishQuestion` (day, period, selected choice, entry-key latch) in the feature module; never in `Reading`, `$.state` or `$.store`. It clears on reset, hiding, switching period, day change or completion. Only confirmation's full counts and `isDone` are saved. Older saved completed readings are normalized to full counts when read.
- **Question keys:** Tab or ← selects between the two choices; Enter/Space chooses; →, Backspace or right click returns to the last thikr. The host exposes key presses without key-up or repeat metadata. To prevent a held counting key from confirming, the entry key stays blocked until explicit Tab/← selection; the other activation key can choose immediately. A plain click outside a choice does not confirm. A folded question's first press only wakes it.
- **End:** «تَقَبَّلَ اللَّهُ 🤲», a short closing du’a addressed to the reader, outside the authored athkar and without a source citation, then the done row with `/athkar <period> reset → to read again`.

## Counts

Every thikr's count comes from the data file only. There is no choice of counts at reading time (no 10 | 100 switch): 91 and 93 (morning) are a hundred, 92 (evening) and 98 are ten.

## Settings

| `/config` field | Command | Default |
| --- | --- | --- |
| `athkar` | `/athkar on` · `off` | on |
| `athkarStyle` | `/athkar style sky` · `frame` | sky |
| `color` (shared) | `/muslim color orange` · `green` · `yellow` · `blue` | orange |

`/athkar morning` · `/athkar evening` open that period's reader above the prompt even outside its hours (morning athkar at 22:00), and bring it back if hidden with ×. The band, its counts and its keys all follow that period. The choice holds for the session until you pick the other period or hide the band with ×; then automatic period selection resumes (a reload also forgets it). If that period is finished today, the reply is its done row's hint, `/athkar <period> reset → to read again`. `/athkar morning reset` · `/athkar evening reset` start that period again. `/athkar` shows the status and the command table; `/athkar help` and `/muslim help athkar` show the table alone. `/muslim` lists athkar in its settings table.

Tashkeel follows the shared `/muslim tashkeel` setting (desktop only); in the terminal the athkar go through the shared terminal Arabic path like every feature: no tashkeel, and this terminal's mode from `/muslim terminal-arabic`.

**Terminal:** the style is always Frame, and `/athkar style` changes nothing there. Sky is desktop only; `athkarStyle` applies to the desktop app. The shared main color applies on both. See the [terminal guide](../../terminal/terminal-arabic.md#athkar-in-the-terminal).

On desktop the athan card uses the same shared card and open size as the athkar band, and takes its place while it shows. The band returns with the reading kept when the athan closes or expires. Terminal behavior is unchanged.

Not settable: the font and the text size. The mod API sets neither.

## Demo

The shared `/muslim demo` connects a transient signal to this same feature-local starter through a demo-only setup hook. It passes no engine handle across files and writes no state. Started that way, it reports its end after its folded scene, so the next demo follows it.

The `/salah demo` continuation uses these same builders and `demoStep`, with the real `listFor('afterSalah', reading)` Fajr list in a disposable reading (`pray: 'fajr'`). It shows three readings in order: `66-istighfar` (1.2s, counts every 200ms to three), `69-tasbih` (3.6s, 100ms to 33) and `70-ikhlas` (1.2s, 200ms to three). It skips the readings between them using the existing disposable-counts technique. Reading totals 6.0s, followed by the real `FINALE_MS` (3.2s) and a 1.2s folded done row: 10.4s total. The sky follows the current prayer bounds (fixed clock hours without a saved place) and uses the configured accent and desktop style; terminal uses Frame. There is no new drawing path, command or saved state.

A demo-only command hook connects the `afterSalah` starter on the shared transient bus for both `/salah demo` and `/muslim demo`. Salah's start button, × or expiry closes its disposable athan and starts this continuation immediately. Athkar calls the supplied completion callback only after the folded done row, allowing salah to report its end to `/muslim demo`. A real athan waits until the continuation finishes, then returns untouched. Restarting the salah demo cancels the previous continuation. Demo input targets `athkar-demo` and cannot change the real reading, store or signals.

`/athkar demo` uses the current desktop style, or Frame in the terminal.
`/athkar demo sky` is desktop only; the terminal replies that Sky is desktop
only. `/athkar demo frame` plays on either surface. Sky has eight scenes in
33.2 seconds: all six skies appear on reading scenes in day order, then the
finale and folded done stay on crescent in the evening period. Frame keeps
its six-scene morning story, timings and colors, totaling 24.2 seconds.
The command reply reports the scene count and total seconds for its style.

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

| Frame scene | Id | Period | Length | Color |
| --- | --- | --- | --- | --- |
| Ayat al-Kursi, with its authored note | 75 | morning | 5s | orange |
| Short thikr | 83 | morning | 4s | green |
| Long thikr | 84 | morning | 5s | yellow |
| Last thikr, counting to ten | 98 | morning | 4s | blue |
| Celebration: the real finale | finished | morning | `FINALE_MS` (3.2s) | orange |
| Finished, folded to one line | finished | morning | 3s | green |

Reading scenes use the authored repetition counts and real list positions.
The demo skips ahead in a disposable reading, completing preceding items
there only; the pill counts down and the overall progress glow moves. Id 98
counts from 0 to 10 in 3 seconds, then holds the completed reading for 1 second.
Desktop celebrates with falling stars and the rising dua for the real
`FINALE_MS`; the terminal shows its own open done row, then folded done row.

Another demo command restarts playback. Input, including ×, has no handler
and cannot change the real reading. The demo has its own Client key and
render hook; it shows even when athkar is hidden, done or switched off. For standalone athkar previews, the
desktop athan card still takes precedence. The demo never writes settings,
the store or state, and never changes the real band's view or timers. When
it ends, the real band redraws from its own unchanged logic. Pure scenes live
in `plugin/src/features/athkar/demo.ts`; marked demo blocks in `install.tsx` hold the
runner and separate drawing path.

## Design

Looks, size, folding, the finale and the reader's visual means: [athkar design](athkar-design.md).

Salah supplies `salahAthkarTimes` on each read (current date, previous date, Fajr, Sunrise, Maghrib, Isha and next Fajr), using the same method and adjustments as its prayer times. This works before its ticker starts and across midnight, even with show off. Athkar wakes automatically at the next prayer period boundary; its existing minute redraw selects the sky from these prayer bounds. Dawn starts at Fajr, sunrise at Sunrise, day at Sunrise + 2 hours, rose at Maghrib − 1 hour, blue hour at Maghrib, and crescent at min(Maghrib + 1 hour, Isha), including after midnight before Fajr. Invalid sunrise falls back to Fajr + 1.5 hours; short days clamp phases to ordered boundaries (see the design). Without prayer times the fixed 4/6/8/17/18/19 sky hours remain unchanged.

Prayer bounds reuse a pure daily calculation cache, refreshed on the first read after the place’s date changes; a settings reload drops the cache.

## Muslim pane

The [Muslim pane](../muslim-pane/muslim-pane.md) card shows the current set and lets the person pick morning, evening or after-salah from its title menu; choosing a set shares the slash command's internal selection function, including manual hold and unhide rules. Its row buttons act on the shown set: «ابدأ» (no counts) or «أكمل» (partly counted) opens the reader, «✓ أتممتُها» finishes and «إعادة» resets. Look and sizes: [pane design](../muslim-pane/muslim-pane-design.md).

Only `plugin/src/shared/panel/signal.ts` connects the features: `PanelAthkar.set` uses the public command spelling (`morning|evening|after-salah`), `canUndo` reports reset undo availability, and athkar validates `athkar-set` values. `athkar-reset` uses the same reset function as `/athkar <set> reset`: empty counts, clear done/hidden, keep after-salah prayer identity, return to the folded cover. The pane alone offers an 8-second reset undo (`athkar-undo`); a module-local copied snapshot restores the counts, index, done and hidden state. A day change, any new set choice, another reset, prayer-slot replacement, expiry or reload drops the snapshot. Nothing new is persisted with the reading and no slash command is added. The pane owns only menu visibility (`paneAthkarMenu`).

Athkar reconnects its feed and actions during band drawing and Muslim-pane render/input, so the card works before a band has drawn. The terminal fallback keeps its existing line shape; the band and authored religious text are unchanged.
