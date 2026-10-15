# Muslim pane — design

The Muslim pane's visual means and layout, following [DESIGN.md](../../DESIGN.md). Behavior is in [muslim-pane.md](muslim-pane.md).

## Visual means

A Pane (`$.ui.open({ id: 'muslim', title: 'Muslim' })`) docked beside the «القرآن الكريم» pane, drawn by one Client (`client.tsx`) as an Svg holding HTML and CSS in a foreignObject, the same approach as the Quran pane (the API has no HTML or native card element, so a drawn picture is the only way to match the Desktop's own session-panel cards: rounded bordered cards, a header with a chevron and a value, icon rows, a switch). `view.ts` builds the picture, `layout.ts` holds the fixed pixel layout and the hit testing, `model.ts` the pure data. Colors stay in `view.ts`: dark by default, light under the app's color scheme or the Claude theme row when it names light or dark, and the accent from `src/shared/color/` (the plugin-wide `/muslim color`, orange by default) for the next prayer, the next row, the switch, the progress bars and the play button. Fonts are the system's (no embedded font); Arabic is left exactly as authored on desktop.

**Why a drawn picture:** the same reason as the Quran pane. **Fallback:** the terminal gets a plain text reply from `/muslim pane` and a text body if the pane is placed there; Arabic goes through `src/shared/arabic`.

## Background and font

The pane draws no fill of its own: the root and the cards are `background:transparent` in both themes, so Claude Desktop's panel shows through exactly as in the Quran pane; the cards keep only their 1px border line and rounded corners (the highlighted next-prayer row, the switch and the buttons keep their tints). The type is Tajawal 400 and 700 for Arabic, Latin and numbers alike, embedded through `src/shared/font/` (shared with the Quran pane; weight 500 resolves to 400).

## Title row and folding

Each card's title row is: a small icon in the main color (moon for prayers, the open book for the Quran, sun for the morning athkar and sunset for the evening's), the title, then at the far end the muted meta (city, quarter, `٢٢ / ٢٢`) and a fold control. Pressing anywhere on the row (a pointer cell overlapping it counts, via the half-cell slack) folds the card to just its row and unfolds it again; the chevron points down when open and left (RTL) when folded. Folded cards are 56px tall and the cards below move up; heights and hit boxes come from `cardRects(folds)` in `layout.ts`, and a folded card's inner targets are not hit. The folded state is kept in `$.state` (`muslim.paneFolds`), so it survives redraws and reloads in the session.

## Light and dark

One token set per theme, switched exactly as in the Quran pane: dark by default, light under `prefers-color-scheme: light`. Claude Code's own `theme` row is not read (it can differ from the Desktop's, which made light mode draw with dark tokens). Elements take colors only from the tokens (text, muted, hairline `--line`, raised buttons); no hex outside the palette.

## Footer chip

On Desktop the footer's SessionMode row gets a small `☾` Button owned by this feature (its own `ui.render` hook, registered before Quran's so it is leftmost): `☾`, then the Quran chip, then the prayer text, then the engine's items. It opens the Muslim pane when closed and closes it when open, always just `☾` at any width. Not drawn in the terminal.

## Layout

Three cards stacked in one right-to-left column, 20px outside margin (the Quran pane's side margin) and 12px between cards, 19px corner radius, 1px line border, 16px side padding, 28px header. Every height is a constant (the pane is 20 + prayer + 12 + Quran + 12 + athkar + 20 tall, see `layout.ts`), so the hooks module hit-tests clicks against the same numbers the Client draws with, whatever the data.

Scrolling moves the host's body window over this fixed picture only when there is actual overflow. A person-origin Desktop `ui.scroll` whose clamped offset equals the last rendered offset is consumed without drawing, including wheel/trackpad input over the passive reciter and surah labels and ticks at either edge. `UiScrollInput` has no surface field, so the hook remembers the pane's surface and offset from `ui.render`; it does not infer them from the session. Plugin-origin requests and the terminal text body pass through. The Client has no size polling: `ClientSurface` already calls it on resize, and polling a flickering measured row count only caused redundant `setState` picture swaps for size messages nobody used. Fixed SVG/card heights and the existing pointer mapping stay the same.

- **Prayer** — header «الصلاة» with the city at the left. The next block: «الصلاة القادمة», the name at 28px bold in the main color; at the left the time at 28px and the countdown below. Five 32px rows: icon, name, time at the end; done rows dim with a check ring, the next row tinted 15% main color with a dotted ring, upcoming rows a ring. A divider, then the 40px Athan row: bell, `Athan`, switch at the left end.
- **Quran** — header «القرآن» with the quarter at the left. Two 36px rows (microphone + reciter, book + surah), a 5px bar with LTR elapsed and total under it, three round controls (40px previous and next, 52px play-stop in the main color), then the full-width 42px **Open full player** button.
- **Athkar** — header with the period's title and `٤ / ١٢`, then one 36px row: sunset icon, the bar, a 72px **Open** button at the left end.

## States

- Hover lights a control or button (a hover tint; the play button brightens). The pointer is whole cells on Desktop, so a target counts as hit when the cell overlaps it, the nearest one winning, as in the Quran pane.
- Inactive controls (no Quran catalog yet, first or last surah, no city, athkar off) are dimmed and not hit; Open full player always works.
- No scores or streaks: the athkar fraction is the person's own count, shown only to them.

## Full-player navigation

Open full player is navigation to the existing `quran` id, never a toggle or a new pane instance. Quran reconnects during the Muslim pane render and input chain; it uses the press context to request `focus: true` immediately, before its player queue, including when its tab already exists. Muslim stays open. The host renders the mod panes as sibling tabs in one dock; the API supplies no group selector. The focus request is host-controlled (not an unconditional grant); the installed Desktop allows it from another pane of the same plugin. No button geometry or visual style changes. Native grouping and activation need a live check.
