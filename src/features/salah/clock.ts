// Wall-clock reading of an instant in a time zone, and the Hijri month.
// Uses Intl when it knows the zone; otherwise the runtime's own local time.

export type LocalTime = { year: number; month: number; day: number; hour: number; minute: number }

const parts = (at: number, options: Intl.DateTimeFormatOptions, locale = 'en-US') => {
  const values: Record<string, number> = {}
  for (const part of new Intl.DateTimeFormat(locale, options).formatToParts(at)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }

  return values
}

export const localTime = (at: number, timeZone: string): LocalTime => {
  try {
    const p = parts(at, {
      timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    })

    return { year: p.year ?? 0, month: p.month ?? 0, day: p.day ?? 0, hour: p.hour ?? 0, minute: p.minute ?? 0 }
  } catch {
    const date = new Date(at)

    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() }
  }
}

// The Umm al-Qura Hijri month (9 is Ramadan), or undefined without Intl's Islamic calendar.
export const hijriMonth = (at: number, timeZone: string): number | undefined => {
  try {
    const month = parts(at, { timeZone, month: 'numeric' }, 'en-US-u-ca-islamic-umalqura').month

    return Number.isInteger(month) ? month : undefined
  } catch {
    return undefined
  }
}
