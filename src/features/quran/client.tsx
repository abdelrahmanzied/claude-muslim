import type { ClientModule, SvgProps } from 'claude-code'
import { pointerPixels, type CardAction } from './card.ts'
import { PANE_HEIGHT, moveHighlight, openPicker, options, paneHit, paneSvg, pickerInitial, typeQuery, type PaneModel, type PickerState } from './pane.ts'

type Local = { picker: PickerState; hover: CardAction | null; size: string }
const client: ClientModule<PaneModel, Local> = (props, surface) => {
  const { Box } = surface.elements
  if (surface.state === undefined) {
    surface.setState({ picker: pickerInitial(props), hover: null, size: '' })
    surface.every(200, () => {
      const size = `${surface.columns}x${surface.rows}`
      const local = surface.state
      if (local && size !== local.size && surface.columns > 0) {
        surface.post({ act: 'size', columns: surface.columns, rows: surface.rows })
        surface.setState({ ...local, size })
      }
    })
  }
  const model = { ...props, width: surface.columns > 0 ? Math.max(240, Math.min(1200, Math.round(surface.columns * 8.4))) : props.width }
  let local = surface.state ?? { picker: pickerInitial(model), hover: null, size: '' }
  if (local.picker.focusRevision !== model.focusRevision || local.picker.wasFocused && !model.isFocused) {
    local = { ...local, picker: pickerInitial(model) }
    surface.setState(local)
  } else if (local.picker.wasFocused !== model.isFocused) {
    local = { ...local, picker: { ...local.picker, wasFocused: model.isFocused } }
    surface.setState(local)
  }
  surface.onPointer(e => {
    const current = surface.state ?? local
    const x = e.fine?.x ?? e.x + 0.5, y = e.fine?.y ?? e.y + 0.5
    // Shared card maps cells to pixels; the full pane substitutes its own height.
    const pixels = pointerPixels(model.width, x, y, surface.columns, surface.rows, PANE_HEIGHT)
    const hit = paneHit(model, current.picker, pixels.x, pixels.y)
    const hover = e.type !== 'leave' && hit?.act === 'control' ? hit.action : null
    const rowHover = e.type !== 'leave' && hit?.act === 'row' ? hit.index : -1
    if (hover !== current.hover || rowHover !== current.picker.hover) surface.setState({ ...current, hover, picker: { ...current.picker, hover: rowHover } })
    if (e.type !== 'down' || (e.button ?? 'left') !== 'left') return
    if (hit?.act === 'field') surface.setState({ ...current, picker: openPicker(model, current.picker, hit.list), hover: null })
    else if (hit?.act === 'row' && current.picker.open) {
      const option = options(model, current.picker.open, current.picker.query)[hit.index]
      if (option) surface.post({ act: 'pick', list: current.picker.open, value: option.value })
      surface.setState({ ...current, picker: pickerInitial(model) })
    } else if (hit?.act === 'close') surface.setState({ ...current, picker: pickerInitial(model) })
    else if (hit?.act === 'control') surface.post({ act: 'pointer', x, y, columns: surface.columns, rows: surface.rows, width: model.width, generation: props.generation, button: 'left' })
  })
  surface.onKey(e => {
    const current = surface.state ?? local
    if (!current.picker.open) {
      surface.post({ act: 'key', key: e.key })
      return
    }
    const state = current.picker, list = state.open!
    const matches = options(model, list, state.query)
    if (e.key === 'return') {
      const selected = matches[state.highlight]
      if (selected) {
        surface.post({ act: 'pick', list, value: selected.value })
        surface.setState({ ...current, picker: pickerInitial(model) })
      }
    } else if (e.key === 'up' || e.key === 'down') surface.setState({ ...current, picker: moveHighlight(state, matches.length, e.key === 'up' ? -1 : 1) })
    else if (!e.ctrl && !e.meta && (e.key === 'backspace' || Array.from(e.key).length === 1 && e.key >= ' ')) surface.setState({ ...current, picker: typeQuery(state, e.key) })
    else if (e.key === 'tab') surface.setState({ ...current, picker: pickerInitial(model) })
  })
  const svg: SvgProps = { source: paneSvg(model, local.picker, local.hover), width: model.width, height: PANE_HEIGHT, alt: `القارئ · السورة · ${model.status} · ${model.title} · ${model.reciter} · ${model.elapsed} / ${model.total} · السابقة · ${model.playing ? 'إيقاف' : 'تشغيل'} · التالية` }
  return <Box width="100%">{h('Svg', svg)}</Box>
}
export default client
