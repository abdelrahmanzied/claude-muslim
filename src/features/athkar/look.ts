import type { BandModel } from './band.ts'
import type { Period } from './data.ts'
import { arabicDigits, countOf, currentOf, END, END_NOTE, hasBegun, listFor, overall, textOf, timesOf, TITLE } from './logic.ts'
import type { Reading, Sky } from './logic.ts'

export type Style = 'sky' | 'frame'
export type Accent = 'orange' | 'green' | 'gold' | 'blue'

// The main color, for a light theme and a dark one.
export const ACCENTS: Record<Accent, { light: string; dark: string }> = {
  orange: { light: '#c8642d', dark: '#d97757' },
  green: { light: '#0b7a50', dark: '#1a9466' },
  gold: { light: '#c99a1f', dark: '#e8b93c' },
  blue: { light: '#3a6aa3', dark: '#4a7fc0' },
}

type SkyLook = {
  // Top to bottom.
  stops: readonly string[]
  // The color under the picture, and the whole sky where none is drawn.
  base: string
  // Sunrise is bright: dark words on it. Every other sky takes white.
  isBright: boolean
}

export const SKIES: Record<Sky, SkyLook> = {
  dawn: { stops: ['#1f2c58', '#4f4a82', '#c4778a', '#f3b38f'], base: '#3d3a6b', isBright: false },
  sunrise: { stops: ['#86b6e6', '#bcd2ea', '#f6d0a6', '#f4ac72'], base: '#c9d6e6', isBright: true },
  day: { stops: ['#2f7fd6', '#5ea6ec', '#a6d0f6'], base: '#3f86cf', isBright: false },
  rose: { stops: ['#29225a', '#574285', '#a96f98', '#eeb19c'], base: '#4a3a78', isBright: false },
  bluehour: { stops: ['#0b1636', '#1d336c', '#3c5ba2', '#7c90c6'], base: '#1d336c', isBright: false },
  crescent: { stops: ['#060c22', '#121d48', '#26346a'], base: '#101a40', isBright: false },
}

const PAGE = { light: '#ffffff', dark: '#1f1e1d' }

export type Look = {
  style: Style
  // The main color.
  ring: string
  // Words, and words of less weight.
  ink: string
  dim: string
  // The empty part of the progress line.
  track: string
  // Behind the reader; none where a picture or the page shows through.
  background?: string
  // The color under the reader, which the frame's breathing blends from.
  under: string
}

const hex = (value: string) => {
  const n = Number.parseInt(value.slice(1), 16)

  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const
}

// `from` moved toward `to` by `amount`, 0 to 1.
export const blend = (from: string, to: string, amount: number) => {
  const a = hex(from)
  const b = hex(to)
  const mix = a.map((v, i) => Math.round(v + ((b[i] ?? 0) - v) * Math.min(1, Math.max(0, amount))))

  return `#${mix.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

export const lookFor = (style: Style, accent: Accent, sky: Sky, isDark: boolean, hasPicture: boolean): Look => {
  const ring = ACCENTS[accent][isDark ? 'dark' : 'light']
  if (style === 'sky') {
    const { base, isBright } = SKIES[sky]
    const ink = isBright ? '#141a2a' : '#ffffff'

    return {
      style,
      ring,
      ink,
      dim: blend(ink, base, 0.25),
      track: blend(base, ink, 0.3),
      background: hasPicture ? undefined : base,
      under: base,
    }
  }
  const page = PAGE[isDark ? 'dark' : 'light']
  const ink = isDark ? '#ece8e2' : '#26231f'

  return {
    style,
    ring,
    ink,
    dim: blend(ink, page, 0.4),
    track: blend(page, ink, 0.18),
    background: undefined,
    under: page,
  }
}

export type ReaderProps = {
  period: Period
  phase: 'cover' | 'reading' | 'done'
  // Lit by a click; faded again when idle.
  isActive: boolean
  // Desktop: the band is a picture the reader draws and listens over.
  isPicture: boolean
  band?: BandModel
  look: Look
  title: string
  // The cover says continue once anything was counted today.
  hasBegun: boolean
  text: string
  note?: string
  position: string
  // The repetitions left on this thikr, Arabic-Indic: the progress line's head carries it.
  left: string
  // The whole period, 0 to 1.
  progress: number
  end: string
  endHint: string
  endNote: string
}

// A Client's props are plain data: no undefined anywhere.
export const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const readerProps = (
  period: Period,
  reading: Reading,
  look: Look,
  display: (text: string) => string,
  view: { isOpen: boolean; isActive: boolean; isPicture: boolean },
): ReaderProps => {
  const list = listFor(period)
  const thikr = currentOf(period, reading)
  const n = countOf(thikr, reading)
  const times = timesOf(thikr)

  return plain({
    period,
    phase: reading.isDone ? 'done' : view.isOpen ? 'reading' : 'cover',
    isActive: view.isActive,
    isPicture: view.isPicture,
    look,
    title: display(TITLE[period]),
    hasBegun: hasBegun(reading),
    text: display(textOf(thikr, period)),
    note: thikr.note === undefined ? undefined : display(thikr.note.split(' · ')[0] ?? ''),
    position: display(`${arabicDigits(Math.min(reading.index, list.length - 1) + 1)} مِنْ ${arabicDigits(list.length)}`),
    left: arabicDigits(Math.max(0, times - n)),
    progress: overall(period, reading),
    end: display(END),
    endHint: `/athkar ${period} reset → to read again`,
    endNote: display(END_NOTE[period]),
  })
}
