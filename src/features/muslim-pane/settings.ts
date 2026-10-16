// Settings are plain data. Drawing and hit testing consume the same fixed rows
// and control rectangles; neither the Client nor the hooks measure HTML.
import { readOptions, writeAdjust, type Options } from '../../config.ts'
import type { PaneCopied, PaneOptimistic, PaneSettings } from '../../../types/index.d.ts'
import type { FeatureIconKey } from '../../shared/icon/index.ts'
import type { PanelQuranSettings } from '../../shared/panel/signal.ts'
import { arabicDigits } from '../../shared/pray/line.ts'

export type SettingsState = PaneSettings
export const CATEGORIES = [
  ['general', 'عام', 'sliders'], ['prayer', 'الصلاة', 'sujoodreal'], ['quran', 'القرآن', 'qpane'], ['athkar', 'الأذكار', 'horizon'], ['thikr', 'الذكر', 'spinbeads'],
] as const satisfies readonly (readonly [SettingsState['category'], string, FeatureIconKey])[]
export const CLOSED_SETTINGS: SettingsState = { open: false, category: 'general', face: 'main', page: 0 }
export const isSettings = (v: unknown): v is SettingsState => {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  const validFace = s.face === 'main' || s.category === 'prayer' && ['methods', 'adjust', 'city'].includes(String(s.face)) || s.category === 'quran' && s.face === 'reciters'
  return typeof s.open === 'boolean' && CATEGORIES.some(c => c[0] === s.category) && validFace && Number.isSafeInteger(s.page) && Number(s.page) >= 0
}
// Older accordion state could have no open category. Normalize on read, never
// write during render; the next input saves the normalized state naturally.
export const loadSettings = (saved: unknown): SettingsState => {
  if (isSettings(saved)) return saved
  if (saved && typeof saved === 'object') {
    const s = saved as Record<string, unknown>
    if (s.category === 'general' && s.face === 'terminal' && isSettings({ ...s, face: 'main' })) return { ...s, face: 'main', page: 0 } as SettingsState
    const migrated = { ...s, category: 'general' }
    if (s.category === null && s.face === 'main' && isSettings(migrated)) return { ...migrated, page: 0 }
  }
  return CLOSED_SETTINGS
}
export type SettingsOptions = Omit<Options, 'salahPlace'> & { salahPlace: NonNullable<Options['salahPlace']> | null }
export const settingsOptions = (o: Options): SettingsOptions => ({ ...o, salahPlace: o.salahPlace ?? null })
export const SWITCH_FIELDS = ['tashkeel', 'thikr', 'thikrEnd', 'athkar', 'salahAthan'] as const
export const isSwitchField = (field: keyof Options): field is keyof PaneOptimistic => SWITCH_FIELDS.some(f => f === field)
// Retain only pending values; called on load, outside drawing (state writes
// are forbidden during ui.render). Also filters malformed session data.
export const pendingSwitches = (options: Options, saved: PaneOptimistic = {}): PaneOptimistic => Object.fromEntries(
  SWITCH_FIELDS.filter(f => typeof saved[f] === 'boolean' && saved[f] !== options[f]).map(f => [f, saved[f]]),
)
export const optimisticOptions = (options: Options, saved: PaneOptimistic = {}): SettingsOptions => ({ ...settingsOptions(options), ...pendingSwitches(options, saved) })
// `copied` is the command whose copy button confirmed within the last COPIED_MS, else null.
export type SettingsModel = { state: SettingsState; options: SettingsOptions; quran: PanelQuranSettings; terminalMode: string; copied: string | null }
export const COPIED_LABEL = 'تم النسخ ✓'
export const COPIED_MS = 2000
export const isPaneCopied = (v: unknown): v is PaneCopied => !!v && typeof v === 'object' && typeof (v as PaneCopied).command === 'string' && Number.isFinite((v as PaneCopied).until)
// The command to show as copied at `now`: a saved confirmation counts until its expiry time.
export const copiedAt = (saved: unknown, now: number): string | null => isPaneCopied(saved) && saved.until > now ? saved.command : null
export const EMPTY_QURAN_SETTINGS: PanelQuranSettings = { reciters: [], selected: '', repeat: 'off', split: false }
export const DEFAULT_SETTINGS: SettingsModel = { state: CLOSED_SETTINGS, options: settingsOptions(readOptions({})), quran: EMPTY_QURAN_SETTINGS, terminalMode: 'per-terminal setup', copied: null }
export type SettingsAct = `settings:${string}`
export type Effect =
  | { kind: 'config'; field: keyof Options; value: string | boolean }
  | { kind: 'face'; face: SettingsState['face'] }
  | { kind: 'reciter'; key: string }
  | { kind: 'repeat'; value: 'off' | 'surah' | 'segment' }
  | { kind: 'page'; page: number }
  | { kind: 'copy'; command: string }
export type SettingControl = { id: SettingsAct; label: string; width: number; style: 'pill' | 'switch' | 'value' | 'step' | 'swatch'; selected?: boolean; disabled?: boolean; done?: boolean; effect: Effect }
export type SettingRow = { label: string; hint: string; height: number; controls: SettingControl[]; extra?: { label: string; controls: SettingControl[] }; sample?: string }
export const SETTINGS_TOP = 56
// One-line labels: 4px padding, 20px icon, 4px gap, 14px label, 4px padding, inside the 5px border+padding.
export const TABS_H = 60
export const TAB_INSET = 16
export const TAB_PAD = 5 // 1px border + 4px padding, matching the drawing.
export const TAB_GAP = 4
export const SETTINGS_BODY_TOP = SETTINGS_TOP + TABS_H + 16
export const BODY_TOP = 0
export const LABEL_H = 22
export const HINT_TOP = LABEL_H + 4
export const HINT_H = 16
export const CONTROL_TOP = HINT_TOP + HINT_H + 10
export const CONTROL_H = 28
// The space between a row's last line and the next row's label, the same in every tab.
export const ROW_GAP = 28
// A row's height ends with the gap after its last shown line; the extra line (a stepper) counts only while shown.
export const ROW_H = CONTROL_TOP + CONTROL_H + ROW_GAP // 108
export const SWITCH_ROW_H = HINT_TOP + HINT_H + ROW_GAP // 70
export const EXTRA_TOP = CONTROL_TOP + CONTROL_H + 10
export const EXTRA_ROW_H = EXTRA_TOP + CONTROL_H + ROW_GAP // 146
export const SAMPLE_ROW_H = CONTROL_TOP + 18 + ROW_GAP // 98
export const ADJUST_TOP = 42
export const ADJUST_NOTE_TOP = ADJUST_TOP + 6 * ROW_H
// Athkar preview: a 12px muted label «معاينة» 14px under the style row's controls, then the 62px box 4px under it.
export const PREVIEW_LABEL_H = 16
export const PREVIEW_LABEL_TOP = SWITCH_ROW_H + ROW_H - ROW_GAP + 14 // 164
export const ATHKAR_SAMPLE_TOP = PREVIEW_LABEL_TOP + PREVIEW_LABEL_H + 4 // 184
export const SAMPLE_BOX_H = 62
// The last row's gap is replaced by this much space above the card's own 12px bottom inset.
export const BODY_END = 18
const bodyH = (...rows: number[]): number => rows.reduce((n, h) => n + h, 0) - ROW_GAP + BODY_END
export const LIST_SIZE = 6
export const LIST_ROW_H = 70
export const LIST_CHOICE_H = LIST_ROW_H - 12
// Includes subheader, six slots (even on the last page), paging and note.
export const LIST_H = 548
// Constants, per tab, for the tallest row set: «عرض الصلاة» and the speed row count their stepper line (EXTRA_ROW_H) here.
export const MAIN_HEIGHTS = {
  prayer: bodyH(EXTRA_ROW_H, SWITCH_ROW_H, ROW_H, ROW_H, ROW_H), quran: bodyH(ROW_H, ROW_H), athkar: ATHKAR_SAMPLE_TOP + SAMPLE_BOX_H + BODY_END,
  thikr: bodyH(SWITCH_ROW_H, ROW_H, EXTRA_ROW_H, SAMPLE_ROW_H), general: bodyH(ROW_H, SWITCH_ROW_H, ROW_H),
} as const
export const FACE_HEIGHTS = { methods: LIST_H, reciters: LIST_H, adjust: ADJUST_NOTE_TOP + 50, city: 310 } as const
export const settingsBodyHeight = (s: SettingsState): number => !s.open ? 0 : s.face === 'main' ? MAIN_HEIGHTS[s.category] : FACE_HEIGHTS[s.face]
export const settingsHeight = (s: SettingsState): number => s.open ? SETTINGS_BODY_TOP + settingsBodyHeight(s) + 12 : SETTINGS_TOP
// width is the whole pane; rectangles are pane-relative in x, card-relative in y.
export const categoryTabs = (width: number) => {
  const left = 12 + TAB_INSET + TAB_PAD
  const tabWidth = (width - 2 * left - (CATEGORIES.length - 1) * TAB_GAP) / CATEGORIES.length
  return CATEGORIES.map(([category, label, icon], i) => {
    const x1 = width - left - i * (tabWidth + TAB_GAP)
    return { category, label, icon, x0: x1 - tabWidth, x1, y0: SETTINGS_TOP + TAB_PAD, y1: SETTINGS_TOP + TABS_H - TAB_PAD }
  })
}
export const changeCategory = (s: SettingsState, category: SettingsState['category']): SettingsState => s.category === category ? s : ({ ...s, category, face: 'main', page: 0 })

// The manifest order and the approved Arabic names; auto must stay first.
export const METHOD_CHOICES = [
  ['auto','تلقائي','طريقة بلدك'],['mwl','رابطة العالم الإسلامي','رابطة العالم الإسلامي'],['egypt','الهيئة المصرية للمساحة','مصر'],['ummAlQura','أم القرى','أم القرى'],['karachi','كراتشي','كراتشي'],['isna','أمريكا الشمالية','أمريكا الشمالية'],['dubai','دبي','دبي'],['kuwait','الكويت','الكويت'],['qatar','قطر','قطر'],['singapore','سنغافورة','سنغافورة'],['jakim','ماليزيا','ماليزيا'],['kemenag','إندونيسيا','إندونيسيا'],['turkey','تركيا','تركيا'],['france','فرنسا','فرنسا'],['russia','روسيا','روسيا'],['tunisia','تونس','تونس'],['algeria','الجزائر','الجزائر'],['morocco','المغرب','المغرب'],['jordan','الأردن','الأردن'],['portugal','البرتغال','البرتغال'],
] as const
const PRAYERS = [['fajr','الفجر'],['sunrise','الشروق'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']] as const
const config = (field: keyof Options, value: string | boolean): Effect => ({ kind: 'config', field, value })
const control = (id: string, label: string, effect: Effect, style: SettingControl['style'] = 'pill', width = 42, selected = false, disabled = false): SettingControl => ({ id: `settings:${id}`, label, effect, style, width, selected, disabled })
const toggle = (o: SettingsOptions, field: 'thikr' | 'thikrEnd' | 'tashkeel' | 'athkar' | 'salahAthan') => [control(field, o[field] ? 'on' : 'off', config(field, !o[field]), 'switch', 38, o[field])]
const pills = (field: keyof Options, selected: string, values: readonly (readonly [string, string])[]) => values.map(([v,l]) => control(`${field}:${v}`, l, config(field, v), 'pill', l.length > 10 ? 108 : 46, selected === v))
const face = (id: SettingsState['face'], label: string) => [control(id, label, { kind: 'face', face: id }, 'value', 142)]
// Heights include the ROW_GAP after each row. A switch shares the label line.
const row = (label: string, controls: SettingControl[], hint: string, extra?: SettingRow['extra'], sample?: string): SettingRow => ({ label, controls, hint, height: extra?.controls.length ? EXTRA_ROW_H : sample ? SAMPLE_ROW_H : controls[0]?.style === 'switch' ? SWITCH_ROW_H : ROW_H, ...(extra ? { extra } : {}), ...(sample ? { sample } : {}) })
// A copy button: its label is the command (or a note); for COPIED_MS after a copy it confirms instead.
const copyControl = (m: SettingsModel, id: string, label: string, command: string, width: number): SettingControl => {
  const done = m.copied === command
  return { ...control(id, done ? COPIED_LABEL : label, { kind: 'copy', command }, 'value', width), ...(done ? { done } : {}) }
}
const step = (id: string, value: number, min: number, max: number, effect: (n: number) => Effect): SettingControl[] => [
  control(`${id}:-`, '−', effect(value - 1), 'step', 30, false, value <= min),
  control(`${id}:value`, arabicDigits(`${id.startsWith('adjust') && value > 0 ? '+' : ''}${value}`), effect(value), 'step', 40, false, true),
  control(`${id}:+`, '+', effect(value + 1), 'step', 30, false, value >= max),
]
export const settingsRows = (m: SettingsModel): SettingRow[] => {
  const o = m.options, s = m.state, q = m.quran
  switch (s.category) {
    case 'prayer': return [
      row('عرض الصلاة', pills('salahShow', typeof o.salahShow === 'number' ? '20' : o.salahShow, [['always','دائمًا'],['20','قبل'],['off','إيقاف']]).map(c => c.label === 'قبل' ? { ...c, effect: config('salahShow', String(typeof o.salahShow === 'number' ? o.salahShow : 20)) } : c), 'ظهور الصلاة أسفل Claude · قبلها بـ٢٠ دقيقة', { label: typeof o.salahShow === 'number' ? 'قبل الصلاة بدقائق' : '', controls: typeof o.salahShow === 'number' ? step('salahShow', o.salahShow, 1, 720, n => config('salahShow', String(n))) : [] }),
      row('تنبيه الصلاة', toggle(o,'salahAthan'), 'تنبيه مرئي لمدة ١٥ دقيقة، بلا صوت'),
      row('المكان', face('city',o.salahPlace?.name ?? 'اختيار المدينة'), 'يفتح سؤال المدينة في Claude'),
      row('طريقة الحساب',face('methods',METHOD_CHOICES.find(c => c[0] === o.salahMethod)?.[1] ?? 'تلقائي'),'التلقائي يستخدم طريقة بلدك'),
      row('تعديل المواقيت',face('adjust','− / + دقيقة'),'ستة مواقيت، منها الشروق'),
    ]
    case 'quran': return [
      row('القارئ',face('reciters',q.reciters.find(r => r.key === q.selected)?.label ?? 'اختيار القارئ'),'يُحفظ اختيارك'),
      row('التكرار',(['off','surah','segment'] as const).map((v,i) => control(`repeat:${v}`,['إيقاف','السورة','المقطع'][i]!,{kind:'repeat',value:v},'pill',46,q.repeat === v,v === 'segment' && !q.split)),'لهذه الجلسة · المقطع للسور المقسّمة'),
    ]
    case 'athkar': return [row('أذكار الصباح والمساء',toggle(o,'athkar'),'يعرض الأذكار فوق خانة الكتابة'),row('المظهر',pills('athkarStyle',o.athkarStyle,[['sky','سماء'],['frame','إطار']]),'سماء على سطح المكتب، وإطار في الترمينال')]
    case 'thikr': return [
      row('الذكر',toggle(o,'thikr'),'عبارات في Spinner (سطر العمل) في Claude Code'),
      row('المحتوى',pills('thikrMode',o.thikrMode,[['all','الكل'],['salawat','الصلاة على النبي']]),'كل الأذكار أو صلاة على النبي في كل رد'),
      row('السرعة',pills('thikrSpeed',o.thikrSpeed === 'auto' ? 'auto' : '3',[['auto','تلقائي'],['3','ثوانٍ']]).map(c => c.label === 'ثوانٍ' ? {...c,effect:config('thikrSpeed',String(o.thikrSpeed === 'auto' ? 3 : o.thikrSpeed))} : c),'تلقائي: ثانية + نصف ثانية لكل كلمة',{label:o.thikrSpeed === 'auto' ? '' : 'ثوانٍ لكل عبارة',controls:o.thikrSpeed === 'auto' ? [] : step('thikrSpeed',o.thikrSpeed,1,60,n => config('thikrSpeed',String(n)))}),
      row('نهاية الرد',toggle(o,'thikrEnd'),'سطر في الترمينال عند نهاية الرد',undefined,o.tashkeel ? 'تَمَّ بِحَمْدِ اللَّهِ' : 'تم بحمد الله'),
    ]
    case 'general': return [
      row('اللون الرئيسي',(['orange','green','yellow','blue'] as const).map(v => control(`color:${v}`,v,config('color',v),'swatch',23,o.color === v)),'لون واحد لكل الأجزاء'),
      row('التشكيل',toggle(o,'tashkeel'),'على سطح المكتب فقط، الترمينال يحذف التشكيل'),
      row('العربية في Terminal',[copyControl(m,'terminal','/muslim terminal-arabic','/muslim terminal-arabic',244)],'لكل ترمينال: شغّل هذا الأمر في الترمينال'),
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
  if (!s.open) return out
  if (s.face !== 'main') add(control('back','رجوع',{kind:'face',face:'main'},'value',65),left,0)
  if (s.face === 'methods' || s.face === 'reciters') {
    const choices = s.face === 'methods' ? METHOD_CHOICES.map(([key,label,note]) => ({key,label,note})) : q.reciters.map(r => ({key:r.key,label:r.label,note:r.note}))
    out.pages = Math.max(1,Math.ceil(choices.length/LIST_SIZE)); out.page = Math.min(s.page,out.pages-1)
    out.choices = choices.slice(out.page*LIST_SIZE,(out.page+1)*LIST_SIZE).map((r,i) => {
      const c = control(`pick:${r.key}`,r.label,s.face === 'methods' ? config('salahMethod',r.key) : {kind:'reciter',key:r.key},'value',right-left,s.face === 'methods' ? o.salahMethod === r.key : q.selected === r.key)
      const y = 42+i*LIST_ROW_H; add(c,left,y,right-left,LIST_CHOICE_H)
      return {label:r.label,note:r.note,y,control:c}
    })
    add(control('page-prev','السابق',{kind:'page',page:out.page-1},'value',70,false,out.page===0),left,470)
    add(control('page-next','التالي',{kind:'page',page:out.page+1},'value',70,false,out.page+1===out.pages),right-70,470)
  } else if (s.face === 'adjust') {
    PRAYERS.forEach(([pray,label],i) => {
      const controls = step(`adjust:${pray}`,o.salahAdjust[pray],-Infinity,Infinity,n => config('salahAdjust',writeAdjust({...o.salahAdjust,[pray]:n})))
      const y = ADJUST_TOP+i*ROW_H
      out.rows.push({y,row:{label,hint:'التعديل بالدقائق',height:ROW_H,controls}})
      let x=left
      for (const c of controls) { add(c,x,y+CONTROL_TOP); x+=c.width }
    })
  } else if (s.face === 'city') {
    add(copyControl(m,'copy','نسخ الأمر','/salah city',right-left),left,248,right-left,36)
  } else {
    let y = BODY_TOP
    for (const r of settingsRows(m)) {
      out.rows.push({row:r,y})
      const total = r.controls.reduce((n,c) => n+c.width,0) + (r.controls.length-1)*4
      let x = r.controls[0]?.style === 'swatch' ? (width-total)/2 : left
      for (const c of r.controls) {
        add(c,x,y+(c.style === 'switch' ? 0 : CONTROL_TOP),Math.min(c.width,right-left),c.style === 'switch' ? LABEL_H : CONTROL_H)
        x += c.width+4
      }
      if (r.extra) { x=left; for (const c of r.extra.controls) { add(c,x,y+EXTRA_TOP); x+=c.width } }
      y+=r.height
    }
  }
  return out
}
export const terminalSettings = (m: SettingsModel, show: (s:string)=>string): string[] => {
  const o=m.options, q=m.quran, on=(v:boolean)=>v?'on':'off'
  return [
    `**${show('الإعدادات')}**`,
    `**${show('عام')}**`,
    `Color: ${o.color} · /muslim color orange | green | yellow | blue`, `Tashkeel: ${on(o.tashkeel)} · /muslim tashkeel on | off`,
    `Terminal Arabic: ${m.terminalMode} · /muslim terminal-arabic`,
    `**${show('الصلاة')}**`,
    `Prayer · city: ${o.salahPlace ? show(o.salahPlace.name) : 'not set'} · /salah city [name or lat, lng]`,
    `Prayer · show: ${o.salahShow} · /salah show always | <minutes> | off`,
    `Prayer · athan: ${on(o.salahAthan)} · /salah athan on | off`,
    `Prayer · method: ${o.salahMethod} · /salah method <auto or name>`,
    `Prayer · adjust: ${writeAdjust(o.salahAdjust)} · /salah adjust <pray> <±min>`,
    `**${show('القرآن')}**`,
    `Quran · reciter: ${show(q.reciters.find(r=>r.key===q.selected)?.label ?? '—')} · /quran reciter <number or name>`,
    `Quran · repeat: ${q.repeat} · /quran repeat [segment] (session only)`,
    `**${show('الأذكار')}**`,
    `Athkar: ${on(o.athkar)} · /athkar on | off`, `Athkar · style: ${o.athkarStyle} · /athkar style sky | frame`,
    `**${show('الذكر')}**`,
    show('يتحكّم في الذكر المعروض في Spinner (سطر العمل) في Claude Code'),
    `Thikr: ${on(o.thikr)} · /thikr on | off`, `Thikr · mode: ${o.thikrMode} · /thikr mode all | salawat`,
    `Thikr · speed: ${o.thikrSpeed} · /thikr speed auto | <1–60>`, `End of turn: ${on(o.thikrEnd)} · /thikr end on | off`,
  ]
}
