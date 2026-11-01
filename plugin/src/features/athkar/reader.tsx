import type { ClientModule, RenderElement } from 'claude-code'

import { coverHint } from './band.ts'
import type { ReaderProps } from './look.ts'

// The athkar reader in the terminal: its input, and the band drawn as text.
// It runs on the drawing thread and posts every click and key to the hooks
// module, which keeps the reading and decides what each one does. The
// desktop draws the band as the shared card instead (card.tsx).

type Local = {
  // The progress line as drawn, easing toward the real value.
  shown: number
  // Frames, for the head's slow pulse.
  frame: number
  // The region's size last reported to the hooks module.
  size: string
}

const TICK_MS = 100
// One full pulse of the progress head, in frames.
const PULSE = Math.round(2600 / TICK_MS)

const COVER_KEYS = '⎵ ↵ count · ← → move · right click ⌫ undo'

// The props of the last draw, for the frame clock.
let latest: ReaderProps

const Reader: ClientModule<ReaderProps, Local> = (props, surface) => {
  const { Box, Text, Button } = surface.elements
  const local: Local = surface.state ?? { shown: props.progress, frame: 0, size: '' }
  latest = props

  if (surface.state === undefined) {
    surface.setState(local)
    surface.every(TICK_MS, () => {
      const s = surface.state ?? local
      // The hooks module hit-tests clicks on the picture, so it needs the region's size.
      const size = `${surface.columns}x${surface.rows}`
      if (size !== s.size && surface.columns > 0) surface.post({ act: 'size', columns: surface.columns, rows: surface.rows })
      const target = latest.progress
      const shown = Math.abs(target - s.shown) < 0.002 ? target : s.shown + (target - s.shown) * 0.25
      // At rest (faded, line in place) nothing moves: no redraw.
      if (!latest.isActive && shown === s.shown && size === s.size) return
      surface.setState({ ...s, shown, size, frame: s.frame + 1 })
    })
  }

  surface.onPointer(event => {
    if (event.type === 'enter' || event.type === 'leave') surface.post({ act: event.type })
    if (event.type !== 'down') return
    surface.post({ act: 'pointer', button: event.button ?? 'left', x: event.x, y: event.y, columns: surface.columns, rows: surface.rows })
  })

  surface.onKey(event => {
    surface.post({ act: 'key', key: event.key })
  })

  const { look } = props
  const isLit = props.isActive
  // Skies light up from faded; Frame breathes.
  const accent = isLit || look.style !== 'sky' ? look.ring : look.dim
  const wave = (1 - Math.cos(((local.frame % PULSE) / PULSE) * Math.PI * 2)) / 2
  // Frame: the border breathes between the main color and its dim form; faded, it takes the theme's quiet key.
  const frame = look.style === 'sky' ? undefined : isLit ? look.ring : look.track
  const isDimFrame = look.style !== 'sky' && isLit && wave < 0.5

  const close = <Button key="hide" plain label="×" onPress={() => surface.post({ act: 'hide' })} />

  const shell = (children: RenderElement[]) => (
    <Box flexDirection="column" paddingX={2} backgroundColor={look.background} borderStyle={frame ? 'round' : undefined} borderColor={frame} borderDimColor={isDimFrame} width="100%">
      {children}
    </Box>
  )

  if (props.phase === 'question' && props.question) {
    const q = props.question
    if (!isLit) return shell([<Text key="question" color={look.dim}>{q.title}</Text>])
    return shell([
      <Box key="question" flexDirection="row-reverse" justifyContent="space-between"><Text bold color={look.ink}>{q.title}</Text>{close}</Box>,
      <Text key="remaining" color={look.dim}>{q.remaining}</Text>,
      <Box key="choices" flexDirection="row-reverse" gap={2}>
        <Button key="finish" plain label={`${q.focus === 'finish' ? '› ' : ''}${q.confirm}`} onPress={() => surface.post({ act: 'finish' })} />
        <Button key="resume" plain label={`${q.focus === 'resume' ? '› ' : ''}${q.resume}`} onPress={() => surface.post({ act: 'resume' })} />
      </Box>,
      <Text key="choice-keys" color={look.dim}>Tab / ← select · Space / Enter choose · → / ⌫ back</Text>,
    ])
  }

  if (props.phase === 'done') {
    return shell([
      // Faded, it folds to one line.
      <Box key="done" flexDirection="row-reverse" justifyContent="space-between" alignItems="center" paddingY={isLit ? 1 : 0} gap={2}>
        <Text bold color={look.style === 'sky' ? look.ink : look.ring} wrap={isLit ? 'wrap' : 'truncate-end'}>{props.end}</Text>
        <Text color={look.dim} wrap="truncate-end">{isLit ? props.endHint : props.endNote}</Text>
      </Box>,
    ])
  }

  if (props.phase === 'cover') {
    // Faded, the cover folds to one line; a press opens it.
    if (!isLit) {
      return shell([
        <Box key="rest" flexDirection="row-reverse" justifyContent="space-between" gap={2}>
          <Text bold color={look.ring}>{props.title}</Text>
          <Text color={look.dim} wrap="truncate-end">{coverHint(props.hasBegun)}</Text>
        </Box>,
      ])
    }

    return shell([
      <Box key="cover" flexDirection="row-reverse" justifyContent="space-between" alignItems="center" paddingY={1} gap={2}>
        <Text bold color={look.ring}>{props.title}</Text>
        <Text color={look.dim} wrap="wrap">{`click ${props.hasBegun ? 'continue' : 'start'} · ${COVER_KEYS}`}</Text>
        {close}
      </Box>,
    ])
  }

  // Faded, the reading folds to one row; a press opens it.
  if (!isLit) {
    return shell([
      <Box key="rest" flexDirection="row-reverse" justifyContent="space-between" gap={2}>
        <Text bold color={look.ring} wrap="truncate-end">{props.title}</Text>
        <Text color={look.dim}>{props.position}</Text>
      </Box>,
    ])
  }

  return shell([
    <Box key="meta" flexDirection="row-reverse" justifyContent="space-between">
      <Text color={look.dim}>{[props.note, props.position].filter(Boolean).join(' · ')}</Text>
      {close}
    </Box>,
    <Box key="text" flexDirection="column" alignItems="flex-end">
      <Text color={isLit ? look.ink : look.dim} wrap="wrap">{props.text}</Text>
    </Box>,
    horizon(surface.elements, surface.columns - 4, local.shown, accent, look, props.left),
  ])
}

// Horizon glow: a soft line along the bottom, filled from the right. Its head
// carries the repetitions left on this thikr, " ٢ " on the main color, and
// stays whole at either end of the line.
const horizon = (elements: ReaderElements, columns: number, shown: number, accent: string, look: ReaderProps['look'], left: string) => {
  const { Box, Text } = elements
  const width = Math.max(10, columns)
  const label = ` ${left} `
  const filled = Math.min(width - label.length, Math.max(0, Math.round(width * Math.min(1, Math.max(0, shown)))))

  return (
    <Box key="horizon" flexDirection="row">
      <Text color={look.track}>{'─'.repeat(Math.max(0, width - filled - label.length))}</Text>
      <Text bold color="#ffffff" backgroundColor={accent}>{label}</Text>
      <Text color={accent}>{'━'.repeat(filled)}</Text>
    </Box>
  )
}

type ReaderElements = Parameters<ClientModule>[1]['elements']

export default Reader
