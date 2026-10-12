import type { ClientModule, SvgProps } from 'claude-code'
import { CARD_HEIGHT, cardSvg, hitTest, pointerPixels, type CardAction, type CardModel } from './card.ts'

type Local = { hover: CardAction | null; size: string }
const client: ClientModule<CardModel, Local> = (props, surface) => {
  const { Box } = surface.elements
  if (surface.state === undefined) {
    surface.setState({ hover: null, size: '' })
    surface.every(200, () => {
      const size = `${surface.columns}x${surface.rows}`
      const local = surface.state ?? { hover: null, size: '' }
      if (size !== local.size && surface.columns > 0) {
        surface.post({ act: 'size', columns: surface.columns, rows: surface.rows })
        surface.setState({ ...local, size })
      }
    })
  }
  const model = { ...props, width: surface.columns > 0 ? Math.max(180, Math.min(1200, Math.round(surface.columns * 8.4))) : props.width }
  surface.onPointer(e => {
    const x = e.fine?.x ?? e.x + 0.5
    const y = e.fine?.y ?? e.y + 0.5
    const pixels = pointerPixels(model.width, x, y, surface.columns, surface.rows)
    const hover = e.type === 'leave' ? null : hitTest(model.width, pixels.x, pixels.y)
    const local = surface.state ?? { hover: null, size: '' }
    if (hover !== local.hover) surface.setState({ ...local, hover })
    if (e.type === 'down' && (e.button ?? 'left') === 'left') surface.post({ act: 'pointer', x, y, columns: surface.columns, rows: surface.rows, width: model.width, generation: props.generation, button: 'left' })
  })
  surface.onKey(e => surface.post({ act: 'key', key: e.key }))
  // Svg is outside the Client's terminal-shaped element table; Desktop knows the tag.
  const svg: SvgProps = { source: cardSvg(model, surface.state?.hover ?? null), width: model.width, height: CARD_HEIGHT, alt: `${model.status} · ${model.title} · ${model.reciter} · ${model.elapsed} / ${model.total} · السابقة · ${model.playing ? 'إيقاف' : 'تشغيل'} · التالية` }
  return <Box width="100%">{h('Svg', svg)}</Box>
}
export default client
