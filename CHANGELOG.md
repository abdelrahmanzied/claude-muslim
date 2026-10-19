# Changelog

## 0.1.0

The first public release.

### Thikr line

- Subagent turns keep the main turn's thikr moving, with its phrase progress intact.
- A short thikr joins Claude's working line while it works: starting phrases, tasbih while it thinks and runs tools, a pair while it writes, and a longer group during compacting, subagents and long commands. Claude's own step text stays.
- A closing word at the end of each turn, and a thikr above the prompt when the usage limit is reached.
- `/thikr speed`: each phrase stays for its reading time (default) or a fixed number of seconds.
- `/thikr mode salawat`: one salawat on the Prophet ﷺ for each whole turn.

### Athkar

- Three reminder switches, for morning, evening and after salah: in the pane's الأذكار tab or `/athkar <set> on · off`. Off only stops that set opening by itself; you can still open it, and a reading in progress stays. They replace the old whole-feature `athkar` switch and `/athkar on · off`.
- An untouched after-salah offer ends 30 minutes after the athan; counting or opening it yourself keeps it available.
- Fast counting presses all save, even when they arrive together.
- `/athkar` no longer marks the period it just brought back as hidden in its own status table.
- On a fresh install nothing opens by itself until prayer times are set up or put off; reminders start from the next morning, evening or athan.
- Morning and evening athkar from Hisn al-Muslim in a reader above the prompt: click, Space or Enter to count, and it moves on by itself. Your reading is saved for the day.
- Morning and evening follow Fajr and Maghrib when prayer times are set, otherwise 05:00 and 17:00.
- The athkar after salah, offered after each athan.
- `/athkar morning` · `evening` · `after-salah` open a reader at any time; `reset` reads it again.
- On desktop, the reader sits on a sky that follows the time of day (`/athkar style sky`), or a plain frame.

### Prayer times

- On a new terminal, the Arabic check comes first, then the city setup with its number keys.
- Saving a calculation method returns to settings, and saving reviewed times closes the form; a failed save restores it.
- The next and previous prayer stay on the right calendar day when the clocks change.
- If Yes cannot find the city setting on a fresh install, it asks you to run `/reload-plugins`, then try again; the setup card stays available.
- `/salah city`: your city by name in any language, or by coordinates; the times are calculated on your machine, with your country's method by default.
- The next prayer under the prompt, all day or only in the minutes before it, with a countdown.
- An athan moment when a prayer comes in: a photo card on desktop, a rising minaret in the terminal.
- `/salah adjust`: match the times to your mosque, a minute at a time.

### Quran (desktop)

- A failed play shows one quiet error in the Quran card, with a working Retry button.
- A play error stays on its own command reply; Stop and Help keep their own words.
- Changing a plugin setting stops Quran first and says why, so the player keeps no untracked audio.
- The player is ready as soon as muslim is installed; the reciter and surah lists ship with it.
- A recitation player with complete Hafs recordings: pick a reciter and a surah, play, stop, previous and next.
- Long recordings play in quarters; repeat a whole surah or one quarter.

### Muslim pane (desktop)

- While Quran plays or prepares, settings explain that a change stops it and the next play starts over.
- The athkar card says «أكمل» as soon as any repetition has been counted.
- `/muslim` opens a pane with today's prayers, the Quran player, athkar progress and every setting, with a button in the prompt footer.
- A settings button takes a press anywhere on it, its empty padding included, not only on its word.

### Everywhere

- Setup forms have the space above the prompt to themselves; your reminders return when setup closes.
- A missing setting asks you to run `/reload-plugins`, keeping Quran playing and the current form open.
- Linux terminals and classic Windows Console keep their own Arabic setting instead of being mistaken for Windows Terminal.
- Works in the terminal and the Claude desktop app, on macOS, Windows and Linux.
- `/muslim color`: the main color in every feature (Claude orange, green, yellow or blue).
- `/muslim tashkeel`: Arabic diacritics on desktop; `/muslim terminal-arabic` picks how Arabic shows in your terminal.
- `/muslim update` updates only this plugin; Claude Code also updates it in the background unless `/muslim autoupdate off`.
- `/muslim feedback`: Claude drafts a GitHub issue for a bug, idea or content correction and sends it only after you choose Send.
- `/muslim help` lists every command; `/muslim demo` plays every feature.
