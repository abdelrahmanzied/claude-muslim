// Shared terminal Arabic picker; thikr keeps its existing command help.
export const muslimHelp = (feature?: string): string => {
  if (feature && feature !== 'terminal-arabic' && feature !== 'thikr') return `No feature "${feature}". Features: thikr, terminal-arabic.`
  if (feature === 'terminal-arabic') return 'Terminal Arabic: /muslim terminal-arabic opens a terminal-only keyboard check for the current terminal.'
  if (feature === 'thikr') return 'Thikr: /thikr (status and help)'

  return 'Terminal Arabic: /muslim terminal-arabic (keyboard check; terminal only)\n\nThikr: /thikr (status and help)'
}
