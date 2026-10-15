import { expect, test } from 'claude-code/testing'
import { readAdjust, readOptions, writeAdjust } from '../../src/config.ts'
import { cardRects, hitAt, hitOfCells, NO_FOLDS, paneHeight, settingsBoxes, type Enabled } from '../../src/features/muslim-pane/layout.ts'
import { BODY_TOP, CATEGORY_H, CATEGORIES, CLOSED_SETTINGS, DEFAULT_SETTINGS, FACE_HEIGHTS, LIST_SIZE, MAIN_HEIGHTS, METHOD_CHOICES, SETTINGS_TOP, categoryRows, changeCategory, isSettings, settingsBody, settingsBodyHeight, settingsHeight, settingsOptions, settingsRows, terminalSettings, type SettingsModel, type SettingsState } from '../../src/features/muslim-pane/settings.ts'
import { paneModel } from '../../src/features/muslim-pane/model.ts'
import { paneSvg } from '../../src/features/muslim-pane/view.ts'
const OFF: Enabled = { athan:false,quran:false,canPrev:false,canNext:false,athkar:false }
const make = (category: SettingsState['category'], face: SettingsState['face']='main', page=0): SettingsModel => ({ ...DEFAULT_SETTINGS, state:{open:true,category,face,page}, options:settingsOptions(readOptions({thikrSpeed:'60',salahShow:'720'})), quran:{selected:'r1',repeat:'off',split:true,reciters:Array.from({length:17},(_,i)=>({key:`r${i}`,label:`قارئ ${i}`,note:'مرتل'}))} })

test('settings heights are fixed per category and sub-face, independent of width or config',()=>{
  expect(settingsHeight(CLOSED_SETTINGS)).toBe(56)
  expect(settingsHeight({...CLOSED_SETTINGS,open:true})).toBe(56+5*CATEGORY_H+12)
  for(const [category] of CATEGORIES){
    const m=make(category)
    expect(settingsBodyHeight(m.state)).toBe(MAIN_HEIGHTS[category])
    const rows=settingsRows(m)
    expect(rows.reduce((h,r)=>h+r.height,BODY_TOP)).toBeLessThanOrEqual(MAIN_HEIGHTS[category])
    expect(settingsHeight(m.state)).toBe(SETTINGS_TOP+5*CATEGORY_H+MAIN_HEIGHTS[category]+12)
    expect(paneHeight(NO_FOLDS,m.state)-paneHeight(NO_FOLDS)).toBe(settingsHeight(m.state)-56)
  }
  for(const face of ['methods','reciters','adjust','city','terminal'] as const){
    const m=make(face==='reciters'?'quran':face==='terminal'?'general':'prayer',face)
    expect(settingsBodyHeight(m.state)).toBe(FACE_HEIGHTS[face])
  }
})

test('one category replaces another, toggles closed, and clears its sub-face and page',()=>{
  const prayer=changeCategory({...CLOSED_SETTINGS,open:true},'prayer')
  expect(prayer.category).toBe('prayer')
  const quran=changeCategory({...prayer,face:'methods',page:2},'quran')
  expect(quran).toEqual({open:true,category:'quran',face:'main',page:0})
  expect(changeCategory(quran,'quran').category).toBeNull()
  expect(categoryRows(quran).filter(c=>c.category===quran.category)).toHaveLength(1)
  expect(isSettings(quran)).toBe(true)
  for(const invalid of [null,{}, {...quran,page:-1},{...quran,face:'methods'},{...quran,page:Infinity},{...quran,open:1}]) expect(isSettings(invalid)).toBe(false)
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

test('closed settings, closed categories and disabled controls have no inner targets',()=>{
  const m=make('prayer'), r=cardRects(NO_FOLDS,m.state)
  expect(settingsBoxes(320,NO_FOLDS,{...m,state:{...m.state,open:false}}).map(t=>t.act)).toEqual(['settings:fold'])
  const empty=settingsBoxes(320,NO_FOLDS,{...m,state:{...m.state,category:null}})
  expect(empty).toHaveLength(6)
  expect(hitAt(320,40,r.settingsY+56+46+40,OFF,0,0,NO_FOLDS,{...m,state:{...m.state,open:false}})).toBeNull()
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
      expect(settingsBodyHeight({...m.state,page})).toBe(440)
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
