import type { ClientModule, SvgProps } from 'claude-code'
import { pointerPixels, pointerSlack, type CardAction } from './card.ts'
import { columnsWidth, dragCell, safeWidth, paneHeight, beginPickerDrag, dragPicker, moveHighlight, openPicker, options, paneHit, paneSvg, pickerInitial, typeQuery, type PaneModel, type PickerState, type PickerDrag } from './pane.ts'

type Local = { picker: PickerState; hover: CardAction | null; drag: PickerDrag | null }
// The list never follows the mouse wheel: Desktop moves the pane before any hook sees a wheel tick, so holding the pane still to scroll
// the list made it shake. The wheel scrolls the pane like any other; the list moves by search, ↑ ↓ and the scrollbar.
// One highlight serves both hands: the row under the pointer becomes the highlight, and ↑ ↓ go on from it.
const client: ClientModule<PaneModel, Local> = (props, surface) => {
  const { Box } = surface.elements
  const model = { ...props, width: surface.columns > 0 ? columnsWidth(surface.columns, safeWidth(props.width)) : safeWidth(props.width) }
  let local = surface.state ?? { picker: pickerInitial(model), hover: null, drag: null }
  if (surface.state === undefined) surface.setState(local)
  if (local.picker.focusRevision !== model.focusRevision || local.picker.wasFocused && !model.isFocused) {
    local = { ...local, picker: pickerInitial(model), drag: null }
    surface.setState(local)
  } else if (local.picker.wasFocused !== model.isFocused) {
    local = { ...local, picker: { ...local.picker, wasFocused: model.isFocused } }
    surface.setState(local)
  }
  surface.onPointer(e => {
    const current = surface.state ?? local
    const x = e.fine?.x ?? e.x + 0.5, y = e.fine?.y ?? e.y + 0.5
    // Shared card maps cells to pixels; the full pane substitutes its own height.
    const pixels = pointerPixels(model.width, x, y, surface.columns, surface.rows, paneHeight(model))
    // Without `fine` the pointer is a whole cell snapped to its center; hit testing then treats the cell's half-extent as slack.
    const coarse = e.fine === undefined
    const slack = pointerSlack(model.width, surface.columns, surface.rows, paneHeight(model), coarse)
    if (current.drag && current.picker.open && (e.type === 'move' || e.type === 'up')) {
      // While dragging, vertical position is the cell count times the scale frozen at the press, never today's rows.
      const y = Number.isFinite(current.drag.cell) ? (e.fine?.y ?? e.y + 0.5) * current.drag.cell : pixels.y
      const picker = dragPicker(current.picker, options(model, current.picker.open, current.picker.query).length, current.drag, y)
      // A move that changes nothing draws nothing: every redraw swaps a whole picture on the host.
      if (e.type === 'move' && picker.scroll === current.picker.scroll && picker.highlight === current.picker.highlight && current.hover === null) return
      surface.setState({ ...current, picker, hover: null, drag: e.type === 'up' ? null : current.drag })
      return
    }
    const hit = paneHit(model, current.picker, pixels.x, pixels.y, slack)
    const hover = e.type !== 'leave' && hit?.act === 'control' ? hit.action : null
    const highlight = e.type !== 'leave' && hit?.act === 'row' ? hit.index : current.picker.highlight
    if (hover !== current.hover || highlight !== current.picker.highlight) surface.setState({ ...current, hover, picker: { ...current.picker, highlight } })
    if (e.type !== 'down' || (e.button ?? 'left') !== 'left') return
    if (hit?.act === 'scrollbar' && current.picker.open) {
      const result = beginPickerDrag(current.picker, options(model, current.picker.open, current.picker.query).length, pixels.y, dragCell(paneHeight(model), surface.rows))
      if (result) surface.setState({ ...current, ...result, hover: null })
    } else if (hit?.act === 'field') {
      surface.setState({ ...current, picker: openPicker(model, current.picker, hit.list), hover: null, drag: null })
    } else if (hit?.act === 'row' && current.picker.open) {
      const option = options(model, current.picker.open, current.picker.query)[hit.index]
      if (option) surface.post({ act: 'pick', list: current.picker.open, value: option.value })
      surface.setState({ ...current, picker: pickerInitial(model), drag: null })
    } else if (hit?.act === 'close') surface.setState({ ...current, picker: pickerInitial(model), drag: null })
    else if (hit?.act === 'control') surface.post({ act: 'pointer', x, y, columns: surface.columns, rows: surface.rows, width: model.width, generation: props.generation, button: 'left', coarse })
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
        surface.setState({ ...current, picker: pickerInitial(model), drag: null })
      }
    } else if (e.key === 'up' || e.key === 'down') surface.setState({ ...current, picker: moveHighlight(state, matches.length, e.key === 'up' ? -1 : 1), drag: null })
    else if (!e.ctrl && !e.meta && (e.key === 'backspace' || Array.from(e.key).length === 1 && e.key >= ' ')) surface.setState({ ...current, picker: typeQuery(state, e.key), drag: null })
    else if (e.key === 'tab') surface.setState({ ...current, picker: pickerInitial(model), drag: null })
  })
  const svg: SvgProps = { source: paneSvg(model, local.picker, local.hover), width: model.width, height: paneHeight(model), alt: `المصحف · القارئ · السورة · ${model.segmented ? 'ابدأ من · ' + model.segmentLabel + ' · ' : ''}${model.status} · ${model.title} · ${model.reciter} · ${model.elapsed} / ${model.total} · السابقة · ${model.playing || model.preparing ? 'إيقاف' : 'تشغيل'} · التالية · تكرار السورة ${model.repeat === 'surah' ? 'مفعّل' : 'متوقف'} · تكرار المقطع ${model.repeat === 'segment' ? 'مفعّل' : 'متوقف'}` }
  return <Box width="100%">{h('Svg', svg)}</Box>
}
export default client
