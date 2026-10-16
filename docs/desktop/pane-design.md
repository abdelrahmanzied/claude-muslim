# Desktop pane design

The design principles for every drawn desktop pane in this mod (today the Muslim pane, `/muslim pane`, and the Quran pane). They extend [DESIGN.md](../../DESIGN.md) and never contradict it; each pane's own `docs/features/<feature>-design.md` holds its exact layout. Read this before drawing or changing a pane.

## 1. What the Desktop owns, and what we own

- **The frame is the Desktop's.** `$.ui.open` takes `id`, `title`, `focus`, `closeOnEscape` and `holdToasts`, nothing else: no width, height, padding or position. The Desktop adds its own space above the picture and sets the pane's width. We own only the picture inside.
- **The heading starts at the picture's top edge** (`TOP_Y = 0`), since the Desktop's own top space is already there. The picture ends 12px (`PAD`) under the last card.
- **The footer is one shared slot.** On Desktop a plugin reaches the prompt footer only through `SessionMode`: one slot for every plugin, placed and sized by the Desktop, with no size or position prop. Each plugin adds its items next to what `next(e)` returns, so they share one width and long items are cut with `…`. Keep ours to one short plain Button, `☾ Muslim`. Only text and Buttons (string or emoji labels) draw there; Svg and custom fonts do not.

## 2. A fixed picture

- The pane is one Client-drawn SVG picture at fixed pixels. Every height and position is a constant (`layout.ts`, `settings.ts`); nothing is measured.
- Drawing and hit testing read the same constants and rectangles, so a click always means what is drawn under it. A change to one height is a change to both, with tests.
- It must work at the 240px minimum width and at 360px.

## 3. Look

- **Transparent**, like the Quran pane: no panel fill. It follows the app's light or dark scheme, and every color is a token (`--text`, `--muted`, `--line`, feature-specific surface/state tokens, `--accent`); the accent is the plugin-wide main color from `src/shared/color/`.
- **Tajawal** throughout, embedded from `src/shared/font/`.
- **Type scale:** 24px the plugin name «مسلم», 20px the big fact (next prayer), 16px card titles, 14px body and buttons, 12px meta and descriptions. Settings tab labels are 11px so the tabs fit at 240px.
- **Tajawal sits high.** Text beside an icon or a switch gets `line-height:1; transform:translateY(.12em)` so icon, text and control share one center line. Check every icon + text row for this.
- **Icons:** each feature has one standard icon (DESIGN.md §3 Icons, `src/shared/icon/`), 20px in the main color on its card header and 20px on its settings tab. Small row icons (bell, check ring) stay free.

## 4. Cards

- A card: 19px radius, 1px `--line` border, 16px side inset, 12px between cards.
- **Title row:** the feature icon, the title, then at the far end short muted meta and a fold chevron. Pressing anywhere on the row folds the card to that row; the fold is kept in `$.state`.
- **Meta stays short.** Long or secondary facts (the prayer card's city) go on a quiet 12px muted line at the bottom of the card, not in the title row.
- One clear primary action per card at most, a full-width button at the card's end.

## 5. Words

- **Arabic in the pane.** Labels, descriptions, buttons and notes in a pane are Arabic (the pane is a drawn surface for this mod's users, unlike Claude's own chrome). Latin product names (Terminal, Claude, Spinner) stay Latin inside an Arabic line, and commands are LTR in `<bdi>`.
- Keep descriptions to one short line at 360px. No explanations that repeat the label.

## 6. Settings rows

- **Order:** the label at the start; its description right under it (12px muted, 4px gap); then the choices (10px under the description). Rows are 28px apart, measured from a row's last shown line to the next label (a hidden optional line adds no height). No subheader over the rows; the first row starts 16px under the tab bar.
- **Switches** sit on the label's line at the opposite end, never on a line of their own. They flip at once on press (the value is drawn from `$.state` before the config write and its module reload).
- **Color dots** sit on the label's line at the opposite end, like a switch, at their small 16px size.
- **A command is its own button.** When a setting is changed by running a command elsewhere (the terminal check), the button's text is the command itself (no glyph) and one press copies it (`$.ui.copy`, a toast when copying fails). After a copy the button shows «تم النسخ ✓» in the main color for 2 seconds, then the command again. No extra page for one command, no long how-to text.
- A card is only as tall as its visible rows: a hidden line takes its height with it.
- One home per setting: a setting already in another pane (the Quran reciter and repeat) is not repeated here.
- Lists (methods) and steppers (adjustments) may open a detail face with a back control.

## 7. Terminal

A pane is a desktop surface. The terminal gets a text body for the same data (DESIGN.md §1.6), through `src/shared/arabic` for any Arabic.

## 8. Before shipping a pane change

- Light and dark, 240px and 360px.
- Icon and text rows share a center line.
- Hit tests match the drawing (tests on `hitAt`/`settingsBoxes`).
- The feature's design doc and this file still agree.
