# Salah — design

The salah feature's own design. It adds to the shared base in [DESIGN.md](../../DESIGN.md) and never contradicts it. What the feature does is in [salah.md](salah.md).

## Visual means

- **Text by default.** The prayer line, the setup line, the review form and command replies are text in Claude's font, size and colors (the shared main color (`claude` for orange, light/dark hex otherwise) for the accent, `dimColor` for hints).
- **The terminal athan moment is a short text look.** When a prayer comes in, a band above the prompt plays once (about 3 seconds), then rests as the prayer line `حان وقت صلاة …`. In the terminal it is a Unicode minaret rising row by row from the base (about 330 ms a row, the shared main color (`claude` for orange, light/dark hex otherwise) for the crescent and the point, `dimColor` for the rest) beside «حان وقت صلاة العصر»:

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
- **Desktop athan card.** On the desktop the minaret is never drawn; instead the shared card in `src/shared/card/` sits above the prompt, with the same width and open height (77px), frame, ×, hover, lighting and input as the athkar band. Salah supplies the calligraphic font, photo of the Haram and text inside its vector document holding HTML and CSS. It shows «حان وقت صلاة المغرب» large on the right and the time in Arabic digits under it, in one font and white; the shared × at the top left closes it and shows a light disc on hover. The photo is a wide strip cut from a larger original so it stays sharp across the card. It appears at once, lit and open, in an isolated view. No bar. It stays until the user closes it or the call's 15 minutes end. Only one desktop card shows at a time: it takes the athkar band's place while it shows, and the band returns with the reading kept. The terminal reader and rising minaret are unchanged.
- **Test path.** `/salah athan test` shows the athan moment on demand for the next prayer (the card on the desktop, the minaret in the terminal), even before the prayer display first appears, without changing settings or marking it shown.

**Why:** prayer time is a few moments a day and worth marking; the rest of the day salah stays a quiet line.

## Surfaces

Setup, review and terminal rows stack: each feature's AbovePrompt hook keeps what `next(e)` returns and adds its own row above it (setup or review rows, thikr's usage-limit row, the minaret moment). The desktop cards share one place: the athan replaces the athkar band while it shows. The prayer line is not a band row: it is bold text in the `SessionMode` labels at the right of the prompt footer, before the model name; the hook keeps what `next(e)` returns and adds the line beside it.

| Moment | Surface | Shows |
| --- | --- | --- |
| No city yet | AbovePrompt band | One line: the guessed city, **Yes**, **Another city**, **Not now** |
| City saved, or `/salah adjust` | AbovePrompt band | Today's times, − and + per prayer with no minute bounds, **Save**, **Skip** |
| All day (mode `always`) | SessionMode (footer, before the model), bold, the shared main color (`claude` for orange, light/dark hex otherwise), no card | `☾ العصر ١٥:٥٩`; empty with minutes |
| Countdown window (`/salah show <minutes>`, 20 by default; the last 20 min with `always`) | SessionMode, same text | `☾ العصر ١٩:٤٢`, a live mm:ss countdown, once a second |
| Prayer comes in | AbovePrompt band, once, and the SessionMode line | Terminal: the rising minaret (~3 s) beside `حان وقت صلاة العصر`. Desktop: the photo card until closed or 15 minutes. The footer line keeps the call for 15 minutes (`salahAthan`) |
| Claude works in the window | Spinner (thikr line) | حَيَّ عَلَى الصَّلَاةِ joins the thikr rotation |
| Settings and help | Command reply | `/salah`, `/salah help` table, `/muslim help` |

## Picks

What the user chose:

| Part | Pick |
| --- | --- |
| Placement | The prayer line sits in the prompt footer beside the model: plain text, the shared main color (`claude` for orange, light/dark hex otherwise), terminal and desktop alike; no status line. A row of its own above the prompt was dropped because the desktop draws that area as a card |
| Digits | Arabic-Indic |
| Countdown | Live `mm:ss` in the footer line inside the countdown window, `☾ العصر ١٩:٤٢` |
| Thikr | The first phrase of a thikr turn inside the window is «حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د» ([thikr.md](thikr.md#before-a-prayer)) |
| Terminal athan moment | The rising text minaret above |
| Desktop athan card | A photo-background card above the prompt, as described above |

## Never

- **No OS notification.** Banners show in meetings and screen shares; reminders stay inside Claude Code (the footer line).
- **No sound** unless a later setting asks for it.
- **No location service or IP lookup.** The city comes from the time zone or what the user types.

## Text

- Terminal Arabic follows the shared per-terminal setting in [DESIGN.md](../../DESIGN.md#4-typography-and-arabic) (`/muslim terminal-arabic`). Convert the footer and minaret label only at draw time; the desktop footer and athan card keep logical text.

- Prayer names in Arabic in lines (الفجر، الظهر، العصر، المغرب، العشاء), in English in commands (Fajr, Dhuhr, Asr, Maghrib, Isha).
- حان وقت صلاة … and حَيَّ عَلَى الصَّلَاةِ are authored text with tashkeel, never generated.
- Digits: Arabic-Indic (`١٥:٥٩`, `١٩:٤٢`).
- Countdown: `mm:ss` in Arabic digits inside the countdown window, redrawn each second only there (30 s outside).
- Minutes in words: دقيقة، دقيقتين، ٣ دقائق، ١١ دقيقة.

## Checklist for a change

- [ ] Every richer look has a terminal text fallback, tested on `terminal` and `desktop`.
- [ ] No OS notification, no sound, no network.
- [ ] Main-color text uses `src/shared/color/` and `/muslim color`; other text keeps its theme colors.
- [ ] The moment plays once and clears itself (see DESIGN.md, Time-based behavior).

The main color is the shared `/muslim color` setting, default Claude orange. It changes only existing main-color accents; Claude's spinner keeps its own color.
