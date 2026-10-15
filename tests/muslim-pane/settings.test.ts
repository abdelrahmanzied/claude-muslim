import { expect, test } from 'claude-code/testing'
import { readAdjust, readOptions, writeAdjust } from '../../src/config.ts'
import { cardRects, hitAt, hitOfCells, NO_FOLDS, paneHeight, settingsBoxes, type Enabled } from '../../src/features/muslim-pane/layout.ts'
import { BODY_TOP, TABS_H, SETTINGS_BODY_TOP, CATEGORIES, CLOSED_SETTINGS, DEFAULT_SETTINGS, FACE_HEIGHTS, LIST_SIZE, MAIN_HEIGHTS, METHOD_CHOICES, SETTINGS_TOP, categoryTabs, loadSettings, changeCategory, isSettings, settingsBody, settingsBodyHeight, settingsHeight, settingsOptions, settingsRows, terminalSettings, type SettingsModel, type SettingsState } from '../../src/features/muslim-pane/settings.ts'
import { paneModel } from '../../src/features/muslim-pane/model.ts'
import { paneSvg } from '../../src/features/muslim-pane/view.ts'
const OFF: Enabled = { athan:false,quran:false,canPrev:false,canNext:false,athkar:false }
const make = (category: SettingsState['category'], face: SettingsState['face']='main', page=0): SettingsModel => ({ ...DEFAULT_SETTINGS, state:{open:true,category,face,page}, options:settingsOptions(readOptions({thikrSpeed:'60',salahShow:'720'})), quran:{selected:'r1',repeat:'off',split:true,reciters:Array.from({length:17},(_,i)=>({key:`r${i}`,label:`قارئ ${i}`,note:'مرتل'}))} })

test('settings heights are fixed per category and sub-face, independent of width or config',()=>{
  expect(settingsHeight(CLOSED_SETTINGS)).toBe(56)
  expect(settingsHeight({...CLOSED_SETTINGS,open:true})).toBe(SETTINGS_BODY_TOP+MAIN_HEIGHTS.general+12)
  for(const [category] of CATEGORIES){
    const m=make(category)
    expect(settingsBodyHeight(m.state)).toBe(MAIN_HEIGHTS[category])
    const rows=settingsRows(m)
    expect(rows.reduce((h,r)=>h+r.height,BODY_TOP)).toBeLessThanOrEqual(MAIN_HEIGHTS[category])
    expect(settingsHeight(m.state)).toBe(SETTINGS_BODY_TOP+MAIN_HEIGHTS[category]+12)
    expect(paneHeight(NO_FOLDS,m.state)-paneHeight(NO_FOLDS)).toBe(settingsHeight(m.state)-56)
  }
  for(const face of ['methods','reciters','adjust','city','terminal'] as const){
    const m=make(face==='reciters'?'quran':face==='terminal'?'general':'prayer',face)
    expect(settingsBodyHeight(m.state)).toBe(FACE_HEIGHTS[face])
  }
})

test('a different tab resets its face and page; the selected tab is a no-op',()=>{
  const prayer=changeCategory({...CLOSED_SETTINGS,open:true},'prayer')
  expect(prayer.category).toBe('prayer')
  const quran=changeCategory({...prayer,face:'methods',page:2},'quran')
  expect(quran).toEqual({open:true,category:'quran',face:'main',page:0})
  expect(changeCategory(quran,'quran')).toBe(quran)
  const detail={...quran,face:'reciters' as const,page:2}
  expect(changeCategory(detail,'quran')).toBe(detail)
  expect(isSettings(quran)).toBe(true)
  for(const invalid of [null,{}, {...quran,page:-1},{...quran,face:'methods'},{...quran,page:Infinity},{...quran,open:1},{...quran,category:null}]) expect(isSettings(invalid)).toBe(false)
})

test('every active settings target is reachable with pixels, cells and coarse slack at supported widths',()=>{
  for(const width of [240,320,420,1200]) for(const [category] of CATEGORIES){
    const faces:SettingsState['face'][]=category==='prayer'?['main','methods','adjust','city']:category==='quran'?['main','reciters']:category==='general'?['main','terminal']:['main']
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
  const q=make('quran'); q.quran.split=false
  expect(settingsBody(320,q).targets.some(t=>t.act==='settings:repeat:segment')).toBe(false)
  expect(settingsBody(320,m).targets.some(t=>t.act==='settings:salahShow:+')).toBe(false)
  const th=make('thikr')
  expect(settingsBody(320,th).targets.some(t=>t.act==='settings:thikrSpeed:+')).toBe(false)
  const auto={...th,options:settingsOptions(readOptions({}))}
  expect(settingsBody(320,auto).targets.some(t=>t.act.startsWith('settings:thikrSpeed:')&&t.act.endsWith(':-'))).toBe(false)
})

test('list pages cover all twenty methods and the full reciter feed with a fixed height',()=>{
  for(const category of ['prayer','quran'] as const){
    const face=category==='prayer'?'methods':'reciters', m=make(category,face), keys:string[]=[]
    for(let page=0;page<settingsBody(320,m).pages;page++){
      const body=settingsBody(320,{...m,state:{...m.state,page}})
      expect(body.choices.length).toBeLessThanOrEqual(LIST_SIZE)
      keys.push(...body.choices.map(c=>c.control.id))
      expect(settingsBodyHeight({...m.state,page})).toBe(548)
    }
    expect(keys).toHaveLength(category==='prayer'?20:17)
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

test('terminal lists every config key and Quran controls, and all Arabic values use show',()=>{
  const m=make('general');m.options.salahPlace={name:'مدينة',latitude:1,longitude:2,timeZone:'UTC',country:'ZZ'}
  m.quran.selected='r1'
  const text=terminalSettings(m,s=>`SHOWN(${s})`).join('\n')
  for(const command of ['/salah city','/salah show','/salah athan','/salah method','/salah adjust','/quran reciter','/quran repeat','/athkar on','/athkar style','/thikr on','/thikr mode','/thikr speed','/thikr end','/muslim color','/muslim tashkeel','/muslim terminal-arabic']) expect(text).toContain(command)
  expect(text).toContain('SHOWN(مدينة)');expect(text).toContain('SHOWN(قارئ 1)')
})

test('settings picture draws only the open category, escapes catalog text and keeps demo notes out',()=>{
  const model=paneModel({salah:null,quran:null,athkar:null},0,320,'orange')
  model.settings=make('quran','reciters');model.settings.quran.reciters[0]!.label='<bad>&'
  const svg=paneSvg(model)
  expect(svg).toContain('&lt;bad&gt;&amp;');expect(svg).toContain('رجوع')
  expect(svg).not.toContain('تعديل المواقيت</strong>');expect(svg).not.toContain('Preview')
  expect(svg).toContain(`height="${paneHeight(model.folds,model.settings.state)}"`)
})

test('five equal tabs fit the card in RTL order at every supported width',()=>{
  expect(CATEGORIES.map(c=>c[0])).toEqual(['general','prayer','quran','athkar','thikr'])
  expect(CATEGORIES.map(c=>c[1])).toEqual(['عام','الصلاة','القرآن','الأذكار','الذكر'])
  for(const width of [240,320,360,420,1200]){
    const tabs=categoryTabs(width), w=tabs[0]!.x1-tabs[0]!.x0
    expect(tabs).toHaveLength(5)
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
  const detail=make('quran','reciters',2).state
  expect(loadSettings(detail)).toBe(detail)
})

test('terminal settings headings match the tabs, with all Arabic through show',()=>{
  const lines=terminalSettings(make('general'),s=>`SHOWN(${s})`)
  expect(lines.filter(s=>s.startsWith('**'))).toEqual(['الإعدادات',...CATEGORIES.map(c=>c[1])].map(s=>`**SHOWN(${s})**`))
  expect(lines.some(s=>s.startsWith('SHOWN(')&&s.includes('Spinner'))).toBe(true)
})
