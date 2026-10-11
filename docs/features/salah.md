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
3. **Every day.** What the prayer line (plain text in the prompt footer's mode labels, before the model name) shows depends on the mode (`salah`):
   - `always`: the next prayer all day, `☾ العصر ١٥:٥٩`; in the reminder window
     before it (20 minutes by default), a live mm:ss countdown, `☾ العصر ١٩:٤٢`,
     updated every second; for 15 minutes once it is in, `حان وقت صلاة العصر`.
   - `reminder` (default): empty outside the reminder window; the countdown
     inside it; `حان وقت صلاة …` for 15 minutes, then empty again.
   - `off`: nothing, and the line is cleared.
   - When a prayer comes in and `salahAthan` is on, a small Unicode minaret rises row by row above the prompt for about 3 seconds beside «حان وقت صلاة العصر», then the minaret goes and the prayer line keeps the call for 15 minutes. It plays once per prayer, never during a survey, and not for a prayer first seen more than 2 minutes late (a late start or reload). The same text art on terminal and desktop.
   - `salahAthan` off drops the minaret and the `حان وقت` line: the line goes straight back to the
     next prayer (`always`) or to empty (`reminder`).
   - The prayer line redraws every 30 seconds, and every second only while inside the reminder window (the live countdown); it goes back to 30 seconds when the window ends. A timer set for the exact moment the window opens starts the countdown on time, not on the next 30 s tick.
   - Sunrise is in today's times only: no countdown and no reminder for it.
   - While inside the window, salah also publishes it for the [thikr line](thikr.md#before-a-prayer), which opens its turns with حَيَّ عَلَى الصَّلَاةِ.
   - One in-app toast when the window starts for each prayer (`always` and `reminder`, not `off`): «صلاة العصر بعد ٢٠ دقيقة». No OS notification.

## Calculation

- **Method:** the official Sunni authority of the place's country
  (`methods.ts`: Egypt, Umm al-Qura for Saudi Arabia, Bahrain and Oman, …),
  else Muslim World League. A country whose official method is not Sunni gets
  Muslim World League. `/salah method` picks another.
- **Asr:** the majority (shadow equals the object).
- **Ramadan:** Umm al-Qura's Isha is 120 minutes after Maghrib.
- **High latitudes:** the library's recommended rule (seventh of the night above 48°).
- **Minutes:** the user's own per prayer, up to an hour either way.

## Data

| File | What | Source |
| --- | --- | --- |
| `zones.ts` | time zone → country and city coordinates | tzdb 2026e `zone.tab`, public domain |
| `methods.ts` | angles, minutes, country → method | athan library (MIT), public methods list |
| `athan/` | the calculation | vendored library 4.4.6, MIT |

## Commands

`/salah` shows place · method · mode, today's times and a hint to `/salah help`.
`/salah help` is a table of every subcommand: `always` · `reminder` · `off`,
`reminder <5-60>`, `athan on` · `off`, `city` (the setup question) and
`city <name or lat, lng>`, `method <auto or name>`, `adjust` and
`adjust <prayer> <±min>`. An unknown word answers with the table.
`/muslim help` shows the tables of thikr and salah; `/muslim help salah` only salah's.

## Settings

| Field | Command | Default |
| --- | --- | --- |
| `salah` | `/salah always` · `reminder` · `off` | reminder |
| `salahReminder` | `/salah reminder <5-60>` | 20 (minutes) |
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
| `today.ts` | today's line for `/salah` and the method in effect |

Shared with thikr, in `src/shared/pray/`: `names.ts` (prayer names in English and Arabic, the `Prayer` type) and `line.ts` (the prayer line, countdown, reminder text, Arabic digits). Neither feature imports the other's folder.

## To verify live

- The minaret's box-drawing and block characters (`┌┴┐ ├─┤ ▐███▌ ▒`) in the common terminal fonts, and the band's height (7 rows) in a short terminal.
- The prayer line's place and Arabic direction in the footer's mode labels (`SessionMode`, before the model name), in the terminal and the desktop app, stacked with the setup row and thikr's usage-limit row.
- The setup line and review form in a narrow terminal and the desktop app.
- `Intl` time zones inside the hooks runtime (falls back to the runtime's local time).
