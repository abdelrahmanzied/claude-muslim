# Friday — design

Friday's own design. It adds to the shared base in [DESIGN.md](../../../DESIGN.md) and never contradicts it. What the feature does is in [friday spec](friday.md).

## Visual means

- **Names and the thikr line: text only,** exactly as thikr and salah draw them. Jumu'ah is only a different word in the same places.
- **The Al-Kahf card, desktop: a card above the prompt** built on the shared card shell (`plugin/src/shared/card/`): its frame, ×, hover, lighting and input are the shared ones, so it sits like the athkar and athan cards. A Client module draws one Svg: a frame in the shared main color, the title «الجمعة · سورة الكهف» centered in bold Tajawal (the shared font), and a round ▶ at the left beside the shared ×. Why a card: it is the one Friday moment worth seeing, once, and the shared shell already solves size, scaling and input on every window width.
- **The Al-Kahf card, terminal: one text line** above the prompt in the shared main color with a × button; no ▶. The Arabic goes through `plugin/src/shared/arabic` like every terminal Arabic.
- **Icon:** the mosque, key `mosque` in `plugin/src/shared/icon/`. It marks the feature on the pane's «الجمعة» settings tab (listed in DESIGN.md's icon table); the card itself carries no icon.
- No animation of its own; the card appears and disappears in place.

## One card at a time

Only one card shows above the prompt (DESIGN.md §2). The reminder never replaces another: while the athan card or minaret shows (read from salah's state) or the athkar band stands unfolded (cover, reading, question, finale or done; marked in `shared/card/slot.ts`), it waits. A folded athkar row, and an athkar band that has closed after its finale, do not block it.

## Surfaces

| Moment | Surface | What changes |
| --- | --- | --- |
| Friday's Dhuhr slot | Every place a prayer name shows | الجمعة / Jumu'ah |
| Friday from Fajr | Spinner | Salawat (thikr's own phrases) |
| Friday, Dhuhr + 30 min to Maghrib | AbovePrompt, desktop Client card | «الجمعة · سورة الكهف» with ▶ and × |
| Same, terminal | AbovePrompt text row | the same words and × |
| Quran player, Friday | Muslim pane Quran card | a «سورة الكهف» button |
| Settings | Command reply, pane «الجمعة» tab | two switches |

## Input

Desktop: click ▶ plays, click × closes; Enter or Space plays, Escape closes. Terminal: the × button (a press); no ▶. The framed controls are pressed anywhere in their frame (DESIGN.md §2).

## Demo

`/friday demo` and the shared demo draw the same card with the same surfaces for 6 seconds, ▶ closing it instead of playing. The demo only drives drawing: settings, store and state are untouched.

## Checklist for a change

- [ ] The card still comes from the shared card shell; no second frame or close.
- [ ] It never shows over another card above the prompt.
- [ ] Terminal fallback keeps the same words and timing.
- [ ] Main-color text uses the shared palette.
- [ ] The religious text is only what [friday content](friday-content.md) lists.
