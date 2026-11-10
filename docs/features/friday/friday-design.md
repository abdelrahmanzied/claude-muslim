# Friday — design

Friday's own design. It adds to the shared base in [DESIGN.md](../../../DESIGN.md) and never contradicts it. What the feature does is in [friday spec](friday.md).

## Visual means

- **Names and the thikr line: text only,** exactly as thikr and salah draw them. Jumu'ah is only a different word in the same places.
- **The Al-Kahf card, desktop: a card above the prompt** built on the shared card shell (`plugin/src/shared/card/`): its frame, ×, hover, lighting and input are the shared ones, so it sits like the athkar and athan cards. A Client module draws one Svg: a 1.5px frame in the shared main color; at the right, the title «سورة الكهف» in Aref Ruqaa 700 at 28px in the main color (the athkar cover's font, shared from `plugin/src/shared/font/`) and under it «يوم الجمعة · بصوت <reciter>» in Tajawal 12.5px, dim; at the left, the pill, then the Quran avatar (`plugin/src/shared/quran-avatar`, 70px tall on the card's bottom edge), then the text. The pill has a main-color border and fills with it on hover; it sits right of the shared × and left of the avatar. The avatar moves as in the Muslim pane while playing, its clock counted from when the card appeared (a redraw carries on) and stopped by `prefers-reduced-motion`. The pill, avatar and × are fixed; the text takes the rest and its lines end in an ellipsis before anything overlaps. Why a card: it is the one Friday moment worth seeing, once, and the shared shell already solves size, scaling and input on every window width.
- **The pill by OS:** «▶ استمع» on macOS; «↗ افتح في المتصفح» on Windows and Linux, where Claude Code plays no audio (it opens the surah in the browser; a wider pill).
- **The Al-Kahf card, terminal: one text line** above the prompt in the shared main color, «سورة الكهف · يوم الجمعة · بصوت <reciter>», with a × button; no pill. The Arabic goes through `plugin/src/shared/arabic` like every terminal Arabic.
- **Icon:** the mosque, key `mosque` in `plugin/src/shared/icon/`. It marks the feature on the pane's «الجمعة» settings tab (listed in DESIGN.md's icon table); the card itself carries no icon.
- Motion: only the avatar's, as in the pane; the card appears and disappears in place.

## One card at a time

Only one card shows above the prompt (DESIGN.md §2). The reminder never replaces another: while the athan card or minaret shows (read from salah's state) or the athkar band stands unfolded (cover, reading, question, finale or done; marked in `shared/card/slot.ts`), it waits. A folded athkar row, and an athkar band that has closed after its finale, do not block it.

## Surfaces

| Moment | Surface | What changes |
| --- | --- | --- |
| Friday's Dhuhr slot | Every place a prayer name shows | الجمعة / Jumu'ah |
| Friday from Fajr | Spinner | Salawat (thikr's own phrases) |
| Friday, Dhuhr + 30 min to Maghrib | AbovePrompt, desktop Client card | «سورة الكهف», «يوم الجمعة · بصوت <reciter>», the avatar, the pill and × |
| Same, terminal | AbovePrompt text row | «سورة الكهف · يوم الجمعة · بصوت <reciter>» and × |
| Quran player, Friday | Muslim pane Quran card | a «سورة الكهف» button (plays, or opens the browser on Windows and Linux) |
| Settings | Command reply, pane «الجمعة» tab | two switches |

## Input

Desktop: click the pill plays (or opens the browser), click × closes; Enter or Space presses the pill, Escape closes. The avatar and the text are not targets. Terminal: the × button (a press); no ▶. The framed controls are pressed anywhere in their frame (DESIGN.md §2).

## Demo

`/friday demo` and the shared demo draw the same card on both surfaces for 8 seconds, with three rows beside it: the pray line «☾ الجمعة ١٢:٣٠» (the shared pray-line code on a fixed Friday), one salawat in the main color (the thikr line's phrase) and the pane's «سورة الكهف» button as a text row (`[ سورة الكهف ]` on desktop, `سورة الكهف · /friday kahf` on the terminal). The pill closes the demo instead of playing. The demo only drives drawing: settings, store and state are untouched.

## Checklist for a change

- [ ] The card still comes from the shared card shell; no second frame or close.
- [ ] It never shows over another card above the prompt.
- [ ] Terminal fallback keeps the same words and timing.
- [ ] Main-color text uses the shared palette.
- [ ] The religious text is only what [friday content](friday-content.md) lists.
