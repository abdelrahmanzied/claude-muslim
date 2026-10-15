// Settings are plain data. Drawing and hit testing consume the same fixed rows
// and control rectangles; neither the Client nor the hooks measure HTML.
import { readOptions, writeAdjust, type Options } from '../../config.ts'
import type { PaneSettings } from '../../../types/index.d.ts'
import type { PanelQuranSettings } from '../../shared/panel/signal.ts'
import { arabicDigits } from '../../shared/pray/line.ts'

export type SettingsState = PaneSettings
export const CATEGORIES = [
  ['prayer', 'الصلاة', 'moon'], ['quran', 'القرآن', 'book'], ['athkar', 'الأذكار', 'sun'], ['thikr', 'الذكر', 'sun'], ['general', 'عام', 'gear'],
] as const
export const CLOSED_SETTINGS: SettingsState = { open: false, category: null, face: 'main', page: 0 }
export const isSettings = (v: unknown): v is SettingsState => {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  const validFace = s.face === 'main' || s.category === 'prayer' && ['methods', 'adjust', 'city'].includes(String(s.face)) || s.category === 'quran' && s.face === 'reciters' || s.category === 'general' && s.face === 'terminal'
  return typeof s.open === 'boolean' && (s.category === null || CATEGORIES.some(c => c[0] === s.category)) && validFace && Number.isSafeInteger(s.page) && Number(s.page) >= 0
}
export type SettingsOptions = Omit<Options, 'salahPlace'> & { salahPlace: NonNullable<Options['salahPlace']> | null }
export const settingsOptions = (o: Options): SettingsOptions => ({ ...o, salahPlace: o.salahPlace ?? null })
export type SettingsModel = { state: SettingsState; options: SettingsOptions; quran: PanelQuranSettings; terminalMode: string }
export const EMPTY_QURAN_SETTINGS: PanelQuranSettings = { reciters: [], selected: '', repeat: 'off', split: false }
export const DEFAULT_SETTINGS: SettingsModel = { state: CLOSED_SETTINGS, options: settingsOptions(readOptions({})), quran: EMPTY_QURAN_SETTINGS, terminalMode: 'per-terminal setup' }
export type SettingsAct = `settings:${string}`
export type Effect =
  | { kind: 'config'; field: keyof Options; value: string | boolean }
  | { kind: 'face'; face: SettingsState['face'] }
  | { kind: 'reciter'; key: string }
  | { kind: 'repeat'; value: 'off' | 'surah' | 'segment' }
  | { kind: 'page'; page: number }
  | { kind: 'copy'; command: string }
export type SettingControl = { id: SettingsAct; label: string; width: number; style: 'pill' | 'switch' | 'value' | 'step' | 'swatch'; selected?: boolean; disabled?: boolean; effect: Effect }
export type SettingRow = { label: string; hint: string; height: number; controls: SettingControl[]; extra?: { label: string; controls: SettingControl[] }; sample?: string }
export const CATEGORY_H = 46
export const SETTINGS_TOP = 56
export const BODY_TOP = 28
export const LIST_SIZE = 6
export const LIST_ROW_H = 52
// Includes subheader, six slots (even on the last page), paging and note.
export const LIST_H = 440
export const MAIN_HEIGHTS = { prayer: 478, quran: 196, athkar: 274, thikr: 448, general: 310 } as const
export const FACE_HEIGHTS = { methods: LIST_H, reciters: LIST_H, adjust: 436, city: 292, terminal: 292 } as const
export const settingsBodyHeight = (s: SettingsState): number => !s.open || !s.category ? 0 : s.face === 'main' ? MAIN_HEIGHTS[s.category] : FACE_HEIGHTS[s.face]
export const settingsHeight = (s: SettingsState): number => SETTINGS_TOP + (s.open ? CATEGORIES.length * CATEGORY_H + settingsBodyHeight(s) + 12 : 0)
export const categoryRows = (s: SettingsState) => {
  let y = SETTINGS_TOP
  return CATEGORIES.map(([category, label, icon]) => {
    const row = { category, label, icon, y, bodyY: y + CATEGORY_H }
    y += CATEGORY_H + (s.category === category ? settingsBodyHeight(s) : 0)
    return row
  })
}
export const changeCategory = (s: SettingsState, category: SettingsState['category']): SettingsState => ({ ...s, category: s.category === category ? null : category, face: 'main', page: 0 })

// The manifest order and the approved Arabic names; auto must stay first.
export const METHOD_CHOICES = [
  ['auto','تلقائي','Country’s method'],['mwl','رابطة العالم الإسلامي','Muslim World League'],['egypt','الهيئة المصرية للمساحة','Egypt'],['ummAlQura','أم القرى','Umm al-Qura'],['karachi','كراتشي','Karachi'],['isna','أمريكا الشمالية','ISNA'],['dubai','دبي','Dubai'],['kuwait','الكويت','Kuwait'],['qatar','قطر','Qatar'],['singapore','سنغافورة','Singapore'],['jakim','ماليزيا','JAKIM'],['kemenag','إندونيسيا','Kemenag'],['turkey','تركيا','Turkey'],['france','فرنسا','France'],['russia','روسيا','Russia'],['tunisia','تونس','Tunisia'],['algeria','الجزائر','Algeria'],['morocco','المغرب','Morocco'],['jordan','الأردن','Jordan'],['portugal','البرتغال','Portugal'],
] as const
const PRAYERS = [['fajr','الفجر'],['sunrise','الشروق'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']] as const
const config = (field: keyof Options, value: string | boolean): Effect => ({ kind: 'config', field, value })
const control = (id: string, label: string, effect: Effect, style: SettingControl['style'] = 'pill', width = 42, selected = false, disabled = false): SettingControl => ({ id: `settings:${id}`, label, effect, style, width, selected, disabled })
const toggle = (o: SettingsOptions, field: 'thikr' | 'thikrEnd' | 'tashkeel' | 'athkar' | 'salahAthan') => [control(field, o[field] ? 'on' : 'off', config(field, !o[field]), 'switch', 38, o[field])]
const pills = (field: keyof Options, selected: string, values: readonly (readonly [string, string])[]) => values.map(([v,l]) => control(`${field}:${v}`, l, config(field, v), 'pill', l.length > 10 ? 108 : 46, selected === v))
const face = (id: SettingsState['face'], label: string) => [control(id, label, { kind: 'face', face: id }, 'value', 142)]
const row = (label: string, controls: SettingControl[], hint: string, extra?: SettingRow['extra'], sample?: string): SettingRow => ({ label, controls, hint, height: extra || sample ? 114 : 84, ...(extra ? { extra } : {}), ...(sample ? { sample } : {}) })
const step = (id: string, value: number, min: number, max: number, effect: (n: number) => Effect): SettingControl[] => [
  control(`${id}:-`, '−', effect(value - 1), 'step', 30, false, value <= min),
  control(`${id}:value`, arabicDigits(`${id.startsWith('adjust') && value > 0 ? '+' : ''}${value}`), effect(value), 'step', 40, false, true),
  control(`${id}:+`, '+', effect(value + 1), 'step', 30, false, value >= max),
]
export const settingsRows = (m: SettingsModel): SettingRow[] => {
  const o = m.options, s = m.state, q = m.quran
  switch (s.category) {
    case 'prayer': return [
      row('عرض الصلاة', pills('salahShow', typeof o.salahShow === 'number' ? '20' : o.salahShow, [['always','دائمًا'],['20','قبل'],['off','إيقاف']]).map(c => c.label === 'قبل' ? { ...c, effect: config('salahShow', String(typeof o.salahShow === 'number' ? o.salahShow : 20)) } : c), 'Footer visibility · default: 20 min', { label: typeof o.salahShow === 'number' ? 'قبل الصلاة بدقائق' : '', controls: typeof o.salahShow === 'number' ? step('salahShow', o.salahShow, 1, 720, n => config('salahShow', String(n))) : [] }),
      row('تنبيه الصلاة', toggle(o,'salahAthan'), 'Visual call for 15 min · no audio'),
      row('المكان', face('city',o.salahPlace?.name ?? 'اختيار المدينة'), 'Opens /salah city in Claude'),
      row('طريقة الحساب',face('methods',METHOD_CHOICES.find(c => c[0] === o.salahMethod)?.[1] ?? 'تلقائي'),'Auto uses the country’s method'),
      row('تعديل المواقيت',face('adjust','− / + دقيقة'),'Six times, including sunrise'),
    ]
    case 'quran': return [
      row('القارئ',face('reciters',q.reciters.find(r => r.key === q.selected)?.label ?? 'اختيار القارئ'),'Saved recording · no module reload'),
      row('التكرار',(['off','surah','segment'] as const).map((v,i) => control(`repeat:${v}`,['إيقاف','السورة','المقطع'][i]!,{kind:'repeat',value:v},'pill',46,q.repeat === v,v === 'segment' && !q.split)),'Session only · segment needs a split surah'),
    ]
    case 'athkar': return [row('أذكار الصباح والمساء',toggle(o,'athkar'),'Show the reader above the prompt'),row('المظهر',pills('athkarStyle',o.athkarStyle,[['sky','سماء'],['frame','إطار']]),'Sky on desktop · terminal always frame')]
    case 'thikr': return [
      row('الذكر',toggle(o,'thikr'),'Phrases in Claude’s working line'),
      row('المحتوى',pills('thikrMode',o.thikrMode,[['all','الكل'],['salawat','الصلاة على النبي']]),'All groups or one salawat per turn'),
      row('السرعة',pills('thikrSpeed',o.thikrSpeed === 'auto' ? 'auto' : '3',[['auto','تلقائي'],['3','ثوانٍ']]).map(c => c.label === 'ثوانٍ' ? {...c,effect:config('thikrSpeed',String(o.thikrSpeed === 'auto' ? 3 : o.thikrSpeed))} : c),'Auto: 1s + 0.5s per word',{label:o.thikrSpeed === 'auto' ? '' : 'ثوانٍ لكل عبارة',controls:o.thikrSpeed === 'auto' ? [] : step('thikrSpeed',o.thikrSpeed,1,60,n => config('thikrSpeed',String(n)))}),
      row('نهاية الرد',toggle(o,'thikrEnd'),'Terminal end-of-turn line',undefined,o.tashkeel ? 'تَمَّ بِحَمْدِ اللَّهِ' : 'تم بحمد الله'),
    ]
    case 'general': return [
      row('اللون الرئيسي',(['orange','green','gold','blue'] as const).map(v => control(`color:${v}`,v,config('color',v),'swatch',23,o.color === v)),'Shared accent across every feature'),
      row('التشكيل',toggle(o,'tashkeel'),'Desktop only · terminal strips diacritics'),
      { ...row('العربية في Terminal',face('terminal','/muslim terminal-arabic'),'Per terminal · run the check in your terminal. Desktop needs no Arabic setup.'), height: 114 },
    ]
    default: return []
  }
}
export type SettingsTarget = { act: SettingsAct; x0: number; x1: number; y0: number; y1: number; effect: Effect; control: SettingControl }
export type SettingsBody = { rows: { row: SettingRow; y: number }[]; targets: SettingsTarget[]; controls: SettingsTarget[]; page: number; pages: number; choices: { label: string; note: string; y: number; control: SettingControl }[] }
export const settingsBody = (width: number, m: SettingsModel): SettingsBody => {
  const { state:s, options:o, quran:q } = m
  const out: SettingsBody = { rows: [], targets: [], controls: [], page: 0, pages: 1, choices: [] }
  const left = 28, right = width - 28
  const add = (c: SettingControl, x: number, y: number, w = c.width, h = 28) => {
    const target = { act:c.id,x0:x,x1:x+w,y0:y,y1:y+h,effect:c.effect,control:c }
    out.controls.push(target)
    if (!c.disabled) out.targets.push(target)
  }
  if (!s.open || !s.category) return out
  if (s.face !== 'main') add(control('back','رجوع',{kind:'face',face:'main'},'value',65),left,0)
  if (s.face === 'methods' || s.face === 'reciters') {
    const choices = s.face === 'methods' ? METHOD_CHOICES.map(([key,label,note]) => ({key,label,note})) : q.reciters.map(r => ({key:r.key,label:r.label,note:r.note}))
    out.pages = Math.max(1,Math.ceil(choices.length/LIST_SIZE)); out.page = Math.min(s.page,out.pages-1)
    out.choices = choices.slice(out.page*LIST_SIZE,(out.page+1)*LIST_SIZE).map((r,i) => {
      const c = control(`pick:${r.key}`,r.label,s.face === 'methods' ? config('salahMethod',r.key) : {kind:'reciter',key:r.key},'value',right-left,s.face === 'methods' ? o.salahMethod === r.key : q.selected === r.key)
      const y = 42+i*LIST_ROW_H; add(c,left,y,right-left,LIST_ROW_H-4)
      return {label:r.label,note:r.note,y,control:c}
    })
    add(control('page-prev','السابق',{kind:'page',page:out.page-1},'value',70,false,out.page===0),left,362)
    add(control('page-next','التالي',{kind:'page',page:out.page+1},'value',70,false,out.page+1===out.pages),right-70,362)
  } else if (s.face === 'adjust') {
    PRAYERS.forEach(([pray,label],i) => {
      const controls = step(`adjust:${pray}`,o.salahAdjust[pray],-Infinity,Infinity,n => config('salahAdjust',writeAdjust({...o.salahAdjust,[pray]:n})))
      const y = 42+i*56
      out.rows.push({y,row:{label,hint:`${pray} · min`,height:56,controls}})
      controls.forEach((c,j) => add(c,left+j*30+(j===2?10:0),y+8))
    })
  } else if (s.face === 'city' || s.face === 'terminal') {
    const command = s.face === 'city' ? '/salah city' : '/muslim terminal-arabic'
    add(control('copy','نسخ الأمر',{kind:'copy',command},'value',right-left),left,238,right-left,36)
  } else {
    let y = BODY_TOP + (s.category === 'thikr' ? 24 : 0)
    for (const r of settingsRows(m)) {
      out.rows.push({row:r,y})
      let x = left
      for (const c of r.controls) { add(c,x,y+(width<360?28:2)); x += c.width+4 }
      if (r.extra) { x=left; for (const c of r.extra.controls) { add(c,x,y+64); x+=c.width } }
      y+=r.height
    }
  }
  return out
}
export const terminalSettings = (m: SettingsModel, show: (s:string)=>string): string[] => {
  const o=m.options, q=m.quran, on=(v:boolean)=>v?'on':'off'
  return [
    `**${show('الإعدادات')}**`,
    `Prayer · city: ${o.salahPlace ? show(o.salahPlace.name) : 'not set'} · /salah city [name or lat, lng]`,
    `Prayer · show: ${o.salahShow} · /salah show always | <minutes> | off`,
    `Prayer · athan: ${on(o.salahAthan)} · /salah athan on | off`,
    `Prayer · method: ${o.salahMethod} · /salah method <auto or name>`,
    `Prayer · adjust: ${writeAdjust(o.salahAdjust)} · /salah adjust <pray> <±min>`,
    `Quran · reciter: ${show(q.reciters.find(r=>r.key===q.selected)?.label ?? '—')} · /quran reciter <number or name>`,
    `Quran · repeat: ${q.repeat} · /quran repeat [segment] (session only)`,
    `Athkar: ${on(o.athkar)} · /athkar on | off`, `Athkar · style: ${o.athkarStyle} · /athkar style sky | frame`,
    `Thikr: ${on(o.thikr)} · /thikr on | off`, `Thikr · mode: ${o.thikrMode} · /thikr mode all | salawat`,
    `Thikr · speed: ${o.thikrSpeed} · /thikr speed auto | <1–60>`, `End of turn: ${on(o.thikrEnd)} · /thikr end on | off`,
    `Color: ${o.color} · /muslim color orange | green | gold | blue`, `Tashkeel: ${on(o.tashkeel)} · /muslim tashkeel on | off`,
    `Terminal Arabic: ${m.terminalMode} · /muslim terminal-arabic`,
  ]
}
