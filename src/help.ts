// Shared terminal Arabic picker; thikr keeps its existing command help.
export const muslimHelp = (feature?: string): string => {
  if (feature && feature !== 'terminal-arabic' && feature !== 'thikr') return `No feature "${feature}". Features: thikr, terminal-arabic.`
  if (feature === 'terminal-arabic') return '/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)'
  if (feature === 'thikr') return 'Thikr: /thikr (status and help)'

  return '/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)\n\nThikr: /thikr (status and help)'
}
