# Muslim pane — today's prayers, the Quran player and the athkar in one place

A docked pane titled «☾ Muslim» (the crescent at the start, like the Quran pane's «۞») on Claude Desktop that gathers the three things the plugin shows over a day: the prayer times, the Quran player's controls and the athkar progress. It sits as a tab beside the «القرآن الكريم» pane. Its design is [muslim-pane-design.md](muslim-pane-design.md).

## Command

- `/muslim pane` opens the pane (desktop). In the terminal it replies with the daily cards and settings as plain text, Arabic through `src/shared/arabic`.

The pane has no userConfig field of its own and no off switch: it is a view, and each card follows its feature (a card whose feature is off or not set up says so quietly).

## Footer chip

On Desktop a plain `☾ Muslim` button sits at the left of the prompt footer (before the Quran chip and the prayer text) and toggles the pane open or closed.

## The three cards

A heading row sits above the cards: the full Muslim avatar at 36px tall and approximately 38.4px wide beside «مسلم» on the right, and `/muslim` on the left, always shown, like the Quran pane's `/quran`. Both labels are vertically centered on the 36px row, which starts at the picture's top edge because the Desktop adds its own space above the picture and the API has no setting for it; the cards begin at 44px. The bottom margin stays 12px until checked against that space live.

1. **الصلاة** — the title row keeps its chevron, with no city in the header. A large «الصلاة القادمة» block with the next prayer's name in the main color, its time and a countdown (`in 1h 12m`, `in 12m`, `in <1m`). Today's five prays (Fajr, Dhuhr, Asr, Maghrib, Isha): past ones are done (check icon, dim), the next is highlighted in the main color, the rest upcoming (ring icon). After Isha every row is done and the next block shows tomorrow's Fajr. Under the rows an **Athan** row with a switch: pressing the row turns `salahAthan` on or off (the same setting as `/salah athan on|off`; the module reloads). Below Athan, a quiet centered bottom line reads «مواقيت <city>», with the city exactly as stored and isolated in `<bdi>`. The line is not pressable and is hidden when folded. No city: a note points to `/salah city`, with no bottom line; the open card keeps the same fixed height.
2. **القرآن** — the header value is the quarter being played (`المقطع ٣ من ١٦`) when the surah is split. Reciter row, surah row, a progress bar with elapsed and total times, and the previous / play-stop / next controls (they do what the Quran pane's do, including moving between quarters), then **Open full player**, which opens and raises the «القرآن الكريم» tab beside Muslim in the same Desktop mod-pane dock, including when Quran is already open. It does not close either pane or start audio. Before the Quran catalog has been fetched once the rows show a dash, the controls are inactive and only **Open full player** works.
3. **أذكار الصباح / المساء** (the period now) — the header value is the number of athkar completed of the total (`٤ / ١٢`), then a progress bar and a small ✓ **أتممتُها** button beside **Open** while the period is unfinished. Confirming fills every count to its authored full number and marks that period done, so the fraction and bar become full; a visible reader for that period plays its existing finale. **Open** brings the athkar reader above the prompt (unhiding it if it was hidden) and lights it. With athkar off the card says `/athkar on`.

Each card's title row folds and unfolds the card (press anywhere on the row); the folded state is kept for the session.

Keys with the pane focused: space or enter plays and stops, left and right move previous and next.

Wheel and trackpad scrolling belongs to the pane body. The reciter and surah rows are passive labels, not dropdowns. When the cards fit, or the body is already at the requested edge, scrolling leaves the picture still without a redraw. In a shorter window the host scrolls the overflowing cards normally; the terminal's text body and plugin-origin scroll requests retain the host's behavior.

## How the pane gets its data and performs actions

The pane never imports another feature. `src/shared/panel/signal.ts` holds transient module values (no saved state, no `$.state`): each feature connects, from its own hooks, a reader for what the pane shows and a starter for what the pane may ask of it, and the pane calls them.

| Card | Data | Action |
| --- | --- | --- |
| Prayer | salah connects `panelSalah(options, now)` (pure, `src/features/salah/panel.ts`: today's times for the saved place, method and adjustments, and the next pray) when it installs | the Athan row: `$.config.set({ key: 'muslim.salahAthan' })` by the pane |
| Quran | Quran connects a reader of the selected reciter, surah, quarter, elapsed, total and progress from the same model its pane draws, on each footer-chip or Muslim-pane draw and before each Muslim-pane input | `quran-toggle`, `quran-prev`, `quran-next` use the pane's own handlers; `quran-open` immediately calls `$.ui.open` for `quran` with `focus: true`, then initializes the player through its existing queue |
| Athkar | athkar connects a reader of today's reading in the period now on each band draw, only while athkar is on | `athkar-open` unhides, opens and lights the current period reader; `athkar-finish` fills all counts and sets `isDone` for the clock's current period through athkar's shared finish operation, without opening or unhiding a hidden band |

A reload clears the connections; each feature connects again on its next draw (the module asks for a redraw at start). The Muslim render and input hooks continue the hook chain first, so Quran can connect without a footer draw and refresh its closures with the current input context. Quran navigation happens before queued catalog/recording work; initialization skips a redundant pane-open call. An unplaced/refused open shows the existing short unavailable toast. Other presses whose feature is not connected show a short toast.

While the pane is open a clock redraws it every second while the Quran plays and once a minute otherwise (the countdown); the clock stops when the pane closes.

The Client uses its current region size on render and pointer input; the API already redraws it on resize. It has no size polling timer or size messages. The pane's `ui.scroll` hook consumes person-origin Desktop requests whose clamped offset equals the last rendered offset, without `next` or invalidation (the API's way to leave a window undrawn). Real movement is passed through. `scroll.ts` holds the pure decision; unit and engine tests cover both Quran rows, wheel directions, missing pointer coordinates, overflow, edges, and flickering Client row measurements.

## Notes

- Religious text is authored data and never generated: the athkar title comes from the athkar data (tashkeel follows the `tashkeel` setting), prayer names from `src/shared/pray/names.ts`. The confirmation «أتممتُها» is Arabic UI chrome, not religious text. The English chrome (`Athan`, `Open`, `Open full player`, `in 1h 12m`) is UI text.
- Prayer times are calculated locally, no network.

Desktop owns tab grouping and focus. This build exposes no group/placement argument or unconditional activation method. The installed Desktop renders the session's mod panes in one dock and permits a focus request from another pane of the same plugin. Engine tests verify first/repeated opens, coarse input, missing catalog/footer, pending preparation and unplaced results; native activation/paint still needs a live Desktop check.

## Settings card (approved tabs)

After the three daily cards, one **الإعدادات** card starts folded to its 56px title row («ترس بأسنان», title, four-section count, chevron). Opening it shows one horizontal RTL tab strip, in this order: **عام، الصلاة، الأذكار، الذكر**. There is no Quran tab: the reciter and repeat already live in `/quran` and the Quran pane, so a second copy here was removed (saved settings state that pointed at it opens عام). The approved layout “a” puts a 20px icon above each short label in four equal columns. The strip never scrolls; it replaces the accordion so every category takes one tap, without navigating past category rows. The first open selects **عام**. Exactly one category stays selected: pressing it again does nothing, including on a detail face. Selecting another tab resets its face to main and page to zero. Details and **رجوع** stay below the strip.

Approved icons: عام uses **منزلقات** (`sliders`), الصلاة **سجود واقعي** (`sujoodreal`), القرآن **مصحف pane القرآن** (`qpane`, the Quran pane’s mushaf shape fitted to 24px), الأذكار **شروق وغروب** (`horizon`), and الذكر **حبّات Spinner** (`spinbeads`). The settings header uses **ترس بأسنان** (`gearteeth`), distinct from عام. The daily cards use the same icons as their tabs: الصلاة `sujoodreal`, القرآن `qpane`, الأذكار `horizon` (morning and evening alike), the standard set in DESIGN.md §3 Icons. The الذكر body first explains that it controls the thikr shown in Claude Code’s **Spinner** (the working line), keeping Spinner in English.

The open card, selected tab, face and page live in session state `muslim.paneSettings`, guarded by `isSettings`, and survive reloads. Categories are non-null in the current contract. `loadSettings` maps valid old accordion state with a null category to general/main/page 0 on read, preserving whether the card was open. It never writes during a render; the next input saves the normalized state. Daily-card folds remain independent in `paneFolds`.

| Category | Setting | Control / command |
| --- | --- | --- |
| الصلاة | `salahShow` | Always / Before / Off; Before has a 1–720 minute stepper. `/salah show` |
| الصلاة | `salahAthan` | Switch; the same value as the daily Athan row. `/salah athan` |
| الصلاة | `salahPlace` | City row opens Salah's existing question, city resolution, config save and review flow. `/salah city` |
| الصلاة | `salahMethod` | All 20 manifest options, auto first. `/salah method` |
| الصلاة | `salahAdjust` | Six signed whole-minute steppers, including sunrise. Uses the shared `readAdjust` / `writeAdjust` format in `src/config.ts`. `/salah adjust` |
| الأذكار | `athkar` | Reader switch. `/athkar on` or `off` |
| الأذكار | `athkarStyle` | Sky / Frame pills and a quiet sample. `/athkar style` |
| الذكر | `thikr` | Switch. `/thikr on` or `off` |
| الذكر | `thikrMode` | All / Salawat pills. `/thikr mode` |
| الذكر | `thikrSpeed` | Auto / Seconds, then a 1–60 second stepper. `/thikr speed` |
| الذكر | `thikrEnd` | Terminal end-of-turn switch and the authored closing phrase. `/thikr end` |
| عام | `color` | Four shared accent swatches. `/muslim color` |
| عام | `tashkeel` | Desktop display switch. `/muslim tashkeel` |
| عام | Terminal Arabic | One LTR `/muslim terminal-arabic` button copies the command directly (`$.ui.copy`, command toast on failure). After a copy it shows «تم النسخ ✓» in the main color for 2 seconds, then the command again. Run it in that terminal; no separate face or desktop switch. |

All 13 userConfig fields write through `$.config.set({ key: 'muslim.<field>', value })`, including the city owned by Salah. Denials show a toast; module reload after a successful write is expected. The five settings switches (`tashkeel`, `thikr`, `thikrEnd`, `athkar`, `salahAthan`) first write a boolean to session state `muslim.paneOptimistic`. The subscribed pane draws that value immediately with the existing switch transition, before waiting for config. A denial removes that entry by re-reading state and clearing the field only if its stored value is still the one this press wrote (a newer press for the same switch stays; a write another press beat is redone); the existing `session.start` hook removes entries confirmed by the reloaded options. Rendering only reads state, and the daily cards retain their owning features’ data. The pane never imports another feature. Salah connects `salah-city` in the current pane input context, so `$.ui.ask` runs the same flow as its slash command. The city detail face also retains `/salah city` and Copy as a handoff reference.

Methods, adjustments and the city command sheet have a **رجوع** row returning to the category's main rows. Method selections return there too. Long lists use **six 70px slots per page**, with fixed Previous / Next controls, page count and a fixed 548px body even on the last page. No nested scrolling is used. The tab strip is 60px high, with 50px tab targets, 20px icons and one-line 11px labels at 14px line-height, the icon and label centered vertically. At the 240px minimum drawing width, the 216px card contains a 184px strip and four 40.75px tabs, with a 4px gap. The body begins at 132px from the card top, 16px below the strip, with no «الإعدادات · Applies immediately» subheader. Each row puts its Arabic label at RTL start, then a short Arabic description in muted 12px text 4px below it. Switches sit at the left end of the label line; other choices sit 10px below the description, with the color dots centered. Rows are 28px apart (last shown line to next label) in every tab: switches 70px, choices 108px, extra steppers 146px (counted only while shown, so a hidden stepper line leaves no gap), and the end-of-turn switch with its sample 98px. Adjustment rows also use 108px. The athkar tab labels its sample box «معاينة» (12px muted). Descriptions and detail notes are Arabic; product names and LTR commands remain Latin. Main body heights are prayer 530px, athkar 264px (including its sample), thikr 412px and general 276px; prayer and thikr are 38px shorter (492px, 374px) while their stepper line is hidden, so the card is only as tall as its visible rows (`mainHeight` takes the options; drawing and hit testing both pass them). Detail heights are methods 548px, adjustments 740px and city 310px. All heights and control rectangles are constants in `settings.ts`; drawing and `layout.ts` hit testing consume the same `settingsBody` targets, and the Client never measures. Folded settings bodies and disabled controls have no hit targets. Each tab has its own target; the folded header remains available to reopen the card. Settings share the daily cards' nearest-edge / half-cell slack rules and host body scrolling.

Both `/muslim pane` and a terminal Pane append a settings section grouped in the tab order (عام first, then الصلاة، الأذكار، الذكر), with each current value and its slash command, including the current terminal Arabic mode. Arabic values, category headings and the Spinner explanation pass through the existing `show` callback; desktop chrome is left logical and unshaped.
