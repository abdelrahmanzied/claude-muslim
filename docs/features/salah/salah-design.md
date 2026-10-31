# Salah — design

The salah feature's own design. It adds to the shared base in [DESIGN.md](../../../DESIGN.md) and never contradicts it. What the feature does is in [salah spec](salah.md).

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
- **Desktop athan card.** On the desktop the minaret is never drawn; instead the shared card in `plugin/src/shared/card/` sits above the prompt, with the same width and open height (77px), frame, ×, hover, lighting and input as the athkar band. Salah supplies the calligraphic font, photo of the Haram and text inside its vector document holding HTML and CSS. It shows «حان وقت صلاة المغرب» large on the right and the time in Arabic digits under it, in one font and white (on the photo, in either appearance; only the start action's main color follows the app's light or dark appearance, both shades in the card's CSS picked by `prefers-color-scheme`, never Claude Code's `theme` config); the shared × at the top left closes it and shows a light disc on hover. The photo is a wide strip cut from a larger original so it stays sharp across the card. It appears at once, lit and open, in an isolated view, for as long as the footer keeps the call (15 minutes): a late tick or a reload shows it, once, and it ends at the prayer timestamp plus the shared duration. The footer line is drawn from the clock and the card from the timer's tick; the footer's draw therefore asks for a tick when it shows the call and the card has not started, so the two always agree. No bar. After 1 minute (`FOLD_MS`) it folds with `CardFrame.isFolded` and shared `REST_PX` (24px content height, 44px picture with the desktop line), exactly the athkar folded size. The photo, call and Arabic-digit time stay on one horizontal line on the right, as the athkar band's folded title; the shared × remains at the left. Any left press outside × and the start button reopens it with the same rest rules as the athkar band: pointer leave folds after 1 second (enter cancels it); focus moving outside `muslim` in `AbovePrompt` folds immediately, except within 600 ms of its last pointer press; keys with the pointer off fold 3 seconds after the last key; no input folds after 90 seconds. Reopening sets `foldsAt` to that 90-second idle deadline, and later input renews it. Entering the initially open card also enables these rules; without input its first fold stays at 1 minute. Folding writes `isFolded` through the existing state atom. Pointer presence and the short rest timer are module-local. × closes the whole moment; otherwise it closes at the prayer timestamp plus the shared duration (`CARD_MS = IN_MS`, currently 15 minutes), even after reopening. Only one desktop card shows at a time: it takes the athkar band's place while it shows, and after-salah takes its place at that deadline; closing early returns to morning/evening until the deadline. The terminal athkar reader remains independent.
- **Demo path.** `/salah demo` previews fixed Fajr at 05:00, with the real clock formatter and no city, method or prayer-time calculation. It replies `**Salah demo:** athan · Fajr 05:00 · athkar after salah`. Its disposable module-local moments select into the existing desktop card and terminal minaret render paths through one guard each, using the same components and builders. Desktop opens 5 s then folds 3 s; terminal rises 3.01 s then folds 3 s; then the existing transient bus starts the after-salah Fajr scenes in athkar's real demo reader. The card shows its real start button; start, × and expiry all continue immediately. The terminal continues after its minaret closes. Three readings take 6.0 s, followed by the full real 3.2 s finale and 1.2 s folded done (10.4 s after-salah; 18.4 s total desktop, 16.41 s terminal). The reader keeps the configured accent and desktop look, sky for the current prayer bounds (fixed clock hours without a saved place), or terminal Frame. Demo input and timers never write real salah atoms, settings, store or the athkar day. A real athan returns untouched only after this continuation finishes. The shared runner connects a transient signal to this same starter in a demo-only `/muslim demo` setup hook; athkar supplies the completion callback after its folded scene, so `/muslim demo` keeps waiting through the whole flow. There is no second drawing hook.

**Why:** prayer time is a few moments a day and worth marking; the rest of the day salah stays a quiet line.

## Reload and lifetime

The moment keeps its fold state and absolute deadlines in `salahCard` and `salahMinaret`, with the minaret's original rise start. The first draw derives the stage from the clock immediately, without a state write during rendering. A `$.clock.after(0)` callback restores the remaining rise, fold and expiry timers; overdue states are normalized or cleared after that draw. Timer handles belong only to the current load. Closing clears both states without clearing `salahAthanShown`; the footer keeps its own clock behavior.

## Surfaces

Setup and review have exclusive use of AbovePrompt while visible, as specified in DESIGN.md; athkar, thikr's usage-limit row and the minaret moment yield without being dismissed. The desktop cards share one place: the athan replaces the athkar band while it shows. The prayer line is not a band row: it is bold text in the `SessionMode` labels at the right of the prompt footer, before the model name; the hook keeps what `next(e)` returns and adds the line beside it. The Desktop owns that placement: its redesigned footer (app 2.37) draws the slot on a row of its own under the model, effort and context controls, right-aligned. The line is plain Text, so it keeps its bold main color there; nothing in the mod depends on it being inline.

| Moment | Surface | Shows |
| --- | --- | --- |
| No city yet | AbovePrompt band | One line: the guessed city, **Yes**, **Another city**, **Not now** |
| City saved, or `/salah adjust` | AbovePrompt band | The title, a dim how-to line (`reviewHint`: terminal «ctrl+x tab or click a box · 5 later, -5 earlier, 0 none · Enter applies · then Save», desktop the same from «Click a box», mobile the `/salah adjust <pray> <±min>` way), today's times, one minutes box per prayer (`Input`; any whole number, `0` and negatives included, Latin or Arabic-Indic digits) then `min`, **Save**, **Skip**. Mobile draws no field yet and shows the minutes as text |
| All day (mode `always`) | SessionMode (footer, before the model), bold, the shared main color (`claude` for orange, light/dark hex otherwise), no card | `☾ العصر ١٥:٥٩`; empty with minutes |
| Countdown window (`/salah show <minutes>`, 20 by default; the last 20 min with `always`) | SessionMode, same text | `☾ العصر ١٩:٤٢`, a live mm:ss countdown, once a second |
| Prayer comes in | AbovePrompt band, once, and the SessionMode line | Terminal: the rising minaret (~3 s) beside `حان وقت صلاة العصر`. Desktop: open photo card → folded row after 1 minute. Terminal: rise → one folded row after ~3 seconds. Both close with × or at 15 minutes. The footer line keeps the call for 15 minutes (`salahAthan`) |
| Settings and help | Command reply | `/salah`, `/salah help` table, `/muslim help` |

The setup card's appearance and controls stay the same. While it awaits the first answer, the athkar band yields its place. Salah always installs setup, independently of `salahShow` (which controls the footer). Yes, a successfully picked city and Not now record the first answer's epoch ms in `firstRun.remindFrom`, mirrored by the `firstRunRemindFrom` atom for a live redraw. Existing city/Not now choices without a timestamp keep their behavior; later changes preserve the cutoff.

The setup card and `askCity` first look for the `muslim.salahPlace` row (`rowMissing`, an unreadable `/config` counts as present). With no row the card keeps its title shell and `Not now` but shows `Run /reload-plugins to finish installing muslim.` in the main color in place of the question and the Yes / Another city buttons, the same text on every surface; `/salah city` and the pane press reply with that sentence and ask nothing. `savePlace` checks that its config row exists before changing the timestamp or review, then writes both before `config.set`, since success reloads the module without resolving that call. The timestamp is kept even when the save fails: the card still shows without a city, and automatic athkar wait for the next period after the answer. On a denial or thrown error the review atom goes back to its previous value only when `/config` does not hold the new city; a late error can reach a module the successful save already replaced, and an unreadable `/config` counts as saved. Save errors never escape the city hook: card and pane presses toast, and `/salah city` replies. An error mentioning `no /config row` becomes `Not changed: run /reload-plugins, then try again.`; other errors become `Not changed: <error message>`. Denial keeps its existing wording. A failed first answer leaves the setup card showing.

## Picks

What the user chose:

| Part | Pick |
| --- | --- |
| Placement | The prayer line sits in the prompt footer beside the model: plain text, the shared main color (`claude` for orange, light/dark hex otherwise), terminal and desktop alike; no status line. A row of its own above the prompt was dropped because the desktop draws that area as a card |
| Digits | Arabic-Indic |
| Countdown | Live `mm:ss` in the footer line inside the countdown window, `☾ العصر ١٩:٤٢` |
| Prayer-window signal | Salah publishes `salahWindow`; thikr does not read it yet |
| Terminal athan moment | The rising text minaret above |
| Desktop athan card | A photo-background card above the prompt, as described above |

## Never

- **No OS notification.** Banners show in meetings and screen shares; reminders stay inside Claude Code (the footer line).
- **No sound** unless a later setting asks for it.
- **No location service or IP lookup.** The city comes from the time zone or what the user types.

## Text

- Terminal Arabic follows the shared per-terminal setting in [DESIGN.md](../../../DESIGN.md#4-typography-and-arabic) (`/muslim terminal-arabic`). Convert the footer, minaret label and folded terminal call only at draw time; the desktop footer and athan card keep logical text.

- Prayer names in Arabic in lines (الفجر، الظهر، العصر، المغرب، العشاء), in English in commands (Fajr, Dhuhr, Asr, Maghrib, Isha).
- حان وقت صلاة … is authored text with tashkeel, never generated.
- Digits: Arabic-Indic (`١٥:٥٩`, `١٩:٤٢`).
- Countdown: `mm:ss` in Arabic digits inside the countdown window, redrawn each second only there (30 s outside).
- Minutes in words: دقيقة، دقيقتين، ٣ دقائق، ١١ دقيقة.

## Checklist for a change

- [ ] Every richer look has a terminal text fallback, tested on `terminal` and `desktop`.
- [ ] No OS notification, no sound, no network.
- [ ] Main-color text uses `plugin/src/shared/color/` and `/muslim color`; other text keeps its theme colors.
- [ ] The moment plays once and clears itself (see DESIGN.md, Time-based behavior).

The main color is the shared `/muslim color` setting, default Claude orange. It changes only existing main-color accents; Claude's spinner keeps its own color.

The nonvisual `salahLast` signal shares the real prayer ticker: today’s most recent obligatory prayer by its actual local date, including a delayed Isha from the preceding calculation day, excluding sunrise, or null before today’s first prayer or with no place. Tracking continues every 30 seconds with `/salah show off`; the footer, countdown window signal and new athan minaret/card remain hidden. It is independent of footer and athan visibility and drives athkar's delayed offer: start at prayer time plus `IN_MS`, until 30 minutes after the athan unless started. The same start applies when no desktop card appears.

The desktop card has a text action, **ابدأ أذكار بعد الصلاة ←**, on the left beside the shared ×, vertically centered in both open and folded stages. Its left offset is 35px plus the shell's `--ax` padding, just clear of ×'s 34px target. There is no fill, border or button box. The label uses the embedded Aref Ruqaa Bold at 15px in white with a dark text shadow; the left arrow and a space use 12px monospace and come after the label in reading order (to its left). Hover takes the shared main-color light/dark hex (`--start-accent`) and brightens slightly, with a pointer cursor. The call/time stay on the right with their usual padding. Text metrics estimate the label at 93px and the space/arrow at 14.4px; the drawn span and target share that 107.4px width and 24px height in both stages. The shared Client carries the action rectangle for immediate hover feedback; the hooks module uses the same area and shared `pixelOf` conversion, including measured columns and desktop shell padding, for clicks. Hover and clicks take the drawn span plus 8px on each side (`startHitArea`, `START_MARGIN`), cut short of ×'s 34px target. × retains its own target and behavior.

Pressing start closes both card and minaret, then writes `salahAfterSalahStart: { pray, at } | null` (declared in the state contract), where `at` is the card's original prayer time. Athkar reads it, checks against `salahLast`, and opens that prayer's reading lit, past the cover, ready to count. An unfinished reading resumes and a completed one restarts. No imports cross feature folders. The real control is always shown; the demo includes it too and handles it through transient demo signals. × alone never starts early. Reopening or closing the card does not move the offer deadline. An untouched automatic offer ends 30 minutes after the athan. Once started, the reader stays until done, hidden or a new prayer.

Salah connects prayer-day bounds through `plugin/src/shared/pray/bounds.ts`: current and previous calendar date keys in the saved place’s time zone, today’s Fajr, Sunrise, Maghrib and Isha, and tomorrow’s Fajr (epoch milliseconds). Each read computes from the current clock, configured method and adjustments, in timers as well as hooks, without waiting for the ticker or writing during rendering. With no place it returns null. Athkar uses these bounds for Fajr/Maghrib periods, a Fajr day turnover, its next period boundary timer and prayer-based sky phases refreshed each minute; show off does not disable them.

Prayer bounds reuse a pure daily calculation cache, refreshed on the first read after the place’s date changes; a settings reload drops the cache.

### Muslim pane settings connector

Salah connects `salah-city` during Muslim pane input. It runs the same `askCity`, resolution, `savePlace` and review path as `/salah city`, using the current press context; config denials and thrown city-save errors show the toast specified above.

On terminals, city setup is withheld while the current terminal needs the shared Arabic check, using the same pure visibility helper as that check; its hotkeys appear only after the check is answered. Desktop is unchanged. Review Save clears `salahReview` before `config.set`; denial or error restores the previous draft and toasts. Calendar-date arithmetic at noon chooses adjacent prayer days across both DST changes and keeps the Hijri month tied to that date. Settings writes follow the shared stop-before-reload rule in DESIGN.md.

Setup visibility uses DESIGN.md's shared pure priority decision, also read by every reminder. Arabic setup owns the terminal slot first; otherwise review or city setup owns it. While any setup is visible, the desktop athan card and terminal minaret skip drawing without dismissing their moment; they return if their existing window is still active.

Every settings writer preflights the exact config row before stopping Quran or changing UI state, and maps missing-row failures to the shared reload-plugins message in DESIGN.md. Review Save keeps its draft open if that preflight fails.

## Release behavior

Prayer selection compares actual instants across adjacent calculated days. Yesterday’s Isha can fall after midnight: before it, the countdown targets Isha and no athan call shows; once it arrives, the usual fifteen-minute call applies. The last-prayer signal includes that Isha once its instant falls on today’s local date. The pane shows its matching calculated prayer-day rows. `prayLine` also rejects a negative time-since-prayer.

The city dialog’s `Not now` uses the same durable put-off action as the setup row. City model completion has an 8000 ms timeout and thrown/unanswered calls use the existing short `Could not reach Claude` reply. Command status/help and shared help tables are English on every surface, including the Athan description; an Arabic city name uses its coordinates in the settings table and stays authored in the heading. The prayer line and athan moment keep their Arabic. Demo replies mention answering the setup above while the shared decision hides the preview. Settings saves share a same-file writer and retain their reply/toast and rollback paths.

## Text boxes

The athan card's prayer name and time go through the shared text component and are never clipped by the card's own CSS: see DESIGN.md §4 "Drawn text" (`plugin/src/shared/text/`).
