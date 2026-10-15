import { fixtureCatalog } from '../quran/fixtures/catalog.ts'
import type { Mounted } from 'claude-code/testing'
import { settingsBoxes, TITLE_HIT_H, paneHeight } from '../../src/features/muslim-pane/layout.ts'
import { CLOSED_SETTINGS, type SettingsState } from '../../src/features/muslim-pane/settings.ts'
import type { On, PaneOpenArgs, UiOpenResult } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { cardRects, ATHAN_TOP, ATHKAR_Y, CONTROLS_CY, KROW_TOP, OPEN_TOP, PANE_HEIGHT, PRAYER_Y, QURAN_Y } from '../../src/features/muslim-pane/layout.ts'
import type { PaneModel } from '../../src/features/muslim-pane/model.ts'

const MUNICH = 'Munich; 48.1351, 11.582; Europe/Berlin; DE'
const NOON = Date.parse('2026-10-10T10:00:00Z')

const pane = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', component: 'Pane' as const, requestId: 'muslim', surface, props: { title: 'Muslim', isFocused: false, bodyColumns: 50, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} } })
// Stands for the engine's own band and mode labels beneath the plugin, so the features connect as in a session.
const engine = (on: On, surface: 'desktop' | 'terminal', open?: (args: PaneOpenArgs) => UiOpenResult, entries: Record<string, unknown> = {}, storeWrites?: {key:string;value:unknown}[]) => {
  mock.env(on, {})
  if (storeWrites) {
    on('store.get',async(_$,e)=>({value:entries[e.key]}))
    on('store.set',async(_$,e)=>{entries[e.key]=e.value;storeWrites.push({key:e.key,value:e.value});return {value:undefined}})
  } else mock.store(on, entries)
  mock.clock(on, { now: NOON })
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  on('ui.render', { component: 'SessionMode' }, async ($, e) => { const { Text } = $.ui.resolve(e); return <Text>x</Text> })
  on('ui.render', { component: 'Pane', requestId: 'muslim' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  on('ui.message', { element: 'muslim-pane' }, async () => ({}))
  const opened: { id: string; title?: string; focus?: true }[] = []
  on('ui.open', async (_$, e) => { opened.push({ id: e.id, title: e.title, ...(e.focus ? { focus: e.focus } : {}) }); return { value: open?.(e) ?? { isPlaced: true } } })
  return opened
}
const band = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'band', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
const modes = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', surface, component: 'SessionMode' as const, requestId: 'modes', props: { modes: [] as readonly string[] } })

test('/muslim pane opens the Muslim pane on desktop', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'desktop')
  const result = await $.command.run({ command: 'muslim', args: 'pane', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(opened).toEqual([{ id: 'muslim', title: 'Muslim' }])
  expect(result.text).toContain('Muslim pane opened')
})

test('the pane draws the prayer card from salah and quiet notes for features not drawn yet', { options: { salahPlace: MUNICH, athkar: false } }, async ($, on) => {
  engine(on, 'desktop')
  const ui = await $.ui.mount(pane('desktop'))
  const model = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  expect(model.prayer.isSet).toBe(true)
  expect(model.prayer.city).toBe('Munich')
  expect(model.prayer.rows).toHaveLength(5)
  expect(model.prayer.rows.filter(r => r.state === 'next')).toHaveLength(1)
  expect(model.quran.isAvailable).toBe(false)
  expect(model.athkar.isAvailable).toBe(false)
})

test('the athkar card reads today\'s progress once the athkar band has drawn', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  await $.ui.mount(band('desktop'))
  const ui = await $.ui.mount(pane('desktop'))
  const model = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  expect(model.athkar.isAvailable).toBe(true)
  if (model.athkar.isAvailable) expect(model.athkar.fraction).toMatch(/^٠ \/ [٠-٩]+$/)
})

test('the athan row changes the salah setting itself', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  const sets: { key: string; value: unknown }[] = []
  on('config.set', async (_$, e) => { sets.push({ key: e.key, value: e.value }); return { value: e.value } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const fine = { x: 25, y: (PRAYER_Y + ATHAN_TOP + 15) * 40 / PANE_HEIGHT }
  await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  expect(sets).toEqual([{ key: 'muslim.salahAthan', value: false }])
})

test('Open full player works before the footer or catalog has loaded; unavailable controls remain inactive', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'desktop')
  on('http.fetch', async () => ({ value: { ok: false, status: 503, headers: {}, text: '' } }))
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const click = async (y: number) => {
    const fine = { x: 25, y: y * 40 / PANE_HEIGHT }
    await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  }
  // No footer draw or catalog: playback is inactive, navigation still works.
  await click(QURAN_Y + CONTROLS_CY)
  expect(toasts).toEqual([])
  await click(QURAN_Y + OPEN_TOP + 15)
  expect(opened).toEqual([{ id: 'quran', title: '۞ القرآن الكريم', focus: true }])
  expect(toasts).toEqual([])
  // Athkar not connected: its button is not a target.
  await click(ATHKAR_Y + KROW_TOP + 18)
  expect(toasts).toHaveLength(0)
})

test('with the features drawn, Quran Open opens the Quran pane and athkar Open lights the reader', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'desktop', undefined, { 'quran.catalog': { ...fixtureCatalog, fetchedAt: NOON } })
  on('http.fetch', { init: { method: 'HEAD' } }, async () => ({ value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } }))
  await $.ui.mount(modes('desktop'))
  await $.ui.mount(band('desktop'))
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const click = async (y: number) => {
    const fine = { x: 25, y: y * 40 / PANE_HEIGHT }
    await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  }
  await click(QURAN_Y + OPEN_TOP + 15)
  expect(opened.map(o => o.id)).toContain('quran')
})

test('the terminal gets a plain text summary instead of a pane', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'terminal')
  const result = await $.command.run({ command: 'muslim', args: 'pane', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(opened).toEqual([])
  expect(result.text).toContain('**Muslim**')
  expect(result.text).toContain('Munich')
  expect(result.text).toContain('Athan on')
})

test('the terminal pane body is text too', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'terminal')
  const ui = await $.ui.mount(pane('terminal'))
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  expect(await ui.find({ text: /Munich/ })).toBeDefined()
})

test('the footer chip ☾ toggles the Muslim pane on desktop', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'desktop')
  const panes: { id: string; title: string; isShown: boolean; isPlaced: boolean; isFocused: boolean }[] = []
  const closed: string[] = []
  on('ui.panes', async () => ({ value: panes }))
  on('ui.close', async (_$, e) => { closed.push(e.id); panes.length = 0; return { value: undefined } })
  const mounted = await $.ui.mount(modes('desktop'))
  expect((await mounted.find({ type: 'Button', key: 'muslim-footer' }))?.props.label).toBe('☾')
  await mounted.press({ key: 'muslim-footer' })
  expect(opened).toEqual([{ id: 'muslim', title: 'Muslim' }])
  panes.push({ id: 'muslim', title: 'Muslim', isShown: true, isPlaced: true, isFocused: false })
  await mounted.press({ key: 'muslim-footer' })
  expect(closed).toEqual(['muslim'])
  expect(opened).toHaveLength(1)
})

test('the footer chip sits before the engine items and is absent in the terminal, narrow or not', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  const narrow = await $.ui.mount({ ...modes('desktop'), viewport: { columns: 10, rows: 30 } })
  expect((await narrow.find({ type: 'Button', key: 'muslim-footer' }))?.props.label).toBe('☾')
  expect(await narrow.find({ text: 'x' })).toBeDefined()
})

test('the terminal footer gets no ☾ chip', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'terminal')
  const mounted = await $.ui.mount(modes('terminal'))
  expect(await mounted.find({ type: 'Button', key: 'muslim-footer' })).toBeUndefined()
})

test('pressing a card title folds it and unfolds it again, kept in the session', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  const saved: Record<string, unknown> = {}
  on('state.get', { plugin: 'muslim', key: 'paneFolds' }, async (_$, e, next) => saved.paneFolds ? { value: { value: saved.paneFolds as never, version: 1 } } : next(e))
  on('state.set', { plugin: 'muslim', key: 'paneFolds' }, async (_$, e, next) => { saved.paneFolds = e.value; return next(e) })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const model = async () => (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  const click = async (y: number, height: number) => {
    const fine = { x: 25, y: y * 40 / height }
    await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  }
  expect((await model()).folds).toEqual({ prayer: false, quran: false, athkar: false })
  await click(PRAYER_Y + 20, PANE_HEIGHT)
  expect((await model()).folds).toEqual({ prayer: true, quran: false, athkar: false })
  expect(saved.paneFolds).toEqual({ prayer: true, quran: false, athkar: false })
  // The folded card is short: the Quran title now sits right under it.
  const r = cardRects((await model()).folds)
  await click(r.prayerY + 20, r.height)
  expect((await model()).folds.prayer).toBe(false)
})

// Desktop's dock owns all mod-pane tabs. The test observes API requests;
// the native host's tab activation and painting still need a live check.
for (const alreadyOpen of [false, true]) test(`Open full player requests the Quran tab in front (${alreadyOpen ? 'existing tab' : 'first open'}) with a coarse pointer`, async ($, on) => {
  const opened = engine(on, 'desktop', undefined, { 'quran.catalog': { ...fixtureCatalog, fetchedAt: NOON } })
  const panes = [
    { id: 'muslim', title: 'Muslim', isPlaced: true, isShown: true, isFocused: true },
    ...(alreadyOpen ? [{ id: 'quran', title: 'القرآن الكريم', isPlaced: true, isShown: false, isFocused: false }] : []),
  ]
  on('ui.panes', async () => ({ value: panes }))
  on('http.fetch', { init: { method: 'HEAD' } }, async () => ({ value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } }))
  const closed: string[] = []
  on('ui.close', async (_$, e) => { closed.push(e.id); return { value: undefined } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const click = () => ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: 25, y: Math.floor((QURAN_Y + OPEN_TOP + 21) * 40 / PANE_HEIGHT) })
  await click()
  await click()
  expect(opened).toEqual([
    { id: 'quran', title: '۞ القرآن الكريم', focus: true },
    { id: 'quran', title: '۞ القرآن الكريم', focus: true },
  ])
  expect(closed).toEqual([])
  expect(panes[0]!.id).toBe('muslim')
})

test('Open full player raises the tab before queued Quran preparation finishes', async ($, on) => {
  let raised!: () => void
  const opened = engine(on, 'desktop', e => { if (e.focus) raised(); return { isPlaced: true } }, { 'quran.catalog': { ...fixtureCatalog, fetchedAt: NOON } })
  let release!: () => void, started!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  const preparing = new Promise<void>(resolve => { started = resolve })
  const front = new Promise<void>(resolve => { raised = resolve })
  on('http.fetch', { init: { method: 'HEAD' } }, async () => {
    started()
    await held
    return { value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } }
  })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const command = $.command.run({ command: 'quran', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  await preparing
  const click = ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: 25, y: Math.floor((QURAN_Y + OPEN_TOP + 21) * 40 / PANE_HEIGHT) })
  try {
    await front
    expect(opened).toEqual([{ id: 'quran', title: '۞ القرآن الكريم' }, { id: 'quran', title: '۞ القرآن الكريم', focus: true }])
  } finally { release() }
  await command
  await click
  expect(opened).toHaveLength(2)
})

test('an unplaced Quran pane is reported instead of treated as a successful press', async ($, on) => {
  engine(on, 'desktop', () => ({ isPlaced: false, reason: 'no pane surface' }))
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: 25, y: Math.floor((QURAN_Y + OPEN_TOP + 21) * 40 / PANE_HEIGHT) })
  expect(toasts).toEqual(['Quran is not ready yet. /quran'])
})

for (const style of ['sky', 'frame'] as const) {
  test(`pane finish ${style}: fills counts, updates fraction/bar, hides its button and plays the visible band's finale`, { options: { athkarStyle: style } }, async ($, on) => {
    engine(on, 'desktop')
    const written: unknown[] = []
    on('state.set', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => { written.push(e.value); return next(e) })
    const reader = await $.ui.mount(band('desktop'))
    const ui = await $.ui.mount(pane('desktop'))
    await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
    const model = async () => (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
    expect((await model()).athkar).toMatchObject({ isAvailable: true, isDone: false, progress: 0 })
    expect(String((await ui.find({ in: 'muslim-pane', type: 'Svg' }))?.props.source)).toContain('✓ أتممتُها')
    // Finish is immediately to Open's right, in the same RTL row.
    const fine = { x: 148 * 50 / 420, y: (ATHKAR_Y + KROW_TOP + 18) * 40 / PANE_HEIGHT }
    await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
    const card = (await model()).athkar
    expect(card).toMatchObject({ isDone: true, progress: 1 })
    if (card.isAvailable) {
      const [done, total] = card.fraction.split(' / ')
      expect(done).toBe(total)
    }
    expect(written).toHaveLength(1)
    expect(String((await ui.find({ in: 'muslim-pane', type: 'Svg' }))?.props.source)).not.toContain('✓ أتممتُها')
    expect(String((await reader.find({ in: 'athkar', type: 'Svg' }))?.props.source)).toContain('class="fall"')
    await ui.unmount(); await reader.unmount()
  })
}

// Settings use real Client pointer messages, not calls to implementation helpers.

async function settingsClick(ui: Mounted<'desktop' | 'terminal', 'Pane'>, act: string) {
  await ui.resize({ columns:50, rows:100, in:'muslim-pane' })
  const model=(await ui.find({type:'Client',key:'muslim-pane'}))!.props.props as PaneModel
  const y=cardRects(model.folds,model.settings.state).settingsY
  const t=act==='settings:fold'?{x0:12,x1:408,y0:y,y1:y+TITLE_HIT_H}:settingsBoxes(420,model.folds,model.settings).find(t=>t.act===act)
  if(!t) throw new Error(`Missing settings target ${act}`)
  const height=paneHeight(model.folds,model.settings.state)
  const fine={x:(t.x0+t.x1)/2*50/420,y:(t.y0+t.y1)/2*100/height}
  await ui.pointer({in:'muslim-pane',type:'down',button:'left',x:Math.floor(fine.x),y:Math.floor(fine.y),fine})
}
function settingsState(on: On, state: SettingsState) {
  let saved=state
  on('state.get',{plugin:'muslim',key:'paneSettings'},async()=>({value:{value:saved,version:1}}))
  on('state.set',{plugin:'muslim',key:'paneSettings'},async(_$,e,next)=>{saved=e.value!;return next(e)})
  return ()=>saved
}
const settingCases: {category:SettingsState['category'];face?:SettingsState['face'];page?:number;act:string;field:string;value:string|boolean}[] = [
  {category:'thikr',act:'thikr',field:'thikr',value:false},
  {category:'thikr',act:'thikrSpeed:3',field:'thikrSpeed',value:'3'},
  {category:'thikr',act:'thikrMode:salawat',field:'thikrMode',value:'salawat'},
  {category:'thikr',act:'thikrEnd',field:'thikrEnd',value:false},
  {category:'general',act:'tashkeel',field:'tashkeel',value:false},
  {category:'general',act:'color:blue',field:'color',value:'blue'},
  {category:'athkar',act:'athkar',field:'athkar',value:false},
  {category:'athkar',act:'athkarStyle:frame',field:'athkarStyle',value:'frame'},
  {category:'prayer',act:'salahShow:always',field:'salahShow',value:'always'},
  {category:'prayer',act:'salahShow:off',field:'salahShow',value:'off'},
  {category:'prayer',act:'salahShow:+',field:'salahShow',value:'21'},
  {category:'prayer',act:'salahAthan',field:'salahAthan',value:false},
  {category:'prayer',face:'methods',page:3,act:'pick:portugal',field:'salahMethod',value:'portugal'},
  {category:'prayer',face:'adjust',act:'adjust:asr:-',field:'salahAdjust',value:'0 0 0 -1 0 0'},
]
for(const c of settingCases) test(`settings press writes ${c.field} = ${c.value}`,async($,on)=>{
  engine(on,'desktop')
  settingsState(on,{open:true,category:c.category,face:c.face??'main',page:c.page??0})
  const sets:{key:string;value:unknown}[]=[]
  on('config.set',async(_$,e)=>{sets.push({key:e.key,value:e.value});return {value:e.value}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,`settings:${c.act}`)
  expect(sets).toEqual([{key:`muslim.${c.field}`,value:c.value}])
})

test('settings config deny shows a toast and leaves the category open',async($,on)=>{
  engine(on,'desktop')
  const state=settingsState(on,{open:true,category:'athkar',face:'main',page:0})
  const toasts:string[]=[]
  on('config.set',async()=>({deny:'locked'}))
  on('ui.toast',async(_$,e)=>{toasts.push(e.text);return {value:undefined}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:athkar')
  expect(toasts).toEqual(['Not changed: locked'])
  expect(state().category).toBe('athkar')
})

test('settings starts on general; tabs, sub-face back, and reopens survive redraws',async($,on)=>{
  engine(on,'desktop')
  const state=settingsState(on,CLOSED_SETTINGS)
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:fold')
  expect(state()).toEqual({...CLOSED_SETTINGS,open:true})
  await settingsClick(ui,'settings:tab:prayer')
  await settingsClick(ui,'settings:methods')
  expect(state().face).toBe('methods')
  await settingsClick(ui,'settings:tab:prayer')
  expect(state().face).toBe('methods')
  await settingsClick(ui,'settings:back')
  expect(state().face).toBe('main')
  await settingsClick(ui,'settings:tab:general')
  expect(state().category).toBe('general')
  await settingsClick(ui,'settings:tab:general')
  expect(state()).toEqual({...CLOSED_SETTINGS,open:true})
  await settingsClick(ui,'settings:fold')
  expect(state().open).toBe(false)
  await settingsClick(ui,'settings:fold')
  expect(state().category).toBe('general')
})

test('legacy open accordion state renders general and saves normalized state on input',async($,on)=>{
  engine(on,'desktop')
  // Deliberately inject the pre-tabs persisted shape at the engine boundary.
  const legacy={open:true,category:null,face:'main',page:0} as unknown as SettingsState
  const state=settingsState(on,legacy)
  const ui=await $.ui.mount(pane('desktop'))
  const model=(await ui.find({type:'Client',key:'muslim-pane'}))!.props.props as PaneModel
  expect(model.settings.state).toEqual({...CLOSED_SETTINGS,open:true})
  expect(state()).toBe(legacy) // Reading/rendering does not write state.
  await settingsClick(ui,'settings:tab:prayer')
  expect(state()).toEqual({open:true,category:'prayer',face:'main',page:0})
})

test('reciter press reaches the Quran connector and its command selection path, without userConfig',async($,on)=>{
  const saved:{key:string;value:unknown}[]=[], configs:unknown[]=[]
  engine(on,'desktop',undefined,{'quran.catalog':{...fixtureCatalog,fetchedAt:NOON}},saved)
  const state=settingsState(on,{open:true,category:'quran',face:'main',page:0})
  on('config.set',async(_$,e)=>{configs.push(e);return {value:e.value}})
  on('http.fetch',{init:{method:'HEAD'}},async()=>({value:{ok:true,status:200,headers:{'content-length':'1000000'},text:''}}))
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:reciters')
  await settingsClick(ui,'settings:pick:10:21')
  expect(saved).toContainEqual({key:'quran.reciter',value:'10:21'})
  expect(configs).toEqual([])
  expect(state().face).toBe('main')
})

test('repeat pills reach existing Quran repeat logic, remain session-only, and can turn off',async($,on)=>{
  const stores:{key:string;value:unknown}[]=[]
  engine(on,'desktop',undefined,{'quran.catalog':{...fixtureCatalog,fetchedAt:NOON}},stores)
  settingsState(on,{open:true,category:'quran',face:'main',page:0})
  const repeats:unknown[]=[],configs:string[]=[]
  on('state.set',{plugin:'muslim',key:'quranRepeat'},async(_$,e,next)=>{repeats.push(e.value);return next(e)})
  on('config.set',async(_$,e)=>{configs.push(e.key);return {value:e.value}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:repeat:surah')
  await settingsClick(ui,'settings:repeat:off')
  expect(repeats).toEqual(['surah','off'])
  expect(stores).toEqual([]);expect(configs).toEqual([])
})

test('city press runs Salah question and its existing save/review flow',async($,on)=>{
  engine(on,'desktop')
  settingsState(on,{open:true,category:'prayer',face:'main',page:0})
  const questions:string[]=[],sets:{key:string;value:unknown}[]=[]
  on('tool.call',async(_$,e)=>{
    const q=(e as unknown as {questions:{question:string}[]}).questions[0]!.question
    questions.push(q)
    return {tool:e.tool,tool_use_id:e.tool_use_id,result:{questions:[],answers:{[q]:'48.14, 11.58'}}} as never
  })
  on('config.set',async(_$,e)=>{sets.push({key:e.key,value:e.value});return {value:e.value}})
  const reviews:unknown[]=[]
  on('state.set',{plugin:'muslim',key:'salahReview'},async(_$,e,next)=>{reviews.push(e.value);return next(e)})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:city')
  expect(questions).toHaveLength(1)
  expect(sets).toHaveLength(1)
  expect(sets[0]!.key).toBe('muslim.salahPlace')
  expect(String(sets[0]!.value)).toContain('48.14, 11.58')
  expect(reviews).toContainEqual({fajr:0,sunrise:0,dhuhr:0,asr:0,maghrib:0,isha:0})
})

test('terminal Arabic opens a command sheet and copies its command without a setting write',async($,on)=>{
  engine(on,'desktop')
  settingsState(on,{open:true,category:'general',face:'main',page:0})
  const copies:string[]=[],sets:string[]=[]
  on('ui.copy',async(_$,e)=>{copies.push(e.text);return {value:{isCopied:true}}})
  on('config.set',async(_$,e)=>{sets.push(e.key);return {value:e.value}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:terminal')
  expect(String((await ui.find({in:'muslim-pane',type:'Svg'}))?.props.source)).toContain('/muslim terminal-arabic')
  await settingsClick(ui,'settings:copy')
  expect(copies).toEqual(['/muslim terminal-arabic']);expect(sets).toEqual([])
})

test('terminal pane command refreshes Quran settings before any footer or pane draw',async($,on)=>{
  engine(on,'terminal',undefined,{'quran.catalog':{...fixtureCatalog,fetchedAt:NOON},'quran.reciter':'10:21'})
  const result=await $.command.run({command:'muslim',args:'pane',origin:{kind:'composer'},presentation:{isFullscreen:false,columns:80}})
  expect(result.text).toContain('Quran · reciter: محمد صديق المنشاوي')
  expect(result.text).toContain('/quran reciter <number or name>')
  expect(result.text).toContain('Quran · repeat: off')
  expect(result.text).toContain('Terminal Arabic:')
})

const boundaryCases: {category:SettingsState['category'];act:string;raw:Record<string,string>;expected:{key:string;value:string}|null}[] = [
  {category:'thikr' as const,act:'thikrSpeed:-',raw:{thikrSpeed:'1'},expected:null},
  {category:'thikr' as const,act:'thikrSpeed:+',raw:{thikrSpeed:'59'},expected:{key:'muslim.thikrSpeed',value:'60'}},
  {category:'prayer' as const,act:'salahShow:-',raw:{salahShow:'2'},expected:{key:'muslim.salahShow',value:'1'}},
  {category:'prayer' as const,act:'salahShow:+',raw:{salahShow:'720'},expected:null},
]
for(const c of boundaryCases) test(`setting step boundaries ${c.act} ${JSON.stringify(c.raw)}`,{options:c.raw},async($,on)=>{
  engine(on,'desktop');settingsState(on,{open:true,category:c.category,face:'main',page:0})
  const sets:{key:string;value:unknown}[]=[]
  on('config.set',async(_$,e)=>{sets.push({key:e.key,value:e.value});return {value:e.value}})
  const ui=await $.ui.mount(pane('desktop'))
  if(c.expected){await settingsClick(ui,`settings:${c.act}`);expect(sets).toEqual([c.expected])}
  else {
    const model=(await ui.find({type:'Client',key:'muslim-pane'}))!.props.props as PaneModel
    expect(settingsBoxes(420,model.folds,model.settings).some(t=>t.act===`settings:${c.act}`)).toBe(false)
    expect(sets).toEqual([])
  }
})
