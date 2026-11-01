// Which cards above the prompt are drawn right now, so a card that waits for a free
// slot (the Friday Al-Kahf reminder) can tell. Each card's feature marks its own
// name when its draw returns the card and clears it when the draw returns none.
// Plain module values, no engine API and no saved state; a reload clears them.

const shown = new Set<string>()

export const markCard = (name: string, isShown: boolean) => { if (isShown) shown.add(name); else shown.delete(name) }
export const isAnotherCardShown = (except: string): boolean => [...shown].some(name => name !== except)
export const resetCards = () => { shown.clear() }
