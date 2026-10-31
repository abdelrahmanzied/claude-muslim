import { VERSION } from '../../src/constants.ts'
import { END_OF_TURN } from '../../src/shared/thikr/end.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'
import { expect, test } from 'claude-code/testing'
import { readAdjust, readOptions, writeAdjust } from '../../src/config.ts'
import { cardRects, hitAt, hitOfCells, NO_FOLDS, paneHeight, settingsBoxes, type Enabled } from '../../src/features/muslim-pane/layout.ts'
import { BODY_TOP, BODY_END, COPIED_LABEL, COPIED_MS, EXTRA_TOP, copiedAt, LABEL_H, HINT_TOP, HINT_H, CONTROL_TOP, CONTROL_H, ROW_GAP, ROW_H, SWITCH_ROW_H, TWO_LINE_SWITCH_ROW_H, DIVIDER_H, EXTRA_ROW_H, pendingSwitches, optimisticOptions, TABS_H, SETTINGS_BODY_TOP, CATEGORIES, CLOSED_SETTINGS, DEFAULT_SETTINGS, FACE_HEIGHTS, LIST_SIZE, MAIN_HEIGHTS, mainHeight, METHOD_CHOICES, isInline, SETTINGS_TOP, categoryTabs, loadSettings, changeCategory, isSettings, settingsBody, settingsBodyHeight, settingsHeight, settingsOptions, settingsRows, terminalSettings, type SettingsModel, type SettingsState, FIELD_W, FIELD_EDIT_LABEL, fieldKey, fieldSpec, fieldSubmit } from '../../src/features/muslim-pane/settings.ts'
import { paneModel } from '../../src/features/muslim-pane/model.ts'
import { paneSvg } from '../../src/features/muslim-pane/view.ts'
const OFF: Enabled = { athan:false,quran:false,canPrev:false,canNext:false,athkar:false }
const make = (category: SettingsState['category'], face: SettingsState['face']='main', page=0, raw: Record<string,string|undefined>={thikrSpeed:'60',salahShow:'60'}): SettingsModel => ({ ...DEFAULT_SETTINGS, state:{open:true,category,face,page}, options:settingsOptions(readOptions(raw)) })

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
  // A number box is one target, the old stepper's width; it is gone while its row hides it.
  expect(settingsBody(320,m).targets.filter(t=>t.act==='settings:field:salahShow').map(t=>t.x1-t.x0)).toEqual([FIELD_W])
  const th=make('thikr')
  expect(settingsBody(320,th).targets.filter(t=>t.act==='settings:field:thikrSpeed')).toHaveLength(1)
  const auto={...th,options:settingsOptions(readOptions({}))}
  expect(settingsBody(320,auto).targets.some(t=>t.act==='settings:field:thikrSpeed')).toBe(true)
})

test('thikr speed is one line: auto then an always-visible seconds box, with a fixed selected value or an auto placeholder',()=>{
  for(const speed of ['auto','5']) for(const width of [240,360]){
    const m=make('thikr','main',0,{thikrSpeed:speed}), row=settingsRows(m).find(r=>r.label==='السرعة')!
    expect(row.height).toBe(ROW_H);expect(row.extra).toBeUndefined()
    expect(row.controls.map(c=>c.id)).toEqual(['settings:thikrSpeed:auto','settings:field:thikrSpeed'])
    const [auto,box]=row.controls
    expect(auto!.effect).toEqual({kind:'config',field:'thikrSpeed',value:'auto'})
    expect(auto!.selected).toBe(speed==='auto');expect(box!.selected).toBe(speed!=='auto')
    expect(box!.effect).toEqual({kind:'field',id:'thikrSpeed'})
    expect(box!.label).toBe(speed==='auto'?'':'٥')
    expect(box!.placeholder).toBe(speed==='auto'?'وقت ثابت':undefined)
    expect(box!.unit).toBe(speed==='auto'?undefined:'ثانية')
    expect(row.hint).toBe('تلقائي: ثانية + نصف ثانية لكل كلمة')
    const body=settingsBody(width,m), targets=row.controls.map(c=>body.targets.find(t=>t.act===c.id)!)
    expect(targets[0]!.x0).toBe(28);expect(targets[0]!.x1-targets[0]!.x0).toBe(46)
    expect(targets[1]!.x0-targets[0]!.x1).toBe(4);expect(targets[1]!.x1-targets[1]!.x0).toBe(FIELD_W)
    expect(targets[1]!.y0).toBe(targets[0]!.y0);expect(targets[1]!.x1).toBeLessThanOrEqual(width-28)
    expect(body.targets.some(t=>t.act==='settings:thikrSpeed:3')).toBe(false)
    const model=paneModel({salah:null,quran:null,athkar:null},0,width,'orange');model.settings=m
    const drawn=paneSvg(model).match(/<div class="sc field[^>]*>[\s\S]*?<\/div>/)![0]
    expect(drawn).toContain(speed==='auto'?'<span class="ph">وقت ثابت</span>':'<bdi dir="ltr">٥</bdi><span class="unit">ثانية</span>')
    expect(drawn.includes('field on')).toBe(speed!=='auto')
    for(const text of ['','٧']){
      const editing={...m,field:{id:'thikrSpeed',text}}, edited=settingsRows(editing).find(r=>r.label==='السرعة')!
      expect(edited.hint).toBe(FIELD_EDIT_LABEL)
      expect(edited.controls[1]!.editing).toBe(true);expect(edited.controls[1]!.label).toBe(text)
      expect(edited.controls[1]!.unit).toBe('ثانية')
      expect(edited.controls[1]!.placeholder).toBe(speed==='auto'?'وقت ثابت':'٥')
      model.settings=editing
      const svg=paneSvg(model)
      expect(svg).toContain('class="caret"');expect(svg).toContain('field.editing{box-shadow:inset 0 0 0 1.5px var(--accent)}')
    }
  }
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
  expect(settingsBody(320,m).targets.filter(t=>t.act.startsWith('settings:field:adjust:')).map(t=>t.control.label)).toEqual(['-١٢٠','+١','+٢','+٣','+٤','+٩٠'])
  expect(fieldSubmit(m.options,{id:'adjust:asr',text:'4'}).save).toEqual({kind:'config',field:'salahAdjust',value:'-120 1 2 4 4 90'})
  expect(writeAdjust(readAdjust('-120 1 2 3 4 90'))).toBe('-120 1 2 3 4 90')
})

test('number box keys: digits of every script, a leading sign only where negatives count, Backspace, Enter, Escape',()=>{
  const f={id:'adjust:asr',text:''}
  let r=fieldKey(f,'-',true); expect(r.field?.text).toBe('-')
  r=fieldKey(r.field!,'٣',true); expect(r.field?.text).toBe('-٣')
  expect(fieldKey(r.field!,'-',true).field?.text).toBe('-٣')
  expect(fieldKey(r.field!,'x',true).field?.text).toBe('-٣')
  expect(fieldKey(r.field!,'backspace',true).field?.text).toBe('-')
  expect(fieldKey(r.field!,'return',true)).toEqual({field:r.field,submit:true})
  expect(fieldKey(r.field!,'escape',true)).toEqual({field:null,submit:false})
  expect(fieldKey({id:'thikrSpeed',text:''},'-',false).field?.text).toBe('')
  expect(fieldKey({id:'thikrSpeed',text:'12345'},'6',false).field?.text).toBe('12345')
})

test('Enter saves only whole numbers in range: thikr 1–60 s, «عرض الصلاة» 1–60 min, adjustments any whole minutes',()=>{
  const o=make('prayer').options
  const save=(id:string,text:string)=>fieldSubmit(o,{id,text})
  expect(save('thikrSpeed','0')).toEqual({save:null,error:'Not saved: type seconds from 1 to 60.'})
  expect(save('thikrSpeed','٥').save).toEqual({kind:'config',field:'thikrSpeed',value:'5'})
  expect(save('thikrSpeed','60')).toEqual({save:null,error:null})
  expect(save('salahShow','0').error).toBe('Not saved: type minutes from 1 to 60.')
  expect(save('salahShow','61').error).toBe('Not saved: type minutes from 1 to 60.')
  expect(save('salahShow','30').save).toEqual({kind:'config',field:'salahShow',value:'30'})
  expect(save('adjust:fajr','0')).toEqual({save:null,error:null})
  expect(save('adjust:fajr','-').error).toBe('Not saved: type whole minutes, like 3, 0 or -3.')
  expect(save('adjust:fajr','-15').save).toEqual({kind:'config',field:'salahAdjust',value:'-15 0 0 0 0 0'})
  expect(save('salahShow','')).toEqual({save:null,error:null})
  const auto=settingsOptions(readOptions({thikrSpeed:'auto'})), spec=fieldSpec(auto,'thikrSpeed')!
  expect([spec.min,spec.max,spec.value]).toEqual([1,60,null])
  expect(fieldSubmit(auto,{id:'thikrSpeed',text:'5'})).toEqual({save:{kind:'config',field:'thikrSpeed',value:'5'},error:null})
  for(const text of ['0','61']) expect(fieldSubmit(auto,{id:'thikrSpeed',text}).error).toBe('Not saved: type seconds from 1 to 60.')
  expect(fieldSubmit(auto,{id:'thikrSpeed',text:''})).toEqual({save:null,error:null})
})

test('terminal lists every config key, and all Arabic values use show',()=>{
  const m=make('general');m.options.salahPlace={name:'مدينة',latitude:1,longitude:2,timeZone:'UTC',country:'ZZ'}
  const text=terminalSettings(m,s=>`SHOWN(${s})`).join('\n')
  for(const command of ['/salah city','/salah show','/salah athan','/salah method','/salah adjust','/athkar morning on | off','/athkar evening on | off','/athkar after-salah on | off','/athkar style','/thikr on','/thikr mode','/thikr speed','/thikr end','/muslim color','/muslim tashkeel','/muslim terminal-arabic']) expect(text).toContain(command)
  expect(text).toContain('SHOWN(مدينة)');expect(text).not.toContain('/quran')
})

test('settings picture draws only the open category, escapes city text and keeps demo notes out',()=>{
  const model=paneModel({salah:null,quran:null,athkar:null},0,320,'orange')
  model.settings=make('prayer');model.settings.options.salahPlace={name:'<bad>&',latitude:1,longitude:2,timeZone:'UTC',country:'ZZ'}
  const svg=paneSvg(model)
  expect(svg).toContain('&lt;bad&gt;&amp;')
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

test('old settings shapes fall back to a fresh closed card',()=>{
  const old={open:true,category:null,face:'main',page:0}
  expect(isSettings(old)).toBe(false)
  expect(loadSettings(old)).toEqual(CLOSED_SETTINGS)
  expect(loadSettings({...old,open:false})).toEqual(CLOSED_SETTINGS)
  expect(loadSettings({...old,page:-1})).toEqual(CLOSED_SETTINGS)
  expect(loadSettings(null)).toEqual(CLOSED_SETTINGS)
  const detail=make('prayer','methods',2).state
  expect(loadSettings(detail)).toBe(detail)
  // Removed tab state also starts fresh.
  expect(loadSettings({open:true,category:'quran',face:'reciters',page:2})).toEqual(CLOSED_SETTINGS)
})

test('terminal settings headings match the tabs, with all Arabic through show',()=>{
  const lines=terminalSettings(make('general'),s=>`SHOWN(${s})`)
  expect(lines.filter(s=>s.startsWith('**'))).toEqual(['الإعدادات',...CATEGORIES.map(c=>c[1])].map(s=>`**SHOWN(${s})**`))
  expect(lines.some(s=>s.startsWith('SHOWN(')&&s.includes('Spinner'))).toBe(true)
})

test('rows share label/description/control geometry, inline switches and color dots on the label line',()=>{
  expect(SETTINGS_BODY_TOP-SETTINGS_TOP-TABS_H).toBe(16)
  expect(HINT_TOP-LABEL_H).toBe(4)
  expect(CONTROL_TOP-HINT_TOP-HINT_H).toBe(10)
  expect(ROW_H-CONTROL_TOP-CONTROL_H).toBe(ROW_GAP)
  expect([ROW_H,SWITCH_ROW_H,EXTRA_ROW_H]).toEqual([108,70,160])
  for(const width of [240,360,1200]) for(const [category] of CATEGORIES){
    const m=make(category), b=settingsBody(width,m)
    expect(b.rows[0]!.y).toBe(0)
    for(const {row,y} of b.rows){
      if(row.kind==='divider') continue
      const controls=b.controls.filter(t=>row.controls.some(c=>c.id===t.act))
      for(const t of controls) expect(t.y0).toBe(y+(isInline(t.control)?0:CONTROL_TOP))
      if(isInline(row.controls[0])){
        expect(row.height).toBe(row.hintSecondLine ? TWO_LINE_SWITCH_ROW_H : SWITCH_ROW_H)
        expect(controls[0]!.x0).toBe(28)
        expect(controls[0]!.y1-y).toBe(LABEL_H)
      }
      if(row.controls[0]?.style==='swatch'){
        expect(row.height).toBe(SWITCH_ROW_H)
        expect(controls[0]!.x0).toBe(28)
        for(const t of controls) expect(t.y1-y).toBe(LABEL_H)
      }
      if (!row.hintLtr) expect(row.hint).toMatch(/[ء-ي]/)
    }
    const model=paneModel({salah:null,quran:null,athkar:null},0,width,'orange'); model.settings=m
    const svg=paneSvg(model)
    expect(svg).not.toContain('Applies immediately')
    expect(svg).not.toContain('class="settings-head"')
    for(const {row,y} of b.rows){
      if(row.kind==='divider') continue
      expect(svg).toContain(`top:${y+HINT_TOP}px">`)
      expect(svg).toContain(row.hintLtr ? `<bdi dir="ltr">${row.hint}</bdi>` : row.hint.replace(/\/muslim/g, '<bdi dir="ltr">/muslim</bdi>'))
    }
  }
})

test('terminal Arabic is one direct command-copy target; an old terminal face starts fresh',()=>{
  const m=make('general'), t=settingsBody(360,m).targets.find(t=>t.act==='settings:terminal')!
  expect(t.effect).toEqual({kind:'copy',command:'/muslim terminal-arabic'})
  expect(t.control.label).toBe('/muslim terminal-arabic')
  expect(isSettings({...m.state,face:'terminal'})).toBe(false)
  expect(loadSettings({...m.state,face:'terminal',page:2})).toEqual(CLOSED_SETTINGS)
  const city=make('prayer','city')
  expect(settingsBody(360,city).targets.find(t=>t.act==='settings:copy')!.effect).toEqual({kind:'copy',command:'/salah city'})
})

test('optimistic switches retain mismatches and drop confirmed or malformed values',()=>{
  const options=readOptions({})
  const saved={athkarMorning:false,tashkeel:true,thikr:false}
  expect(pendingSwitches(options,saved)).toEqual({athkarMorning:false,thikr:false})
  expect(optimisticOptions(options,saved)).toMatchObject({athkarMorning:false,tashkeel:true,thikr:false})
  expect(pendingSwitches({...options,athkarMorning:false,thikr:false},saved)).toEqual({})
  expect(pendingSwitches(options,{athkarMorning:'no',color:'blue'} as never)).toEqual({})
  expect(options.athkarMorning).toBe(true)
})

// The last shown line of a row, from the row's top: what the 28px gap is measured from.
const lastLineBottom=(row:ReturnType<typeof settingsRows>[number], showsExtra:boolean)=>
  row.kind==='divider'?18:showsExtra?EXTRA_TOP+CONTROL_H: isInline(row.controls[0])?HINT_TOP+HINT_H*(row.hintSecondLine?2:1) : CONTROL_TOP+CONTROL_H

test('every setting row ends 28px under its last shown line, in every tab and both stepper states',()=>{
  expect(ROW_GAP).toBe(28)
  const raws=[{salahShow:'always',thikrSpeed:'auto'},{thikrSpeed:'60',salahShow:'60'}]
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
  expect(speed(speedHidden)).toBe(ROW_H);expect(speed(speedShown)).toBe(ROW_H)
})

test('a tab is only as tall as its visible rows when the options are known',()=>{
  const prayerHidden=make('prayer','main',0,{salahShow:'always'}), prayerShown=make('prayer','main',0,{salahShow:'20'})
  expect(settingsBodyHeight(prayerShown.state,prayerShown.options)-settingsBodyHeight(prayerHidden.state,prayerHidden.options)).toBe(EXTRA_ROW_H-ROW_H)
  const thikrHidden=make('thikr','main',0,{thikrSpeed:'auto'}), thikrShown=make('thikr','main',0,{thikrSpeed:'5'})
  expect(settingsBodyHeight(thikrShown.state,thikrShown.options)).toBe(362)
  expect(settingsBodyHeight(thikrHidden.state,thikrHidden.options)).toBe(362)
  for(const m of [prayerHidden,prayerShown,thikrHidden,thikrShown]){
    const rows=settingsRows(m)
    expect(settingsBodyHeight(m.state,m.options)).toBe(rows.reduce((h,r)=>h+r.height,BODY_TOP)-ROW_GAP+BODY_END)
    expect(paneHeight(NO_FOLDS,m.state,m.options)-paneHeight(NO_FOLDS)).toBe(settingsHeight(m.state,m.options)-56)
    // Hit testing uses the same height: the lowest target sits inside the drawn picture.
    const height=paneHeight(NO_FOLDS,m.state,m.options)
    for(const t of settingsBoxes(360,NO_FOLDS,m)) expect(t.y1).toBeLessThanOrEqual(height-12)
  }
})

test('the athkar tab is its three reminders and the look, with no preview box',()=>{
  const m=make('athkar'), model=paneModel({salah:null,quran:null,athkar:null},0,360,'orange'); model.settings=m
  const svg=paneSvg(model)
  expect(svg).not.toContain('معاينة');expect(svg).not.toContain('settings-sky')
  expect(MAIN_HEIGHTS.athkar).toBe(settingsRows(m).reduce((h,r)=>h+r.height,0)-ROW_GAP+BODY_END)
  expect(settingsRows(m).map(r=>r.label)).toEqual(['تذكير أذكار الصباح','تذكير أذكار المساء','تذكير أذكار بعد الصلاة','المظهر'])
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
  expect(cell).toContain('تم النسخ ✓');expect(cell).not.toContain('<svg');expect(svg).toContain('.sc.copied{color:var(--text)}')
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

test('general rows and thikr end share fixed geometry and Arabic labels',()=>{
  for(const width of [240,360]){
    const general={...make('general'),autoUpdate:'on' as const}
    const body=settingsBody(width,general)
    expect(body.rows.map(r=>r.row.label)).toEqual(['زر مسلم','اللون الرئيسي','التشكيل','العربية في Terminal','','الإصدار','التحديث التلقائي','إرسال ملاحظة'])
    expect(body.rows.map(r=>r.row.height)).toEqual([70,70,70,108,DIVIDER_H,70,70,70])
    expect(MAIN_HEIGHTS.general).toBe(564)
    const target=(act:string)=>body.targets.find(t=>t.act===`settings:${act}`)!
    expect(target('paneButton').effect).toEqual({kind:'config',field:'paneButton',value:false})
    expect(body.targets.find(t=>t.act==='settings:update')).toBeUndefined()
    expect(body.controls.find(t=>t.act==='settings:update')!.effect).toEqual({kind:'command',args:'update'})
    expect(target('autoupdate').effect).toEqual({kind:'autoupdate',value:false})
    expect(target('feedback').effect).toEqual({kind:'command',args:'feedback'})
    for(const t of settingsBoxes(width,NO_FOLDS,general)){
      expect(hitAt(width,(t.x0+t.x1)/2,(t.y0+t.y1)/2,OFF,0,0,NO_FOLDS,general)).toBe(t.act)
    }
    const thikr=make('thikr'),rows=settingsRows(thikr)
    expect(rows.at(-1)!.label).toBe('نهاية الرد')
    expect(rows.at(-1)!.height).toBe(TWO_LINE_SWITCH_ROW_H)
    expect(rows.at(-1)!.controls[0]!.effect).toEqual({kind:'config',field:'thikrEnd',value:false})
    expect(MAIN_HEIGHTS.thikr).toBe(362)
  }
})

test('auto-update draws only on for on, disables unreadable states, and overlays a pending press',()=>{
  for(const state of ['on','off','default','missing','unknown'] as const){
    const m={...make('general'),autoUpdate:state}
    const c=settingsBody(360,m).controls.find(t=>t.act==='settings:autoupdate')!.control
    expect(c.selected).toBe(state==='on')
    expect(c.disabled).toBe(state==='missing'||state==='unknown')
    expect(settingsBody(360,{...m,pendingAutoUpdate:false}).controls.find(t=>t.act==='settings:autoupdate')!.control.selected).toBe(false)
  }
  expect(readOptions({}).paneButton).toBe(true)
  expect(readOptions({paneButton:false}).paneButton).toBe(false)
  const options=readOptions({})
  expect(pendingSwitches(options,{paneButton:false,thikrEnd:false})).toEqual({paneButton:false,thikrEnd:false})
  expect(pendingSwitches({...options,paneButton:false,thikrEnd:false},{paneButton:false,thikrEnd:false})).toEqual({})
})

test('the inline update button follows the shown auto-update value without moving the version hint',()=>{
  for(const width of [240,360]) for(const autoUpdate of [undefined,'on','off','default','missing','unknown'] as const) for(const pendingAutoUpdate of [undefined,null,false,true]){
    const m={...make('general'),autoUpdate,pendingAutoUpdate}, body=settingsBody(width,m)
    const shown=pendingAutoUpdate ?? (autoUpdate==='on'), row=body.rows[5]!
    const update=body.controls.find(t=>t.act==='settings:update')!
    expect(row.row.height).toBe(SWITCH_ROW_H)
    expect(row.row.hint).toBe(`v${VERSION}`)
    expect(row.row.hintNote).toBe(shown?'يتحدّث تلقائيًا':undefined)
    expect(update.control.style).toBe('inline')
    expect(isInline(update.control)).toBe(true)
    expect(update.control.disabled).toBe(shown)
    expect(body.controls.find(t=>t.act==='settings:autoupdate')!.control.selected).toBe(shown)
    expect(update.x0).toBe(28)
    expect(update.x1-update.x0).toBe(64)
    expect(update.y0).toBe(row.y)
    expect(update.y1-update.y0).toBe(LABEL_H)
    expect(body.targets.some(t=>t.act==='settings:update')).toBe(!shown)
    const y=cardRects(NO_FOLDS,m.state,m.options).settingsY+SETTINGS_BODY_TOP+(update.y0+update.y1)/2
    expect(hitAt(width,(update.x0+update.x1)/2,y,OFF,0,0,NO_FOLDS,m)).toBe(shown?null:'settings:update')
    expect(mainHeight('general',m.options)).toBe(settingsRows(m).reduce((h,r)=>h+r.height,0)-ROW_GAP+BODY_END)
    const model=paneModel({salah:null,quran:null,athkar:null},0,width,'orange');model.settings=m
    const svg=paneSvg(model), button=svg.match(/<div class="sc inline[^"]*"[^>]*aria-label="تحديث"[^>]*>/)![0]
    expect(button).toContain(`aria-disabled="${shown}"`)
    expect(button).toContain(`left:16px;top:${row.y}px;width:64px;height:22px`)
    expect(button.includes(' disabled')).toBe(shown)
    expect(svg).toContain(`top:${row.y}px;max-width:calc(100% - 108px)`)
    expect(svg).toContain(`<bdi dir="ltr">v${VERSION}</bdi>`)
    if(shown)expect(svg).toContain(`<bdi dir="ltr">v${VERSION}</bdi> · يتحدّث تلقائيًا`)
    else expect(svg).not.toContain('يتحدّث تلقائيًا')
    expect(svg).toContain('.sc.inline{font-size:12px;padding:0 6px}')
    expect(svg).toContain('.sc.inline .value-text{margin-block:-.5em;transform:translateY(.12em)}')
  }
})

test('the general divider separates purpose with equal row gaps and no hit targets',()=>{
  expect(DIVIDER_H).toBe(18+ROW_GAP)
  for(const width of [240,360]){
    const m=make('general'), body=settingsBody(width,m), divider=body.rows[4]!
    expect(divider.row.kind).toBe('divider')
    expect(divider.row.controls).toEqual([])
    expect(divider.y).toBe(3*SWITCH_ROW_H+ROW_H)
    expect(body.rows[5]!.y-divider.y-18).toBe(ROW_GAP)
    expect(body.targets.some(t=>t.y0<divider.y+DIVIDER_H&&t.y1>divider.y)).toBe(false)
    const y=cardRects(NO_FOLDS,m.state,m.options).settingsY+SETTINGS_BODY_TOP+divider.y+9
    for(const x of [28,width/2,width-28]) expect(hitAt(width,x,y,OFF,0,0,NO_FOLDS,m)).toBeNull()
    const model=paneModel({salah:null,quran:null,athkar:null},0,width,'blue');model.settings=m
    for(const theme of ['light','dark'] as const){
      model.theme=theme
      const svg=paneSvg(model)
      expect(svg.match(/class="setting-divider"/g)).toHaveLength(1)
      expect(svg).toContain(`class="setting-divider" aria-hidden="true" style="top:${divider.y}px"`)
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="m20 4 4 6 7-1 1 7 5 4-5 4-1 7-7-1-4 6-4-6-7 1-1-7-5-4 5-4 1-7 7 1Z"/><path d="m20 11 9 9-9 9-9-9Z"/><circle cx="20" cy="20" r="3"/>')
      expect(svg).toContain('height:1px;opacity:.8')
      expect(svg).toContain('width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8')
      expect(svg).toContain('--ornament-dim:color-mix(in srgb,var(--accent) 60%,transparent)')
      expect(svg).toContain('linear-gradient(to right,transparent,var(--ornament-dim))')
      expect(svg).toContain('linear-gradient(to left,transparent,var(--ornament-dim))')
    }
  }
})

test('the authored end hint has two full lines and never inherits chrome truncation',()=>{
  expect(TWO_LINE_SWITCH_ROW_H).toBe(SWITCH_ROW_H+HINT_H)
  for(const width of [240,360]) for(const tashkeel of [false,true]){
    const m=make('thikr');m.options.tashkeel=tashkeel
    const last=settingsRows(m).at(-1)!
    expect(last.hint).toBe(`«${tashkeel ? END_OF_TURN : stripTashkeel(END_OF_TURN)}» في آخر الرد`)
    expect(last.hintSecondLine).toBe('بدل كلمة Claude مثل Baked · في الترمينال فقط')
    expect(last.height-HINT_TOP-2*HINT_H).toBe(ROW_GAP)
    expect(mainHeight('thikr',{salahShow:'off',thikrSpeed:'auto'})).toBe(362)
    const model=paneModel({salah:null,quran:null,athkar:null},0,width,'orange');model.settings=m
    const svg=paneSvg(model), hint=svg.match(/<span class="setting-hint" style="top:\d+px"><span class="hint-line tx tx-wrap".*?<\/span><span class="hint-line tx tx-line".*?<\/span><\/span>/)![0]
    expect(hint).toContain(last.hint)
    expect(hint).toContain(last.hintSecondLine)
    expect(hint).not.toContain('font-size')
    // The authored phrase's line can never ellipsize; only the chrome line may.
    expect(hint).toContain(`<span class="hint-line tx tx-wrap" dir="rtl">${last.hint}</span>`)
    const base=svg.match(/\.setting-hint\{[^}]+\}/)![0]
    expect(base).not.toContain('overflow')
    expect(base).not.toContain('nowrap')
    // The chrome line is cut by the shared text class, never by the pane's own rule.
    expect(svg).toContain('.hint-line{display:block;white-space:nowrap;margin-block:-4px}')
    expect(svg).not.toContain('.chrome-hint{')
  }
})


test('version and commands keep LTR isolation and the end sample follows tashkeel',()=>{
  const m=make('general'),model=paneModel({salah:null,quran:null,athkar:null},0,360,'orange')
  model.settings=m
  const svg=paneSvg(model)
  expect(svg).toContain(`<bdi dir="ltr">v${VERSION}</bdi>`)
  expect(svg).toContain('افتح اللوحة بـ <bdi dir="ltr">/muslim</bdi>')
  expect(settingsRows(make('thikr')).at(-1)!.hint).toContain(END_OF_TURN)
  const noMarks={...make('thikr'),options:{...make('thikr').options,tashkeel:false}}
  expect(settingsRows(noMarks).at(-1)!.hint).toContain(stripTashkeel(END_OF_TURN))
  expect(settingsRows(noMarks).at(-1)!.hint).not.toContain(END_OF_TURN)
})
