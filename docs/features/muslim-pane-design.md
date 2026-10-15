# Muslim pane — design

The Muslim pane's visual means and layout, following [DESIGN.md](../../DESIGN.md). Behavior is in [muslim-pane.md](muslim-pane.md).

## Visual means

A Pane (`$.ui.open({ id: 'muslim', title: 'Muslim' })`) docked beside the «القرآن الكريم» pane, drawn by one Client (`client.tsx`) as an Svg holding HTML and CSS in a foreignObject, the same approach as the Quran pane (the API has no HTML or native card element, so a drawn picture is the only way to match the Desktop's own session-panel cards: rounded bordered cards, a header with a chevron and a value, icon rows, a switch). `view.ts` builds the picture, `layout.ts` holds the fixed pixel layout and the hit testing, `model.ts` the pure data. Colors stay in `view.ts`: dark by default, light under the app's color scheme or the Claude theme row when it names light or dark, and the accent from `src/shared/color/` (the plugin-wide `/muslim color`, orange by default) for the next prayer, the next row, the switch, the progress bars and the play button. Fonts use the shared embedded Tajawal face described below; Arabic is left exactly as authored on desktop.

**Why a drawn picture:** the same reason as the Quran pane. **Fallback:** the terminal gets a plain text reply from `/muslim pane` and a text body if the pane is placed there; Arabic goes through `src/shared/arabic`.

## Background and font

The pane draws no fill of its own: the root and the cards are `background:transparent` in both themes, so Claude Desktop's panel shows through exactly as in the Quran pane; the cards keep only their 1px border line and rounded corners (the highlighted next-prayer row, the switch and the buttons keep their tints). The type is Tajawal 400 and 700 for Arabic, Latin and numbers alike, embedded through `src/shared/font/` (shared with the Quran pane; weight 500 resolves to 400). The daily cards use a 13px base, 14px card-title CSS size (the existing `.ar` 1.1em title scale remains), 12px header values, and 14px Quran row text. Prayer rows and the athkar row use a 12.5px base; the prayer names and times retain the `.ar` 1.1em scale, and the athkar off note stays 13px. The next-prayer name and time are 24px, its key and countdown 12px; the remaining notes and timestamps keep their existing sizes. The settings card retains its 14px base, 15.4px title CSS size and all existing text sizes. All fixed heights and vertical centering rules stay unchanged. The previous typography is preserved in git at `126e2bd`.

## Title row and folding

Each card's title row is: a 20px icon in the main color, the feature's standard icon from DESIGN.md §3 Icons and `src/shared/icon/`, the same one its settings tab shows (`sujoodreal` for prayers, `qpane` for the Quran, `horizon` for the athkar in both periods), the title, then at the far end the muted meta (the title and meta use line-height 1 and drop .12em, the Quran pane's fix for Tajawal sitting high, so the text centers on the icon) (city, quarter, `٢٢ / ٢٢`) and a fold control. Pressing anywhere on the row (a pointer cell overlapping it counts, via the half-cell slack) folds the card to just its row and unfolds it again; the chevron points down when open and left (RTL) when folded. Folded cards are 56px tall and the cards below move up; heights and hit boxes come from `cardRects(folds)` in `layout.ts`, and a folded card's inner targets are not hit. The folded state is kept in `$.state` (`muslim.paneFolds`), so it survives redraws and reloads in the session.

## Light and dark

One token set per theme, switched exactly as in the Quran pane: dark by default, light under `prefers-color-scheme: light`. Claude Code's own `theme` row is not read (it can differ from the Desktop's, which made light mode draw with dark tokens). Elements take colors only from the tokens (text, muted, hairline `--line`, raised buttons); no hex outside the palette.

## Footer chip

On Desktop the footer's SessionMode row gets a small `☾` Button owned by this feature (its own `ui.render` hook, registered before Quran's so it is leftmost): `☾`, then the Quran chip, then the prayer text, then the engine's items. It opens the Muslim pane when closed and closes it when open, always just `☾` at any width. Not drawn in the terminal.

## Layout

A heading row, then three daily cards and one settings card stacked in one right-to-left column. The heading (`TOP_Y` 12px, `TOP_H` 36px; the full avatar fills its height, so its top sits 12px (`PAD`) from the pane's top, the same as the bottom margin): the full Muslim avatar, 36px tall and approximately 38.4px wide (`avatar.ts`, the base sprite with nothing in its hands, pixelated, no background) and «مسلم» at 18px bold with a 10px gap at the right edge, 20px in; the LTR `/muslim` label at 12px dim at the left edge, 20px in, never hidden. Both «مسلم» and `/muslim` are vertically centered on the avatar row. It has no hit target. The cards start at `CARDS_TOP` (56px), 12px outside margin (`PAD` in `layout.ts`) and 12px between cards, 19px corner radius, 1px line border, 16px side padding, 28px header. Every height is a constant (the pane is CARDS_TOP + prayer + GAP + Quran + GAP + athkar + GAP + settings + PAD tall, see `layout.ts`), so the hooks module hit-tests clicks against the same numbers the Client draws with, whatever the data.

Scrolling moves the host's body window over this fixed picture only when there is actual overflow. A person-origin Desktop `ui.scroll` whose clamped offset equals the last rendered offset is consumed without drawing, including wheel/trackpad input over the passive reciter and surah labels and ticks at either edge. `UiScrollInput` has no surface field, so the hook remembers the pane's surface and offset from `ui.render`; it does not infer them from the session. Plugin-origin requests and the terminal text body pass through. The Client has no size polling: `ClientSurface` already calls it on resize, and polling a flickering measured row count only caused redundant `setState` picture swaps for size messages nobody used. Fixed SVG/card heights and the existing pointer mapping stay the same.

- **Prayer** — header «الصلاة» with the city at the left. The next block: «الصلاة القادمة», the name at 24px bold in the main color; at the left the time at 24px and the countdown below. Five 32px rows: icon, name, time at the end; done rows dim with a check ring, the next row tinted 15% main color with a dotted ring, upcoming rows a ring. A divider, then the 40px Athan row: bell, `Athan`, switch at the left end.
- **Quran** — header «القرآن» with the quarter at the left. Two 36px rows (microphone + reciter, book + surah), a 5px bar with LTR elapsed and total under it, three round controls (40px previous and next, 52px play-stop in the main color), then the full-width 42px **Open full player** button.
- **Athkar** — header with the period's title and `٤ / ١٢`, then one 36px row: the `horizon` icon, the bar, an 84px ✓ **أتممتُها** button beside the 56px **Open** button at the left end. Finish is present and hit-testable only for an available unfinished period; its space returns to the bar when done. Both buttons use centered 13px text, 10px horizontal inner padding and an 8px gap, sharing the existing quiet raised style and hover tint. Confirmation fills every count through the owning feature's `athkar-finish` action, producing a full fraction and bar and the visible current-period band's existing finale. It neither opens nor unhides a band. Header folding and card height stay unchanged.

## States

- Hover lights a control or button (a hover tint; the play button brightens). The pointer is whole cells on Desktop, so a target counts as hit when the cell overlaps it, the nearest one winning, as in the Quran pane.
- Inactive controls (no Quran catalog yet, first or last surah, no city, athkar off) are dimmed and not hit; Open full player always works.
- No scores or streaks: the athkar fraction is the person's own count, shown only to them.

## Full-player navigation

Open full player is navigation to the existing `quran` id, never a toggle or a new pane instance. Quran reconnects during the Muslim pane render and input chain; it uses the press context to request `focus: true` immediately, before its player queue, including when its tab already exists. Muslim stays open. The host renders the mod panes as sibling tabs in one dock; the API supplies no group selector. The focus request is host-controlled (not an unconditional grant); the installed Desktop allows it from another pane of the same plugin. No button geometry or visual style changes. Native grouping and activation need a live check.

## Settings — approved layout “a” and icon picks

The main-color choices are small 16px dots centered in their press areas, not stretched to the area's shape; the chosen one gets a thin ring around it, with no check mark.

One folded «الإعدادات» card follows athkar. Its 56px header uses the existing card shell, Tajawal, **ترس بأسنان** (`gearteeth`) in the shared accent, the muted «٥ أقسام» count and fold chevron. The separate **عام** tab uses **منزلقات** (`sliders`). State is separate from the three daily folds.

The user approved layout “a” (`strip()` / `.tabs.a` / `.tab`) from the icons-avatars design: one horizontal, non-scrolling RTL row of five equal columns, each with a 24px icon above an 11px label. Order and exact approved icon picks:

| RTL position | Label | Approved icon name | Catalog id |
| --- | --- | --- | --- |
| 1 (rightmost) | عام | منزلقات | `sliders` |
| 2 | الصلاة | سجود واقعي | `sujoodreal` |
| 3 | القرآن | مصحف pane القرآن (الحالي) | `qpane` |
| 4 | الأذكار | شروق وغروب | `horizon` |
| 5 (leftmost) | الذكر | حبّات Spinner | `spinbeads` |

All six chosen SVG fragments (including `gearteeth`) are copied verbatim from the approved catalog. `qpane` is the Quran pane’s mushaf silhouette fitted to 24px; Every card header uses its feature's tab icon (DESIGN.md §3 Icons): `sujoodreal`, `qpane`, `horizon`. The الذكر label is exactly «الذكر»; its body begins with the explanation that it controls the thikr shown in Claude Code’s **Spinner** (the working line), with Spinner in English.

The accordion was replaced to eliminate category-row scrolling and reach any category in one tap. A raised rounded strip holds muted tabs; the selected tab uses the card-face token, shared main-color accent and a hairline ring. General is selected on first open, and one category is always selected while open. Repressing the selected tab does nothing, preserving its face/page; switching tabs resets to main/page 0. Sub-faces and «رجوع» remain beneath the strip.

Geometry: `widthOf` clamps the picture to 240–1200px (8.4px per reported column, 360px fallback). Cards have 12px outer insets. The strip has 16px card insets, a 1px border, 4px padding and 4px gaps. At 240px, the card is 216px, the strip 184px and each tab 31.6px wide. Strip height is fixed at 60px; tab height is 50px: 4px padding, a 24px icon, 4px gap, one 14px label line and 4px padding, with no spare space under the label. Labels stay on one line (the longest, «الأذكار», fits a 31.6px tab at 11px). The Client never measures labels. The body starts at card y=128 (56px header + 60px strip + 12px gap).

The non-null selected category lives in `paneSettings`. `isSettings` rejects null categories. `loadSettings` safely maps valid legacy null-category accordion state to general/main/page 0, preserving open/closed state, without a render-time write. Invalid saved data falls back to folded general. The next input naturally saves normalized state.

Category bodies retain switches, selected pills, signed minute / bounded seconds steppers, four shared color swatches, value buttons and the same hints as the prototype. Arabic labels are UI chrome. Religious samples are the existing authored closing phrase and athkar title; display follows tashkeel. Demo-only notes and demo controls are omitted. Main rows reserve fixed extra space for optional Before-minutes and Seconds controls, so changing those modes never needs measurement. At widths below 360px controls sit below labels; heights remain identical.

`settings.ts` owns the category/body constants, pure row data, control effects and control rectangles; both SVG drawing and layout hit testing consume them. Main body heights: prayer 478px, Quran 196px, athkar 274px, thikr 448px, general 310px. Detail heights: methods and reciters 440px, adjustments 436px, city and terminal command sheets 292px. The open card is `128 + selected-body + 12`; folded it is 56. Each tab rectangle follows the same nearest-edge / half-cell slack arbitration as the controls. Tab and body targets disappear when folded, while the independent fold header can reopen the card; only the selected body has targets. The surrounding host scrolls the resulting fixed picture with the existing no-movement redraw suppression unchanged.

Long lists are paged, six 52px slots per page, retaining all 20 methods and every Quran-owned recording. The last page keeps the same six slots and body height; paging controls are disabled at the ends. No inner HTML scroll and no measured list height. Lists and steppers have a «رجوع» subheader. City invokes the existing Salah question directly from the press context and keeps a command sheet with Copy; terminal Arabic only opens its command sheet with Copy. Values come from current normalized options and Quran's read-only settings feed, without a competing store.

The terminal gets all settings and their commands in tab order, عام first and the exact heading الذكر, through the existing Arabic `show` path. Native Desktop painting and scroll feel still require a live host check; engine tests prove geometry, input routing, state and API calls.
