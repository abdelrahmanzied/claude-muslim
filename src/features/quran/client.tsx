import type { ClientModule, SvgProps } from 'claude-code'
import { pointerPixels, type CardAction } from './card.ts'
import { PANE_HEIGHT, columnsWidth, safeWidth, paneHeight, beginPickerDrag, dragPicker, moveHighlight, openPicker, options, paneHit, paneSvg, pickerInitial, scrollPicker, typeQuery, type PaneModel, type PickerState, type PickerDrag } from './pane.ts'

type Local = { picker: PickerState; hover: CardAction | null; size: string; wheel: number; overList: boolean; drag: PickerDrag | null }
const client: ClientModule<PaneModel, Local> = (props, surface) => {
  const { Box } = surface.elements
  if (surface.state === undefined) {
    surface.setState({ picker: pickerInitial(props), hover: null, size: '', wheel: props.wheel, overList: false, drag: null })
    surface.every(200, () => {
      const size = `${surface.columns}x${surface.rows}`
      const local = surface.state
      if (local && size !== local.size && surface.columns > 0 && surface.rows > 0) {
        surface.post({ act: 'picker', list: local.picker.open, width: columnsWidth(surface.columns), columns: surface.columns, rows: surface.rows, height: paneHeight(model), focusRevision: local.picker.focusRevision, overList: local.overList })
        surface.setState({ ...local, size })
      }
    })
  }
  const model = { ...props, width: surface.columns > 0 ? columnsWidth(surface.columns, safeWidth(props.width)) : safeWidth(props.width) }
  let local = surface.state ?? { picker: pickerInitial(model), hover: null, size: '', wheel: props.wheel, overList: false, drag: null }
  let resetPicker = false
  if (local.picker.focusRevision !== model.focusRevision || local.picker.wasFocused && !model.isFocused) {
    resetPicker = true
    local = { ...local, picker: pickerInitial(model), wheel: model.wheel, overList: false, drag: null }
    surface.setState(local)
  } else if (local.picker.wasFocused !== model.isFocused) {
    local = { ...local, picker: { ...local.picker, wasFocused: model.isFocused } }
    surface.setState(local)
  }
  if (local.wheel !== model.wheel) {
    const picker = local.picker.open ? scrollPicker(local.picker, options(model, local.picker.open, local.picker.query).length, model.wheel - local.wheel) : local.picker
    local = { ...local, picker, wheel: model.wheel }
    surface.setState(local)
  }
  const reportPicker = (picker: PickerState, overList = false) => {
    if (surface.columns > 0 && surface.rows > 0) surface.post({ act: 'picker', list: picker.open, width: model.width, columns: surface.columns, rows: surface.rows, height: paneHeight(model), focusRevision: model.focusRevision, overList })
  }
  if (resetPicker) reportPicker(local.picker)
  surface.onPointer(e => {
    const current = surface.state ?? local
    const x = e.fine?.x ?? e.x + 0.5, y = e.fine?.y ?? e.y + 0.5
    // Shared card maps cells to pixels; the full pane substitutes its own height.
    const pixels = pointerPixels(model.width, x, y, surface.columns, surface.rows, paneHeight(model))
    if (current.drag && current.picker.open && (e.type === 'move' || e.type === 'up')) {
      const picker = dragPicker(current.picker, options(model, current.picker.open, current.picker.query).length, current.drag, pixels.y)
      const hit = paneHit(model, picker, pixels.x, pixels.y)
      const overList = hit?.act === 'row' || hit?.act === 'panel' || hit?.act === 'scrollbar'
      if (e.type === 'up' && overList !== current.overList) reportPicker(picker, overList)
      surface.setState({ ...current, picker, hover: null, overList: e.type === 'up' ? overList : current.overList, drag: e.type === 'up' ? null : current.drag })
      return
    }
    const hit = paneHit(model, current.picker, pixels.x, pixels.y)
    const hover = e.type !== 'leave' && hit?.act === 'control' ? hit.action : null
    const overList = e.type !== 'leave' && (hit?.act === 'row' || hit?.act === 'panel' || hit?.act === 'scrollbar')
    const rowHover = e.type !== 'leave' && hit?.act === 'row' ? hit.index : -1
    if (hover !== current.hover || rowHover !== current.picker.hover || overList !== current.overList) surface.setState({ ...current, hover, overList, picker: { ...current.picker, hover: rowHover } })
    if (e.type !== 'down' || (e.button ?? 'left') !== 'left') {
      if (overList !== current.overList) reportPicker(current.picker, overList)
      return
    }
    if (hit?.act === 'scrollbar' && current.picker.open) {
      const result = beginPickerDrag(current.picker, options(model, current.picker.open, current.picker.query).length, pixels.y)
      if (result) surface.setState({ ...current, ...result, hover: null, overList: true })
      reportPicker(current.picker, true)
    } else if (hit?.act === 'field') {
      const picker = openPicker(model, current.picker, hit.list)
      reportPicker(picker)
      surface.setState({ ...current, picker, hover: null, overList: false, drag: null })
    } else if (hit?.act === 'row' && current.picker.open) {
      const option = options(model, current.picker.open, current.picker.query)[hit.index]
      if (option) surface.post({ act: 'pick', list: current.picker.open, value: option.value })
      surface.setState({ ...current, picker: pickerInitial(model), overList: false, drag: null })
    } else if (hit?.act === 'close') {
      reportPicker(pickerInitial(model))
      surface.setState({ ...current, picker: pickerInitial(model), overList: false, drag: null })
    } else if (hit?.act === 'panel' && overList !== current.overList) reportPicker(current.picker, overList)
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
        surface.setState({ ...current, picker: pickerInitial(model), overList: false, drag: null })
      }
    } else if (e.key === 'up' || e.key === 'down') surface.setState({ ...current, picker: moveHighlight(state, matches.length, e.key === 'up' ? -1 : 1), drag: null })
    else if (!e.ctrl && !e.meta && (e.key === 'backspace' || Array.from(e.key).length === 1 && e.key >= ' ')) surface.setState({ ...current, picker: typeQuery(state, e.key), drag: null })
    else if (e.key === 'tab') {
      reportPicker(pickerInitial(model))
      surface.setState({ ...current, picker: pickerInitial(model), overList: false, drag: null })
    }
  })
  const svg: SvgProps = { source: paneSvg(model, local.picker, local.hover), width: model.width, height: paneHeight(model), alt: `المصحف · القارئ · السورة · ${model.segmented ? 'ابدأ من · ' + model.segmentLabel + ' · ' : ''}${model.status} · ${model.title} · ${model.reciter} · ${model.elapsed} / ${model.total} · السابقة · ${model.playing || model.preparing ? 'إيقاف' : 'تشغيل'} · التالية · تكرار السورة ${model.repeat ? 'مفعّل' : 'متوقف'}` }
  return <Box width="100%">{h('Svg', svg)}</Box>
}
export default client
