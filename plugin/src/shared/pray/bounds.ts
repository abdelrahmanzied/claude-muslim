// Salah connects prayer-day bounds; athkar reads them in hooks and timers.
// Replaces a $.state read-through: the engine does not run the plugin's own
// hooks for calls from its timers. No engine API or saved state here.
import type { SalahAthkarTimes } from '../../../types'

let provide: ((at: number) => SalahAthkarTimes | null) | undefined

export const connectAthkarTimes = (read: (at: number) => SalahAthkarTimes | null) => { provide = read }
export const athkarTimesAt = (at: number): SalahAthkarTimes | null => provide?.(at) ?? null
