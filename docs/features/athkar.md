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
| `athkarColor` | `/athkar color orange` · `green` · `gold` · `blue` | orange |

`/athkar morning reset` · `/athkar evening reset` start that period again. `/athkar` shows the status and help.

Not settable: the font and the text size. The mod API sets neither.

## Design

Looks, size, folding, the finale and the reader's visual means: [athkar-design.md](athkar-design.md).
