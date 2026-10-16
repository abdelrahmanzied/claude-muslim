import { expect, test } from 'claude-code/testing'
import { readAdjust, readOptions, writeAdjust } from '../../src/config.ts'
import { cardRects, hitAt, hitOfCells, NO_FOLDS, paneHeight, settingsBoxes, type Enabled } from '../../src/features/muslim-pane/layout.ts'
import { BODY_TOP, BODY_END, COPIED_LABEL, COPIED_MS, EXTRA_TOP, PREVIEW_LABEL_TOP, ATHKAR_SAMPLE_TOP, SAMPLE_BOX_H, copiedAt, LABEL_H, HINT_TOP, HINT_H, CONTROL_TOP, CONTROL_H, ROW_GAP, ROW_H, SWITCH_ROW_H, EXTRA_ROW_H, pendingSwitches, optimisticOptions, TABS_H, SETTINGS_BODY_TOP, CATEGORIES, CLOSED_SETTINGS, DEFAULT_SETTINGS, FACE_HEIGHTS, LIST_SIZE, MAIN_HEIGHTS, METHOD_CHOICES, SETTINGS_TOP, categoryTabs, loadSettings, changeCategory, isSettings, settingsBody, settingsBodyHeight, settingsHeight, settingsOptions, settingsRows, terminalSettings, type SettingsModel, type SettingsState } from '../../src/features/muslim-pane/settings.ts'
import { paneModel } from '../../src/features/muslim-pane/model.ts'
import { paneSvg } from '../../src/features/muslim-pane/view.ts'
const OFF: Enabled = { athan:false,quran:false,canPrev:false,canNext:false,athkar:false }
const make = (category: SettingsState['category'], face: SettingsState['face']='main', page=0, raw: Record<string,string|undefined>={thikrSpeed:'60',salahShow:'720'}): SettingsModel => ({ ...DEFAULT_SETTINGS, state:{open:true,category,face,page}, options:settingsOptions(readOptions(raw)) })

test('settings heights are fixed per category and sub-face, independent of width or config',()=>{
  expect(settingsHeight(CLOSED_SETTINGS)).toBe(56)
  expect(settingsHeight({...CLOSED_SETTINGS,open:true})).toBe(SETTINGS_BODY_TOP+MAIN_HEIGHTS.general+12)
  for(const [category] of CATEGORIES){
    const m=make(category)
    expect(settingsBodyHeight(m.state)).toBe(MAIN_HEIGHTS[category])
    const rows=settingsRows(m)
    if(category!=='athkar') expect(rows.reduce((h,r)=>h+r.height,BODY_TOP)-ROW_GAP+BODY_END).toBeLessThanOrEqual(MAIN_HEIGHTS[category])
    expect(settingsHeight(m.state)).toBe(SETTINGS_BODY_TOP+MAIN_HEIGHTS[category]+12)
    expect(paneHeight(NO_FOLDS,m.state)-paneHeight(NO_FOLDS)).toBe(settingsHeight(m.state)-56)
  }
  for(const face of ['methods','adjust','city'] as const){
    const m=make('prayer',face)
    expect(settingsBodyHeight(m.state)).toBe(FACE_HEIGHTS[face])
  }
})

test('a different tab resets its face and page; the selected tab is a no-op',()=>{
  const prayer=changeCategory({...CLOSED_SETTINGS,open:true},'prayer')
  expect(prayer.category).toBe('prayer')
  const thikr=changeCategory({...prayer,face:'methods',page:2},'thikr')
  expect(thikr).toEqual({open:true,category:'thikr',face:'main',page:0})
  expect(changeCategory(thikr,'thikr')).toBe(thikr)
  const detail={...prayer,face:'methods' as const,page:2}
  expect(changeCategory(detail,'prayer')).toBe(detail)
  expect(isSettings(thikr)).toBe(true)
  for(const invalid of [null,{}, {...thikr,page:-1},{...thikr,face:'methods'},{...thikr,page:Infinity},{...thikr,open:1},{...thikr,category:null},{...thikr,category:'quran'}]) expect(isSettings(invalid)).toBe(false)
})

test('every active settings target is reachable with pixels, cells and coarse slack at supported widths',()=>{
  for(const width of [240,320,420,1200]) for(const [category] of CATEGORIES){
    const faces:SettingsState['face'][]=category==='prayer'?['main','methods','adjust','city']:['main']
    for(const face of faces) for(const page of [0,1,2,3]){
      const m=make(category,face,page), height=paneHeight(NO_FOLDS,m.state)
      for(const t of settingsBoxes(width,NO_FOLDS,m)){
        const x=(t.x0+t.x1)/2,y=(t.y0+t.y1)/2
        expect(hitAt(width,x,y,OFF,0,0,NO_FOLDS,m)).toBe(t.act)
        expect(hitOfCells(width,x*50/width,y*100/height,50,100,false,OFF,NO_FOLDS,m)).toBe(t.act)
        expect(hitAt(width,x,y,OFF,2,3,NO_FOLDS,m)).toBe(t.act)
        expect(t.x0).toBeGreaterThanOrEqual(12)
        expect(t.x1).toBeLessThanOrEqual(width-12)
        expect(t.y1).toBeLessThanOrEqual(height-12)
      }
    }
  }
})

test('closed settings and disabled controls have no body targets',()=>{
  const m=make('prayer'), r=cardRects(NO_FOLDS,m.state)
  const closed={...m,state:{...m.state,open:false}}
  expect(settingsBoxes(320,NO_FOLDS,closed)).toEqual([])
  expect(settingsBody(320,closed).targets).toEqual([])
  expect(hitAt(320,40,r.settingsY+SETTINGS_BODY_TOP+40,OFF,0,0,NO_FOLDS,closed)).toBeNull()
  // The title remains the independent way to reopen the card.
  expect(hitAt(320,40,r.settingsY+20,OFF,0,0,NO_FOLDS,closed)).toBe('settings:fold')
  expect(settingsBody(320,m).targets.some(t=>t.act==='settings:salahShow:+')).toBe(false)
  const th=make('thikr')
  expect(settingsBody(320,th).targets.some(t=>t.act==='settings:thikrSpeed:+')).toBe(false)
  const auto={...th,options:settingsOptions(readOptions({}))}
  expect(settingsBody(320,auto).targets.some(t=>t.act.startsWith('settings:thikrSpeed:')&&t.act.endsWith(':-'))).toBe(false)
})

test('list pages cover all twenty methods with a fixed height',()=>{
  {
    const m=make('prayer','methods'), keys:string[]=[]
    for(let page=0;page<settingsBody(320,m).pages;page++){
      const body=settingsBody(320,{...m,state:{...m.state,page}})
      expect(body.choices.length).toBeLessThanOrEqual(LIST_SIZE)
      keys.push(...body.choices.map(c=>c.control.id))
      expect(settingsBodyHeight({...m.state,page})).toBe(548)
    }
    expect(keys).toHaveLength(20)
    expect(new Set(keys).size).toBe(keys.length)
  }
  expect(METHOD_CHOICES[0]![0]).toBe('auto')
})

test('six signed offsets preserve the shared parse/write order and untouched values',()=>{
  const m=make('prayer','adjust');m.options.salahAdjust=readAdjust('-120 1 2 3 4 90')
  const t=settingsBody(320,m).targets.find(t=>t.act==='settings:adjust:asr:+')!
  expect(t.effect).toEqual({kind:'config',field:'salahAdjust',value:'-120 1 2 4 4 90'})
  expect(writeAdjust(readAdjust('-120 1 2 3 4 90'))).toBe('-120 1 2 3 4 90')
})

test('terminal lists every config key, and all Arabic values use show',()=>{
  const m=make('general');m.options.salahPlace={name:'مدينة',latitude:1,longitude:2,timeZone:'UTC',country:'ZZ'}
  const text=terminalSettings(m,s=>`SHOWN(${s})`).join('\n')
  for(const command of ['/salah city','/salah show','/salah athan','/salah method','/salah adjust','/athkar on','/athkar style','/thikr on','/thikr mode','/thikr speed','/thikr end','/muslim color','/muslim tashkeel','/muslim terminal-arabic']) expect(text).toContain(command)
  expect(text).toContain('SHOWN(مدينة)');expect(text).not.toContain('/quran')
})

test('settings picture draws only the open category, escapes city text and keeps demo notes out',()=>{
  const model=paneModel({salah:null,quran:null,athkar:null},0,320,'orange')
  model.settings=make('prayer');model.settings.options.salahPlace={name:'<bad>&',latitude:1,longitude:2,timeZone:'UTC',country:'ZZ'}
  const svg=paneSvg(model)
  expect(svg).toContain('&lt;bad&gt;&amp;');expect(svg).not.toContain('القارئ')
  expect(svg).not.toContain('تعديل المواقيت</strong>');expect(svg).not.toContain('Preview')
  expect(svg).toContain(`height="${paneHeight(model.folds,model.settings.state,model.settings.options)}"`)
})

test('four equal tabs fit the card in RTL order at every supported width',()=>{
  expect(CATEGORIES.map(c=>c[0])).toEqual(['general','prayer','athkar','thikr'])
  expect(CATEGORIES.map(c=>c[1])).toEqual(['عام','الصلاة','الأذكار','الذكر'])
  for(const width of [240,320,360,420,1200]){
    const tabs=categoryTabs(width), w=tabs[0]!.x1-tabs[0]!.x0
    expect(tabs).toHaveLength(4)
    for(const [i,t] of tabs.entries()){
      expect(Math.abs(t.x1-t.x0-w)).toBeLessThan(0.000001)
      expect(t.x0).toBeGreaterThanOrEqual(12+16)
      expect(t.x1).toBeLessThanOrEqual(width-12-16)
      expect(t.y1-t.y0).toBe(TABS_H-10)
      if(i) expect(t.x1).toBeLessThan(tabs[i-1]!.x0)
      const m=make('general'), y=cardRects(NO_FOLDS,m.state).settingsY+(t.y0+t.y1)/2
      expect(hitAt(width,(t.x0+t.x1)/2,y,OFF,0,0,NO_FOLDS,m)).toBe(`settings:tab:${t.category}`)
      expect(hitAt(width,t.x0-1,y,OFF,1.1,3,NO_FOLDS,m)).toBe(`settings:tab:${t.category}`)
    }
  }
})

test('legacy null category state loads as general without closing the card',()=>{
  const old={open:true,category:null,face:'main',page:0}
  expect(isSettings(old)).toBe(false)
  expect(loadSettings(old)).toEqual({open:true,category:'general',face:'main',page:0})
  expect(loadSettings({...old,open:false})).toEqual(CLOSED_SETTINGS)
  expect(loadSettings({...old,page:-1})).toEqual(CLOSED_SETTINGS)
  expect(loadSettings(null)).toEqual(CLOSED_SETTINGS)
  const detail=make('prayer','methods',2).state
  expect(loadSettings(detail)).toBe(detail)
  // The removed Quran tab opens the general tab.
  expect(loadSettings({open:true,category:'quran',face:'reciters',page:2})).toEqual({open:true,category:'general',face:'main',page:0})
})

test('terminal settings headings match the tabs, with all Arabic through show',()=>{
  const lines=terminalSettings(make('general'),s=>`SHOWN(${s})`)
  expect(lines.filter(s=>s.startsWith('**'))).toEqual(['الإعدادات',...CATEGORIES.map(c=>c[1])].map(s=>`**SHOWN(${s})**`))
  expect(lines.some(s=>s.startsWith('SHOWN(')&&s.includes('Spinner'))).toBe(true)
})

test('rows share label/description/control geometry, inline switches and centered swatches',()=>{
  expect(SETTINGS_BODY_TOP-SETTINGS_TOP-TABS_H).toBe(16)
  expect(HINT_TOP-LABEL_H).toBe(4)
  expect(CONTROL_TOP-HINT_TOP-HINT_H).toBe(10)
  expect(ROW_H-CONTROL_TOP-CONTROL_H).toBe(ROW_GAP)
  expect([ROW_H,SWITCH_ROW_H,EXTRA_ROW_H]).toEqual([108,70,146])
  for(const width of [240,360,1200]) for(const [category] of CATEGORIES){
    const m=make(category), b=settingsBody(width,m)
    expect(b.rows[0]!.y).toBe(0)
    for(const {row,y} of b.rows){
      const controls=b.controls.filter(t=>row.controls.some(c=>c.id===t.act))
      for(const t of controls) expect(t.y0).toBe(y+(t.control.style==='switch'?0:CONTROL_TOP))
      if(row.controls[0]?.style==='switch'){
        expect(row.height).toBe(SWITCH_ROW_H)
        expect(controls[0]!.x0).toBe(28)
        expect(controls[0]!.y1-y).toBe(LABEL_H)
      }
      if(row.controls[0]?.style==='swatch') expect(controls[0]!.x0+controls[controls.length-1]!.x1).toBe(width)
      expect(row.hint).toMatch(/[ء-ي]/)
    }
    const model=paneModel({salah:null,quran:null,athkar:null},0,width,'orange'); model.settings=m
    const svg=paneSvg(model)
    expect(svg).not.toContain('Applies immediately')
    expect(svg).not.toContain('class="settings-head"')
    for(const {row,y} of b.rows){
      expect(svg).toContain(`top:${y+HINT_TOP}px">${row.hint}`)
    }
  }
})

test('terminal Arabic is one direct command-copy target; old terminal face migrates to main',()=>{
  const m=make('general'), t=settingsBody(360,m).targets.find(t=>t.act==='settings:terminal')!
  expect(t.effect).toEqual({kind:'copy',command:'/muslim terminal-arabic'})
  expect(t.control.label).toBe('/muslim terminal-arabic')
  expect(isSettings({...m.state,face:'terminal'})).toBe(false)
  expect(loadSettings({...m.state,face:'terminal',page:2})).toEqual({...m.state,page:0})
  const city=make('prayer','city')
  expect(settingsBody(360,city).targets.find(t=>t.act==='settings:copy')!.effect).toEqual({kind:'copy',command:'/salah city'})
})

test('optimistic switches retain mismatches and drop confirmed or malformed values',()=>{
  const options=readOptions({})
  const saved={athkar:false,tashkeel:true,thikr:false}
  expect(pendingSwitches(options,saved)).toEqual({athkar:false,thikr:false})
  expect(optimisticOptions(options,saved)).toMatchObject({athkar:false,tashkeel:true,thikr:false})
  expect(pendingSwitches({...options,athkar:false,thikr:false},saved)).toEqual({})
  expect(pendingSwitches(options,{athkar:'no',color:'blue'} as never)).toEqual({})
  expect(options.athkar).toBe(true)
})

// The last shown line of a row, from the row's top: what the 28px gap is measured from.
const lastLineBottom=(row:ReturnType<typeof settingsRows>[number], showsExtra:boolean)=>
  showsExtra?EXTRA_TOP+CONTROL_H: row.controls[0]?.style==='switch'?HINT_TOP+HINT_H : CONTROL_TOP+CONTROL_H

test('every setting row ends 28px under its last shown line, in every tab and both stepper states',()=>{
  expect(ROW_GAP).toBe(28)
  const raws=[{salahShow:'always',thikrSpeed:'auto'},{thikrSpeed:'60',salahShow:'720'}]
  for(const raw of raws) for(const [category] of CATEGORIES){
    const m=make(category,'main',0,raw), rows=settingsRows(m)
    let y=0
    for(const [i,row] of rows.entries()){
      const showsExtra=!!row.extra?.controls.length
      expect(row.height).toBe(lastLineBottom(row,showsExtra)+ROW_GAP)
      expect(settingsBody(360,m).rows[i]!.y).toBe(y)
      y+=row.height
    }
    expect(y-ROW_GAP+BODY_END).toBeLessThanOrEqual(MAIN_HEIGHTS[category])
  }
})

test('a hidden stepper line takes no height: «عرض الصلاة» leaves the normal gap before «تنبيه الصلاة»',()=>{
  const hidden=make('prayer','main',0,{salahShow:'always'}), shown=make('prayer','main',0,{salahShow:'20'})
  const rowsOf=(m:SettingsModel)=>Object.fromEntries(settingsBody(360,m).rows.map(r=>[r.row.label,r]))
  expect(rowsOf(hidden)['عرض الصلاة']!.row.height).toBe(ROW_H)
  expect(rowsOf(shown)['عرض الصلاة']!.row.height).toBe(EXTRA_ROW_H)
  expect(rowsOf(hidden)['تنبيه الصلاة']!.y).toBe(ROW_H)
  expect(rowsOf(shown)['تنبيه الصلاة']!.y).toBe(EXTRA_ROW_H)
  // Drawing and hit testing agree: the switch target sits on its row's label line at that y.
  const sw=settingsBody(360,hidden).targets.find(t=>t.act==='settings:salahAthan')!
  expect(sw.y0).toBe(ROW_H)
  expect(settingsBoxes(360,NO_FOLDS,hidden).find(t=>t.act==='settings:salahAthan')!.y0).toBe(cardRects(NO_FOLDS,hidden.state).settingsY+SETTINGS_BODY_TOP+ROW_H)
  const speedHidden=make('thikr','main',0,{thikrSpeed:'auto'}), speedShown=make('thikr','main',0,{thikrSpeed:'5'})
  const speed=(m:SettingsModel)=>settingsBody(360,m).rows.find(r=>r.row.label==='السرعة')!.row.height
  expect(speed(speedHidden)).toBe(ROW_H);expect(speed(speedShown)).toBe(EXTRA_ROW_H)
})

test('a tab is only as tall as its visible rows when the options are known',()=>{
  const prayerHidden=make('prayer','main',0,{salahShow:'always'}), prayerShown=make('prayer','main',0,{salahShow:'20'})
  expect(settingsBodyHeight(prayerShown.state,prayerShown.options)-settingsBodyHeight(prayerHidden.state,prayerHidden.options)).toBe(EXTRA_ROW_H-ROW_H)
  const thikrHidden=make('thikr','main',0,{thikrSpeed:'auto'}), thikrShown=make('thikr','main',0,{thikrSpeed:'5'})
  expect(settingsBodyHeight(thikrShown.state,thikrShown.options)-settingsBodyHeight(thikrHidden.state,thikrHidden.options)).toBe(EXTRA_ROW_H-ROW_H)
  for(const m of [prayerHidden,prayerShown,thikrHidden,thikrShown]){
    const rows=settingsRows(m)
    expect(settingsBodyHeight(m.state,m.options)).toBe(rows.reduce((h,r)=>h+r.height,BODY_TOP)-ROW_GAP+BODY_END)
    expect(paneHeight(NO_FOLDS,m.state,m.options)-paneHeight(NO_FOLDS)).toBe(settingsHeight(m.state,m.options)-56)
    // Hit testing uses the same height: the lowest target sits inside the drawn picture.
    const height=paneHeight(NO_FOLDS,m.state,m.options)
    for(const t of settingsBoxes(360,NO_FOLDS,m)) expect(t.y1).toBeLessThanOrEqual(height-12)
  }
})

test('the athkar preview has a «معاينة» label above its box, in constants',()=>{
  const m=make('athkar'), model=paneModel({salah:null,quran:null,athkar:null},0,360,'orange'); model.settings=m
  const svg=paneSvg(model)
  expect(svg).toContain(`<span class="setting-hint" style="top:${PREVIEW_LABEL_TOP}px">معاينة</span><div class="settings-sky`)
  expect(svg).toContain(`class="settings-sky sky" style="top:${ATHKAR_SAMPLE_TOP}px"`)
  const rows=settingsRows(m), end=rows.reduce((h,r)=>h+r.height,0)
  expect(PREVIEW_LABEL_TOP).toBeGreaterThan(end-ROW_GAP)
  expect(ATHKAR_SAMPLE_TOP).toBeGreaterThan(PREVIEW_LABEL_TOP+16)
  expect(ATHKAR_SAMPLE_TOP+SAMPLE_BOX_H+BODY_END).toBe(MAIN_HEIGHTS.athkar)
  expect(svg).not.toContain('معاينة</span><div class="settings-sky frame')
})

test('copy buttons confirm with «تم النسخ ✓» (no glyph) while their command was just copied',()=>{
  const m=make('general'), btn=(m:SettingsModel)=>settingsBody(360,m).targets.find(t=>t.act==='settings:terminal')!
  expect(btn(m).control.label).toBe('/muslim terminal-arabic');expect(btn(m).control.done).toBeUndefined()
  const done={...m,copied:'/muslim terminal-arabic'}
  expect(btn(done).control.label).toBe(COPIED_LABEL);expect(btn(done).control.done).toBe(true)
  expect(btn(done).effect).toEqual({kind:'copy',command:'/muslim terminal-arabic'})
  expect(btn({...m,copied:'/salah city'}).control.label).toBe('/muslim terminal-arabic')
  const model=paneModel({salah:null,quran:null,athkar:null},0,360,'orange')
  model.settings=m;expect(paneSvg(model)).not.toContain('<svg xmlns="http://www.w3.org/2000/svg" class="ic " viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8"')
  expect(paneSvg(model)).not.toContain('تم النسخ')
  model.settings=done
  const svg=paneSvg(model), cell=svg.match(/<div class="sc value[^"]* copied[^>]*>.*?<\/div>/s)![0]
  expect(cell).toContain('تم النسخ ✓');expect(cell).not.toContain('<svg');expect(svg).toContain('.sc.copied{color:var(--accent)}')
  // The city page's button confirms the same way.
  const city=make('prayer','city')
  expect(settingsBody(360,city).targets.find(t=>t.act==='settings:copy')!.control.label).toBe('نسخ الأمر')
  expect(settingsBody(360,{...city,copied:'/salah city'}).targets.find(t=>t.act==='settings:copy')!.control.label).toBe(COPIED_LABEL)
})

test('a copy confirmation lasts until its expiry time and ignores malformed saved values',()=>{
  const saved={command:'/muslim terminal-arabic',until:10_000+COPIED_MS}
  expect(copiedAt(saved,10_000)).toBe('/muslim terminal-arabic')
  expect(copiedAt(saved,10_000+COPIED_MS-1)).toBe('/muslim terminal-arabic')
  expect(copiedAt(saved,10_000+COPIED_MS)).toBeNull()
  for(const bad of [null,undefined,{},{command:1,until:5},{command:'x',until:'5'},{command:'x',until:Infinity*0}]) expect(copiedAt(bad,0)).toBeNull()
  expect(COPIED_MS).toBe(2000)
})
