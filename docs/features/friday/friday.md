# Friday

What changes on Friday: the Dhuhr slot is named Jumu'ah, the thikr line shows salawat on the Prophet ﷺ, and a card reminds you of Surat al-Kahf. Friday is the device's local day, whatever the saved city's time zone.

## Jumu'ah name

On a device Friday the Dhuhr slot is called «الجمعة» (English «Jumu'ah») in every place a prayer name shows: the prayer line under the prompt, the athan card and its text, the salah times table and review, the Muslim pane's prayer card and the thikr call. The time is still Dhuhr's. Other days, and every other prayer, keep their names. The name comes from one lookup in `plugin/src/shared/pray/names.ts`, which takes the prayer and its time.

## Friday salawat

From Fajr on a Friday the thikr line shows the salawat phrases (the same authored ones as `/thikr mode salawat`, one for the whole turn, the next on the next turn). With no saved city the whole Friday counts. `/friday salawat on | off` switches it (default on). The phrases are listed in [thikr content](../thikr/thikr-content.md); Friday adds no text of its own here.

## Al-Kahf reminder

A card above the prompt: the title «سورة الكهف» and, under it, «يوم الجمعة · بصوت <reciter>», the reciter being the one last used in the Quran player (`quran.reciter`), named as the Quran player names it (short Arabic name). Until the Quran player is ready the subtitle is only «يوم الجمعة».

- **When:** on a Friday, from 30 minutes after Dhuhr (Jumu'ah) until Maghrib, in the saved city's times. The 30 minutes are fixed, not a setting. It needs a saved city (`/salah city`); without one there is no window and nothing shows by itself.
- **Once per Friday, across sessions:** the first session open inside the window shows it. A session opened in the morning shows nothing. The day it showed is kept in the shared store (`friday.kahfDay`), written read-merge-write as the athkar progress is, so a second session never shows it again that day.
- **Waits for a free slot:** if the athan card or minaret, or the athkar band (open, not folded) is showing, the reminder waits and shows when it closes, still inside the window. A card that ends after Maghrib is not shown.
- **Stays 3 minutes,** then hides by itself. × closes it earlier.
- **Desktop:** the card shows the Quran avatar (the Muslim pane's own, moving as it does while playing, and still when reduced motion is asked for), a pill and ×. On macOS the pill reads «▶ استمع» and plays Surat al-Kahf (surah 18) in the Quran player with the reciter last used. On Windows and Linux, where Claude Code plays no audio, it reads «↗ افتح في المتصفح» and opens the whole surah 18 MP3 of that reciter (no segment, https only) in the default browser, as the Quran card's «استمع في المتصفح» does; if the browser does not open, the Quran player's toast shows. The card closes after the press. Enter or Space presses the pill too.
- **Terminal:** one line above the prompt with the same words («سورة الكهف · يوم الجمعة · بصوت <reciter>»), window, 3 minutes, once-per-Friday rule and wait for other cards; there is no play button (the Quran player is desktop only). It closes early by pressing its × button (a click, as every terminal button); otherwise it hides by itself after 3 minutes.
- `/friday kahf on | off` switches the automatic reminder only (default on).
- `/friday kahf` alone shows the card now, on any day and at any time. On a Friday it counts as that day's showing.
- **No saved city:** there is no window, so nothing shows by itself, and no time is guessed. `/friday` says so («The automatic Al-Kahf reminder needs a city: set one with `/salah city`»); `/friday kahf` keeps working.

## Desktop and terminal

Every behaviour is on both surfaces and each is tested on both (`plugin/tests/friday/`, `plugin/tests/thikr/friday.test.tsx`).

| Piece | Desktop | Terminal |
| --- | --- | --- |
| Jumu'ah name | Athan card, pane prayer card and rows | Prayer line, athan text, `/salah` table, review form, thikr call, the pane's text fallback |
| Salawat in the thikr line | the phrase as authored, with tashkeel | the same phrase, tashkeel as the terminal setting says |
| Al-Kahf reminder | card: avatar, «▶ استمع» (macOS) or «↗ افتح في المتصفح» (Windows, Linux) and × | text line «سورة الكهف · يوم الجمعة · بصوت <reciter>» with ×; no pill |
| Window, 3 minutes, once per Friday, waits for other cards | same | same |
| `/friday`, `/friday salawat`, `/friday kahf` | same replies | same replies; `/friday kahf` says nothing of ▶ |
| Settings | Muslim pane «الجمعة» tab | `/muslim` text lines (`Friday · salawat`, `Friday · Al-Kahf reminder`) |
| Quran Friday shortcut | «سورة الكهف» button (plays on macOS, opens the browser on Windows and Linux) | none: the Quran player is desktop only |

The differences that remain are only what the surface cannot do: no ▶ and no Quran button on the terminal.

## Seeing it on a day that is not Friday

`/friday kahf` shows the card now (desktop and terminal), `/friday demo` plays everything Friday shows for 8 seconds, `/friday` shows the day and the settings, and the Muslim pane's «الجمعة» tab (desktop) or `/muslim` (terminal) shows both switches. The Jumu'ah name, the salawat phrases and the Quran button follow the device's real Friday.

## Quran card shortcut

On a Friday the Muslim pane's Quran card adds a full-width «سورة الكهف» button under its controls (and under the audio note when that shows). It picks surah 18 like the surah list does on macOS; on Windows and Linux it opens the surah in the browser like the card's pill. See [muslim-pane design](../muslim-pane/muslim-pane-design.md).

## Settings

| Setting | `/config` key | Command | Default |
| --- | --- | --- | --- |
| Friday salawat | `fridaySalawat` | `/friday salawat on \| off` | on |
| Al-Kahf reminder | `fridayKahf` | `/friday kahf on \| off` | on |

The Muslim pane's «الجمعة» settings tab has both switches.

## Commands

`/friday` (the day, both settings and whether the reminder showed today), `/friday help`, `/friday salawat on | off`, `/friday kahf [on | off]`, `/friday demo`. The table is `plugin/src/features/friday/help.ts`.

## Demo

`/friday demo` shows, for 8 seconds on any day and on both surfaces: the Al-Kahf card (its pill closes the demo instead of playing or opening a browser), the pray line with «الجمعة» in place of «الظهر» (the real pray-line code on a fixed Friday 12:30), one Friday salawat as a thikr line (the first of the shared authored list) and the pane's «سورة الكهف» button (a text row on both surfaces). It never touches settings, the store or saved state. It is the fourth step of the shared `/muslim demo` (thikr, athkar, salah, **friday**, pane tour).

## Code

- `plugin/src/shared/friday/` (pure): the Friday test, the day key, the salawat window, the surah number, shared with thikr and the pane.
- `plugin/src/shared/card/slot.ts`: which cards above the prompt are drawn (athkar marks its open band), so the reminder can wait.
- `plugin/src/features/friday/`: `logic.ts` (the window and the decision), `card.ts(x)` (the desktop card), `help.ts`, `demo.ts`, `install.tsx` (the command, the timer, the draw, the store claim).
