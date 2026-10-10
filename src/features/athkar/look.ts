import type { Period } from './data.ts'
import { arabicDigits, countOf, currentOf, END, hasBegun, listFor, overall, textOf, timesOf, TITLE } from './logic.ts'
import type { Reading, Sky } from './logic.ts'

export type Style = 'sky' | 'sand' | 'outline'
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

const SAND = { light: '#f3ede4', dark: '#2b2622' }
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
  // What a filling circle blends from.
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
  const page = style === 'sand' ? SAND[isDark ? 'dark' : 'light'] : PAGE[isDark ? 'dark' : 'light']
  const ink = isDark ? '#ece8e2' : '#26231f'

  return {
    style,
    ring,
    ink,
    dim: blend(ink, page, 0.4),
    track: blend(page, ink, 0.18),
    background: style === 'sand' ? page : undefined,
    under: page,
  }
}

export type Circle = {
  label: string
  // open: still to say; done: said; filling: the 100's circle being counted.
  state: 'open' | 'done' | 'filling'
  // The filling circle's color, deeper as it fills.
  fill?: string
}

export type ReaderProps = {
  period: Period
  look: Look
  title: string
  // The cover says continue once anything was counted today.
  hasBegun: boolean
  isDone: boolean
  text: string
  note?: string
  position: string
  circles: Circle[]
  choices: { label: string; times: number; isPicked: boolean }[]
  // The whole period, 0 to 1.
  progress: number
  end: string
  endHint: string
}

// Up to ten circles, one per count; a count above ten shows ten circles of a
// tenth each, the one being counted filling like water.
export const circlesFor = (n: number, times: number, look: Look): Circle[] => {
  if (times <= 10) {
    return Array.from({ length: times }, (_, i) => ({ label: arabicDigits(i + 1), state: i < n ? 'done' : 'open' }))
  }
  const per = times / 10
  const done = Math.floor(n / per)

  return Array.from({ length: 10 }, (_, i): Circle => {
    if (i < done) return { label: arabicDigits((i + 1) * per), state: 'done' }
    if (i === done && n < times) {
      const level = (n % per) / per

      return { label: arabicDigits(n), state: 'filling', fill: blend(look.under, look.ring, 0.35 + 0.65 * level) }
    }

    return { label: arabicDigits((i + 1) * per), state: 'open' }
  })
}

// A Client's props are plain data: no undefined anywhere.
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const readerProps = (period: Period, reading: Reading, look: Look, display: (text: string) => string): ReaderProps => {
  const list = listFor(period)
  const thikr = currentOf(period, reading)
  const n = countOf(thikr, reading)
  const times = timesOf(thikr, reading)

  return plain({
    period,
    look,
    title: display(TITLE[period]),
    hasBegun: hasBegun(reading),
    isDone: reading.isDone,
    text: display(textOf(thikr, period)),
    note: thikr.note?.split(' · ')[0],
    position: `${arabicDigits(Math.min(reading.index, list.length - 1) + 1)} مِنْ ${arabicDigits(list.length)}`,
    circles: circlesFor(Math.min(n, times), times, look),
    choices: (thikr.choices ?? []).map(c => ({ label: arabicDigits(c), times: c, isPicked: c === times })),
    progress: overall(period, reading),
    end: display(END),
    endHint: `/athkar ${period} reset to read again`,
  })
}

// --- The sky picture (desktop): gradient, Rich motion, falling stars at the end.

const round = (n: number) => Math.round(n * 10) / 10

const star = (x: number, y: number, r: number, delay: number, dur: number) =>
  `<circle cx="${round(x)}" cy="${round(y)}" r="${r}" fill="#fff"><animate attributeName="opacity" values=".25;1;.25" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></circle>`

const shooting = (x: number, y: number, delay: number, dur: number) =>
  `<g opacity="0"><line x1="0" y1="0" x2="60" y2="0" stroke="url(#tail)" stroke-width="1.5" stroke-linecap="round"/><animateTransform attributeName="transform" type="translate" values="${round(x)} ${round(y)};${round(x - 160)} ${round(y + 50)}" keyTimes="0;1" dur="1.2s" begin="${delay}s;sh${Math.round(delay * 10)}.end+${dur}s" id="sh${Math.round(delay * 10)}"/><animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="${delay}s;sh${Math.round(delay * 10)}.end+${dur}s"/></g>`

const cloud = (y: number, w: number, width: number, dur: number, offset: number, opacity: number) =>
  `<g opacity="${opacity}"><g><ellipse cx="0" cy="${round(y)}" rx="${round(w * 0.4)}" ry="${round(w * 0.12)}" fill="#fff"/><ellipse cx="${round(w * 0.25)}" cy="${round(y - w * 0.06)}" rx="${round(w * 0.3)}" ry="${round(w * 0.13)}" fill="#fff"/><animateTransform attributeName="transform" type="translate" from="${round(-w - offset)} 0" to="${round(width + w - offset)} 0" dur="${dur}s" repeatCount="indefinite"/></g></g>`

const bird = (y: number, width: number, dur: number) =>
  `<g><path d="M0 0 q4 -4 8 0 q4 -4 8 0" fill="none" stroke="rgba(40,44,70,.7)" stroke-width="1.4" stroke-linecap="round"><animate attributeName="d" values="M0 0 q4 -4 8 0 q4 -4 8 0;M0 0 q4 2 8 0 q4 2 8 0;M0 0 q4 -4 8 0 q4 -4 8 0" dur=".9s" repeatCount="indefinite"/></path><animateTransform attributeName="transform" type="translate" from="-20 ${round(y)}" to="${round(width + 20)} ${round(y - 8)}" dur="${dur}s" repeatCount="indefinite"/></g>`

const glow = (cx: number, cy: number, r: number, color: string, values: string, dur: number) =>
  `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${color}"><animate attributeName="opacity" values="${values}" dur="${dur}s" repeatCount="indefinite"/></circle>`

const starsAcross = (width: number, height: number, count: number, seed: number) =>
  Array.from({ length: count }, (_, i) => {
    const x = ((i * 97 + seed * 31) % 100) / 100 * width
    const y = (((i * 53 + seed * 17) % 60) / 100 + 0.04) * height

    return star(x, y, i % 3 === 0 ? 1.4 : 0.9, -((i * 0.7) % 3), 3 + (i % 4) * 0.5)
  }).join('')

const motion = (sky: Sky, w: number, h: number) => {
  switch (sky) {
    case 'dawn':
      return starsAcross(w, h * 0.6, 6, 1) + glow(w * 0.5, h * 1.25, h * 0.9, 'url(#warm)', '.6;1;.6', 7)
    case 'sunrise':
      return `<circle cx="${round(w * 0.86)}" r="${round(h * 0.55)}" fill="url(#sun)"><animate attributeName="cy" values="${round(h * 1.15)};${round(h * 0.9)};${round(h * 1.15)}" dur="18s" repeatCount="indefinite"/></circle>`
        + cloud(h * 0.3, 90, w, 40, 0, 0.6) + cloud(h * 0.62, 70, w, 55, w * 0.5, 0.45) + bird(h * 0.4, w, 30)
    case 'day':
      return glow(w * 0.93, -h * 0.06, h * 0.9, 'url(#sun)', '.6;.9;.6', 4)
        + cloud(h * 0.28, 100, w, 45, 0, 0.8) + cloud(h * 0.55, 80, w, 60, w * 0.4, 0.6) + cloud(h * 0.75, 110, w, 70, w * 0.75, 0.5) + bird(h * 0.35, w, 34)
    case 'rose':
      return `<circle cx="${round(w * 0.1)}" r="${round(h * 0.5)}" fill="url(#dusk)"><animate attributeName="cy" values="${round(h * 0.95)};${round(h * 1.2)};${round(h * 0.95)}" dur="18s" repeatCount="indefinite"/></circle>`
        + starsAcross(w, h * 0.45, 4, 2) + cloud(h * 0.55, 160, w, 60, 0, 0.18) + cloud(h * 0.75, 200, w, 80, w * 0.5, 0.12)
    case 'bluehour':
      return starsAcross(w, h * 0.6, 7, 3) + shooting(w * 0.8, h * 0.08, 2, 9) + glow(w * 0.5, h * 1.3, h * 0.9, 'url(#warm)', '.5;.9;.5', 7)
    case 'crescent':
      return starsAcross(w, h * 0.7, 9, 4) + shooting(w * 0.8, h * 0.08, 1, 7) + shooting(w * 0.5, h * 0.22, 5, 11)
        + `<g opacity=".7"><path d="M0 -9 a9 9 0 1 0 0 18 a7 7 0 1 1 0 -18z" fill="#ffe9b8" transform="translate(${round(w - 40)} 16)"><animate attributeName="opacity" values=".7;1;.7" dur="4s" repeatCount="indefinite"/></path></g>`
  }
}

const falling = (w: number, h: number) =>
  Array.from({ length: 14 }, (_, i) => {
    const x = ((i * 61) % 100) / 100 * w
    const delay = (i * 0.37) % 2.4

    return `<text x="${round(x)}" y="0" font-size="${10 + (i % 3) * 3}" fill="${i % 2 ? '#ffe9b8' : '#fff'}" opacity="0">✦<animate attributeName="y" from="-10" to="${round(h + 10)}" dur="2.8s" begin="${delay}s" repeatCount="2"/><animate attributeName="opacity" values="0;1;1;0" dur="2.8s" begin="${delay}s" repeatCount="2"/></text>`
  }).join('')

// The sky as one SVG document sized in CSS pixels, so nothing stretches.
export const skySvg = (sky: Sky, width: number, height: number, isDone: boolean) => {
  const w = Math.max(80, Math.round(width))
  const h = Math.max(40, Math.round(height))
  const { stops, isBright } = SKIES[sky]
  const gradient = stops.map((c, i) => `<stop offset="${round(i / (stops.length - 1))}" stop-color="${c}"/>`).join('')
  // A shade under the words keeps them readable: light on bright skies, dark on the rest.
  const scrim = isBright ? 'rgba(255,255,255,.34)' : 'rgba(8,12,30,.30)'

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${gradient}</linearGradient>`
    + '<radialGradient id="sun"><stop offset="0" stop-color="#fffdf0" stop-opacity=".8"/><stop offset=".35" stop-color="#ffe08f" stop-opacity=".5"/><stop offset="1" stop-color="#ffb062" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="dusk"><stop offset="0" stop-color="#ffeccc" stop-opacity=".55"/><stop offset=".4" stop-color="#ffb98a" stop-opacity=".35"/><stop offset="1" stop-color="#ff9678" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="warm"><stop offset="0" stop-color="#ffc496" stop-opacity=".5"/><stop offset="1" stop-color="#ffc496" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="tail"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>'
    + `<rect width="${w}" height="${h}" fill="url(#g)"/>`
    + motion(sky, w, h)
    + `<rect width="${w}" height="${h}" fill="${scrim}"/>`
    + (isDone ? falling(w, h) : '')
    + '</svg>'
}
