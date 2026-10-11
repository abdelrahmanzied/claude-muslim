# Salah — design

The salah feature's own design. It adds to the shared base in [DESIGN.md](../../DESIGN.md) and never contradicts it. What the feature does is in [salah.md](salah.md).

## Visual means

- **Text by default.** The status line, the setup line, the review form and command replies are text in Claude's font, size and theme colors (`color="claude"` for the accent, `dimColor` for hints).
- **The adhan moment may be richer.** When a prayer comes in, a short look plays once (about 3 seconds), then rests as one line. Its look is being chosen in the [Adhan Lab](https://claude.ai/artifact/EyjJvfhhV6asq9VXbKY3YE):
  - text frames that work on every surface (words appearing, a shimmer, falling ✦ ☾, a Unicode minaret, a brightening crescent), or
  - a drawing on desktop only (`Svg`: mosque at dusk, Kaaba, crescent, lantern), always with a text fallback in the terminal.
- **Until picked,** the moment is the text line alone.

**Why:** prayer time is a few moments a day and worth marking; the rest of the day salah stays a quiet line.

## Surfaces

| Moment | Surface | Shows |
| --- | --- | --- |
| No city yet | AbovePrompt band | One line: the guessed city, **Yes**, **Another city**, **Not now** |
| City saved, or `/salah adjust` | AbovePrompt band | Today's times, − and + per prayer, **Save**, **Skip** |
| All day (mode `always`) | Status line | `☾ العصر ١٥:٥٩`; empty in `reminder` mode |
| Reminder window (`salahReminder`, 20 min by default) | Status line | `☾ العصر ١٩:٤٢`, a live mm:ss countdown, once a second |
| Reminder starts | Toast (in-app) | One short line, closes by itself |
| Prayer comes in | Status line (+ the adhan look) | `حان وقت صلاة العصر` for 15 minutes (`salahAdhan`) |
| Claude works in the window | Spinner (thikr line) | حَيَّ عَلَى الصَّلَاةِ joins the thikr rotation |
| Settings and help | Command reply | `/salah`, `/salah help` table, `/muslim help` |

## Never

- **No OS notification.** Banners show in meetings and screen shares; reminders stay inside Claude Code (status line and toast).
- **No sound** unless a later setting asks for it.
- **No location service or IP lookup.** The city comes from the time zone or what the user types.

## Text

- Prayer names in Arabic in lines (الفجر، الظهر، العصر، المغرب، العشاء), in English in commands (Fajr, Dhuhr, Asr, Maghrib, Isha).
- حان وقت صلاة … and حَيَّ عَلَى الصَّلَاةِ are authored text with tashkeel, never generated.
- Digits: Arabic-Indic by default (`١٥:٥٩`); a Latin option is being chosen in the lab.
- Countdown: `mm:ss` in Arabic digits inside the reminder window, redrawn each second only there (30 s outside). The toast keeps minutes in words.
- Minutes in words: دقيقة، دقيقتين، ٣ دقائق، ١١ دقيقة.

## Checklist for a change

- [ ] Every richer look has a terminal text fallback, tested on `terminal` and `desktop`.
- [ ] No OS notification, no sound, no network.
- [ ] Colors are theme keys where text is used.
- [ ] The moment plays once and clears itself (see DESIGN.md, Time-based behavior).
