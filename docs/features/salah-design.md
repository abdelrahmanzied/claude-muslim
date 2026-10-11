# Salah — design

The salah feature's own design. It adds to the shared base in [DESIGN.md](../../DESIGN.md) and never contradicts it. What the feature does is in [salah.md](salah.md).

## Visual means

- **Text by default.** The prayer line, the setup line, the review form and command replies are text in Claude's font, size and theme colors (`color="claude"` for the accent, `dimColor` for hints).
- **The adhan moment is a short text look.** When a prayer comes in, a band above the prompt plays once (about 3 seconds), then rests as the prayer line `حان وقت صلاة …`. In the terminal, and on the desktop for now, it is a Unicode minaret rising row by row from the base (about 330 ms a row, `color="claude"` for the crescent and the point, `dimColor` for the rest) beside «حان وقت صلاة العصر»:

  ```
     ☾
     ▲
    ┌┴┐
    │▒│
    ├─┤
    │▒│
   ▐███▌
  ```

  The seven rows keep their height while it rises, it shows once per prayer (state `salahAdhanShown`), never during a survey, and `salahAdhan` off drops it.
- **Desktop popup: planned, not built.** A card with a photo background (V9), top-right, 320×80, Arabic digits, to replace the minaret on the desktop. Picked: photo kaaba-2 (full photo 2: twin minarets and the Kaaba from above, `background-position` 50% 28%), with «حان وقت صلاة العصر» in the Aref Ruqaa font. Open question: the colour of the 2px progress bar at the card's bottom (the mock used a fixed gold #d9b25f) is undecided. Pending the photo's licence and a live test of a JPEG inside `Svg`; until then the desktop shows the same text minaret.

**Why:** prayer time is a few moments a day and worth marking; the rest of the day salah stays a quiet line.

## Surfaces

Rows stack, never compete: each feature's AbovePrompt hook keeps what `next(e)` returns and adds its own row above it (setup or review rows, thikr's usage-limit row, the prayer row). While the minaret plays it takes the prayer row's place.

| Moment | Surface | Shows |
| --- | --- | --- |
| No city yet | AbovePrompt band | One line: the guessed city, **Yes**, **Another city**, **Not now** |
| City saved, or `/salah adjust` | AbovePrompt band | Today's times, − and + per prayer, **Save**, **Skip** |
| All day (mode `always`) | AbovePrompt band, own row, right-aligned | `☾ العصر ١٥:٥٩`; empty in `reminder` mode |
| Reminder window (`salahReminder`, 20 min by default) | AbovePrompt band, same row | `☾ العصر ١٩:٤٢`, a live mm:ss countdown, once a second |
| Reminder starts | Toast (in-app) | One short line, closes by itself |
| Prayer comes in | AbovePrompt band, once (~3 s), then the prayer row | The rising minaret takes the prayer row's place beside `حان وقت صلاة العصر`, then the row returns and keeps it for 15 minutes (`salahAdhan`) |
| Claude works in the window | Spinner (thikr line) | حَيَّ عَلَى الصَّلَاةِ joins the thikr rotation |
| Settings and help | Command reply | `/salah`, `/salah help` table, `/muslim help` |

## Picks

What the user chose from the Adhan Lab:

| Part | Pick |
| --- | --- |
| Placement | P4a: the prayer line is its own row in the AbovePrompt band, right-aligned, `color="claude"`, terminal and desktop alike; no status line |
| Digits | Arabic-Indic |
| Toast | A: «صلاة العصر بعد ٢٠ دقيقة» |
| Countdown | B: live `mm:ss` in the prayer row inside the reminder window, `☾ العصر ١٩:٤٢` |
| Thikr | C: the first phrase of a thikr turn inside the window is «حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د» ([thikr.md](thikr.md#before-a-prayer)) |
| Terminal adhan moment | D: the rising text minaret above |
| Desktop popup | V9: photo-background card (kaaba-2, Aref Ruqaa), top-right, 320×80, Arabic digits. Planned, pending the photo's licence and a live test of a JPEG inside `Svg` |

## Never

- **No OS notification.** Banners show in meetings and screen shares; reminders stay inside Claude Code (prayer row and toast).
- **No sound** unless a later setting asks for it.
- **No location service or IP lookup.** The city comes from the time zone or what the user types.

## Text

- Prayer names in Arabic in lines (الفجر، الظهر، العصر، المغرب، العشاء), in English in commands (Fajr, Dhuhr, Asr, Maghrib, Isha).
- حان وقت صلاة … and حَيَّ عَلَى الصَّلَاةِ are authored text with tashkeel, never generated.
- Digits: Arabic-Indic (`١٥:٥٩`, `١٩:٤٢`).
- Countdown: `mm:ss` in Arabic digits inside the reminder window, redrawn each second only there (30 s outside). The toast keeps minutes in words.
- Minutes in words: دقيقة، دقيقتين، ٣ دقائق، ١١ دقيقة.

## Checklist for a change

- [ ] Every richer look has a terminal text fallback, tested on `terminal` and `desktop`.
- [ ] No OS notification, no sound, no network.
- [ ] Colors are theme keys where text is used.
- [ ] The moment plays once and clears itself (see DESIGN.md, Time-based behavior).
