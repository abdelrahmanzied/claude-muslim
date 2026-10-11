# Salah — design

The salah feature's own design. It adds to the shared base in [DESIGN.md](../../DESIGN.md) and never contradicts it. What the feature does is in [salah.md](salah.md).

## Visual means

- **Text by default.** The prayer line, the setup line, the review form and command replies are text in Claude's font, size and theme colors (`color="claude"` for the accent, `dimColor` for hints).
- **The athan moment is a short text look.** When a prayer comes in, a band above the prompt plays once (about 3 seconds), then rests as the prayer line `حان وقت صلاة …`. In the terminal, and on the desktop for now, it is a Unicode minaret rising row by row from the base (about 330 ms a row, `color="claude"` for the crescent and the point, `dimColor` for the rest) beside «حان وقت صلاة العصر»:

  ```
     ☾
     ▲
    ┌┴┐
    │▒│
    ├─┤
    │▒│
   ▐███▌
  ```

  The seven rows keep their height while it rises, it shows once per prayer (state `salahAthanShown`), never during a survey, and `salahAthan` off drops it.
- **Test path.** `/salah athan test` plays the athan moment on demand for the next prayer, without changing settings or marking it shown. On the desktop it also draws a small test card (a photo behind the call, a thin shrinking bar), the live check that a photo can sit inside a vector drawing there; it is a test, not the final desktop look.
- **Desktop popup: planned, not built.** A card at the top right of the desktop with a photo of the Haram behind the text, to replace the minaret there. It shows «حان وقت صلاة العصر» and the time «العصر · ١٥:٥٩» in one calligraphic font and one colour, with Arabic digits. A thin bar in Claude's accent colour runs down along the bottom while the card shows, then the card closes by itself. Pending a live test that a photo shows inside `Svg` on desktop; until then the desktop shows the same text minaret, and the terminal always keeps the rising text minaret.

**Why:** prayer time is a few moments a day and worth marking; the rest of the day salah stays a quiet line.

## Surfaces

Rows stack, never compete: each feature's AbovePrompt hook keeps what `next(e)` returns and adds its own row above it (setup or review rows, thikr's usage-limit row, the minaret moment). The prayer line is not a band row: it is plain text in the `SessionMode` labels at the right of the prompt footer, before the model name; the hook keeps what `next(e)` returns and adds the line beside it.

| Moment | Surface | Shows |
| --- | --- | --- |
| No city yet | AbovePrompt band | One line: the guessed city, **Yes**, **Another city**, **Not now** |
| City saved, or `/salah adjust` | AbovePrompt band | Today's times, − and + per prayer, **Save**, **Skip** |
| All day (mode `always`) | SessionMode (footer, before the model), `color="claude"`, no card | `☾ العصر ١٥:٥٩`; empty in `reminder` mode |
| Reminder window (`salahReminder`, 20 min by default) | SessionMode, same text | `☾ العصر ١٩:٤٢`, a live mm:ss countdown, once a second |
| Reminder starts | Toast (in-app) | One short line, closes by itself |
| Prayer comes in | AbovePrompt band, once (~3 s), and the SessionMode line | The rising minaret plays in the band beside `حان وقت صلاة العصر`, then clears; the footer line keeps the call for 15 minutes (`salahAthan`) |
| Claude works in the window | Spinner (thikr line) | حَيَّ عَلَى الصَّلَاةِ joins the thikr rotation |
| Settings and help | Command reply | `/salah`, `/salah help` table, `/muslim help` |

## Picks

What the user chose:

| Part | Pick |
| --- | --- |
| Placement | The prayer line sits in the prompt footer beside the model: plain text, `color="claude"`, terminal and desktop alike; no status line. A row of its own above the prompt was dropped because the desktop draws that area as a card |
| Digits | Arabic-Indic |
| Toast | «صلاة العصر بعد ٢٠ دقيقة» |
| Countdown | Live `mm:ss` in the footer line inside the reminder window, `☾ العصر ١٩:٤٢` |
| Thikr | The first phrase of a thikr turn inside the window is «حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د» ([thikr.md](thikr.md#before-a-prayer)) |
| Terminal athan moment | The rising text minaret above |
| Desktop popup | A photo-background card at the top right, as described above. Planned, pending a live test that a photo shows inside `Svg` on desktop |

## Never

- **No OS notification.** Banners show in meetings and screen shares; reminders stay inside Claude Code (footer line and toast).
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
