import type { ClientModule, SvgProps } from 'claude-code'
import { pointerPixels, pointerSlack, type CardAction } from './card.ts'
import { columnsWidth, safeWidth, paneHeight, listTitle, moveHighlight, openPicker, options, paneHit, paneSvg, pickerInitial, turnPage, typeQuery, type PaneModel, type PickerState } from './pane.ts'

type Local = { picker: PickerState; hover: CardAction | null }
const client: ClientModule<PaneModel, Local> = (props, surface) => {
  const { Box } = surface.elements
  const model = { ...props, width: surface.columns > 0 ? columnsWidth(surface.columns, safeWidth(props.width)) : safeWidth(props.width) }
  let local = surface.state ?? { picker: pickerInitial(model), hover: null }
  if (surface.state === undefined) surface.setState(local)
  const reportPicker = (picker: PickerState) => surface.post({ act: 'picker', list: picker.open, focusRevision: model.focusRevision })
  if (local.picker.focusRevision !== model.focusRevision || local.picker.wasFocused && !model.isFocused) {
    const wasOpen = local.picker.open !== null
    local = { picker: pickerInitial(model), hover: null }
    surface.setState(local)
    if (wasOpen) reportPicker(local.picker)
  } else if (local.picker.wasFocused !== model.isFocused) {
    local = { ...local, picker: { ...local.picker, wasFocused: model.isFocused } }
    surface.setState(local)
  }
  const closePicker = () => {
    const picker = pickerInitial(model)
    surface.setState({ picker, hover: null })
    reportPicker(picker)
  }
  surface.onPointer(e => {
    const current = surface.state ?? local
    const x = e.fine?.x ?? e.x + 0.5, y = e.fine?.y ?? e.y + 0.5
    // Client rows start at the region's top, even inside a scrolled pane. Use
    // the whole picture's height, never the visible pane window or its offset.
    const height = paneHeight(model, current.picker)
    const pixels = pointerPixels(model.width, x, y, surface.columns, surface.rows, height)
    const coarse = e.fine === undefined
    const slack = pointerSlack(model.width, surface.columns, surface.rows, height, coarse)
    const hit = paneHit(model, current.picker, pixels.x, pixels.y, slack)
    const hover = e.type !== 'leave' && hit?.act === 'control' ? hit.action : null
    const rowHover = e.type === 'leave' ? -1 : hit?.act === 'row' ? hit.index : hit?.act === 'close' ? -2 : -1
    if (hover !== current.hover || rowHover !== current.picker.hover) surface.setState({ ...current, hover, picker: { ...current.picker, hover: rowHover } })
    if (e.type !== 'down' || (e.button ?? 'left') !== 'left') return
    if (hit?.act === 'field') {
      const picker = openPicker(model, current.picker, hit.list)
      surface.setState({ picker, hover: null })
      reportPicker(picker)
    } else if (hit?.act === 'row' && current.picker.open) {
      const option = options(model, current.picker.open, current.picker.query)[hit.index]
      if (option) {
        surface.setState({ picker: pickerInitial(model), hover: null })
        // post is one message per frame: pick also requests the card's top.
        surface.post({ act: 'pick', list: current.picker.open, value: option.value })
      }
    } else if (hit?.act === 'page') surface.setState({ ...current, picker: { ...turnPage(model, current.picker, hit.delta), hover: -1 } })
    else if (hit?.act === 'close') closePicker()
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
        surface.setState({ picker: pickerInitial(model), hover: null })
        surface.post({ act: 'pick', list, value: selected.value })
      }
    } else if (e.key === 'up' || e.key === 'down') surface.setState({ ...current, picker: moveHighlight(state, matches.length, e.key === 'up' ? -1 : 1) })
    else if (!e.ctrl && !e.meta && (e.key === 'backspace' || Array.from(e.key).length === 1 && e.key >= ' ')) {
      const picker = typeQuery(state, e.key)
      surface.setState({ ...current, picker })
      reportPicker(picker)
    } else if (e.key === 'tab' || e.key === 'escape') closePicker()
  })
  const cardAlt = `المصحف · القارئ · السورة · ${model.segmented ? 'ابدأ من · ' + model.segmentLabel + ' · ' : ''}${model.status} · ${model.title} · ${model.reciter} · ${model.elapsed} / ${model.total} · السابقة · ${model.playing || model.preparing ? 'إيقاف' : 'تشغيل'} · التالية · تكرار السورة ${model.repeat === 'surah' ? 'مفعّل' : 'متوقف'} · تكرار المقطع ${model.repeat === 'segment' ? 'مفعّل' : 'متوقف'}`
  const listAlt = local.picker.open ? `${listTitle(local.picker.open)} · رجوع · بحث ${local.picker.query} · ${options(model, local.picker.open, local.picker.query).length} خيارات` : ''
  // Svg sizes are capped at 4096px; listPageLayout pages a long list to stay within it.
  const svg: SvgProps = { source: paneSvg(model, local.picker, local.hover), width: model.width, height: paneHeight(model, local.picker), alt: local.picker.open ? listAlt : cardAlt }
  return <Box width="100%">{h('Svg', svg)}</Box>
}
export default client
