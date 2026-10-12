import { commandTable } from '../../table.ts'
export const QURAN_COMMANDS: readonly (readonly [string, string])[] = [
  ['/quran', 'Open the desktop Quran player'],
  ['/quran play <surah>', 'Play whole surahs from a number (1–114) or Arabic name; advance on natural end'],
  ['/quran stop', 'Stop playback'],
  ['/quran next` · `/quran prev', 'Play the next or previous surah; stop at the ends'],
  ['/quran reciter', 'List complete Hafs recordings by number'],
  ['/quran reciter <number or name>', 'Choose a recording; restart the current surah if playing'],
  ['/quran help', 'This table'],
]
export const quranHelp = (): string => `**Muslim › Quran › Help**\n\n${commandTable(QURAN_COMMANDS)}`
