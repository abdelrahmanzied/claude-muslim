# Salah — prayer times

Prayer times for the user's city, calculated on their machine with
[adhan-js](../../src/features/salah/adhan/VENDOR.md). No location service and no prayer-times API.

## Flow

1. **First prompt after install.** Until a place is saved, one line above the
   prompt offers the city named by the system's time zone (`Europe/Berlin`
   gives Berlin, Germany): **Yes**, **Another city**, **Not now**.
   - *Another city* opens Claude Code's question dialog; the user types any
     city in any language, or `latitude, longitude`, under Other.
   - Claude (haiku) reads the typed name into English name, country,
     coordinates and time zone as JSON; each field is checked before saving.
     A shared name (Alexandria) asks which one.
   - *Not now* puts setup off for good; `/salah setup` brings it back.
   - No guess (time zone UTC): **Pick city**, **Not now**.
2. **Review.** Saving the place shows today's times above the prompt, one row
   per prayer with − and +. The user matches them to their mosque and saves the
   minutes, or skips.
3. **Every day.** The status line shows the next prayer: `☾ العصر ١٥:٥٩`; in
   the 20 minutes before it, `☾ العصر بعد ٢٠ دقيقة`; for 15 minutes once it is
   in, `حان وقت صلاة العصر`. One notification 20 minutes before each prayer and
   before sunrise.

## Calculation

- **Method:** the official Sunni authority of the place's country
  (`methods.ts`: Egypt, Umm al-Qura for Saudi Arabia, Bahrain and Oman, …),
  else Muslim World League. A country whose official method is not Sunni gets
  Muslim World League. `/salah method` picks another.
- **Asr:** the majority (shadow equals the object).
- **Ramadan:** Umm al-Qura's Isha is 120 minutes after Maghrib.
- **High latitudes:** adhan's recommended rule (seventh of the night above 48°).
- **Minutes:** the user's own per prayer, up to an hour either way.

## Data

| File | What | Source |
| --- | --- | --- |
| `zones.ts` | time zone → country and city coordinates | tzdb 2026e `zone.tab`, public domain |
| `methods.ts` | angles, minutes, country → method | adhan-js (MIT), AlAdhan methods list |
| `adhan/` | the calculation | adhan-js 4.4.6, MIT |

## Settings

| Field | Command | Default |
| --- | --- | --- |
| `salah` | `/salah on` · `off` | on |
| `salahNotify` | `/salah notify on` · `off` | on |
| `salahPlace` | `/salah setup` · `/salah city <name>` | empty |
| `salahMethod` | `/salah method <name>` | auto |
| `salahAdjust` | `/salah adjust` · `/salah adjust <prayer> <±min>` | `0 0 0 0 0 0` |


## Design

- **Status line and bands are text**, in Claude's font, size and theme colors.
- **The adhan moment's look is open.** Animation and art (a minaret, mosque or crescent), drawn richer on desktop only with a terminal text fallback, are being chosen in a design lab. Until decided, the moment stays text.

## Files

| File | Holds |
| --- | --- |
| `install.tsx` | hooks: `/salah`, setup line, review form, status line |
| `times.ts` | a day's times, next and last prayer |
| `clock.ts` | local time and Hijri month in a time zone |
| `location.ts` | the guess from the system's time zone |
| `city.ts` | Claude's prompt for a typed city and the checks on its reply |
| `place.ts` | the saved place's one-setting format |
| `review.ts` | the review form's rows |
| `line.ts` | the status line and notification text |
| `names.ts` | prayer names in English and Arabic |
| `today.ts` | today's line for `/salah` and the method in effect |

## To verify live

- The status line's Arabic direction next to Claude's own items.
- The setup line and review form in a narrow terminal and the desktop app.
- `Intl` time zones inside the hooks runtime (falls back to the runtime's local time).
