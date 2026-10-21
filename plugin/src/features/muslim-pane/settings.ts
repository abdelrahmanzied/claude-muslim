// Settings are plain data. Drawing and hit testing consume the same fixed rows
// and control rectangles; neither the Client nor the hooks measure HTML.
import { SHOW_MAX, SHOW_MIN, SPEED_MAX, SPEED_MIN, readOptions, writeAdjust, type Options } from '../../config.ts'
import type { PaneCopied, PaneField, PaneOptimistic, PaneSettings } from '../../../types/index.d.ts'
import type { FeatureIconKey } from '../../shared/icon/index.ts'
import { VERSION } from '../../constants.ts'
import { END_OF_TURN } from '../../shared/thikr/end.ts'
import { withTashkeel } from '../../shared/arabic/visual.ts'
import type { PanelAutoUpdate } from '../../shared/panel/signal.ts'
import { arabicDigits } from '../../shared/pray/line.ts'
import { typedInteger } from '../../shared/digits/index.ts'

export type SettingsState = PaneSettings
export const CATEGORIES = [
  ['general', 'عام', 'sliders'], ['prayer', 'الصلاة', 'sujoodreal'], ['athkar', 'الأذكار', 'horizon'], ['thikr', 'الذكر', 'spinbeads'],
] as const satisfies readonly (readonly [SettingsState['category'], string, FeatureIconKey])[]
export const CLOSED_SETTINGS: SettingsState = { open: false, category: 'general', face: 'main', page: 0 }
export const isSettings = (v: unknown): v is SettingsState => {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  const validFace = s.face === 'main' || s.category === 'prayer' && ['methods', 'adjust', 'city'].includes(String(s.face))
  return typeof s.open === 'boolean' && CATEGORIES.some(c => c[0] === s.category) && validFace && Number.isSafeInteger(s.page) && Number(s.page) >= 0
}
// Unreadable or obsolete session shapes start with fresh settings.
export const loadSettings = (saved: unknown): SettingsState => isSettings(saved) ? saved : CLOSED_SETTINGS
export type SettingsOptions = Omit<Options, 'salahPlace'> & { salahPlace: NonNullable<Options['salahPlace']> | null }
export const settingsOptions = (o: Options): SettingsOptions => ({ ...o, salahPlace: o.salahPlace ?? null })
export const SWITCH_FIELDS = ['tashkeel', 'thikr', 'athkarMorning', 'athkarEvening', 'athkarAfterSalah', 'salahAthan', 'paneButton', 'thikrEnd'] as const
export const isSwitchField = (field: keyof Options): field is keyof PaneOptimistic => SWITCH_FIELDS.some(f => f === field)
// Only valid, differing pending values affect drawing. The installer supplies
// current-module presses and retires inherited entries outside ui.render.
export const pendingSwitches = (options: Options, saved: PaneOptimistic = {}): PaneOptimistic => Object.fromEntries(
  SWITCH_FIELDS.filter(f => typeof saved[f] === 'boolean' && saved[f] !== options[f]).map(f => [f, saved[f]]),
)
export const optimisticOptions = (options: Options, saved: PaneOptimistic = {}): SettingsOptions => ({ ...settingsOptions(options), ...pendingSwitches(options, saved) })
// `copied` is the command whose copy button confirmed within the last COPIED_MS, else null; `field` the number box being typed in.
export type SettingsModel = { state: SettingsState; options: SettingsOptions; terminalMode: string; copied: string | null; autoUpdate?: PanelAutoUpdate; pendingAutoUpdate?: boolean | null; field?: PaneField | null }
export const COPIED_LABEL = 'تم النسخ ✓'
export const COPIED_MS = 2000
export const isPaneCopied = (v: unknown): v is PaneCopied => !!v && typeof v === 'object' && typeof (v as PaneCopied).command === 'string' && Number.isFinite((v as PaneCopied).until)
// The command to show as copied at `now`: a saved confirmation counts until its expiry time.
export const copiedAt = (saved: unknown, now: number): string | null => isPaneCopied(saved) && saved.until > now ? saved.command : null
export const DEFAULT_SETTINGS: SettingsModel = { state: CLOSED_SETTINGS, options: settingsOptions(readOptions({})), terminalMode: 'per-terminal setup', copied: null }
export type SettingsAct = `settings:${string}`
export type Effect =
  | { kind: 'config'; field: keyof Options; value: string | boolean }
  | { kind: 'face'; face: SettingsState['face'] }
  | { kind: 'page'; page: number }
  | { kind: 'copy'; command: string }
  | { kind: 'command'; args: 'update' | 'feedback' }
  | { kind: 'autoupdate'; value: boolean }
  | { kind: 'field'; id: string }
export type SettingControl = { id: SettingsAct; label: string; width: number; style: 'pill' | 'switch' | 'value' | 'inline' | 'field' | 'swatch'; selected?: boolean; disabled?: boolean; done?: boolean; editing?: boolean; placeholder?: string; unit?: string; effect: Effect }
export type SettingRow = { kind?: 'divider'; label: string; hint: string; hintLtr?: boolean; hintNote?: string; hintSecondLine?: string; height: number; controls: SettingControl[]; extra?: { label: string; controls: SettingControl[] } }
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
export const QURAN_SETTINGS_NOTE = 'تغيير أي إعداد يوقف التلاوة، وتبدأ من جديد عند التشغيل'
export const QURAN_SETTINGS_NOTE_H = HINT_H + ROW_GAP
export const settingsNoteHeight = (isPlaying = false): number => isPlaying ? QURAN_SETTINGS_NOTE_H : 0
// A row's height ends with the gap after its last shown line; the extra line (a number box) counts only while shown.
export const ROW_H = CONTROL_TOP + CONTROL_H + ROW_GAP // 108
export const SWITCH_ROW_H = HINT_TOP + HINT_H + ROW_GAP // 70
export const TWO_LINE_SWITCH_ROW_H = SWITCH_ROW_H + HINT_H // 86; retains the usual gap after the second line.
// The preceding row already leaves ROW_GAP above the 18px rosette; this row leaves the same below it.
export const DIVIDER_H = 18 + ROW_GAP // 46
// A framed control stacked under another sits at least this far below it: more than one Desktop
// pointer cell (about 20px), so a whole-cell press on one never lands on its neighbour.
export const STACK_GAP = 24
export const EXTRA_TOP = CONTROL_TOP + CONTROL_H + STACK_GAP
export const EXTRA_ROW_H = EXTRA_TOP + CONTROL_H + ROW_GAP // 160
export const ADJUST_TOP = 42
export const ADJUST_NOTE_TOP = ADJUST_TOP + 6 * ROW_H
// The last row's gap is replaced by this much space above the card's own 12px bottom inset.
export const BODY_END = 18
const bodyH = (...rows: number[]): number => rows.reduce((n, h) => n + h, 0) - ROW_GAP + BODY_END
export const LIST_SIZE = 6
export const LIST_ROW_H = 70
export const LIST_CHOICE_H = LIST_ROW_H - 12
// Includes subheader, six slots (even on the last page), paging and note.
export const LIST_H = 548
// Constants, per tab, for the tallest row set: «عرض الصلاة» counts its number-box line (EXTRA_ROW_H) here.
export const MAIN_HEIGHTS = {
  prayer: bodyH(EXTRA_ROW_H, SWITCH_ROW_H, ROW_H, ROW_H, ROW_H), athkar: bodyH(SWITCH_ROW_H, SWITCH_ROW_H, SWITCH_ROW_H, ROW_H),
  thikr: bodyH(SWITCH_ROW_H, ROW_H, ROW_H, TWO_LINE_SWITCH_ROW_H), general: bodyH(SWITCH_ROW_H, SWITCH_ROW_H, SWITCH_ROW_H, ROW_H, DIVIDER_H, SWITCH_ROW_H, SWITCH_ROW_H, SWITCH_ROW_H),
} as const
export const FACE_HEIGHTS = { methods: LIST_H, adjust: ADJUST_NOTE_TOP + 50, city: 310 } as const
// With the options, a tab is only as tall as its visible rows: a hidden number-box line takes no space,
// as in row(). Without them, the tallest set.
type FieldOptions = Pick<SettingsOptions, 'salahShow' | 'thikrSpeed'>
export const mainHeight = (c: SettingsState['category'], o?: FieldOptions): number =>
  !o ? MAIN_HEIGHTS[c]
  : c === 'prayer' ? bodyH(typeof o.salahShow === 'number' ? EXTRA_ROW_H : ROW_H, SWITCH_ROW_H, ROW_H, ROW_H, ROW_H)
  : MAIN_HEIGHTS[c]
export const settingsBodyHeight = (s: SettingsState, o?: FieldOptions): number => !s.open ? 0 : s.face === 'main' ? mainHeight(s.category, o) : FACE_HEIGHTS[s.face]
export const settingsHeight = (s: SettingsState, o?: FieldOptions, isPlaying = false): number => s.open ? SETTINGS_BODY_TOP + settingsNoteHeight(isPlaying) + settingsBodyHeight(s, o) + 12 : SETTINGS_TOP
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
const toggle = (o: SettingsOptions, field: keyof PaneOptimistic) => [control(field, o[field] ? 'on' : 'off', config(field, !o[field]), 'switch', 38, o[field])]
const pills = (field: keyof Options, selected: string, values: readonly (readonly [string, string])[]) => values.map(([v,l]) => control(`${field}:${v}`, l, config(field, v), 'pill', l.length > 10 ? 108 : 46, selected === v))
const face = (id: SettingsState['face'], label: string) => [control(id, label, { kind: 'face', face: id }, 'value', 142)]
// Heights include the ROW_GAP after each row. Switches, color dots and compact buttons share the label line.
export const isInline = (c: SettingControl | undefined): boolean => c?.style === 'switch' || c?.style === 'swatch' || c?.style === 'inline'
const row = (label: string, controls: SettingControl[], hint: string, extra?: SettingRow['extra']): SettingRow => ({ label, controls, hint, height: extra?.controls.length ? EXTRA_ROW_H : isInline(controls[0]) ? SWITCH_ROW_H : ROW_H, ...(extra ? { extra } : {}) })
// A copy button: its label is the command (or a note); for COPIED_MS after a copy it confirms instead.
const copyControl = (m: SettingsModel, id: string, label: string, command: string, width: number): SettingControl => {
  const done = m.copied === command
  return { ...control(id, done ? COPIED_LABEL : label, { kind: 'copy', command }, 'value', width), ...(done ? { done } : {}) }
}
// A number box: one press target the size of the old − value + row. Pressed, it takes the pane's typed
// keys (`fieldKey`) until Enter saves a valid number (`fieldSubmit`) or another press closes it.
export const FIELD_W = 100
export const FIELD_MAX = 5
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`
// Every box names its unit beside the number: minutes for salah, seconds for the thikr speed.
export const MINUTE_UNIT = 'دقيقة'
export const SECOND_UNIT = 'ثانية'
const numberField = (m: SettingsModel, id: string, shown: string, unit: string): SettingControl => {
  const editing = m.field?.id === id
  return { ...control(`field:${id}`, editing ? m.field!.text : shown, { kind: 'field', id }, 'field', FIELD_W), unit, ...(editing ? { editing, placeholder: shown } : {}) }
}
// Each box's whole-number range, current value and save; out-of-range or non-number text is not saved.
// Thikr speed and «عرض الصلاة» take 1 and up; the adjustments take any whole minutes, 0 and negatives included.
type FieldSpec = { min: number; max: number; value: number | null; save: (n: number) => Effect; error: string }
export const fieldSpec = (o: SettingsOptions, id: string): FieldSpec | null => {
  if (id === 'thikrSpeed') return { min: SPEED_MIN, max: SPEED_MAX, value: o.thikrSpeed === 'auto' ? null : o.thikrSpeed, save: n => config('thikrSpeed', String(n)), error: `Not saved: type seconds from ${SPEED_MIN} to ${SPEED_MAX}.` }
  if (id === 'salahShow' && typeof o.salahShow === 'number') return { min: SHOW_MIN, max: SHOW_MAX, value: o.salahShow, save: n => config('salahShow', String(n)), error: `Not saved: type minutes from ${SHOW_MIN} to ${SHOW_MAX}.` }
  const pray = PRAYERS.find(([p]) => id === `adjust:${p}`)?.[0]
  if (pray) return { min: -Infinity, max: Infinity, value: o.salahAdjust[pray], save: n => config('salahAdjust', writeAdjust({ ...o.salahAdjust, [pray]: n })), error: 'Not saved: type whole minutes, like 3, 0 or -3.' }
  return null
}
// A key in an open box: digits (Latin, Arabic-Indic, Persian) and, first and only where negatives count,
// one sign are typed; Backspace deletes; Enter submits; Escape or Tab closes. Anything else changes nothing.
export const fieldKey = (field: PaneField, key: string, signs: boolean): { field: PaneField | null; submit: boolean } => {
  if (key === 'return' || key === 'enter') return { field, submit: true }
  if (key === 'escape' || key === 'esc' || key === 'tab') return { field: null, submit: false }
  if (key === 'backspace' || key === 'delete') return { field: { ...field, text: Array.from(field.text).slice(0, -1).join('') }, submit: false }
  const typed = Array.from(field.text).length < FIELD_MAX && (/^[0-9٠-٩۰-۹]$/.test(key) || signs && field.text === '' && /^[-−+]$/.test(key))
  return { field: typed ? { ...field, text: field.text + key } : field, submit: false }
}
// Enter in a box: the effect to save (null when empty, unchanged or invalid) and the toast for invalid text.
export const fieldSubmit = (o: SettingsOptions, field: PaneField): { save: Effect | null; error: string | null } => {
  const spec = fieldSpec(o, field.id)
  if (!spec || field.text.trim() === '') return { save: null, error: null }
  const n = typedInteger(field.text, spec.min, spec.max)
  if (n === undefined) return { save: null, error: spec.error }
  return { save: n === spec.value ? null : spec.save(n), error: null }
}
export const FIELD_EDIT_LABEL = 'Enter للحفظ'
export const settingsRows = (m: SettingsModel): SettingRow[] => {
  const o = m.options, s = m.state
  const autoUpdateOn = m.pendingAutoUpdate ?? (m.autoUpdate === 'on')
  switch (s.category) {
    case 'prayer': return [
      row('عرض الصلاة', pills('salahShow', typeof o.salahShow === 'number' ? '20' : o.salahShow, [['always','دائمًا'],['20','قبل'],['off','إيقاف']]).map(c => c.label === 'قبل' ? { ...c, effect: config('salahShow', String(typeof o.salahShow === 'number' ? o.salahShow : 20)) } : c), 'ظهور الصلاة أسفل Claude · قبلها بـ٢٠ دقيقة', { label: typeof o.salahShow === 'number' ? m.field?.id === 'salahShow' ? FIELD_EDIT_LABEL : 'قبل الصلاة بدقائق' : '', controls: typeof o.salahShow === 'number' ? [numberField(m, 'salahShow', arabicDigits(o.salahShow), MINUTE_UNIT)] : [] }),
      row('تنبيه الصلاة', toggle(o,'salahAthan'), 'تنبيه مرئي لمدة ١٥ دقيقة، بلا صوت'),
      row('المكان', face('city',o.salahPlace?.name ?? 'اختيار المدينة'), 'يفتح سؤال المدينة في Claude'),
      row('طريقة الحساب',face('methods',METHOD_CHOICES.find(c => c[0] === o.salahMethod)?.[1] ?? 'تلقائي'),'التلقائي يستخدم طريقة بلدك'),
      row('تعديل المواقيت',face('adjust','بالدقائق'),'ستة مواقيت، منها الشروق'),
    ]
    case 'athkar': return [
      row('تذكير أذكار الصباح',toggle(o,'athkarMorning'),'يظهر فوق خانة الكتابة من الفجر'),
      row('تذكير أذكار المساء',toggle(o,'athkarEvening'),'يظهر فوق خانة الكتابة من المغرب'),
      row('تذكير أذكار بعد الصلاة',toggle(o,'athkarAfterSalah'),'يظهر ربع ساعة بعد كل أذان'),
      row('المظهر',pills('athkarStyle',o.athkarStyle,[['sky','سماء'],['frame','إطار']]),'سماء على سطح المكتب، وإطار في الترمينال'),
    ]
    case 'thikr': return [
      row('الذكر',toggle(o,'thikr'),'عبارات في Spinner (سطر العمل) في Claude Code'),
      row('المحتوى',pills('thikrMode',o.thikrMode,[['all','الكل'],['salawat','الصلاة على النبي']]),'كل الأذكار أو صلاة على النبي في كل رد'),
      row('السرعة',[...pills('thikrSpeed',String(o.thikrSpeed),[['auto','تلقائي']]),{...numberField(m,'thikrSpeed',o.thikrSpeed === 'auto' ? 'وقت ثابت' : arabicDigits(o.thikrSpeed),SECOND_UNIT),selected:o.thikrSpeed !== 'auto',...(o.thikrSpeed === 'auto' && m.field?.id !== 'thikrSpeed' ? {label:'',placeholder:'وقت ثابت',unit:undefined} : {})}],m.field?.id === 'thikrSpeed' ? FIELD_EDIT_LABEL : 'تلقائي: ثانية + نصف ثانية لكل كلمة'),
      {...row('نهاية الرد',toggle(o,'thikrEnd'),`«${withTashkeel(END_OF_TURN,o.tashkeel)}» في آخر الرد`),hintSecondLine:'بدل كلمة Claude مثل Baked · في الترمينال فقط',height:TWO_LINE_SWITCH_ROW_H},
    ]
    case 'general': return [
      row('زر مسلم',toggle(o,'paneButton'),'في الشريط تحت خانة الكتابة · عند الإيقاف افتح اللوحة بـ /muslim'),
      row('اللون الرئيسي',(['orange','green','yellow','blue'] as const).map(v => control(`color:${v}`,v,config('color',v),'swatch',23,o.color === v)),'لون واحد لكل الأجزاء'),
      row('التشكيل',toggle(o,'tashkeel'),'على سطح المكتب فقط، الترمينال يحذف التشكيل'),
      row('العربية في Terminal',[copyControl(m,'terminal','/muslim terminal-arabic','/muslim terminal-arabic',244)],'لكل ترمينال: شغّل هذا الأمر في الترمينال'),
      {kind:'divider',label:'',hint:'',height:DIVIDER_H,controls:[]},
      {...row('الإصدار',[control('update','تحديث',{kind:'command',args:'update'},'inline',64,false,autoUpdateOn)],`v${VERSION}`),hintLtr:true,hintNote:autoUpdateOn?'يتحدّث تلقائيًا':undefined},
      row('التحديث التلقائي',[control('autoupdate','التحديث التلقائي',{kind:'autoupdate',value:!autoUpdateOn},'switch',38,autoUpdateOn,!m.autoUpdate || m.autoUpdate === 'missing' || m.autoUpdate === 'unknown')],'يحدّث Claude Code إضافة مسلم في الخلفية'),
      row('إرسال ملاحظة',[control('feedback','إرسال ملاحظة',{kind:'command',args:'feedback'},'inline',88)],'مشكلة أو اقتراح أو تصحيح · لا يُرسل شيء إلا بموافقتك'),
    ]
    default: return []
  }
}
export type SettingsTarget = { act: SettingsAct; x0: number; x1: number; y0: number; y1: number; effect: Effect; control: SettingControl }
export type SettingsBody = { rows: { row: SettingRow; y: number }[]; targets: SettingsTarget[]; controls: SettingsTarget[]; page: number; pages: number; choices: { label: string; note: string; y: number; control: SettingControl }[] }
export const settingsBody = (width: number, m: SettingsModel): SettingsBody => {
  const { state:s, options:o } = m
  const out: SettingsBody = { rows: [], targets: [], controls: [], page: 0, pages: 1, choices: [] }
  const left = 28, right = width - 28
  const add = (c: SettingControl, x: number, y: number, w = c.width, h = 28) => {
    const target = { act:c.id,x0:x,x1:x+w,y0:y,y1:y+h,effect:c.effect,control:c }
    out.controls.push(target)
    if (!c.disabled) out.targets.push(target)
  }
  if (!s.open) return out
  if (s.face !== 'main') add(control('back','رجوع',{kind:'face',face:'main'},'value',65),left,0)
  if (s.face === 'methods') {
    const choices = METHOD_CHOICES.map(([key,label,note]) => ({key,label,note}))
    out.pages = Math.max(1,Math.ceil(choices.length/LIST_SIZE)); out.page = Math.min(s.page,out.pages-1)
    out.choices = choices.slice(out.page*LIST_SIZE,(out.page+1)*LIST_SIZE).map((r,i) => {
      const c = control(`pick:${r.key}`,r.label,config('salahMethod',r.key),'value',right-left,o.salahMethod === r.key)
      const y = 42+i*LIST_ROW_H; add(c,left,y,right-left,LIST_CHOICE_H)
      return {label:r.label,note:r.note,y,control:c}
    })
    add(control('page-prev','السابق',{kind:'page',page:out.page-1},'value',70,false,out.page===0),left,470)
    add(control('page-next','التالي',{kind:'page',page:out.page+1},'value',70,false,out.page+1===out.pages),right-70,470)
  } else if (s.face === 'adjust') {
    PRAYERS.forEach(([pray,label],i) => {
      const controls = [numberField(m,`adjust:${pray}`,arabicDigits(signed(o.salahAdjust[pray])),MINUTE_UNIT)]
      const y = ADJUST_TOP+i*ROW_H
      out.rows.push({y,row:{label,hint:m.field?.id === `adjust:${pray}` ? FIELD_EDIT_LABEL : 'التعديل بالدقائق',height:ROW_H,controls}})
      let x=left
      for (const c of controls) { add(c,x,y+CONTROL_TOP); x+=c.width }
    })
  } else if (s.face === 'city') {
    add(copyControl(m,'copy','نسخ الأمر','/salah city',right-left),left,248,right-left,36)
  } else {
    let y = BODY_TOP
    for (const r of settingsRows(m)) {
      out.rows.push({row:r,y})
      let x = left
      for (const c of r.controls) {
        add(c,x,y+(isInline(c) ? 0 : CONTROL_TOP),Math.min(c.width,right-left),isInline(c) ? LABEL_H : CONTROL_H)
        x += c.width+4
      }
      if (r.extra) { x=left; for (const c of r.extra.controls) { add(c,x,y+EXTRA_TOP); x+=c.width } }
      y+=r.height
    }
  }
  return out
}
export const terminalSettings = (m: SettingsModel, show: (s:string)=>string, isPlaying = false): string[] => {
  const o=m.options, on=(v:boolean)=>v?'on':'off'
  return [
    `**${show('الإعدادات')}**`,
    ...(isPlaying ? [show(QURAN_SETTINGS_NOTE)] : []),
    `**${show('عام')}**`,
    `Color: ${o.color} · /muslim color orange | green | yellow | blue`, `Tashkeel: ${on(o.tashkeel)} · /muslim tashkeel on | off`,
    `Terminal Arabic: ${m.terminalMode} · /muslim terminal-arabic`,
    `**${show('الصلاة')}**`,
    `Prayer · city: ${o.salahPlace ? show(o.salahPlace.name) : 'not set'} · /salah city [name or lat, lng]`,
    `Prayer · show: ${o.salahShow} · /salah show always | <minutes> | off`,
    `Prayer · athan: ${on(o.salahAthan)} · /salah athan on | off`,
    `Prayer · method: ${o.salahMethod} · /salah method <auto or name>`,
    `Prayer · adjust: ${writeAdjust(o.salahAdjust)} · /salah adjust <pray> <±min>`,
    `**${show('الأذكار')}**`,
    `Athkar · morning reminder: ${on(o.athkarMorning)} · /athkar morning on | off`,
    `Athkar · evening reminder: ${on(o.athkarEvening)} · /athkar evening on | off`,
    `Athkar · after-salah reminder: ${on(o.athkarAfterSalah)} · /athkar after-salah on | off`,
    `Athkar · style: ${o.athkarStyle} · /athkar style sky | frame`,
    `**${show('الذكر')}**`,
    show('يتحكّم في الذكر المعروض في Spinner (سطر العمل) في Claude Code'),
    `Thikr: ${on(o.thikr)} · /thikr on | off`, `Thikr · mode: ${o.thikrMode} · /thikr mode all | salawat`,
    `Thikr · speed: ${o.thikrSpeed} · /thikr speed auto | <1–60>`, `End of turn: ${on(o.thikrEnd)} · /thikr end on | off`,
  ]
}
