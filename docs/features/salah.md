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
   - When a prayer comes in and `salahAthan` is on, the athan moment shows once per prayer, never during a survey, and not for a prayer first seen more than 15 minutes late (the same window the footer keeps «حان وقت»; a late tick or a reload still shows it, once). A moment that starts late still ends 15 minutes after the prayer's time. If the footer shows the call while the moment has not started, the footer's draw asks for a tick at once. It has three stages:
     1. **Show:** desktop opens the lit shared card over the Haram photo, with the call and time in Arabic digits; terminal plays the rising Unicode minaret (~3 seconds).
     2. **Fold:** after 1 minute (`FOLD_MS`), desktop uses the shared folded row (24px content height, the same as athkar): call and time on one line over the photo, shared × on the left. Pressing anywhere except × reopens it with the athkar band's shared rest rules: leave folds after 1 second, enter cancels that wait, keys with the pointer off fold 3 seconds after the last key, and no input folds after 90 seconds. A focus move elsewhere in `AbovePrompt` (`plugin` other than `muslim`) folds immediately unless it arrives within 600 ms of a pointer press on the card. Reopening and later input renew the 90-second `foldsAt` deadline. These rules also apply once the pointer has entered the initially open card; an untouched first appearance still folds after 1 minute. The folded state is persisted through the existing atom. Terminal folds as soon as the rise finishes to one row above the prompt: `☾`, the call through the shared terminal Arabic path in the main color, and a × Button at the end; it stays folded.
     3. **Close:** × closes the moment at any stage on either surface; otherwise both disappear 15 minutes after the original start (`CARD_MS`). Reopening never extends that deadline. Neither closing nor expiry announces the same prayer again.
   - The fold state, rise start and end deadlines live in `$.state`; a reload resumes the correct open, folded or gone stage and re-arms only the remaining timers. The desktop athkar band stays hidden for both open and folded stages and returns with its reading kept after close or expiry. The footer independently keeps the call for 15 minutes, unchanged by ×.
   - `salahAthan` off drops the minaret, the card and the `حان وقت` line: the line goes straight back to the
     next prayer (`always`) or to empty (minutes).
   - The prayer line redraws every 30 seconds, and every second only while inside the countdown window (the live countdown); it goes back to 30 seconds when the window ends. A timer set for the exact moment the window opens starts the countdown on time, not on the next 30 s tick. The timer starts on every module load (the first draw of the footer or the band, and a redraw asked at session start), so it re-arms after `/salah show off` then `/salah show 60`.
   - The footer works out the line from the clock and the settings each time it is drawn, so a setting change shows at once; the timer only asks for redraws.
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
`/salah help` is a table of every subcommand: `show always` · `<minutes>` · `off`, `athan on` · `off`, `demo` (fixed Fajr at 05:00, with no city or calculation; desktop open 5 s then folded 3 s; terminal rises 3.01 s then folded 3 s; real state, settings and store are untouched), `city` (the setup question) and
`city <name or lat, lng>`, `method <auto or name>`, `adjust` and
`adjust <prayer> <±min>` (any whole number of minutes, such as `+90` or `-120`; missing or malformed minutes are an error). An unknown word answers with the table.
`/muslim help` shows the tables of thikr and salah; `/muslim help salah` only salah's.

Replies are short markdown: a bold title line first (`**Muslim › Salah**`, `**Show:** …`, `**Athan:** on`), then any heading or table. The engine prefixes a reply's first line with `muslim: `, so a table or heading on that line would not render. `/salah show` with no value shows the current one and how to change it; a value outside `always`, `off` or 1–720 answers with the accepted forms. Old saved values (`salah` on/off/always, `salahReminder` minutes) carry over to `salahShow`.

### Rules behind the line

- No `$.state` write while drawing: the engine refuses it. Clearing the line (show `off`, no place) is deferred to the next clock tick.
- The footer computes the line from the clock and the settings at draw time, never from a value saved earlier, so `show off` hides it, `show 20` far from a pray empties it, and `show always` after `off` brings it back, all at once.

## Demo

`/salah demo` replies `**Salah demo:** athan · Fajr 05:00` and always previews «الفجر» at 05:00, formatted by the real `clockText` function. It does not read a city, method or calculated prayer time. Disposable module-local card and minaret values have their own redraw timers. One selector per existing render path chooses the demo while it is active; the same `athan-card.tsx` and minaret builders draw it. Desktop: open 5 seconds, folded 3 seconds; terminal: rise 3.01 seconds, folded 3 seconds. Expiry or × discards only the demo, revealing any real athan with its state and timers untouched. Demo input cannot change the real card. The shared `/muslim demo` starts this same runner, which then reports its end when the moment closes or expires, through a transient signal connected in a demo-only command hook; it needs no city either.

## Settings

Main-color accents follow the plugin-wide `/muslim color orange | green | gold | blue` setting through `src/shared/color/`, default Claude orange. Other colors stay as they are.

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
| `demo.ts` | pure demo path: fixed Fajr, real `clockText` formatting at 05:00, reply and short deadlines |
| `help.ts` | the `/salah help` table (also in `/muslim help`) |
| `times.ts` | a day's times, next (with and without sunrise) and last prayer |
| `clock.ts` | local time and Hijri month in a time zone |
| `location.ts` | the guess from the system's time zone |
| `city.ts` | Claude's prompt for a typed city and the checks on its reply |
| `place.ts` | the saved place's one-setting format |
| `review.ts` | the review form's rows |
| `minaret.ts` | the minaret's rows, frame timing and when it is due |
| `card.ts`, `athan-card.tsx` | desktop athan content and Client, using the shared card in `src/shared/card/` around a photo in `assets/`, with the embedded font in `card-font.ts` |
| `today.ts` | the times and settings tables for `/salah`, and the method in effect |

Shared with thikr, in `src/shared/pray/`: `names.ts` (prayer names in English and Arabic, the `Prayer` type) and `line.ts` (the prayer line, countdown, Arabic digits). Neither feature imports the other's folder.

The desktop athan uses the same shared card and open size as the athkar band. Only one card shows at a time: the athan takes the band's place until closed or expired, then the band returns with the reading kept. The terminal reader and minaret are unchanged.

## To verify live

- The minaret's box-drawing and block characters (`┌┴┐ ├─┤ ▐███▌ ▒`) in the common terminal fonts, and the band's height (7 rows) in a short terminal.
- The prayer line's place and Arabic direction in the footer's mode labels (`SessionMode`, before the model name), in the terminal and the desktop app, stacked with the setup row and thikr's usage-limit row.
- The setup line and review form in a narrow terminal and the desktop app.
- `Intl` time zones inside the hooks runtime (falls back to the runtime's local time).

Terminal checklist (each reply opens with its title, tables render):

| Run | Expect |
| --- | --- |
| `/salah` | title, today's times table (next pray bold), settings table, help hint |
| `/salah help` | table of every command |
| `/salah show` | the current value and how to change it |
| `/salah show always` | `☾ <pray> <HH:MM>` in the footer at once |
| `/salah show 20` far from a pray | the line disappears at once |
| `/salah show 600` | the line shows, counting down |
| `/salah show off`, then `show always` | hides, then comes back at once |
| `/salah show 0` · `show abc` | the accepted forms, nothing changed |
| `/salah demo` | fixed Fajr at 05:00 without a city; desktop 5 s open + 3 s folded, terminal 3.01 s rise + 3 s folded; no real state, settings or store changes |
| `/salah athan off` · `on` | `**Athan:** off` · `on` |
| `/salah adjust` · `adjust asr +5` | the review form · `**Adjust:** Asr +5 min` |
| `/salah method auto` | `**Method:** auto (…)` |
| `/salah city <name>` | `**City:** …` and today's times above the prompt |
| `/salah reminder` (old word) | the help table |

## Muslim pane

The [Muslim pane](muslim-pane.md) shows this feature on its own card. This feature connects what that card shows (and what its buttons ask of it) through `src/shared/panel/signal.ts`; see the pane spec for the table.


### Muslim pane settings connector

Salah connects `salah-city` during Muslim pane input. It runs the same `askCity`, resolution, `savePlace` and review path as `/salah city`, using the current press context; config denials show a toast.
