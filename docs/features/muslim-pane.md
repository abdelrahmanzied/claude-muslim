# Muslim pane — today's prayers, the Quran player and the athkar in one place

A docked pane titled «Muslim» on Claude Desktop that gathers the three things the plugin shows over a day: the prayer times, the Quran player's controls and the athkar progress. It sits as a tab beside the «القرآن الكريم» pane. Its design is [muslim-pane-design.md](muslim-pane-design.md).

## Command

- `/muslim pane` opens the pane (desktop). In the terminal it replies with the daily cards and settings as plain text, Arabic through `src/shared/arabic`.

The pane has no userConfig field of its own and no off switch: it is a view, and each card follows its feature (a card whose feature is off or not set up says so quietly).

## Footer chip

On Desktop a `☾` chip at the left of the prompt footer (before the Quran chip and the prayer text) toggles the pane: it opens it when closed and closes it when open. It is always just `☾`.

## The three cards

1. **الصلاة** — the city on the left of the header. A large «الصلاة القادمة» block with the next prayer's name in the main color, its time and a countdown (`in 1h 12m`, `in 12m`, `in <1m`). Today's five prays (Fajr, Dhuhr, Asr, Maghrib, Isha): past ones are done (check icon, dim), the next is highlighted in the main color, the rest upcoming (ring icon). After Isha every row is done and the next block shows tomorrow's Fajr. Under the rows an **Athan** row with a switch: pressing the row turns `salahAthan` on or off (the same setting as `/salah athan on|off`; the module reloads). No city: a note points to `/salah city`.
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

## Settings card (option B)

After the three daily cards, one **الإعدادات** card starts folded to its 56px title row (gear, title, five-section count, chevron). Opening it shows **الصلاة، القرآن، الأذكار، الذكر، عام**. Only one category is open at a time; pressing its row again closes it. Category changes reset the detail face and page. The open card, category, face and page live in session state `muslim.paneSettings`, guarded by `isSettings`, and survive reloads. Daily-card folds remain independent in `paneFolds`.

| Category | Setting | Control / command |
| --- | --- | --- |
| الصلاة | `salahShow` | Always / Before / Off; Before has a 1–720 minute stepper. `/salah show` |
| الصلاة | `salahAthan` | Switch; the same value as the daily Athan row. `/salah athan` |
| الصلاة | `salahPlace` | City row opens Salah's existing question, city resolution, config save and review flow. `/salah city` |
| الصلاة | `salahMethod` | All 20 manifest options, auto first. `/salah method` |
| الصلاة | `salahAdjust` | Six signed whole-minute steppers, including sunrise. Uses the shared `readAdjust` / `writeAdjust` format in `src/config.ts`. `/salah adjust` |
| القرآن | Reciter | Full Quran-owned complete Hafs catalog; `quran-reciter` passes the selected recording key to Quran, which validates it and uses its command selection path. Saved in `quran.reciter`, never userConfig. `/quran reciter` |
| القرآن | Repeat | Off / Surah / Segment; `quran-repeat` uses Quran's repeat logic and session state. Segment is disabled for an unsplit selection. `/quran repeat [segment]` |
| الأذكار | `athkar` | Reader switch. `/athkar on` or `off` |
| الأذكار | `athkarStyle` | Sky / Frame pills and a quiet sample. `/athkar style` |
| الذكر | `thikr` | Switch. `/thikr on` or `off` |
| الذكر | `thikrMode` | All / Salawat pills. `/thikr mode` |
| الذكر | `thikrSpeed` | Auto / Seconds, then a 1–60 second stepper. `/thikr speed` |
| الذكر | `thikrEnd` | Terminal end-of-turn switch and the authored closing phrase. `/thikr end` |
| عام | `color` | Four shared accent swatches. `/muslim color` |
| عام | `tashkeel` | Desktop display switch. `/muslim tashkeel` |
| عام | Terminal Arabic | A command sheet with Copy; run `/muslim terminal-arabic` in the terminal being configured. No desktop switch. |

All 13 userConfig fields write through `$.config.set({ key: 'muslim.<field>', value })`, including the city owned by Salah. Denials show a toast; module reload after a successful write is expected. The pane never imports another feature. Quran connects a read-only catalog/selection/repeat feed; opening its reciter list can fetch the catalog through `quran-catalog` in input context. A missing catalog leaves a command hint, not invented reciters. Salah connects `salah-city` in the current pane input context, so `$.ui.ask` runs the same flow as its slash command. The city detail face also retains `/salah city` and Copy as a handoff reference.

Methods, reciters, adjustments and command sheets have a **رجوع** row returning to the category's main rows. Method and reciter selections return there too. Long lists use **six 52px slots per page**, with fixed Previous / Next controls, page count and a fixed 440px body even on the last page. Every reciter remains reachable; no catalog-size cap or nested scrolling is used. All other category and detail heights are constants in `settings.ts`; the Client never measures. Folded card bodies, closed categories and disabled controls have no hit targets. Settings share the daily cards' nearest-edge / half-cell slack rules and host body scrolling.

Both `/muslim pane` and a terminal Pane append a settings section with each current value and its slash command, including reciter, repeat and the current terminal Arabic mode. Arabic values and the settings heading pass through the existing `show` callback; desktop chrome is left logical and unshaped.
