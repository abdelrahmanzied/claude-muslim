# Morning and evening athkar

A reader above the prompt for the morning athkar (05:00 to 17:00) and the evening athkar (17:00 to 05:00), from Hisn al-Muslim 75 to 98 (`src/features/athkar/data.ts`). 93 is the same words as 92, so they are one thikr.

## Reading

- **Cover:** the title (أَذْكَارُ الصَّبَاحِ or أَذْكَارُ الْمَسَاءِ) and the keys. The first click only opens it; the next starts the reading; neither counts.
- **Count:** click, Space or Enter adds one. Right click or Backspace takes one back, or goes to the thikr before at 0. ← next, → previous (Arabic reads right to left). Esc gives the prompt back.
- **Moves on** by itself 650 ms after a thikr's last count.
- **Passage name:** Quran items show their name beside the set position: آية الكرسي and the three short surahs (الإخلاص، الفلق، الناس). Duas have none.
- **Progress:** each thikr is an equal share, partial counts included: `Σ min(count / times, 1) / n`.
- **×** hides the band and keeps the reading; `/athkar` brings it back.
- **Saved** per day and period in `$.store`. A day runs 05:00 to 05:00, so evening athkar read after midnight still count for that evening. A new day starts fresh; a finished period does not show again that day.
- **End:** the end verse ﴿رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ﴾ — البقرة ١٢٧, then the done row with `/athkar <period> reset → to read again`.

## Counts

Every thikr's count comes from the data file only. There is no choice of counts at reading time (no 10 | 100 switch): 91 and 92 are a hundred, 98 is ten.

## Settings

| `/config` field | Command | Default |
| --- | --- | --- |
| `athkar` | `/athkar on` · `off` | on |
| `athkarStyle` | `/athkar style sky` · `frame` | sky |
| `color` (shared) | `/muslim color orange` · `green` · `gold` · `blue` | orange |

`/athkar morning reset` · `/athkar evening reset` start that period again. `/athkar` shows the status and the command table; `/athkar help` and `/muslim help athkar` show the table alone. `/muslim` lists athkar in its settings table.

Tashkeel follows the shared `/muslim tashkeel` setting (desktop only); in the terminal the athkar go through the shared terminal Arabic path like every feature: no tashkeel, and this terminal's mode from `/muslim terminal-arabic`.

**Terminal:** the style is always Frame, and `/athkar style` changes nothing there. Sky is desktop only; `athkarStyle` applies to the desktop app. The shared main color applies on both. See the [terminal guide](../terminal.md#athkar-in-the-terminal).

On desktop the athan card uses the same shared card and open size as the athkar band, and takes its place while it shows. The band returns with the reading kept when the athan closes or expires. Terminal behavior is unchanged.

Not settable: the font and the text size. The mod API sets neither.

## Demo

`/athkar demo` uses the current desktop style, or Frame in the terminal.
`/athkar demo sky` is desktop only; the terminal replies that Sky is desktop
only. `/athkar demo frame` plays on either surface. Both tell the same
six-scene story in 24.2 seconds:

| Scene | Authored thikr | Length | Sky | Frame color |
| --- | --- | --- | --- | --- |
| Ayat al-Kursi, with «آية الكرسي · البقرة ٢٥٥» | 75 | 5s | dawn | orange |
| A short line: «حَسْبِيَ اللَّهُ…» | 83 | 4s | sunrise | green |
| A long dua: «اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ…» | 84 | 5s | day | gold |
| The last thikr: «اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ» | 98 | 4s | rose | blue |
| Celebration: the real finale | finished | 3.2s | bluehour | orange |
| Finished, folded to one line | finished | 3s | crescent | green |

Reading scenes use the authored repetition counts and real list positions.
The demo skips ahead in a disposable reading, completing preceding items
there only; the pill counts down and the overall progress glow moves. Id 98
counts from 0 to 10 in 3 seconds, then holds the completed reading for 1 second.
Desktop celebrates with falling stars and the rising dua for the real
`FINALE_MS`; the terminal shows its own open done row, then folded done row.

Another demo command restarts playback. Input, including ×, has no handler
and cannot change the real reading. The demo has its own Client key and
render hook; it shows even when athkar is hidden, done or switched off. The
desktop athan card still takes precedence. The demo never writes settings,
the store or state, and never changes the real band's view or timers. When
it ends, the real band redraws from its own unchanged logic. Pure scenes live
in `src/features/athkar/demo.ts`; marked demo blocks in `install.tsx` hold the
runner and separate drawing path.

## Design

Looks, size, folding, the finale and the reader's visual means: [athkar-design.md](athkar-design.md).
