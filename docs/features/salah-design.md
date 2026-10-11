# Salah — design

The salah feature's own design. It adds to the shared base in [DESIGN.md](../../DESIGN.md) and never contradicts it. What the feature does is in [salah.md](salah.md).

## Visual means

- **Text by default.** The prayer line, the setup line, the review form and command replies are text in Claude's font, size and theme colors (`color="claude"` for the accent, `dimColor` for hints).
- **The athan moment is a short text look.** When a prayer comes in, a band above the prompt plays once (about 3 seconds), then rests as the prayer line `حان وقت صلاة …`. In the terminal it is a Unicode minaret rising row by row from the base (about 330 ms a row, `color="claude"` for the crescent and the point, `dimColor` for the rest) beside «حان وقت صلاة العصر»:

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
- **Desktop athan card.** On the desktop the minaret is never drawn; instead a full-width card sits above the prompt, built like the athkar band: one vector document holding HTML and CSS, with the calligraphic font and the photo of the Haram embedded in it, rounded corners, the card the same width and height as that band. It shows «حان وقت صلاة المغرب» large on the right and the time in Arabic digits under it, in one font and white; a × at the top left, on a round dark translucent disc with a thin light border so it reads over the photo, closes it. The photo is a wide strip cut from a larger original so it stays sharp across the card. The card fades in and settles over under a second, the text a moment after the photo (no motion when the system asks for reduced motion). No bar. It stays until the user closes it or the call's 15 minutes end.
- **Test path.** `/salah athan test` shows the athan moment on demand for the next prayer (the card on the desktop, the minaret in the terminal), without changing settings or marking it shown.

**Why:** prayer time is a few moments a day and worth marking; the rest of the day salah stays a quiet line.

## Surfaces

Rows stack, never compete: each feature's AbovePrompt hook keeps what `next(e)` returns and adds its own row above it (setup or review rows, thikr's usage-limit row, the minaret moment). The prayer line is not a band row: it is plain text in the `SessionMode` labels at the right of the prompt footer, before the model name; the hook keeps what `next(e)` returns and adds the line beside it.

| Moment | Surface | Shows |
| --- | --- | --- |
| No city yet | AbovePrompt band | One line: the guessed city, **Yes**, **Another city**, **Not now** |
| City saved, or `/salah adjust` | AbovePrompt band | Today's times, − and + per prayer, **Save**, **Skip** |
| All day (mode `always`) | SessionMode (footer, before the model), `color="claude"`, no card | `☾ العصر ١٥:٥٩`; empty in `reminder` mode |
| Reminder window (`salahReminder`, 20 min by default) | SessionMode, same text | `☾ العصر ١٩:٤٢`, a live mm:ss countdown, once a second |
| Prayer comes in | AbovePrompt band, once, and the SessionMode line | Terminal: the rising minaret (~3 s) beside `حان وقت صلاة العصر`. Desktop: the photo card until closed or 15 minutes. The footer line keeps the call for 15 minutes (`salahAthan`) |
| Claude works in the window | Spinner (thikr line) | حَيَّ عَلَى الصَّلَاةِ joins the thikr rotation |
| Settings and help | Command reply | `/salah`, `/salah help` table, `/muslim help` |

## Picks

What the user chose:

| Part | Pick |
| --- | --- |
| Placement | The prayer line sits in the prompt footer beside the model: plain text, `color="claude"`, terminal and desktop alike; no status line. A row of its own above the prompt was dropped because the desktop draws that area as a card |
| Digits | Arabic-Indic |
| Countdown | Live `mm:ss` in the footer line inside the reminder window, `☾ العصر ١٩:٤٢` |
| Thikr | The first phrase of a thikr turn inside the window is «حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د» ([thikr.md](thikr.md#before-a-prayer)) |
| Terminal athan moment | The rising text minaret above |
| Desktop athan card | A photo-background card above the prompt, as described above |

## Never

- **No OS notification.** Banners show in meetings and screen shares; reminders stay inside Claude Code (the footer line).
- **No sound** unless a later setting asks for it.
- **No location service or IP lookup.** The city comes from the time zone or what the user types.

## Text

- Prayer names in Arabic in lines (الفجر، الظهر، العصر، المغرب، العشاء), in English in commands (Fajr, Dhuhr, Asr, Maghrib, Isha).
- حان وقت صلاة … and حَيَّ عَلَى الصَّلَاةِ are authored text with tashkeel, never generated.
- Digits: Arabic-Indic (`١٥:٥٩`, `١٩:٤٢`).
- Countdown: `mm:ss` in Arabic digits inside the reminder window, redrawn each second only there (30 s outside).
- Minutes in words: دقيقة، دقيقتين، ٣ دقائق، ١١ دقيقة.

## Checklist for a change

- [ ] Every richer look has a terminal text fallback, tested on `terminal` and `desktop`.
- [ ] No OS notification, no sound, no network.
- [ ] Colors are theme keys where text is used.
- [ ] The moment plays once and clears itself (see DESIGN.md, Time-based behavior).
