# Desktop pane design

The design principles for every drawn desktop pane in this mod (today the Muslim pane, `/muslim`; the Quran player is its card). They extend [DESIGN.md](../../DESIGN.md) and never contradict it; each pane's own `docs/features/<feature>-design.md` holds its exact layout. Read this before drawing or changing a pane.

## 1. What the Desktop owns, and what we own

- **The frame is the Desktop's.** `$.ui.open` takes `id`, `title`, `focus`, `closeOnEscape` and `holdToasts`, nothing else: no width, height, padding or position. The Desktop adds its own space above the picture and sets the pane's width. We own only the picture inside.
- **The heading starts at the picture's top edge** (`TOP_Y = 0`), since the Desktop's own top space is already there. The picture ends 12px (`PAD`) under the last card.
- **The footer is one shared slot.** On Desktop a plugin reaches the prompt footer only through `SessionMode`: one slot for every plugin, placed and sized by the Desktop, with no size or position prop. Each plugin adds its items next to what `next(e)` returns, so they share one width and long items are cut with `…`. Keep ours to one short plain Button, `☾ Muslim`, shown while `paneButton` is on (default). The pane and `/config` can turn it off; `/muslim` still opens the pane. Only text and Buttons (string or emoji labels) draw there; Svg and custom fonts do not.

## 2. A fixed picture

- The pane is one Client-drawn SVG picture at fixed pixels. Every height and position is a constant (`layout.ts`, `settings.ts`); nothing is measured.
- Drawing and hit testing read the same constants and rectangles, so a click always means what is drawn under it. A change to one height is a change to both, with tests.
- A framed button or box takes a press anywhere in its frame (DESIGN.md §2), never only on its words, plus a margin of 10px each side and 4px above and below (`BUTTON_SLOP`; a whole-cell press whose row touches the frame already counts, so a wider margin would only light it below): every settings control and tab, the number boxes, the athkar row's buttons, its title button and set menu, and the Quran fields, Retry and «استمع في المتصفح ↗». Card title rows (the folds) and the Athan row take only their own area. The distance counts from the drawn edge, so a press inside one button always picks it and a press between two picks the nearer.
- Framed controls stacked one above another are at least 24px apart (`STACK_GAP`, more than Desktop's ~20px pointer cell), so a whole-cell press near one never picks the other. Side-by-side pills keep their 4px gap: a cell is only about 8px wide. Prefer putting a number box beside its choice on the same line, so no control sits right above it.
- Desktop lays the picture into whole rows of about 19.25px, rounded up, so `height / rows` is a little short of a row and a press low in a long pane used to come in a whole row too high. A reported row is read as `ROW_PX` (19.25px) wherever the pane's height and row count allow it, else as `height / rows` (`plugin/src/shared/card/pointer.ts`).
- It must work at the 240px minimum width and at 360px.

## 3. Look

- **Transparent**: no panel fill. It follows the app's light or dark scheme, and every color is a token (`--text`, `--muted`, `--line`, feature-specific surface/state tokens, `--accent`); the accent is the plugin-wide main color from `plugin/src/shared/color/`.
- **Tajawal** throughout, embedded from `plugin/src/shared/font/`.
- **Type scale:** 24px the plugin name «مسلم», 20px the big fact (next prayer), 16px card titles, 14px body and buttons, 12px meta, descriptions and the athkar row's compact buttons. Settings tab labels are 11px so the tabs fit at 240px. A two-line religious settings sample may fit its first line down to 10.5px at the 240px minimum, keeping both lines complete and the normal 16px line-height; it returns to 12px when space permits.
- **Tajawal sits high.** Text beside an icon or a switch gets `line-height:1; transform:translateY(.12em)` so icon, text and control share one center line. Check every icon + text row for this.
- **Icons:** each feature has one standard icon (DESIGN.md §3 Icons, `plugin/src/shared/icon/`), 20px in the main color on its card header and 20px on its settings tab. Small row icons (bell, check ring) stay free.

## 4. Cards

- A card: 12px radius (as Claude Desktop's own cards), 1px `--line` border, 16px side inset, 12px between cards.
- **Title row:** the feature icon, the title, then at the far end short muted meta and a fold chevron. Pressing anywhere on the row folds the card to that row (except where the title is itself a menu, as in athkar, which folds by its chevron); the fold is kept in `$.state`.
- **Meta stays short.** Long or secondary facts (the prayer card's city) go on a quiet 12px muted line at the bottom of the card, not in the title row.
- One clear primary action per card at most, a full-width button at the card's end.

## 5. Words

- **Arabic in the pane.** Labels, descriptions, buttons and notes in a pane are Arabic (the pane is a drawn surface for this mod's users, unlike Claude's own chrome). Latin product names (Terminal, Claude, Spinner) stay Latin inside an Arabic line, and commands are LTR in `<bdi>`.
- Keep chrome descriptions to one short line at 360px; only these may ellipsize as a guard at narrower widths. Arabic religious text must never ellipsize or clip: give it explicit lines and enough fixed row height, preserving the normal gap after its last line. No explanations that repeat the label.

## 6. Settings rows

- **Order:** the label at the start; its description right under it (12px muted, 4px gap); then the choices (10px under the description). Rows are 28px apart, measured from a row's last shown line to the next label (a hidden optional line adds no height). No subheader over the rows; the first row starts 16px under the tab bar.
- **Groups:** one rosette rule marks each change of purpose between settings rows within a tab, never a box border. Use the original Quran pane’s eight-point rosette: 18px, `viewBox="0 0 40 40"`, `fill:none`, `stroke:currentColor`, `stroke-width:1.8`, in `--accent`, with an explicit SVG namespace. Two 1px arms at 80% opacity fade from the dimmer accent token `--ornament-dim` beside it to transparent toward the card edges. Model it as a fixed-height data row with no controls or hit target, counted in the same heights used for drawing and hit tests. Keep even space above and below in the row-gap rhythm.
- **Switches** sit on the label's line at the opposite end, never on a line of their own. They flip at once on press (the value is drawn from `$.state` before the config write and its module reload).
- **Inline buttons** may share the label line at the opposite end, like switches: compact value-style outline, 22px high (`LABEL_H`), 12px text centered with the same Tajawal `translateY(.12em)` rule. Reserve the button width plus a 12px gap in the label’s max-width. These use the same 70px row height, control rectangles and disabled/no-hit behavior as switches.
- **Color dots** sit on the label's line at the opposite end, like a switch, at their small 16px size.
- **A command is its own button.** When a setting is changed by running a command elsewhere (the terminal check), the button's text is the command itself (no glyph) and one press copies it (`$.ui.copy`, a toast when copying fails). After a copy the button shows «تم النسخ ✓» in the main color for 2 seconds, then the command again. No extra page for one command, no long how-to text.
- **Chat actions** (update and feedback) use one Arabic value-style button and run the existing slash command from the input hook. No command logic is copied into the pane. The version hint is LTR; commands embedded in descriptions stay in LTR `<bdi>`. The background-update switch uses its owner’s connected reader and action, with immediate session-state feedback and a toast on failure, without a chat reply.
- **Numbers are typed in a number box**, never stepped with − / +: one framed 100px × 28px target beside its choice, or 24px under choices when a separate line is needed (`STACK_GAP`), pressed anywhere in its frame, its number LTR in `<bdi>` followed by its unit in 12px `--muted` («دقيقة» or «ثانية»), so every number says what it counts. A press opens it (a 1.5px `--accent` frame, the value dim until typing starts, an `--accent` caret) and the pane's own typed keys (the Client's `onKey` path the Quran search uses) fill it: Latin, Arabic-Indic or Persian digits, and one leading sign only where negatives count, at most 5 characters. Enter saves a whole number in the setting's range and closes the box; anything else is not saved, keeps the box open and shows an English toast with the range. Escape, Tab or a press anywhere else closes it unsaved. While open its row's muted line reads «Enter للحفظ». The open box is `$.state` `muslim.paneField` (`{ id, text }`), cleared before the save since a saved setting reloads the module.
- A card is only as tall as its visible rows: a hidden line takes its height with it.
- One home per setting: a setting already in another pane (the Quran reciter and repeat) is not repeated here.
- Lists (methods) and groups of number boxes (adjustments) may open a detail face with a back control.

## 7. Terminal

A pane is a desktop surface. The terminal gets a text body for the same data (DESIGN.md §1.6), through `plugin/src/shared/arabic` for any Arabic.

## 8. Before shipping a pane change

- Light and dark, 240px and 360px.
- Icon and text rows share a center line.
- Hit tests match the drawing (tests on `hitAt`/`settingsBoxes`).
- The feature's design doc and this file still agree.
