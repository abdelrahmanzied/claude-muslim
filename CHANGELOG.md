# Changelog

## 0.1.0

The first public release.

### Thikr line

- A short thikr joins Claude's working line while it works: starting phrases, tasbih while it thinks and runs tools, a pair while it writes, and a longer group during compacting, subagents and long commands. Claude's own step text stays.
- A closing word at the end of each turn, and a thikr above the prompt when the usage limit is reached.
- `/thikr speed`: each phrase stays for its reading time (default) or a fixed number of seconds.
- `/thikr mode salawat`: one salawat on the Prophet ﷺ for each whole turn.

### Athkar

- On a fresh install nothing opens by itself until prayer times are set up or put off; reminders start from the next morning, evening or athan.
- Morning and evening athkar from Hisn al-Muslim in a reader above the prompt: click, Space or Enter to count, and it moves on by itself. Your reading is saved for the day.
- Morning and evening follow Fajr and Maghrib when prayer times are set, otherwise 05:00 and 17:00.
- The athkar after salah, offered after each athan.
- `/athkar morning` · `evening` · `after-salah` open a reader at any time; `reset` reads it again.
- On desktop, the reader sits on a sky that follows the time of day (`/athkar style sky`), or a plain frame.

### Prayer times

- If Yes cannot find the city setting on a fresh install, it asks you to run `/reload-plugins`, then try again; the setup card stays available.
- `/salah city`: your city by name in any language, or by coordinates; the times are calculated on your machine, with your country's method by default.
- The next prayer under the prompt, all day or only in the minutes before it, with a countdown.
- An athan moment when a prayer comes in: a photo card on desktop, a rising minaret in the terminal.
- `/salah adjust`: match the times to your mosque, a minute at a time.

### Quran (desktop)

- The player is ready as soon as muslim is installed; the reciter and surah lists ship with it.
- A recitation player with complete Hafs recordings: pick a reciter and a surah, play, stop, previous and next.
- Long recordings play in quarters; repeat a whole surah or one quarter.

### Muslim pane (desktop)

- `/muslim` opens a pane with today's prayers, the Quran player, athkar progress and every setting, with a button in the prompt footer.

### Everywhere

- Works in the terminal and the Claude desktop app, on macOS, Windows and Linux.
- `/muslim color`: the main color in every feature (Claude orange, green, yellow or blue).
- `/muslim tashkeel`: Arabic diacritics on desktop; `/muslim terminal-arabic` picks how Arabic shows in your terminal.
- `/muslim update` updates only this plugin; Claude Code also updates it in the background unless `/muslim autoupdate off`.
- `/muslim feedback`: Claude drafts a GitHub issue for a bug, idea or content correction and sends it only after you choose Send.
- `/muslim help` lists every command; `/muslim demo` plays every feature.
