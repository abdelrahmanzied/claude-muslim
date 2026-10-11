# Athkar reader — design rules

The rules the athkar reader follows. The feature spec (what it shows, settings, looks) is in [design.md](design.md#morning-and-evening-athkar-030); the mod-wide rules are in [DESIGN.md](../DESIGN.md). Change a rule here first, then the code and its tests.

## Scope

- Desktop app and terminal only. No phone layouts or phone-width checks.
- Few settings, simple rules: on/off, style (sky or outline) and color. Nothing else is customizable.

## Size

- **Fixed height.** The open reading and the cover are one height for every thikr, count and width: 77px on desktop. Faded, they fold to one 24px row. The done row is 56px.
- **Width follows the window.** The band is as wide as the app's card above the prompt.
- **Fixed text size: 14px.** There is no size setting.
- **Long text shrinks to fit.** The text box is two lines of 14px. A thikr that does not fit shrinks just enough to fit the box, with no floor. In a very narrow window the words get small, but they never leave the box or cover the progress line. The band never grows taller.
- **The person owns the window.** A narrow window means smaller words; that is their choice, not a case the band works around.

## Counts

- Every thikr's count comes from the data file (`src/features/athkar/data.ts`) only. There is no choice of counts at reading time (no 10 | 100 switch): 91 and 92 are a hundred, 98 is ten.
- The repetitions left show in a pill on the progress line's head. No circles.

## Clicks and keys

- The first click on a faded band only lights it; it never counts.
- On the cover, the next click opens the reading; it does not count either. After that, clicks count.
- The cover lists no Esc key: the mod never receives Esc (see rule 4).
- Click, Space or Enter counts. Right click or Backspace takes one back. ← next, → previous.
- × hides the band for this period and keeps the reading. `/athkar` brings it back.

## When it folds (collapse rules)

The band is lit while the person uses it, by mouse or keyboard, and folds by itself once they stop.

| # | Case | Rule |
| --- | --- | --- |
| 1 | The pointer leaves the band | Folds after 1 second. Coming back within that second keeps it open. |
| 2 | Counting by keys with the pointer off the band | Folds 3 seconds after the last key. Each key starts the 3 seconds again. |
| 3 | Typing in the prompt | Folds at once. |
| 4 | Esc | Gives the keyboard back to the prompt. The mod never receives Esc, so rule 2 folds the band 3 seconds after the last key. |
| 5 | A click anywhere else | The app sends mods no signal for it; rules 1 and 2 cover it. |
| 6 | No input at all | Folds after 90 seconds, as a backup. |
| 7 | × | Hides the band (see above). |

Counting by keys with the pointer on the band keeps it open until the pointer leaves (rule 1) or rule 6.

## End

- The finale (desktop): falling stars, and the end verse ﴿رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ﴾ rising centered with — البقرة ١٢٧, at a fixed 18px.
- After it, the done row: the verse and — البقرة ١٢٧ on the right, the reset hint (`/athkar morning reset to read again`) on the left.
- The end verse is always in the words' face (Tajawal), in the finale and the done row alike.
- Its color: on a sky, the words' color (white or dark, as the sky's text); on Outline, the main color (the frame's and the progress line's).
- Faded, the done row folds to one slim row like the reading: the verse alone, no reference. The finale (falling stars) never folds.

## Looks

- Two styles: Sky (default) and Outline. Sand was dropped.
- Main color: orange, green, gold or blue.

## Limits of the mod API

- The band always sits in the app's slot above the prompt; a mod cannot place it below the input or above the branch bar.
- No signal for a click elsewhere or for Esc (see rules 4 and 5).
- No cursor shape: the × shows its hover with a light disc instead of a pointer cursor.
