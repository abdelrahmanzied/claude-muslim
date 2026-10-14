import { commandTable } from '../../table.ts'
export const QURAN_COMMANDS: readonly (readonly [string, string])[] = [
  ['/quran', 'Open the desktop Quran player'],
  ['/quran play <surah>', 'Play an available surah by number (1–114) or Arabic name; whole files advance on natural end; large recordings use quarters'],
  ['/quran stop', 'Stop playback'],
  ['/quran repeat', 'Toggle repeating the whole surah for this session; a split surah plays every quarter, then starts over'],
  ['/quran repeat segment', 'Toggle repeating the current quarter of a split surah; turns surah repeat off, and the other way round'],
  ['/quran next` · `/quran prev', 'Play the next or previous quarter when split, otherwise the next available surah; stop at the ends'],
  ['/quran retry', 'Check the recording size and timing metadata again'],
  ['/quran reciter', 'List complete Hafs recordings by number'],
  ['/quran reciter <number or name>', 'Choose a recording; use the next available surah if needed, restarting if playing'],
  ['/quran help', 'This table'],
]
export const quranHelp = (): string => `**Muslim › Quran › Help**\n\n${commandTable(QURAN_COMMANDS)}`
