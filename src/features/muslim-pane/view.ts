// The pane's picture: one SVG document holding HTML and CSS in a foreignObject,
// built in the style of the Desktop's own session-panel cards (rounded
// bordered cards, a header with a chevron and a value, icon rows, a toggle,
// a thin progress bar, round controls). Pure: no $.

import { TAJAWAL_FAMILY, tajawalFontFaceCss } from '../../shared/font/index.ts'
import { accentHex } from '../../shared/color/index.ts'
import { FEATURE_ICONS } from '../../shared/icon/index.ts'
import {
  ATHAN_H, ATHAN_TOP, BAR_TOP, CONTROLS_CY, FIELD_H, HEAD_H, HEAD_TOP, KBTN_W, KROW_H, KROW_TOP, KFINISH_W, KROW_GAP, NX_H, NX_TOP, OPEN_H, OPEN_TOP,
  AVATAR_SIZE, PAD, RECITER_TOP, TOP_H, TOP_Y, ROWS_TOP, ROW_H, SIDE, SURAH_TOP, TIMES_TOP, cardRects, type PaneAct,
} from './layout.ts'
import { SETTINGS_TOP, SETTINGS_BODY_TOP, TABS_H, TAB_INSET, categoryTabs, settingsBody, type SettingsTarget } from './settings.ts'
import type { PaneModel } from './model.ts'
import { avatarHead } from './avatar.ts'

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ltr = (text: string) => `<bdi dir="ltr">${escape(text)}</bdi>`

// Colors live here only: dark by default, light under the app's color scheme (the same mechanism as the Quran pane; Claude Code's own theme row is not read, it can differ from the Desktop's).
const VARS = {
  dark: '--card:#232220;--line:#3a3834;--line-soft:#2b2a27;--text:#ecebe6;--text-2:#c6c3bb;--muted:#8f8c83;--dim:#625f58;--raised:#2a2926;--raised-2:#34322e;--hover:#23221f;--on:#ffffff',
  light: '--card:#fffdf8;--line:#d9d6cc;--line-soft:#e7e4db;--text:#1f1e1b;--text-2:#46443e;--muted:#77746a;--dim:#a5a298;--raised:#ecebe4;--raised-2:#e2e0d8;--hover:#f3f1ec;--on:#ffffff',
}
export const paletteCss = (root: string, color: PaneModel['color']): string => {
  const dark = `${VARS.dark};--accent:${accentHex(color, true)}`, light = `${VARS.light};--accent:${accentHex(color, false)}`
  return `${root}{${dark}}@media (prefers-color-scheme: light){${root}{${light}}}${root}.theme-light{${light}}${root}.theme-dark{${dark}}`
}

// Feature marks come from the standard set; row and control icons stay local.
const PATHS = {
  ...FEATURE_ICONS,
  chev: '<path d="M6 9l6 6 6-6"/>',
  chevl: '<path d="M15 6l-6 6 6 6"/>',
  moon: '<path d="M20 14.5A8.2 8.2 0 019.5 4a8.2 8.2 0 1010.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.5 2.5 4.5-5"/>',
  ring: '<circle cx="12" cy="12" r="8.5"/>',
  now: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none"/>',
  bell: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  book: '<path d="M12 6c-2-1.5-5-2-8-2v13c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v13"/>',
  play: '<path d="M8 5.5l10.5 6.5L8 18.5z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
  prev: '<path d="M7 6v12"/><path d="M18 6.5v11L10 12z"/>',
  next: '<path d="M17 6v12"/><path d="M6 6.5v11L14 12z"/>',
} as const
const icon = (name: keyof typeof PATHS, cls = '') => `<svg xmlns="http://www.w3.org/2000/svg" class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.dp{position:relative;width:100%;height:100%;background:transparent;font-family:${TAJAWAL_FAMILY};font-size:14px;line-height:1.35;font-weight:400;color:var(--text);direction:rtl;user-select:none;-webkit-user-select:none;overflow:hidden}
.ic{width:1.3em;height:1.3em;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.pane-top{position:absolute;right:${PAD+8}px;top:${TOP_Y}px;height:${TOP_H}px;display:flex;align-items:center;gap:10px;color:var(--text);font-size:20px;font-weight:700}.pane-top span{line-height:1;transform:translateY(.12em)}.pane-top svg{flex-shrink:0;image-rendering:pixelated}.pane-command{position:absolute;left:${PAD+8}px;top:${TOP_Y+9}px;line-height:18px;font-size:12px;white-space:nowrap;color:var(--dim)}
.dcard{position:absolute;left:${PAD}px;right:${PAD}px;border-radius:19px;background:transparent;box-shadow:inset 0 0 0 1px var(--line)}
.in{position:absolute;left:${SIDE}px;right:${SIDE}px}
.dh{display:flex;align-items:center;gap:8px;height:${HEAD_H}px;font-size:15.4px;font-weight:500;line-height:1.25;white-space:nowrap}
.dh .hi{width:18px;height:18px;color:var(--accent)}
.dh .fold{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:var(--muted);flex:none;margin-inline-end:-6px}
.dh .fold .ic{width:16px;height:16px}
.dh .fold.hot{background:var(--hover);color:var(--text)}
.dh .dv{margin-inline-start:auto;font-size:12px;font-weight:400;color:var(--muted);min-width:0;overflow:hidden;text-overflow:ellipsis}
.ar{font-size:1.1em}
.nx{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;height:${NX_H}px;padding-bottom:8px;border-bottom:1px solid var(--line-soft)}
.nx-k{color:var(--muted);font-size:12.6px}
.nx-n{font-size:28px;font-weight:700;color:var(--accent);line-height:1.2}
.nx-r{direction:ltr;text-align:left}
.nx-t{font-size:28px;font-weight:500;line-height:1.2;font-variant-numeric:tabular-nums}
.nx-in{color:var(--muted);font-size:12.6px;font-variant-numeric:tabular-nums}
.pr{position:absolute;left:${SIDE - 8}px;right:${SIDE - 8}px;height:${ROW_H}px;display:flex;align-items:center;gap:11px;padding-inline:8px;border-radius:11px}
.pr .ic{width:16px;height:16px;color:var(--muted)}
.pr .t{margin-inline-start:auto;font-variant-numeric:tabular-nums}
.pr.done{color:var(--dim)}.pr.done .ic{color:var(--dim)}
.pr.next{background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent);font-weight:500}.pr.next .ic{color:var(--accent)}
.note{position:absolute;left:${SIDE}px;right:${SIDE}px;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--muted);font-size:13px;direction:ltr}
.drow{display:flex;align-items:center;gap:12px;height:${FIELD_H}px;white-space:nowrap}
.drow .ic{color:var(--text-2);width:18px;height:18px}
.drow .who{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:15.4px}
.drow .who.off{color:var(--dim)}
.athan{display:flex;align-items:center;gap:12px;height:${ATHAN_H}px;border-top:1px solid var(--line-soft);border-radius:0 0 11px 11px;padding-top:2px}
.athan .ic{color:var(--text-2);width:18px;height:18px}
.athan.hot{background:var(--hover)}
.athan.off{opacity:.55}
.tog{direction:ltr;position:relative;width:38px;height:22px;border-radius:99px;background:var(--line);flex:none;margin-inline-start:auto}
.tog.on{background:var(--accent)}
.tog i{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--on);transition:transform .15s}
.tog.on i{transform:translateX(16px)}
.pbar{height:5px;border-radius:99px;background:var(--line);overflow:hidden;flex:1;min-width:0}
.pbar i{display:block;height:100%;background:var(--accent);border-radius:inherit}
.bar{position:absolute;left:${SIDE}px;right:${SIDE}px;direction:ltr}
.tm{position:absolute;left:${SIDE}px;right:${SIDE}px;display:flex;justify-content:space-between;direction:ltr;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.cb{position:absolute;border-radius:50%;box-shadow:inset 0 0 0 1px var(--line);display:grid;place-items:center;color:var(--text-2)}
.cb .ic{width:18px;height:18px}
.cb.hot{background:var(--hover)}
.cb.pl{background:var(--accent);box-shadow:none;color:var(--on)}
.cb.pl.hot{filter:brightness(1.08)}
.cb.pl .ic{width:22px;height:22px}
.cb.off{opacity:.35}
.dbtn{display:flex;align-items:center;justify-content:center;background:var(--raised);color:var(--text);border-radius:10px;font-weight:500;text-align:center;white-space:nowrap}
.dbtn.hot{background:var(--raised-2)}
.dbtn.off{opacity:.45}
.wide{position:absolute;left:${SIDE}px;right:${SIDE}px;height:${OPEN_H}px}
.krow{display:flex;align-items:center;gap:${KROW_GAP}px;height:${KROW_H}px}
.krow .ic{color:var(--text-2);width:18px;height:18px}
.krow .dbtn{width:${KBTN_W}px;height:${KROW_H - 4}px;flex:none}
.krow .dbtn.finish{width:${KFINISH_W}px;font-size:13px}
.krow .none{flex:1;color:var(--muted);font-size:13px;direction:ltr}
`

// Icon and title at the start (the right, in RTL), the muted meta at the far end, and the fold control last.
const header = (name: keyof typeof PATHS, title: string, value: string, isFolded: boolean, isHot: boolean, isLtr = false) =>
  `<div class="in dh" style="top:${HEAD_TOP}px" role="button" aria-expanded="${!isFolded}">${icon(name, 'hi')}<span class="ar">${escape(title)}</span><span class="dv"${isLtr ? ' dir="ltr"' : ''}>${value}</span><span class="fold${isHot ? ' hot' : ''}">${icon(isFolded ? 'chevl' : 'chev')}</span></div>`

const prayerCard = (m: PaneModel, hover: PaneAct | null): string => {
  const p = m.prayer, r = cardRects(m.folds)
  if (m.folds.prayer) return `<section class="dcard" style="top:${r.prayerY}px;height:${r.prayerH}px">${header('sujoodreal', 'الصلاة', p.isSet ? escape(p.city) : '', true, hover === 'fold-prayer', true)}</section>`
  let body: string
  if (!p.isSet) {
    body = `<div class="note" style="top:${NX_TOP}px;height:${NX_H + 5 * ROW_H + 10}px">Choose a city first: /salah city</div>`
  } else {
    const rows = p.rows.map((r, i) => `<div class="pr ${r.state === 'upcoming' ? '' : r.state}" style="top:${ROWS_TOP + i * ROW_H}px">${icon(r.state === 'done' ? 'check' : r.state === 'next' ? 'now' : 'ring')}<span class="ar">${escape(r.name)}</span><span class="t ar">${ltr(r.time)}</span></div>`).join('')
    body = `<div class="in nx" style="top:${NX_TOP}px"><div><div class="nx-k ar">الصلاة القادمة</div><div class="nx-n ar">${escape(p.nextName)}</div></div><div class="nx-r"><div class="nx-t ar">${ltr(p.nextTime)}</div><div class="nx-in">${escape(p.until)}</div></div></div>${rows}`
  }
  const athan = `<div class="in athan${hover === 'athan' ? ' hot' : ''}${p.isSet ? '' : ' off'}" style="top:${ATHAN_TOP}px" role="switch" aria-checked="${p.isAthan}" aria-label="Athan">${icon('bell')}<span dir="ltr">Athan</span><span class="tog${p.isAthan ? ' on' : ''}"><i></i></span></div>`
  return `<section class="dcard" style="top:${r.prayerY}px;height:${r.prayerH}px">${header('sujoodreal', 'الصلاة', p.isSet ? escape(p.city) : '', false, hover === 'fold-prayer', true)}${body}${athan}</section>`
}

const quranCard = (m: PaneModel, hover: PaneAct | null): string => {
  const q = m.quran, r = cardRects(m.folds)
  if (m.folds.quran) return `<section class="dcard" style="top:${r.quranY}px;height:${r.quranH}px">${header('qpane', 'القرآن', q.isAvailable ? escape(q.part) : '', true, hover === 'fold-quran')}</section>`
  const ok = q.isAvailable
  const on = ok && q.isPlaying
  const cls = (act: PaneAct, extra = '', off = false) => `${extra}${hover === act ? ' hot' : ''}${off ? ' off' : ''}`
  const circle = (act: 'quran-prev' | 'quran-toggle' | 'quran-next', r: number, dx: number, name: keyof typeof PATHS, label: string, off: boolean) =>
    `<div class="cb ${cls(act, act === 'quran-toggle' ? 'pl' : '', off)}" role="button" aria-label="${label}" style="width:${r * 2}px;height:${r * 2}px;top:${CONTROLS_CY - r}px;left:calc(50% + ${dx - r}px)">${icon(name)}</div>`
  return `<section class="dcard" style="top:${r.quranY}px;height:${r.quranH}px">${header('qpane', 'القرآن', ok ? escape(q.part) : '', false, hover === 'fold-quran')}`
    + `<div class="in drow" style="top:${RECITER_TOP}px">${icon('mic')}<span class="ar who${ok ? '' : ' off'}">${ok ? escape(q.reciter) : '—'}</span></div>`
    + `<div class="in drow" style="top:${SURAH_TOP}px">${icon('book')}<span class="ar who${ok ? '' : ' off'}">${ok ? escape(q.surah) : '—'}</span></div>`
    + `<div class="bar" style="top:${BAR_TOP}px"><div class="pbar"><i style="width:${ok ? Math.round(q.progress * 1000) / 10 : 0}%"></i></div></div>`
    + `<div class="tm" style="top:${TIMES_TOP}px"><span>${ok ? escape(q.elapsed) : '--:--'}</span><span>${ok ? escape(q.total) : '--:--'}</span></div>`
    + circle('quran-prev', 20, -62, 'prev', 'Previous', !ok || !q.canPrev)
    + circle('quran-toggle', 26, 0, on ? 'stop' : 'play', on ? 'Stop' : 'Play', !ok)
    + circle('quran-next', 20, 62, 'next', 'Next', !ok || !q.canNext)
    + `<div class="wide dbtn${hover === 'quran-open' ? ' hot' : ''}" role="button" style="top:${OPEN_TOP}px">Open full player</div></section>`
}

const athkarCard = (m: PaneModel, hover: PaneAct | null): string => {
  const k = m.athkar, r = cardRects(m.folds)
  const head = (folded: boolean) => header('horizon', k.isAvailable ? k.title : 'أذكار', k.isAvailable ? ltr(k.fraction) : '', folded, hover === 'fold-athkar')
  if (m.folds.athkar) return `<section class="dcard" style="top:${r.athkarY}px;height:${r.athkarH}px">${head(true)}</section>`
  const row = k.isAvailable
    ? `${icon('horizon')}<div class="pbar"><i style="width:${Math.round(k.progress * 1000) / 10}%"></i></div>`
    : `${icon('horizon')}<span class="none">Athkar are off: /athkar on</span>`
  return `<section class="dcard" style="top:${r.athkarY}px;height:${r.athkarH}px">${head(false)}`
    + `<div class="in krow" style="top:${KROW_TOP}px">${row}${k.isAvailable && !k.isDone ? `<span class="dbtn finish${hover === 'athkar-finish' ? ' hot' : ''}" role="button">✓ أتممتُها</span>` : ''}<span class="dbtn${hover === 'athkar-open' ? ' hot' : ''}${k.isAvailable ? '' : ' off'}" role="button">Open</span></div></section>`
}


const SETTINGS_CSS = `
.settings-tabs{position:absolute;left:${TAB_INSET}px;right:${TAB_INSET}px;top:${SETTINGS_TOP}px;height:${TABS_H}px;border:1px solid var(--line);border-radius:15px;padding:4px;background:var(--raised);overflow:hidden}
.setting-tab{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:5px 2px;min-width:0;border-radius:11px;color:var(--muted)}
.setting-tab .ic{width:24px;height:24px}.setting-tab span{font-size:11px;line-height:14px;text-align:center;overflow-wrap:anywhere;min-width:0;max-width:100%;height:28px}
.setting-tab.hot{background:var(--raised-2)}.setting-tab[aria-selected=true]{background:var(--card);color:var(--accent);box-shadow:0 0 0 1px var(--line)}
.settings-body{position:absolute;left:0;right:0}
.settings-head{position:absolute;top:0;left:16px;right:16px;height:24px;display:flex;justify-content:space-between;border-bottom:1px solid var(--line-soft);color:var(--muted);font-size:11px}
.settings-head small{font-size:10px;direction:ltr}.setting-label{position:absolute;right:16px;max-width:calc(100% - 32px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}
.spinner-note{left:16px;font-size:11px;line-height:14px}
.setting-hint{position:absolute;left:16px;right:16px;text-align:right;direction:ltr;line-height:13px;font-size:10px;color:var(--muted)}
.setting-extra{position:absolute;right:16px;max-width:calc(100% - 142px);font-size:11px;line-height:14px;color:var(--muted)}
.setting-sample{position:absolute;right:16px;font-size:14px;color:var(--text-2)}
.sc{position:absolute;display:flex;align-items:center;justify-content:center;gap:4px;border-radius:7px;font-size:12px;color:var(--text-2);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.sc.pill,.sc.value{background:var(--raised);padding:3px 6px}.sc.pill.on{color:var(--accent);box-shadow:inset 0 0 0 1px var(--line)}
.sc.hot{background:var(--raised-2)}.sc.disabled{opacity:.38}.sc.step{border:1px solid var(--line);direction:ltr;border-radius:4px}.sc.step.output{opacity:1;color:var(--text);font-size:12px}.sc.step:not(.output){font-size:19px}
.sc .value-text{min-width:0;overflow:hidden;text-overflow:ellipsis}.sc .ic{width:12px;height:12px;flex:none}.sc.switch{overflow:visible}.sc .tog{margin:0}.sc.swatch{border-radius:50%;color:var(--on)}.sc.swatch.on{outline:1px solid var(--text-2);outline-offset:3px}
.list-choice{position:absolute;left:16px;right:16px;padding:6px 10px;border-radius:8px;height:48px;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:6px}
.list-choice small{display:block;font-size:10px;color:var(--muted);line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.list-choice>span{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.list-choice.on{color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}.list-choice.hot{background:var(--raised-2)}
.settings-subtitle{position:absolute;right:16px;top:4px;font-size:14px}.settings-page{position:absolute;top:368px;left:94px;right:94px;text-align:center;font-size:12px;color:var(--muted)}
.command-sheet{position:absolute;left:16px;right:16px;top:46px;font-size:12px;color:var(--muted)}.command-sheet p{direction:ltr;text-align:right;line-height:18px;height:126px;margin-bottom:10px}.command-sheet code{display:block;direction:ltr;text-align:left;font:11px/18px monospace;padding:12px;background:var(--raised);border-radius:9px;overflow-wrap:anywhere}
.settings-sky{position:absolute;left:16px;right:16px;height:62px;border-radius:10px;padding:14px;display:flex;align-items:center;gap:10px;background:var(--raised);color:var(--text-2)}.settings-sky.frame{background:transparent;border:1px solid var(--accent)}

`
const settingControl = (t: SettingsTarget, hover: PaneAct | null): string => {
  const c = t.control, output = c.style === 'step' && c.id.endsWith(':value')
  const selected = c.selected ? ' on' : '', hot = hover === t.act ? ' hot' : ''
  const attr = c.style === 'switch' ? `role="switch" aria-checked="${!!c.selected}"` : output ? 'role="status"' : `role="button" aria-pressed="${!!c.selected}"`
  const swatch = c.style === 'swatch' ? `background:var(--${c.label});` : ''
  const content = c.style === 'switch' ? `<span class="tog${selected}"><i></i></span>` : c.style === 'swatch' ? (c.selected ? icon('check') : '') : `<span class="value-text">${escape(c.label)}</span>${c.style === 'value' && c.effect.kind === 'face' && c.effect.face !== 'main' ? icon('chevl') : ''}`
  return `<div class="sc ${c.style}${selected}${hot}${c.disabled ? ' disabled' : ''}${output ? ' output' : ''}" ${attr} aria-disabled="${!!c.disabled}" aria-label="${escape(c.label)}" style="left:${t.x0-PAD}px;top:${t.y0}px;width:${t.x1-t.x0}px;height:${t.y1-t.y0}px;${swatch}">${content}</div>`
}
const settingsCard = (m: PaneModel, hover: PaneAct | null): string => {
  const model=m.settings, s=model.state, r=cardRects(m.folds,s), b=settingsBody(m.width,model)
  let content=header('gearteeth','الإعدادات','٥ أقسام',!s.open,hover==='settings:fold')
  if (s.open) {
    content+=`<div class="settings-tabs" role="tablist" aria-label="الإعدادات">${categoryTabs(m.width).map(c=>`<div class="setting-tab${hover===`settings:tab:${c.category}`?' hot':''}" style="left:${c.x0-PAD-TAB_INSET-1}px;top:${c.y0-SETTINGS_TOP-1}px;width:${c.x1-c.x0}px;height:${c.y1-c.y0}px" role="tab" aria-selected="${s.category===c.category}" aria-label="${c.label}">${icon(c.icon)}<span>${c.label}</span></div>`).join('')}</div>`
    let body=''
    if (s.face==='main') {
      body=`<div class="settings-head"><span>الإعدادات</span><small>Applies immediately</small></div>`
      if (s.category==='thikr') body+='<span class="setting-extra spinner-note" style="top:28px;max-width:none;color:var(--accent)">يتحكّم في الذكر المعروض في <bdi dir="ltr">Spinner</bdi> (سطر العمل) في <bdi dir="ltr">Claude Code</bdi></span>'
      body+=b.rows.map(({row,y})=>`<span class="setting-label" style="top:${y+4}px;max-width:calc(100% - ${m.width<360?32:Math.max(160,row.controls.reduce((n,c)=>n+c.width+4,0)+50)}px)">${escape(row.label)}</span><span class="setting-hint" style="top:${y+(row.extra?96:row.sample?88:58)}px">${escape(row.hint)}</span>${row.extra?`<span class="setting-extra" style="top:${y+68}px">${escape(row.extra.label)}</span>`:''}${row.sample?`<span class="setting-sample" style="top:${y+64}px">${escape(row.sample)}</span>`:''}`).join('')
      if (s.category==='athkar') body+=`<div class="settings-sky ${model.options.athkarStyle}" style="top:204px">${icon('sun')}<span>أذكار الصباح</span></div>`
    } else {
      const title=s.face==='methods'?'طريقة الحساب':s.face==='reciters'?'اختيار القارئ':s.face==='adjust'?'تعديل المواقيت':s.face==='city'?'اختيار المدينة':'العربية في Terminal'
      body=`<strong class="settings-subtitle">${title}</strong>`
      if (s.face==='methods'||s.face==='reciters') {
        body+=b.choices.map(c=>`<div class="list-choice${c.control.selected?' on':''}${hover===c.control.id?' hot':''}" style="top:${c.y}px" role="button" aria-pressed="${!!c.control.selected}"><span>${escape(c.label)}<small>${escape(c.note)}</small></span>${c.control.selected?icon('check'):''}</div>`).join('')
        body+=`<span class="settings-page">${escape(String(b.page+1))} / ${b.pages}</span>`
        if (!b.choices.length) body+=`<span class="setting-hint" style="top:52px">Catalog unavailable. /quran reciter</span>`
        body+=`<span class="setting-hint" style="top:402px">${s.face==='methods'?'All 20 manifest options · applies immediately.':'Complete Hafs recordings.'}</span>`
      } else if (s.face==='adjust') {
        body+=b.rows.map(({row,y})=>`<span class="setting-label" style="top:${y+6}px;max-width:calc(100% - 142px)">${escape(row.label)}</span><span class="setting-extra" style="top:${y+29}px;direction:ltr">${escape(row.hint)}</span>`).join('')
        body+=`<span class="setting-hint" style="top:388px">Any whole minutes, positive or negative.<br/>Order: Fajr → Sunrise → Dhuhr → Asr → Maghrib → Isha.</span>`
      } else body+=`<div class="command-sheet"><p>${s.face==='terminal'?'Run this in the terminal you want to configure. The three-choice check remembers that terminal’s mode. Desktop needs no Arabic setup.':'The city question opens in Claude. Enter a city in any language, or latitude and longitude. You can also run this command.'}</p><code>${s.face==='terminal'?'/muslim terminal-arabic':'/salah city'}</code></div>`
    }
    body+=b.controls.filter(t=>!t.act.startsWith('settings:pick:')).map(t=>settingControl(t,hover)).join('')
    content+=`<div class="settings-body" style="top:${SETTINGS_BODY_TOP}px">${body}</div>`
  }
  // Swatches use the shared light/dark accent palette, not a second palette.
  const swatches=(['orange','green','gold','blue'] as const).map(color=>`--${color}:${accentHex(color,true)}`).join(';')
  const light=(['orange','green','gold','blue'] as const).map(color=>`--${color}:${accentHex(color,false)}`).join(';')
  return `<section class="dcard settings-card" style="top:${r.settingsY}px;height:${r.settingsH}px"><style>.settings-card{${swatches}}@media(prefers-color-scheme:light){.settings-card{${light}}}.theme-light .settings-card{${light}}.theme-dark .settings-card{${swatches}}</style>${content}</section>`
}

// The pane's heading: the avatar head and «مسلم» at the right edge, `/muslim` at the left edge, never hidden.
const paneTop = `<div class="pane-top">${avatarHead(AVATAR_SIZE)}<span>مسلم</span></div><div class="pane-command" dir="ltr">${ltr('/muslim')}</div>`

export const paneSvg = (m: PaneModel, hover: PaneAct | null = null): string => {
  const width = m.width, height = cardRects(m.folds, m.settings.state).height
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="dp${m.theme ? ` theme-${m.theme}` : ''}" dir="rtl"><style>${tajawalFontFaceCss()}${paletteCss('.dp', m.color)}${CSS}${SETTINGS_CSS}</style>${paneTop}${prayerCard(m, hover)}${quranCard(m, hover)}${athkarCard(m, hover)}${settingsCard(m, hover)}</div></foreignObject></svg>`
}

export const paneAlt = (m: PaneModel): string =>
  `مسلم · الصلاة${m.prayer.isSet ? ` · ${m.prayer.nextName} ${m.prayer.nextTime} · ${m.prayer.until}` : ''} · القرآن${m.quran.isAvailable ? ` · ${m.quran.surah} · ${m.quran.elapsed} / ${m.quran.total}` : ''} · ${m.athkar.isAvailable ? `${m.athkar.title} ${m.athkar.fraction}` : 'أذكار'} · الإعدادات`

