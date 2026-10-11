# Salah — prayer times

Prayer times for the user's city, calculated on their machine with
[athan library](../../src/features/salah/athan/VENDOR.md) (from [adhan-js](https://github.com/batoulapps/adhan-js)). No location service and no prayer-times API.

## Flow

1. **First prompt after install.** Until a place is saved, one line above the
   prompt offers the city named by the system's time zone (`Europe/Berlin`
   gives Berlin, Germany): **Yes**, **Another city**, **Not now**.
   - *Another city* opens Claude Code's question dialog; the user types any
     city in any language, or `latitude, longitude`, under Other.
   - Claude (haiku) reads the typed name into English name, country,
     coordinates and time zone as JSON; each field is checked before saving.
     A shared name (Alexandria) asks which one.
   - *Not now* puts setup off for good; `/salah city` brings it back.
   - No guess (time zone UTC): **Pick city**, **Not now**.
2. **Review.** Saving the place shows today's times above the prompt, one row
   per prayer with − and +. The user matches them to their mosque and saves the
   minutes, or skips.
3. **Every day.** What the prayer line (plain text in the prompt footer's mode labels, before the model name) shows depends on `salahShow` (`/salah show`):
   - `always`: the next prayer all day, `☾ العصر ١٥:٥٩`; in its last 20 minutes
     a live mm:ss countdown, `☾ العصر ١٩:٤٢`,
     updated every second; for 15 minutes once it is in, `حان وقت صلاة العصر`.
   - minutes (default 20, any whole number from 1 to 720): empty until that many minutes before a prayer, then the countdown; `حان وقت صلاة …` for 15 minutes, then empty again.
   - `off`: nothing, and the line is cleared.
   - When a prayer comes in and `salahAthan` is on, the athan moment shows once per prayer, never during a survey, and not for a prayer first seen more than 2 minutes late (a late start or reload). In the terminal a small Unicode minaret rises row by row above the prompt for about 3 seconds beside «حان وقت صلاة العصر»; the minaret is terminal only. On the desktop a full-width card with a photo of the Haram sits above the prompt with «حان وقت صلاة المغرب» and the time in Arabic digits, and a × at its top left; it appears at once in an isolated view and stays until the user closes it or the call's 15 minutes end. The prayer line keeps the call for 15 minutes either way.
   - `salahAthan` off drops the minaret, the card and the `حان وقت` line: the line goes straight back to the
     next prayer (`always`) or to empty (minutes).
   - The prayer line redraws every 30 seconds, and every second only while inside the countdown window (the live countdown); it goes back to 30 seconds when the window ends. A timer set for the exact moment the window opens starts the countdown on time, not on the next 30 s tick. The timer starts on every module load (the first draw of the footer or the band, and a redraw asked at session start), so it re-arms after `/salah show off` then `/salah show 60`.
   - Sunrise is in today's times only: no countdown for it.
   - While inside the window, salah also publishes it for the [thikr line](thikr.md#before-a-prayer), which opens its turns with حَيَّ عَلَى الصَّلَاةِ.
   - No toast when the window starts: the footer line is the only notice. No OS notification.

## Calculation

- **Method:** the official Sunni authority of the place's country
  (`methods.ts`: Egypt, Umm al-Qura for Saudi Arabia, Bahrain and Oman, …),
  else Muslim World League. A country whose official method is not Sunni gets
  Muslim World League. `/salah method` picks another.
- **Asr:** the majority (shadow equals the object).
- **Ramadan:** Umm al-Qura's Isha is 120 minutes after Maghrib.
- **High latitudes:** the library's recommended rule (seventh of the night above 48°).
- **Minutes:** the user's own per prayer, any whole number in either direction. Unreadable config values are 0.

## Data

| File | What | Source |
| --- | --- | --- |
| `zones.ts` | time zone → country and city coordinates | tzdb 2026e `zone.tab`, public domain |
| `methods.ts` | angles, minutes, country → method | athan library (MIT), public methods list |
| `athan/` | the calculation | vendored library 4.4.6, MIT |

## Commands

`/salah` shows a title, then two tables under their own headings: today's times (the next prayer marked, a moved prayer with its minutes), then the settings (city, method, show, athan, adjust), each with the command that changes it, and a hint to `/salah help`.
`/salah help` is a table of every subcommand: `show always` · `<minutes>` · `off`, `athan on` · `off`, `athan test` (plays the athan moment now for the next prayer, changes nothing; shows the card on the desktop and the minaret in the terminal), `city` (the setup question) and
`city <name or lat, lng>`, `method <auto or name>`, `adjust` and
`adjust <prayer> <±min>` (any whole number of minutes, such as `+90` or `-120`; missing or malformed minutes are an error). An unknown word answers with the table.
`/muslim help` shows the tables of thikr and salah; `/muslim help salah` only salah's.

## Settings

Terminal Arabic: the footer line and the minaret label follow the shared per-terminal setting (`/muslim terminal-arabic`, see the [terminal guide](../terminal.md)). The desktop footer and athan card keep logical text.

| Field | Command | Default |
| --- | --- | --- |
| `salahShow` | `/salah show always` · `<minutes>` · `off` | 20 (minutes) |
| `salahAthan` | `/salah athan on` · `off` (the minaret and the `حان وقت` line) | on |
| `salahPlace` | `/salah city` (question) · `/salah city <name or lat, lng>` | empty |
| `salahMethod` | `/salah method <name>` | auto |
| `salahAdjust` | `/salah adjust` · `/salah adjust <prayer> <±min>` | `0 0 0 0 0 0` |

## Design

Surfaces, the athan moment's look and what salah never does: [salah-design.md](salah-design.md).

## Files

| File | Holds |
| --- | --- |
| `install.tsx` | hooks: `/salah`, setup line, review form, prayer line |
| `help.ts` | the `/salah help` table (also in `/muslim help`) |
| `times.ts` | a day's times, next (with and without sunrise) and last prayer |
| `clock.ts` | local time and Hijri month in a time zone |
| `location.ts` | the guess from the system's time zone |
| `city.ts` | Claude's prompt for a typed city and the checks on its reply |
| `place.ts` | the saved place's one-setting format |
| `review.ts` | the review form's rows |
| `minaret.ts` | the minaret's rows, frame timing and when it is due |
| `card.ts` | the desktop athan card (Svg markup around a photo in `assets/`, with the embedded font in `card-font.ts`) |
| `today.ts` | the times and settings tables for `/salah`, and the method in effect |

Shared with thikr, in `src/shared/pray/`: `names.ts` (prayer names in English and Arabic, the `Prayer` type) and `line.ts` (the prayer line, countdown, Arabic digits). Neither feature imports the other's folder.

## To verify live

- The minaret's box-drawing and block characters (`┌┴┐ ├─┤ ▐███▌ ▒`) in the common terminal fonts, and the band's height (7 rows) in a short terminal.
- The prayer line's place and Arabic direction in the footer's mode labels (`SessionMode`, before the model name), in the terminal and the desktop app, stacked with the setup row and thikr's usage-limit row.
- The setup line and review form in a narrow terminal and the desktop app.
- `Intl` time zones inside the hooks runtime (falls back to the runtime's local time).
