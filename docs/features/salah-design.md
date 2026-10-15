# Salah — design

The salah feature's own design. It adds to the shared base in [DESIGN.md](../../DESIGN.md) and never contradicts it. What the feature does is in [salah.md](salah.md).

## Visual means

- **Text by default.** The prayer line, the setup line, the review form and command replies are text in Claude's font, size and colors (the shared main color (`claude` for orange, light/dark hex otherwise) for the accent, `dimColor` for hints).
- **The terminal athan moment is a short text look.** When a prayer comes in, a band above the prompt plays once (about 3 seconds), then folds to one row above the prompt: `☾`, `حان وقت صلاة …` in the main color through the shared Arabic path, and a × Button at the end. This row stays until × or 15 minutes from the moment's start. The × is also available while it rises. In the terminal it is a Unicode minaret rising row by row from the base (about 330 ms a row, the shared main color (`claude` for orange, light/dark hex otherwise) for the crescent and the point, `dimColor` for the rest) beside «حان وقت صلاة العصر»:

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
- **Desktop athan card.** On the desktop the minaret is never drawn; instead the shared card in `src/shared/card/` sits above the prompt, with the same width and open height (77px), frame, ×, hover, lighting and input as the athkar band. Salah supplies the calligraphic font, photo of the Haram and text inside its vector document holding HTML and CSS. It shows «حان وقت صلاة المغرب» large on the right and the time in Arabic digits under it, in one font and white; the shared × at the top left closes it and shows a light disc on hover. The photo is a wide strip cut from a larger original so it stays sharp across the card. It appears at once, lit and open, in an isolated view. No bar. After 1 minute (`FOLD_MS`) it folds with `CardFrame.isFolded` and shared `REST_PX` (24px content height, 44px picture with the desktop line), exactly the athkar folded size. The photo, call and Arabic-digit time stay on one horizontal line on the right, as the athkar band's folded title; the shared × remains at the left. Any other left press reopens it with the same rest rules as the athkar band: pointer leave folds after 1 second (enter cancels it); focus moving outside `muslim` in `AbovePrompt` folds immediately, except within 600 ms of its last pointer press; keys with the pointer off fold 3 seconds after the last key; no input folds after 90 seconds. Reopening sets `foldsAt` to that 90-second idle deadline, and later input renews it. Entering the initially open card also enables these rules; without input its first fold stays at 1 minute. Folding writes `isFolded` through the existing state atom. Pointer presence and the short rest timer are module-local. × closes the whole moment; otherwise it closes 15 minutes from the original start (`CARD_MS`), even after reopening. Only one desktop card shows at a time: it takes the athkar band's place while it shows, and the band returns with the reading kept. The terminal athkar reader remains independent.
- **Demo path.** `/salah demo` previews fixed Fajr at 05:00, with the real clock formatter and no city, method or prayer-time calculation. It replies `**Salah demo:** athan · Fajr 05:00`. Its disposable module-local moments select into the existing desktop card and terminal minaret render paths through one guard each, using the same components and builders. Desktop opens 5 s then folds 3 s; terminal rises 3.01 s then folds 3 s; then the demo is gone. Demo input and timers never write real salah atoms, settings or store. A real athan returns untouched after expiry or ×. The shared runner connects a transient signal to this same starter in a demo-only `/muslim demo` setup hook; there is no second drawing hook.

**Why:** prayer time is a few moments a day and worth marking; the rest of the day salah stays a quiet line.

## Reload and lifetime

The moment keeps its fold state and absolute deadlines in `salahCard` and `salahMinaret`, with the minaret's original rise start. The first draw derives the stage from the clock immediately, without a state write during rendering. A `$.clock.after(0)` callback restores the remaining rise, fold and expiry timers; overdue states are normalized or cleared after that draw. Timer handles belong only to the current load. Closing clears both states without clearing `salahAthanShown`; the footer keeps its own clock behavior.

## Surfaces

Setup, review and terminal rows stack: each feature's AbovePrompt hook keeps what `next(e)` returns and adds its own row above it (setup or review rows, thikr's usage-limit row, the minaret moment). The desktop cards share one place: the athan replaces the athkar band while it shows. The prayer line is not a band row: it is bold text in the `SessionMode` labels at the right of the prompt footer, before the model name; the hook keeps what `next(e)` returns and adds the line beside it. The Desktop owns that placement: its redesigned footer (app 2.37) draws the slot on a row of its own under the model, effort and context controls, right-aligned. The line is plain Text, so it keeps its bold main color there; nothing in the mod depends on it being inline.

| Moment | Surface | Shows |
| --- | --- | --- |
| No city yet | AbovePrompt band | One line: the guessed city, **Yes**, **Another city**, **Not now** |
| City saved, or `/salah adjust` | AbovePrompt band | Today's times, − and + per prayer with no minute bounds, **Save**, **Skip** |
| All day (mode `always`) | SessionMode (footer, before the model), bold, the shared main color (`claude` for orange, light/dark hex otherwise), no card | `☾ العصر ١٥:٥٩`; empty with minutes |
| Countdown window (`/salah show <minutes>`, 20 by default; the last 20 min with `always`) | SessionMode, same text | `☾ العصر ١٩:٤٢`, a live mm:ss countdown, once a second |
| Prayer comes in | AbovePrompt band, once, and the SessionMode line | Terminal: the rising minaret (~3 s) beside `حان وقت صلاة العصر`. Desktop: open photo card → folded row after 1 minute. Terminal: rise → one folded row after ~3 seconds. Both close with × or at 15 minutes. The footer line keeps the call for 15 minutes (`salahAthan`) |
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

- Terminal Arabic follows the shared per-terminal setting in [DESIGN.md](../../DESIGN.md#4-typography-and-arabic) (`/muslim terminal-arabic`). Convert the footer, minaret label and folded terminal call only at draw time; the desktop footer and athan card keep logical text.

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


### Muslim pane settings connector

Salah connects `salah-city` during Muslim pane input. It runs the same `askCity`, resolution, `savePlace` and review path as `/salah city`, using the current press context; config denials show a toast.
