# Friday — design

Friday's own design. It adds to the shared base in [DESIGN.md](../../../DESIGN.md) and never contradicts it. What the feature does is in [friday spec](friday.md).

## Visual means

- **Names and the thikr line: text only,** exactly as thikr and salah draw them. Jumu'ah is only a different word in the same places.
- **The Al-Kahf card, desktop: a folded-row card above the prompt** built on the shared card shell (`plugin/src/shared/card/`): its frame, ×, hover, lighting and input are the shared ones, so it sits like the athkar and athan cards. Its size is the athkar folded row's (`REST_PX`, the shell's folded height: the × centred on the whole row), and its look is the athkar «frame» look: the same 1.5px frame in the main color with the quiet glow breathing inside it, the app's own light or dark behind. The card draws no border and no clipping of its own; every part is in the flow of one RTL row inside the row's padding (14px at the right, 34px at the left for the ×, plus the shell's own extra over the desktop's card, exactly as the athkar folded row), so nothing sits in the zone the desktop crops. A Client module draws one Svg. From the right: the title «سورة الكهف» in Aref Ruqaa 700 at 17px in the main color (the athkar folded title's rule: `plugin/src/shared/font/` shares the font) and, inline after it, «يوم الجمعة · بصوت <reciter>» in Tajawal 12.5px, dim, which ends in an ellipsis first (the title shortens only after it); then the Quran avatar (`plugin/src/shared/quran-avatar`, at most 36px tall and never taller than the row); then a compact pill (at most 20px tall, 1.5px main-color border, radius 999px, 12px text, a fixed width per OS so its hit area is exact) that fills with the main color on hover; the shared × at the left. **The content cannot outgrow the card, by construction:** the band is one box, the picture's width and height (`height: 100%`, border-box); one row height `--row` is derived from the shell (the picture's height less the shell's padding around the band, the band's extra padding over the desktop's card and the frame's two lines: 21px at the desktop's 20px line), every part is capped at it (`max-height: var(--row)`; the title and subtitle lines are `--row` tall, the avatar and pill shrink to it), nothing is absolutely positioned or pulled out by a negative margin, and the room left over is only padding. The avatar moves as in the Muslim pane while playing, its clock counted from when the card appeared (a redraw carries on) and stopped by `prefers-reduced-motion`. Why a card: it is the one Friday moment worth seeing, once, and the shared shell already solves size, scaling and input on every window width.
- **The pill by OS:** «▶ استمع» on macOS; «↗ افتح في المتصفح» on Windows and Linux, where Claude Code plays no audio (it opens the surah in the browser; a wider pill, 128px against 76px).
- **The Al-Kahf card, terminal: one text line** above the prompt in the shared main color, bold and ending in an ellipsis when narrow (the athkar folded title's own text style: bold, main color, truncate-end), «سورة الكهف · يوم الجمعة · بصوت <reciter>», with a × button; no pill. The Arabic goes through `plugin/src/shared/arabic` like every terminal Arabic.
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
