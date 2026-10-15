# Muslim pane — today's prayers, the Quran player and the athkar in one place

A docked pane titled «Muslim» on Claude Desktop that gathers the three things the plugin shows over a day: the prayer times, the Quran player's controls and the athkar progress. It sits as a tab beside the «القرآن الكريم» pane. Its design is [muslim-pane-design.md](muslim-pane-design.md).

## Command

- `/muslim pane` opens the pane (desktop). In the terminal it replies with the same three cards as plain text, Arabic through `src/shared/arabic`.

The pane has no setting of its own and no off switch: it is a view, and each card follows its feature (a card whose feature is off or not set up says so quietly).

## Footer chip

On Desktop a `☾` chip at the left of the prompt footer (before the Quran chip and the prayer text) toggles the pane: it opens it when closed and closes it when open. It is always just `☾`.

## The three cards

1. **الصلاة** — the city on the left of the header. A large «الصلاة القادمة» block with the next prayer's name in the main color, its time and a countdown (`in 1h 12m`, `in 12m`, `in <1m`). Today's five prays (Fajr, Dhuhr, Asr, Maghrib, Isha): past ones are done (check icon, dim), the next is highlighted in the main color, the rest upcoming (ring icon). After Isha every row is done and the next block shows tomorrow's Fajr. Under the rows an **Athan** row with a switch: pressing the row turns `salahAthan` on or off (the same setting as `/salah athan on|off`; the module reloads). No city: a note points to `/salah city`.
2. **القرآن** — the header value is the quarter being played (`المقطع ٣ من ١٦`) when the surah is split. Reciter row, surah row, a progress bar with elapsed and total times, and the previous / play-stop / next controls (they do what the Quran pane's do, including moving between quarters), then **Open full player**, which opens and raises the «القرآن الكريم» tab beside Muslim in the same Desktop mod-pane dock, including when Quran is already open. It does not close either pane or start audio. Before the Quran catalog has been fetched once the rows show a dash, the controls are inactive and only **Open full player** works.
3. **أذكار الصباح / المساء** (the period now) — the header value is the number of athkar completed of the total (`٤ / ١٢`), then a progress bar and **Open**, which brings the athkar reader above the prompt (unhiding it if it was hidden) and lights it. With athkar off the card says `/athkar on`.

Each card's title row folds and unfolds the card (press anywhere on the row); the folded state is kept for the session.

Keys with the pane focused: space or enter plays and stops, left and right move previous and next.

## How the pane gets its data and performs actions

The pane never imports another feature. `src/shared/panel/signal.ts` holds transient module values (no saved state, no `$.state`): each feature connects, from its own hooks, a reader for what the pane shows and a starter for what the pane may ask of it, and the pane calls them.

| Card | Data | Action |
| --- | --- | --- |
| Prayer | salah connects `panelSalah(options, now)` (pure, `src/features/salah/panel.ts`: today's times for the saved place, method and adjustments, and the next pray) when it installs | the Athan row: `$.config.set({ key: 'muslim.salahAthan' })` by the pane |
| Quran | Quran connects a reader of the selected reciter, surah, quarter, elapsed, total and progress from the same model its pane draws, on each footer-chip or Muslim-pane draw and before each Muslim-pane input | `quran-toggle`, `quran-prev`, `quran-next` use the pane's own handlers; `quran-open` immediately calls `$.ui.open` for `quran` with `focus: true`, then initializes the player through its existing queue |
| Athkar | athkar connects a reader of today's reading in the period now on each band draw, only while athkar is on | `athkar-open` unhides, opens and lights the reader |

A reload clears the connections; each feature connects again on its next draw (the module asks for a redraw at start). The Muslim render and input hooks continue the hook chain first, so Quran can connect without a footer draw and refresh its closures with the current input context. Quran navigation happens before queued catalog/recording work; initialization skips a redundant pane-open call. An unplaced/refused open shows the existing short unavailable toast. Other presses whose feature is not connected show a short toast.

While the pane is open a clock redraws it every second while the Quran plays and once a minute otherwise (the countdown); the clock stops when the pane closes.

## Notes

- Religious text is authored data and never generated: the athkar title comes from the athkar data (tashkeel follows the `tashkeel` setting), prayer names from `src/shared/pray/names.ts`. The English chrome (`Athan`, `Open`, `Open full player`, `in 1h 12m`) is UI text.
- Prayer times are calculated locally, no network.

Desktop owns tab grouping and focus. This build exposes no group/placement argument or unconditional activation method. The installed Desktop renders the session's mod panes in one dock and permits a focus request from another pane of the same plugin. Engine tests verify first/repeated opens, coarse input, missing catalog/footer, pending preparation and unplaced results; native activation/paint still needs a live Desktop check.
