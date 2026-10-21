import { ATHKAR_QUIET, configRows } from '../fixtures/config.ts'
import { emptyDay, dayOf } from '../../src/features/athkar/logic.ts'
import type { Day, PaneOptimistic } from '../../types/index.d.ts'
import { runPanelAction } from '../../src/shared/panel/signal.ts'
import { quranLayout } from '../../src/features/muslim-pane/model.ts'
import { athkarHead, athkarRow, athkarRowTop, KMENU_TOP, KMENU_PAD, KMENU_ROW_H, KMENU_GAP } from '../../src/features/muslim-pane/layout.ts'
import type { Mounted } from 'claude-code/testing'
import { settingsBoxes, TITLE_HIT_H, paneHeight } from '../../src/features/muslim-pane/layout.ts'
import { CLOSED_SETTINGS, COPIED_MS, SETTINGS_BODY_TOP, SWITCH_FIELDS, settingsBody, type SettingsState } from '../../src/features/muslim-pane/settings.ts'
import type { On, PaneOpenArgs, UiOpenResult } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { cardRects, ATHAN_TOP, ATHKAR_Y, KROW_TOP, PANE_HEIGHT, Q_CONTROLS_BASE, Q_CONTROLS_H, Q_TITLE_TOP, PRAYER_Y, QURAN_Y } from '../../src/features/muslim-pane/layout.ts'
import type { PaneModel } from '../../src/features/muslim-pane/model.ts'

const MUNICH = 'Munich; 48.1351, 11.582; Europe/Berlin; DE'
const NOON = Date.parse('2026-10-10T10:00:00Z')

declare const setTimeout: (fn: () => void, ms: number) => unknown
let testClock!: ReturnType<typeof mock.clock>
const pane = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', component: 'Pane' as const, requestId: 'muslim', surface, props: { title: 'Muslim', isFocused: false, bodyColumns: 50, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} } })
// Stands for the engine's own band and mode labels beneath the plugin, so the features connect as in a session.
const engine = (on: On, surface: 'desktop' | 'terminal', open?: (args: PaneOpenArgs) => UiOpenResult, entries: Record<string, unknown> = {}, storeWrites?: {key:string;value:unknown}[], env: Record<string,string> = {}, rows = configRows) => {
  // Existing-user fixture: prayer setup was already put off.
  entries = { salahSetupLater: true, ...entries }
  mock.env(on, env)
  if (storeWrites) {
    on('store.get',async(_$,e)=>({value:entries[e.key]}))
    on('store.set',async(_$,e)=>{entries[e.key]=e.value;storeWrites.push({key:e.key,value:e.value});return {value:undefined}})
  } else mock.store(on, entries)
  testClock = mock.clock(on, { now: NOON })
  on('session.surface', async () => ({ value: surface }))
  on('session.surfaces', async () => ({ value: [surface] }))
  on('config.list', async () => ({ value: rows }))
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

test('/muslim opens the Muslim pane on desktop', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'desktop')
  const result = await $.command.run({ command: 'muslim', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(opened).toEqual([{ id: 'muslim', title: '☾ Muslim' }])
  expect(result.text).toBe('Muslim pane opened.')
})

test('the pane draws prayers and the shipped Quran catalog immediately, and the athkar card even with every reminder off', { options: { salahPlace: MUNICH, ...ATHKAR_QUIET } }, async ($, on) => {
  engine(on, 'desktop')
  const ui = await $.ui.mount(pane('desktop'))
  const model = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  expect(model.prayer.isSet).toBe(true)
  expect(model.prayer.city).toBe('Munich')
  expect(model.prayer.rows).toHaveLength(5)
  expect(model.prayer.rows.filter(r => r.state === 'next')).toHaveLength(1)
  expect(model.quran.isAvailable).toBe(true)
  expect(model.athkar.isAvailable).toBe(true)
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

test('the Quran surah picker works before a footer draw, with an empty store and no network', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  const requests: string[] = []
  on('http.fetch', async (_$, e) => { requests.push(e.url); throw new Error('unexpected network') })
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const model = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  expect(model.quran.isAvailable).toBe(true)
  const rects = cardRects(model.folds, model.settings.state, model.settings.options, quranLayout(model), model.athkarMenu)
  const fine = { x: 25, y: (rects.quranY + Q_TITLE_TOP + 16) * 40 / rects.height }
  await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  const picked = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  expect(picked.picker?.list).toBe('surah')
  expect(picked.picker?.count).toBe(114)
  expect(requests).toEqual([])
  expect(toasts).toEqual([])
})

test('the terminal gets a plain text summary instead of a pane', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'terminal')
  const result = await $.command.run({ command: 'muslim', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(opened).toEqual([])
  expect(result.text).toContain('**Muslim** · v')
  expect(result.text).toContain('### Features\n\n| Feature | Description | State |')
  expect(result.text).toContain('| Salah | Pray times and the next pray under the prompt | `20` — only the 20 min before a pray, counting down |')
})

test('the terminal pane body is text too', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'terminal')
  const ui = await $.ui.mount(pane('terminal'))
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  expect(await ui.find({ text: /Munich/ })).toBeDefined()
})

for (const [key, label] of [['muslim-footer', '☾ Muslim']] as const) {
  test(`the footer button ${label} toggles the Muslim pane on desktop`, { options: { salahPlace: MUNICH } }, async ($, on) => {
    const opened = engine(on, 'desktop')
    const panes: { id: string; title: string; isShown: boolean; isPlaced: boolean; isFocused: boolean }[] = []
    const closed: string[] = []
    on('ui.panes', async () => ({ value: panes }))
    on('ui.close', async (_$, e) => { closed.push(e.id); panes.length = 0; return { value: undefined } })
    const mounted = await $.ui.mount(modes('desktop'))
    const button = await mounted.find({ type: 'Button', key })
    expect(button?.props.label).toBe(label)
    expect(button?.props.plain).toBe(true)
    expect(await mounted.find({ text: label })).toBeDefined()
    await mounted.press({ key })
    expect(opened).toEqual([{ id: 'muslim', title: '☾ Muslim' }])
    panes.push({ id: 'muslim', title: '☾ Muslim', isShown: true, isPlaced: true, isFocused: false })
    await mounted.press({ key })
    expect(closed).toEqual(['muslim'])
    expect(opened).toHaveLength(1)
  })
}

test('the footer button remains before the engine items at narrow widths', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  const narrow = await $.ui.mount({ ...modes('desktop'), viewport: { columns: 10, rows: 30 } })
  expect((await narrow.find({ type: 'Button', key: 'muslim-footer' }))?.props.label).toBe('☾ Muslim')
  expect(await narrow.find({ text: '☾ مسلم' })).toBeUndefined()
  expect(await narrow.find({ text: 'x' })).toBeDefined()
})

test('the terminal footer gets no Muslim button', { options: { salahPlace: MUNICH } }, async ($, on) => {
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
    // Finish sits between «إعادة» and «ابدأ» in the same RTL row.
    const finish = athkarRow(420).finish
    const fine = { x: (finish.x0 + finish.x1) / 2 * 50 / 420, y: (ATHKAR_Y + KROW_TOP + 18) * 40 / PANE_HEIGHT }
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
  const y=cardRects(model.folds,model.settings.state,model.settings.options).settingsY
  const t=act==='settings:fold'?{x0:12,x1:408,y0:y,y1:y+TITLE_HIT_H}:settingsBoxes(420,model.folds,model.settings).find(t=>t.act===act)
  if(!t) throw new Error(`Missing settings target ${act}`)
  const height=paneHeight(model.folds,model.settings.state,model.settings.options)
  const fine={x:(t.x0+t.x1)/2*50/420,y:(t.y0+t.y1)/2*100/height}
  await ui.pointer({in:'muslim-pane',type:'down',button:'left',x:Math.floor(fine.x),y:Math.floor(fine.y),fine})
}
function settingsState(on: On, state: SettingsState) {
  let saved=state
  on('state.get',{plugin:'muslim',key:'paneSettings'},async()=>({value:{value:saved,version:1}}))
  on('state.set',{plugin:'muslim',key:'paneSettings'},async(_$,e,next)=>{saved=e.value!;return next(e)})
  return ()=>saved
}
// A number box takes the pane's keys one by one, as the Client posts them, then Enter.
async function typeKeys(ui: Mounted<'desktop' | 'terminal', 'Pane'>, text: string) {
  for (const key of [...Array.from(text), 'return']) await ui.post({ act: 'key', key }, { in: 'muslim-pane' })
}
const settingCases: {category:SettingsState['category'];face?:SettingsState['face'];page?:number;act:string;typed?:string;field:string;value:string|boolean}[] = [
  {category:'thikr',act:'thikr',field:'thikr',value:false},
  {category:'thikr',act:'thikrEnd',field:'thikrEnd',value:false},
  {category:'general',act:'paneButton',field:'paneButton',value:false},
  {category:'thikr',act:'thikrMode:salawat',field:'thikrMode',value:'salawat'},
  {category:'general',act:'tashkeel',field:'tashkeel',value:false},
  {category:'general',act:'color:blue',field:'color',value:'blue'},
  {category:'athkar',act:'athkarMorning',field:'athkarMorning',value:false},
  {category:'athkar',act:'athkarEvening',field:'athkarEvening',value:false},
  {category:'athkar',act:'athkarAfterSalah',field:'athkarAfterSalah',value:false},
  {category:'athkar',act:'athkarStyle:frame',field:'athkarStyle',value:'frame'},
  {category:'prayer',act:'salahShow:always',field:'salahShow',value:'always'},
  {category:'prayer',act:'salahShow:off',field:'salahShow',value:'off'},
  {category:'prayer',act:'field:salahShow',typed:'45',field:'salahShow',value:'45'},
  {category:'prayer',act:'salahAthan',field:'salahAthan',value:false},
  {category:'prayer',face:'methods',page:3,act:'pick:portugal',field:'salahMethod',value:'portugal'},
  {category:'prayer',face:'adjust',act:'field:adjust:asr',typed:'-1',field:'salahAdjust',value:'0 0 0 -1 0 0'},
]
for(const c of settingCases) test(`settings press writes ${c.field} = ${c.value}`,async($,on)=>{
  engine(on,'desktop')
  settingsState(on,{open:true,category:c.category,face:c.face??'main',page:c.page??0})
  const sets:{key:string;value:unknown}[]=[]
  on('config.set',async(_$,e)=>{sets.push({key:e.key,value:e.value});return {value:e.value}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,`settings:${c.act}`)
  if(c.typed!==undefined) await typeKeys(ui,c.typed)
  expect(sets).toEqual([{key:`muslim.${c.field}`,value:c.value}])
})

test('settings config deny shows a toast and leaves the category open',async($,on)=>{
  engine(on,'desktop')
  const state=settingsState(on,{open:true,category:'athkar',face:'main',page:0})
  const toasts:string[]=[]
  on('config.set',async()=>({deny:'locked'}))
  on('ui.toast',async(_$,e)=>{toasts.push(e.text);return {value:undefined}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:athkarMorning')
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

test('old accordion state draws fresh settings and input saves the current shape',async($,on)=>{
  engine(on,'desktop')
  // Deliberately inject the pre-tabs persisted shape at the engine boundary.
  const legacy={open:true,category:null,face:'main',page:0} as unknown as SettingsState
  const state=settingsState(on,legacy)
  const ui=await $.ui.mount(pane('desktop'))
  const model=(await ui.find({type:'Client',key:'muslim-pane'}))!.props.props as PaneModel
  expect(model.settings.state).toEqual(CLOSED_SETTINGS)
  expect(state()).toBe(legacy) // Reading/rendering does not write state.
  await settingsClick(ui,'settings:fold')
  await settingsClick(ui,'settings:tab:prayer')
  expect(state()).toEqual({open:true,category:'prayer',face:'main',page:0})
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

const svgOf=async(ui:Mounted<'desktop'|'terminal','Pane'>)=>String((await ui.find({in:'muslim-pane',type:'Svg'}))?.props.source)
const terminalButton=(svg:string)=>svg.match(/<div class="sc value[^"]*"[^>]*aria-label="[^"]*"[^>]*>.*?<\/div>/gs)!.find(d=>d.includes('terminal-arabic')||d.includes('تم النسخ'))!

test('terminal Arabic copies its command in one press, then confirms «تم النسخ ✓» for 2s and returns to the command',async($,on)=>{
  engine(on,'desktop')
  settingsState(on,{open:true,category:'general',face:'main',page:0})
  const copies:string[]=[],sets:string[]=[]
  on('ui.copy',async(_$,e)=>{copies.push(e.text);return {value:{isCopied:true}}})
  on('config.set',async(_$,e)=>{sets.push(e.key);return {value:e.value}})
  const ui=await $.ui.mount(pane('desktop'))
  let button=terminalButton(await svgOf(ui))
  expect(button).toContain('/muslim terminal-arabic')
  expect(button).not.toContain('<svg')
  await settingsClick(ui,'settings:terminal')
  button=terminalButton(await svgOf(ui))
  expect(button).toContain('تم النسخ ✓')
  expect(button).toContain(' copied')
  expect(button).not.toContain('<svg')
  expect(button).not.toContain('/muslim terminal-arabic')
  const model=(await ui.find({type:'Client',key:'muslim-pane'}))!.props.props as PaneModel
  expect(model.settings.state.face).toBe('main')
  expect(model.settings.copied).toBe('/muslim terminal-arabic')
  expect(copies).toEqual(['/muslim terminal-arabic']);expect(sets).toEqual([])
  await testClock.advance(COPIED_MS-1)
  expect(terminalButton(await svgOf(ui))).toContain('تم النسخ ✓')
  await testClock.advance(1)
  for(let i=0;i<200&&terminalButton(await svgOf(ui)).includes('تم النسخ');i++)await new Promise<void>(r=>setTimeout(()=>r(),5))
  button=terminalButton(await svgOf(ui))
  expect(button).toContain('/muslim terminal-arabic')
  expect(button).not.toContain('تم النسخ')
})

test('terminal pane body lists terminal settings without desktop-only rows',async($,on)=>{
  engine(on,'terminal')
  const ui=await $.ui.mount(pane('terminal'))
  expect(await ui.find({text:/Terminal Arabic:/})).toBeDefined()
  expect(await ui.find({text:/End of turn:/})).toBeDefined()
  for(const label of ['زر مسلم','الإصدار','التحديث التلقائي','إرسال ملاحظة']) expect(await ui.find({text:label})).toBeUndefined()
})

// Thikr speed takes 1–60 seconds and «عرض الصلاة» 1–60 minutes; the adjustments take any whole minutes, 0 and negatives
// included. Out of range is not saved (a toast says why); a sign is never typed where negatives do not count.
// A key that is not a digit (or an allowed sign) is never typed, so Enter on an empty box closes it quietly.
const fieldCases: {category:SettingsState['category'];face?:SettingsState['face'];act:string;raw:Record<string,string>;typed:string;expected:{key:string;value:string}|null;quiet?:true}[] = [
  {category:'thikr',act:'thikrSpeed',raw:{thikrSpeed:'auto'},typed:'٧',expected:{key:'muslim.thikrSpeed',value:'7'}},
  {category:'thikr',act:'thikrSpeed',raw:{thikrSpeed:'3'},typed:'0',expected:null},
  {category:'thikr',act:'thikrSpeed',raw:{thikrSpeed:'3'},typed:'60',expected:{key:'muslim.thikrSpeed',value:'60'}},
  {category:'thikr',act:'thikrSpeed',raw:{thikrSpeed:'3'},typed:'٧',expected:{key:'muslim.thikrSpeed',value:'7'}},
  {category:'thikr',act:'thikrSpeed',raw:{thikrSpeed:'3'},typed:'61',expected:null},
  {category:'thikr',act:'thikrSpeed',raw:{thikrSpeed:'3'},typed:'-5',expected:{key:'muslim.thikrSpeed',value:'5'}},
  {category:'prayer',act:'salahShow',raw:{salahShow:'20'},typed:'0',expected:null},
  {category:'prayer',act:'salahShow',raw:{salahShow:'20'},typed:'1',expected:{key:'muslim.salahShow',value:'1'}},
  {category:'prayer',act:'salahShow',raw:{salahShow:'20'},typed:'٦٠',expected:{key:'muslim.salahShow',value:'60'}},
  {category:'prayer',act:'salahShow',raw:{salahShow:'20'},typed:'61',expected:null},
  {category:'prayer',act:'salahShow',raw:{salahShow:'20'},typed:'x',expected:null,quiet:true},
  {category:'prayer',face:'adjust',act:'adjust:fajr',raw:{salahAdjust:'4 0 0 0 0 0'},typed:'0',expected:{key:'muslim.salahAdjust',value:'0 0 0 0 0 0'}},
  {category:'prayer',face:'adjust',act:'adjust:isha',raw:{},typed:'-90',expected:{key:'muslim.salahAdjust',value:'0 0 0 0 0 -90'}},
  {category:'prayer',face:'adjust',act:'adjust:isha',raw:{},typed:'-',expected:null},
]
for(const c of fieldCases) test(`number box ${c.act} ${JSON.stringify(c.raw)} typed ${c.typed}`,{options:c.raw},async($,on)=>{
  engine(on,'desktop');settingsState(on,{open:true,category:c.category,face:c.face??'main',page:0})
  const sets:{key:string;value:unknown}[]=[], toasts:string[]=[]
  on('config.set',async(_$,e)=>{sets.push({key:e.key,value:e.value});return {value:e.value}})
  on('ui.toast',async(_$,e)=>{toasts.push(e.text);return {value:undefined}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,`settings:field:${c.act}`)
  await typeKeys(ui,c.typed)
  expect(sets).toEqual(c.expected?[c.expected]:[])
  expect(toasts).toHaveLength(c.expected||c.quiet?0:1)
})

test('a number box shows its unit, takes keys only while open, and any other press closes it unsaved',{options:{salahShow:'20'}},async($,on)=>{
  engine(on,'desktop');settingsState(on,{open:true,category:'prayer',face:'main',page:0})
  const sets:unknown[]=[]
  on('config.set',async(_$,e)=>{sets.push(e.value);return {value:e.value}})
  const ui=await $.ui.mount(pane('desktop'))
  expect(await svgOf(ui)).toContain('<span class="unit">دقيقة</span>')
  await settingsClick(ui,'settings:field:salahShow')
  for(const key of ['4','a','5']) await ui.post({act:'key',key},{in:'muslim-pane'})
  const svg=await svgOf(ui)
  expect(svg).toContain('<bdi dir="ltr">45</bdi><i class="caret"></i>')
  expect(svg).toContain('Enter للحفظ')
  await settingsClick(ui,'settings:salahAthan')
  await ui.post({act:'key',key:'return'},{in:'muslim-pane'})
  expect(sets).toEqual([false])
  expect(await svgOf(ui)).not.toContain('field editing')
})

test('terminal Arabic copy failure shows the command as a toast',async($,on)=>{
  engine(on,'desktop'); settingsState(on,{open:true,category:'general',face:'main',page:0})
  const toasts:string[]=[]
  on('ui.copy',async()=>({value:{isCopied:false,reason:'no-clipboard'}}))
  on('ui.toast',async(_$,e)=>{toasts.push(e.text);return {value:undefined}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:terminal')
  expect(toasts).toEqual(['/muslim terminal-arabic'])
  expect(await svgOf(ui)).not.toContain('تم النسخ')
})

// A press resolves before its config write does; wait for the hook's own effects.
const until=async(done:()=>boolean)=>{for(let i=0;i<200&&!done();i++)await new Promise<void>(r=>setTimeout(()=>r(),5))}
const optimisticRef={plugin:'muslim',key:'paneOptimistic'} as const

function optimisticState(on: On, initial: PaneOptimistic = {}) {
  let saved = initial
  const writes: PaneOptimistic[] = []
  on('state.get', { plugin: 'muslim', key: 'paneOptimistic' }, async (_$, e, next) => {
    const held = await next(e)
    return { value: { version: held.value!.version, value: saved } }
  })
  on('state.set', { plugin: 'muslim', key: 'paneOptimistic' }, async (_$, e, next) => {
    const result = await next(e)
    if (result.value?.isSet) { saved = e.value!; writes.push(saved) }
    return result
  })
  return { read: () => saved, writes }
}

async function athanClick(ui: Mounted<'desktop' | 'terminal', 'Pane'>) {
  await ui.resize({ columns: 50, rows: 100, in: 'muslim-pane' })
  const model = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  const r = cardRects(model.folds, model.settings.state, model.settings.options, quranLayout(model), model.athkarMenu)
  const fine = { x: 25, y: (r.prayerY + ATHAN_TOP + 15) * 100 / r.height }
  await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
}

test('a stale Athan ON entry after reload draws OFF and the next press saves ON', { options: { salahPlace: MUNICH, salahAthan: false } }, async ($, on) => {
  engine(on, 'desktop')
  const pending = optimisticState(on, { salahAthan: true })
  const sets: unknown[] = []
  on('config.set', async (_$, e) => { sets.push(e.value); return { value: e.value } })
  const ui = await $.ui.mount(pane('desktop'))
  expect((await athkarModel(ui)).prayer.isAthan).toBe(false)
  expect((await athkarModel(ui)).settings.options.salahAthan).toBe(false)
  expect(await svgOf(ui)).toContain('aria-checked="false" aria-label="الأذان"')
  // Let the press beat the deferred cleanup of the inherited true value.
  await athanClick(ui)
  await until(() => sets.length > 0)
  await testClock.advance(0)
  expect(sets).toEqual([true])
  expect(pending.read()).toEqual({ salahAthan: true })
  expect((await athkarModel(ui)).prayer.isAthan).toBe(true)
  await ui.unmount()
})

for (const field of SWITCH_FIELDS) for (const matches of [true, false]) test(`reload clears ${matches ? 'confirmed' : 'stale'} ${field} outside drawing`, { options: { [field]: false } }, async ($, on) => {
  engine(on, 'desktop')
  // Host state surviving a successful write/reload, or a later external change.
  const pending = optimisticState(on, { [field]: !matches })
  let rendering = true
  on('state.set', optimisticRef, (_$, e, next) => { expect(rendering).toBe(false); expect(typeof e.ifVersion).toBe('number'); return next(e) })
  const ui = await $.ui.mount(pane('desktop'))
  expect((await athkarModel(ui)).settings.options[field]).toBe(false)
  expect(pending.writes).toEqual([])
  rendering = false
  await testClock.advance(0)
  expect(pending.read()).toEqual({})
  expect(pending.writes).toEqual([{}])
  await ui.redraw()
  await testClock.advance(0)
  expect(pending.writes).toEqual([{}])
  await ui.unmount()
})

test('loaded pending cleanup retries a missed state version', async ($, on) => {
  engine(on, 'desktop')
  const pending = optimisticState(on, { salahAthan: true })
  let missed = false, attempts = 0
  on('state.set', optimisticRef, (_$, e, next) => {
    attempts++
    if (!missed) { missed = true; return { value: { isSet: false, version: 1 } } }
    return next(e)
  })
  const ui = await $.ui.mount(pane('desktop'))
  await testClock.advance(0)
  expect(attempts).toBe(2)
  expect(pending.read()).toEqual({})
  await ui.unmount()
})

for (const failure of ['deny', 'throw', 'missing'] as const) test(`daily Athan ${failure} restores OFF and toasts`, { options: { salahPlace: MUNICH, salahAthan: false } }, async ($, on) => {
  engine(on, 'desktop', undefined, {}, undefined, {}, failure === 'missing' ? [] : configRows)
  const pending = optimisticState(on)
  const toasts: string[] = [], sets: unknown[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  on('config.set', async (_$, e) => { sets.push(e.value); if (failure === 'throw') throw new Error('locked'); return { deny: 'locked' } })
  const ui = await $.ui.mount(pane('desktop'))
  await athanClick(ui)
  await until(() => toasts.length > 0)
  expect((await athkarModel(ui)).prayer.isAthan).toBe(false)
  expect((await athkarModel(ui)).settings.options.salahAthan).toBe(false)
  expect(pending.read()).toEqual({})
  expect(sets).toEqual(failure === 'missing' ? [] : [true])
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toMatch(/^Not changed:/)
  if (failure !== 'throw') expect(toasts[0]).toBe(failure === 'missing' ? 'Not changed: run /reload-plugins, then try again.' : 'Not changed: locked')
  await ui.unmount()
})

for (const denied of [false, true]) test(`two Athan presses before reload keep the second value when the older write ${denied ? 'is denied' : 'succeeds'}`, { options: { salahPlace: MUNICH, salahAthan: false } }, async ($, on) => {
  engine(on, 'desktop')
  const pending = optimisticState(on, { salahAthan: true })
  const values: unknown[] = [], releases: (() => void)[] = [], toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  on('config.set', async (_$, e) => {
    const index = values.length
    values.push(e.value)
    await new Promise<void>(resolve => { releases[index] = resolve })
    return denied && index === 0 ? { deny: 'locked' } : { value: e.value }
  })
  const ui = await $.ui.mount(pane('desktop'))
  try {
    await athanClick(ui); await until(() => values.length === 1)
    expect((await athkarModel(ui)).prayer.isAthan).toBe(true)
    await athanClick(ui); await until(() => values.length === 2)
    expect(values).toEqual([true, false])
    expect(pending.read()).toEqual({ salahAthan: false })
    releases[0]!()
    if (denied) await until(() => toasts.length > 0)
    await testClock.advance(0)
    expect(pending.read()).toEqual({ salahAthan: false })
    expect((await athkarModel(ui)).prayer.isAthan).toBe(false)
    expect((await athkarModel(ui)).settings.options.salahAthan).toBe(false)
  } finally { for (const release of releases) release() }
  await ui.unmount()
})

for(const denied of [false,true]) test(`settings switch redraws while config is pending, ${denied?'then rolls back denial':'then keeps the requested value'}`,async($,on)=>{
  engine(on,'desktop'); settingsState(on,{open:true,category:'athkar',face:'main',page:0})
  let optimistic:unknown
  on('state.set',{plugin:'muslim',key:'paneOptimistic'},async(_$,e,next)=>{optimistic=e.value;return next(e)})
  let started!:()=>void, release!:()=>void
  const writing=new Promise<void>(resolve=>{started=resolve})
  const held=new Promise<void>(resolve=>{release=resolve})
  const toasts:string[]=[]
  on('ui.toast',async(_$,e)=>{toasts.push(e.text);return {value:undefined}})
  on('config.set',async()=>{started();await held;return denied?{deny:'locked'}:{value:false}})
  const ui=await $.ui.mount(pane('desktop'))
  const click=settingsClick(ui,'settings:athkarMorning')
  try {
    await writing
    expect(optimistic).toEqual({athkarMorning:false})
    const model=(await ui.find({type:'Client',key:'muslim-pane'}))!.props.props as PaneModel
    expect(model.settings.options.athkarMorning).toBe(false)
    const svg=String((await ui.find({in:'muslim-pane',type:'Svg'}))?.props.source)
    expect(svg).toContain('role="switch" aria-checked="false"')
  } finally {release()}
  await click
  if(denied) await until(()=>toasts.length>0)
  expect(optimistic).toEqual(denied?{}:{athkarMorning:false})
  const model=(await ui.find({type:'Client',key:'muslim-pane'}))!.props.props as PaneModel
  expect(model.settings.options.athkarMorning).toBe(denied)
})

test('a denied write clears only its own pending value, never a newer press for the same field',async($,on)=>{
  engine(on,'desktop'); settingsState(on,{open:true,category:'athkar',face:'main',page:0})
  let newer=false
  const writes:unknown[]=[]
  on('state.get',optimisticRef,async(_$,e,next)=>newer?{value:{value:{athkarMorning:true,thikr:false},version:99}}:next(e))
  on('state.set',optimisticRef,async(_$,e,next)=>{writes.push(e.value);return next(e)})
  let started!:()=>void, release!:()=>void
  const writing=new Promise<void>(resolve=>{started=resolve})
  const held=new Promise<void>(resolve=>{release=resolve})
  const toasts:string[]=[]
  on('ui.toast',async(_$,e)=>{toasts.push(e.text);return {value:undefined}})
  on('config.set',async()=>{started();await held;return {deny:'locked'}})
  const ui=await $.ui.mount(pane('desktop'))
  const click=settingsClick(ui,'settings:athkarMorning')
  await writing
  // A newer press for the same switch (the opposite value) lands while the first is still pending.
  newer=true
  release()
  await click
  await until(()=>toasts.length>0)
  expect(writes).toEqual([{athkarMorning:false}])
})

test('a denied write is retried when another press beat its version',async($,on)=>{
  engine(on,'desktop'); settingsState(on,{open:true,category:'athkar',face:'main',page:0})
  const writes:unknown[]=[]
  let denying=false, missed=false
  on('state.set',optimisticRef,async(_$,e,next)=>{
    writes.push(e.value)
    if(denying&&!missed){missed=true;return {value:{isSet:false,version:50}}}
    return next(e)
  })
  const toasts:string[]=[]
  on('ui.toast',async(_$,e)=>{toasts.push(e.text);return {value:undefined}})
  on('config.set',async()=>{denying=true;return {deny:'locked'}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:athkarMorning')
  await until(()=>toasts.length>0)
  expect(writes).toEqual([{athkarMorning:false},{},{}])
})

const athkarModel = async (ui: Mounted<'desktop' | 'terminal', 'Pane'>) => (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
async function athkarClick(ui: Mounted<'desktop' | 'terminal', 'Pane'>, target: 'title' | 'reset' | 'fold' | 'open' | 'finish' | number) {
  await ui.resize({ columns: 50, rows: 100, in: 'muslim-pane' })
  const model = await athkarModel(ui), q = quranLayout(model)
  const r = cardRects(model.folds, model.settings.state, model.settings.options, q, model.athkarMenu)
  const h = athkarHead(420)
  let x: number, y: number
  if (typeof target === 'number') { x = 210; y = KMENU_TOP + KMENU_PAD + target * (KMENU_ROW_H + KMENU_GAP) + 16 }
  else if (target === 'title' || target === 'fold') { x = (h[target].x0 + h[target].x1) / 2; y = 28 }
  else { const b = athkarRow(420)[target]; x = (b.x0 + b.x1) / 2; y = athkarRowTop(model.athkarMenu) + 18 }
  const fine = { x: x * 50 / 420, y: (r.athkarY + y) * 100 / r.height }
  await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
}

test('the pane can select and open an untouched after-salah slot after automatic expiry', { options: { salahPlace: MUNICH, salahAthan: false } }, async ($, on) => {
  const day = emptyDay(dayOf(new Date(NOON)))
  day.afterSalah = { ...day.afterSalah, pray: 'fajr', at: Date.parse('2026-10-10T03:42:00Z') }
  engine(on, 'desktop', undefined, { athkar: day })
  const reader = await $.ui.mount(band('desktop'))
  await testClock.advance(0)
  expect((await reader.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'morning' })
  const ui = await $.ui.mount(pane('desktop'))
  await athkarClick(ui, 'title')
  await athkarClick(ui, 2)
  expect((await athkarModel(ui)).athkar).toMatchObject({ set: 'after-salah', progress: 0 })
  await athkarClick(ui, 'open')
  expect((await reader.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
  await testClock.advance(60_000)
  expect((await reader.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
  await ui.unmount()
  await reader.unmount()
})

for (const [i, set] of (['morning', 'evening', 'after-salah'] as const).entries()) {
  test(`athkar picker ${set}: works before band draw, shares manual hold, Finish, Open and reset/undo`, async ($, on) => {
    const writes: { key: string; value: unknown }[] = []
    engine(on, 'desktop', undefined, {}, writes)
    const ui = await $.ui.mount(pane('desktop'))
    expect((await athkarModel(ui)).athkar).toMatchObject({ isAvailable: true })
    await athkarClick(ui, 'title')
    expect((await athkarModel(ui)).athkarMenu).toBe(true)
    await athkarClick(ui, i)
    expect((await athkarModel(ui)).athkarMenu).toBe(false)
    expect((await athkarModel(ui)).athkar).toMatchObject({ set, canUndo: false })
    await athkarClick(ui, 'finish')
    const finished = (await athkarModel(ui)).athkar
    expect(finished).toMatchObject({ set, isDone: true, progress: 1 })
    const saved = writes.filter(w => w.key === 'athkar').at(-1)!.value as Day
    const slot = set === 'after-salah' ? 'afterSalah' : set
    expect(saved[slot].isDone).toBe(true)
    await athkarClick(ui, 'reset')
    expect((await athkarModel(ui)).athkar).toMatchObject({ set, canUndo: true, isDone: false, progress: 0 })
    expect(await svgOf(ui)).toContain('>تراجع</span>')
    await athkarClick(ui, 'reset')
    expect((await athkarModel(ui)).athkar).toMatchObject({ set, canUndo: false, isDone: true, progress: 1 })
    expect(writes.filter(w => w.key === 'athkar').at(-1)!.value).toEqual(saved)
    const reader = await $.ui.mount(band('desktop'))
    await athkarClick(ui, 'open')
    expect((await reader.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: slot, phase: 'done' })
    await athkarClick(ui, 'reset')
    await testClock.advance(8000)
    expect((await athkarModel(ui)).athkar).toMatchObject({ set, canUndo: false })
    await athkarClick(ui, 'reset')
    expect((await athkarModel(ui)).athkar).toMatchObject({ set, canUndo: true, isDone: false })
    await athkarClick(ui, 'title')
    await athkarClick(ui, (i + 1) % 3)
    expect((await athkarModel(ui)).athkar).toMatchObject({ canUndo: false })
    await ui.unmount(); await reader.unmount()
  })
}

test('athkar title toggles its menu, Tab closes it, folding clears it, and invalid signals leave the choice untouched', async ($, on) => {
  engine(on, 'desktop')
  const ui = await $.ui.mount(pane('desktop'))
  await athkarClick(ui, 'title')
  expect((await athkarModel(ui)).athkarMenu).toBe(true)
  await athkarClick(ui, 'title')
  expect((await athkarModel(ui)).athkarMenu).toBe(false)
  await athkarClick(ui, 'title')
  await ui.key({ in: 'muslim-pane', key: 'tab' })
  expect((await athkarModel(ui)).athkarMenu).toBe(false)
  // A forwarded Escape message is accepted; real Escape is consumed by this engine.
  await athkarClick(ui, 'title')
  await ui.post({ act: 'key', key: 'escape' }, { in: 'muslim-pane' })
  expect((await athkarModel(ui)).athkarMenu).toBe(false)
  await athkarClick(ui, 'title')
  await athkarClick(ui, 'fold')
  expect((await athkarModel(ui)).folds.athkar).toBe(true)
  expect((await athkarModel(ui)).athkarMenu).toBe(false)
  const before = (await athkarModel(ui)).athkar
  for (const value of ['afterSalah', 'morning reset', '', undefined]) expect(await runPanelAction('athkar-set', value)).toBe(false)
  expect((await athkarModel(ui)).athkar).toEqual(before)
  await ui.unmount()
})

test('pane and slash choices share hold and unhide rules, and another command choice drops reset undo', async ($, on) => {
  engine(on, 'desktop')
  const ui = await $.ui.mount(pane('desktop'))
  const command = (args: string) => $.command.run({ command: 'athkar', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  await command('evening')
  expect((await athkarModel(ui)).athkar).toMatchObject({ set: 'evening' })
  const reader = await $.ui.mount(band('desktop'))
  await reader.post({ act: 'hide' }, { in: 'athkar' })
  expect((await reader.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'morning' })
  await athkarClick(ui, 'title'); await athkarClick(ui, 1)
  expect((await reader.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'evening' })
  await athkarClick(ui, 'finish'); await athkarClick(ui, 'reset')
  expect((await athkarModel(ui)).athkar).toMatchObject({ canUndo: true })
  await command('evening')
  expect((await athkarModel(ui)).athkar).toMatchObject({ set: 'evening', canUndo: false })
  await ui.unmount(); await reader.unmount()
})

test('pane reads a replaced after-salah slot without trying a render-time state write', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const day = emptyDay(dayOf(new Date(NOON)))
  day.afterSalah = { ...day.afterSalah, pray: 'isha', at: NOON - 24 * 60 * 60 * 1000, counts: { '75': 1 }, isDone: true }
  const writes: { key: string; value: unknown }[] = []
  engine(on, 'desktop', undefined, { athkar: day }, writes)
  const ui = await $.ui.mount(pane('desktop'))
  expect((await athkarModel(ui)).athkar).toMatchObject({ isAvailable: true, isDone: false, progress: 0 })
  expect(writes.filter(w => w.key === 'athkar')).toEqual([])
  await ui.unmount()
})

test('paneButton off preserves the engine footer and /muslim still opens the pane', {options:{paneButton:false}},async($,on)=>{
  const opened=engine(on,'desktop')
  const ui=await $.ui.mount(modes('desktop'))
  expect(await ui.find({key:'muslim-footer'})).toBeUndefined()
  expect(await ui.find({text:'x'})).toBeDefined()
  expect((await $.command.run({command:'muslim',args:'',origin:{kind:'composer'},presentation:{isFullscreen:false,columns:80}})).text).toBe('Muslim pane opened.')
  expect(opened).toHaveLength(1)
})

for(const args of ['update','feedback'] as const) test(`general ${args} press dispatches the chat command`,{plugins:[{
  name:'command-observer',tier:'prepend',register(on){
    on('command.run',{command:'muslim'},async($,e)=>{
      await $.store.set('test.command',{command:e.command,args:e.args})
      return {text:'done'}
    })
  },
}]},async($,on)=>{
  const recorded:{key:string;value:unknown}[]=[],toasts:string[]=[]
  engine(on,'desktop',undefined,{},recorded)
  settingsState(on,{open:true,category:'general',face:'main',page:0})
  on('ui.toast',async(_$,e)=>{toasts.push(e.text);return {value:undefined}})
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,`settings:${args}`)
  expect(recorded.filter(e=>e.key==='test.command').map(e=>e.value)).toEqual([{command:'muslim',args}])
  expect(toasts).toEqual([])
  await ui.unmount()
})

test('an update press runs only when the shown auto-update switch is off', {plugins:[{
  name:'command-observer',tier:'prepend',register(on){
    on('command.run',{command:'muslim'},async($,e)=>{
      await $.store.set('test.command',{command:e.command,args:e.args})
      return {text:'done'}
    })
  },
}]},async($,on)=>{
  const recorded:{key:string;value:unknown}[]=[]
  engine(on,'desktop',undefined,{},recorded)
  settingsState(on,{open:true,category:'general',face:'main',page:0})
  let real=true,pending:boolean|null=null
  on('settings.read',async()=>({value:{extraKnownMarketplaces:{'claude-muslim':{autoUpdate:real}}}}))
  on('state.get',{plugin:'muslim',key:'paneAutoUpdate'},async()=>({value:{value:pending,version:1}}))
  const ui=await $.ui.mount(pane('desktop'))
  let expected=0
  for(const [value,held] of [[true,null],[true,false],[false,true],[false,null]] as const){
    real=value;pending=held
    await ui.resize({columns:50,rows:100,in:'muslim-pane'})
    await ui.redraw()
    const model=(await ui.find({type:'Client',key:'muslim-pane'}))!.props.props as PaneModel
    const update=settingsBody(420,model.settings).controls.find(t=>t.act==='settings:update')!
    const top=cardRects(model.folds,model.settings.state,model.settings.options).settingsY+SETTINGS_BODY_TOP
    const height=paneHeight(model.folds,model.settings.state,model.settings.options)
    const fine={x:(update.x0+update.x1)/2*50/420,y:(top+(update.y0+update.y1)/2)*100/height}
    await ui.pointer({in:'muslim-pane',type:'down',button:'left',x:Math.floor(fine.x),y:Math.floor(fine.y),fine})
    if(!(held??value))expected++
    const commands=recorded.filter(e=>e.key==='test.command')
    expect(commands).toHaveLength(expected)
    for(const command of commands)expect(command.value).toEqual({command:'muslim',args:'update'})
  }
  await ui.unmount()
})

for(const failure of [false,true]) test(`autoupdate uses the connected writer without a chat command; ${failure?'rolls back failure':'clears a confirmed optimistic value'}`,async($,on)=>{
  engine(on,'desktop',undefined,{},undefined,{HOME:'/test-home'})
  settingsState(on,{open:true,category:'general',face:'main',page:0})
  let data={theme:'dark',extraKnownMarketplaces:{'claude-muslim':{autoUpdate:true},other:{autoUpdate:false}}}
  on('settings.read',async()=>({value:data}))
  on('fs.read',async()=>({value:JSON.stringify(data)}))
  let started!:()=>void,release!:()=>void
  const writing=new Promise<void>(r=>{started=r}),held=new Promise<void>(r=>{release=r})
  let pending: boolean | null | undefined
  on('state.set',{plugin:'muslim',key:'paneAutoUpdate'},async(_$,e,next)=>{pending=e.value;return next(e)})
  const writes:string[]=[],toasts:string[]=[],commands:string[]=[]
  on('fs.write',async(_$,e)=>{writes.push(e.path);started();await held;if(failure)return {deny:'locked'};data=JSON.parse(e.text);return {value:undefined}})
  on('ui.toast',async(_$,e)=>{toasts.push(e.text);return {value:undefined}})
  on('command.run',async(_$,e)=>{commands.push(e.args);return {text:'unexpected'}})
  const ui=await $.ui.mount(pane('desktop'))
  const click=settingsClick(ui,'settings:autoupdate')
  try{
    await writing
    expect(pending).toBe(false)
    const m=(await ui.find({type:'Client',key:'muslim-pane'}))!.props.props as PaneModel
    expect(m.settings.pendingAutoUpdate).toBe(false)
  }finally{release()}
  await click
  await until(()=>pending===null)
  expect(writes).toEqual(['/test-home/.claude/settings.json'])
  expect(commands).toEqual([])
  if(failure){expect(toasts).toHaveLength(1);expect(toasts[0]).toMatch(/^Not changed: .*locked$/)}else expect(toasts).toEqual([])
  expect(pending).toBeNull()
  expect(data.extraKnownMarketplaces['claude-muslim'].autoUpdate).toBe(failure)
  expect(data.extraKnownMarketplaces.other.autoUpdate).toBe(false)
  await ui.unmount()
})

test('auto-update keeps a pending value until the real reader catches up, then clears it after drawing',async($,on)=>{
  engine(on,'desktop',undefined,{},undefined,{HOME:'/test-home'})
  settingsState(on,{open:true,category:'general',face:'main',page:0})
  let real=true,pending:boolean|null|undefined,rendering=false
  on('settings.read',async()=>({value:{extraKnownMarketplaces:{'claude-muslim':{autoUpdate:real}}}}))
  on('fs.read',async()=>({value:JSON.stringify({extraKnownMarketplaces:{'claude-muslim':{autoUpdate:true}}})}))
  on('fs.write',async()=>({value:undefined}))
  on('state.set',{plugin:'muslim',key:'paneAutoUpdate'},async(_$,e,next)=>{
    expect(rendering).toBe(false)
    pending=e.value
    return next(e)
  })
  const ui=await $.ui.mount(pane('desktop'))
  await settingsClick(ui,'settings:autoupdate')
  await testClock.settle()
  expect(pending).toBe(false)
  real=false
  rendering=true
  try{await ui.redraw()}finally{rendering=false}
  await testClock.advance(0)
  expect(pending).toBeNull()
  await ui.unmount()
})

test('pane messages reconcile auto-update only while a boolean press is pending, including drag moves',async($,on)=>{
  engine(on,'desktop')
  let pending:boolean|null|undefined, reads=0
  on('state.get',{plugin:'muslim',key:'paneAutoUpdate'},async()=>({value:{value:pending,version:1}}))
  on('state.set',{plugin:'muslim',key:'paneAutoUpdate'},async(_$,e,next)=>{pending=e.value;return next(e)})
  on('settings.read',async()=>{reads++;return {value:{extraKnownMarketplaces:{'claude-muslim':{autoUpdate:true}}}}})
  const ui=await $.ui.mount(pane('desktop'))
  const before=reads
  for(const held of [undefined,null]){
    pending=held
    await ui.post({act:'drag',y:10,rows:40,end:false},{in:'muslim-pane'})
    await ui.post({act:'key',key:'x'},{in:'muslim-pane'})
    expect(reads).toBe(before)
  }
  pending=false
  await ui.post({act:'drag',y:12,rows:40,end:true},{in:'muslim-pane'})
  expect(reads).toBe(before+1)
  expect(pending).toBe(false)
  pending=true
  await ui.post({act:'drag',y:12,rows:40,end:true},{in:'muslim-pane'})
  expect(reads).toBeGreaterThan(before+1)
  expect(pending).toBeNull()
  await ui.unmount()
})

for (const failure of ['pending', 'deny', 'throw'] as const) test(`method selection returns to main before config completes: ${failure}`, async ($, on) => {
  engine(on, 'desktop')
  const before: SettingsState = { open: true, category: 'prayer', face: 'methods', page: 0 }
  const state = settingsState(on, before)
  let started!: () => void
  const writing = new Promise<void>(resolve => { started = resolve })
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  on('config.set', async (_$, e) => {
    expect(state().face).toBe('main')
    started()
    if (failure === 'pending') await new Promise<void>(() => {})
    if (failure === 'throw') throw new Error('locked')
    return { deny: 'locked' }
  })
  const ui = await $.ui.mount(pane('desktop'))
  void settingsClick(ui, 'settings:pick:mwl')
  await writing
  if (failure === 'pending') expect(state().face).toBe('main')
  else {
    await until(() => toasts.length > 0)
    expect(state()).toEqual(before)
    expect(toasts).toHaveLength(1)
    expect(toasts[0]).toMatch(/^Not changed:/)
    if (failure === 'deny') expect(toasts[0]).toBe('Not changed: locked')
  }
  await ui.unmount()
})

test('missing method row keeps the methods face and asks for reload without saving', async ($, on) => {
  engine(on, 'desktop', undefined, {}, undefined, {}, [])
  const before: SettingsState = { open: true, category: 'prayer', face: 'methods', page: 0 }
  const state = settingsState(on, before)
  const writes: unknown[] = [], toasts: string[] = []
  on('config.set', async (_$, e) => { writes.push(e); return { value: e.value } })
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  const ui = await $.ui.mount(pane('desktop'))
  await settingsClick(ui, 'settings:pick:mwl')
  expect(state()).toEqual(before)
  expect(writes).toEqual([])
  expect(toasts).toEqual(['Not changed: run /reload-plugins, then try again.'])
  await ui.unmount()
})


for (const origin of ['command', 'footer'] as const) test(`refused pane open from ${origin} reports unavailable`, async ($, on) => {
  engine(on, 'desktop', () => ({ isPlaced: false, reason: 'no-space' }))
  on('ui.panes', async () => ({ value: [] }))
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  if (origin === 'command') {
    const reply = await $.command.run({ command: 'muslim', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    expect(reply.text).toBe('Muslim pane unavailable. Use /muslim.')
    expect(reply.text).not.toContain('opened')
  } else {
    const ui = await $.ui.mount(modes('desktop'))
    await ui.press({ key: 'muslim-footer' }); await testClock.settle()
    expect(toasts).toEqual(['Muslim pane unavailable. Use /muslim.'])
    await ui.unmount()
  }
})
for (const denied of [false, true]) test(`daily Athan row immediately matches its settings switch and ${denied ? 'rolls back' : 'keeps the pending value'}`, { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop'); settingsState(on, { open: true, category: 'prayer', face: 'main', page: 0 })
  let started!: () => void, release!: () => void
  const writing = new Promise<void>(resolve => { started = resolve }), held = new Promise<void>(resolve => { release = resolve })
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  on('config.set', async () => { started(); await held; return denied ? { deny: 'locked' } : { value: false } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 100, in: 'muslim-pane' })
  const m = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  const r = cardRects(m.folds, m.settings.state, m.settings.options, quranLayout(m), m.athkarMenu)
  const fine = { x: 25, y: (PRAYER_Y + ATHAN_TOP + 15) * 100 / r.height }
  const click = ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  try {
    await writing
    const pending = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
    expect(pending.prayer.isAthan).toBe(false)
    expect(pending.settings.options.salahAthan).toBe(false)
  } finally { release() }
  await click
  if (denied) await until(() => toasts.length > 0)
  const settled = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  expect(settled.prayer.isAthan).toBe(denied)
  expect(settled.settings.options.salahAthan).toBe(denied)
  await ui.unmount()
})
