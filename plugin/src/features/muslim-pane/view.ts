import { ATHKAR_SETS, athkarRowTop, KMENU_TOP, KMENU_PAD, KMENU_ROW_H, KMENU_GAP } from './layout.ts'
// The pane's picture: one SVG document holding HTML and CSS in a foreignObject,
// built in the style of the Desktop's own session-panel cards (rounded
// bordered cards, a header with a chevron and a value, icon rows, a toggle,
// a thin progress bar, round controls). Pure: no $.

import { drawText, textCss } from '../../shared/text/index.ts'
import { TAJAWAL_FAMILY, tajawalFontFaceCss } from '../../shared/font/index.ts'
import { accentHex } from '../../shared/color/index.ts'
import { FEATURE_ICONS } from '../../shared/icon/index.ts'
import {
  ATHAN_H, ATHAN_TOP, CITY_H, CITY_TOP, CONTROL_SPECS, FOLDED_H, HEAD_H, HEAD_TOP, KROW_H, KROW_TOP, athkarRow, KROW_GAP, NX_H, NX_TOP, Q_AVATAR_H, Q_AVATAR_W, Q_BAR_BASE, Q_CONTROLS_BASE, Q_CONTROLS_H, Q_HERO_H, Q_HERO_TOP,
  Q_ERROR_TOP, Q_ERROR_H, Q_RETRY_TOP, Q_RETRY_H, Q_NOTE_H, Q_BROWSER_DY, Q_BROWSER_H, quranNoteTop, Q_RECITER_BASE, Q_RECITER_H, Q_SEG_H, Q_SEG_LEFT, Q_SEG_TOP, Q_TIMES_BASE, Q_TIMES_H, Q_TITLE_H, Q_TITLE_TOP, SHEET_BACK_W, SHEET_BAR_LEFT, SHEET_BAR_W, SHEET_BORDER, SHEET_FOOT_H, SHEET_FOOT_TOP, SHEET_H, SHEET_HEAD_H, SHEET_HEAD_TOP,
  SHEET_MIN_THUMB, SHEET_ROWS_H, SHEET_ROWS_LEFT, SHEET_ROWS_RIGHT, SHEET_ROWS_TOP, SHEET_ROW_H, SHEET_SEARCH_H, SHEET_SEARCH_TOP, AVATAR_H, PAD, TOP_H, TOP_Y, ROWS_TOP, ROW_H, SIDE, cardRects, controlScale, quranOffset, type PaneAct,
} from './layout.ts'
import { SETTINGS_TOP, SETTINGS_BODY_TOP, TABS_H, TAB_INSET, TAB_PAD, LIST_CHOICE_H, LABEL_H, HINT_TOP, HINT_H, CONTROL_TOP, EXTRA_TOP, ADJUST_NOTE_TOP, QURAN_SETTINGS_NOTE, settingsNoteHeight, categoryTabs, settingsBody, type SettingRow, type SettingsTarget } from './settings.ts'
import { quranLayout, type PaneModel } from './model.ts'
import { arabicDigits } from '../../shared/pray/line.ts'
import { avatar } from './avatar.ts'

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// One quiet 12px line in its fixed slot (top and height), cut with an ellipsis by the shared text class. The shared line is 24px
// tall at 12px, so the box is taller than the slot by the difference and starts half of it higher: the text stays where it was.
const QUIET_LINE_PX = 24
const quietLine = (text: string, top: number, height: number) => {
  const pad = (QUIET_LINE_PX - height) / 2

  return drawText(text, { className: 'quiet', tag: 'div', style: `position:absolute;top:${top - pad}px;left:${SIDE}px;right:${SIDE}px;height:${QUIET_LINE_PX}px;font-size:12px` })
}
const ltr = (text: string) => `<bdi dir="ltr">${escape(text)}</bdi>`

// Colors live here only: dark by default, light under the app's color scheme (Claude Code's own theme row is not read, it can differ from the Desktop's).
const VARS = {
  dark: '--line:rgba(238,237,232,.13);--line-soft:rgba(238,237,232,.07);--ornament-dim:color-mix(in srgb,var(--accent) 60%,transparent);--text:#eeede8;--text-2:#c6c3bb;--muted:#a6a299;--dim:#969289;--hover:rgba(238,237,232,.04);--active:rgba(238,237,232,.07);--on:#faf9f5;--on-accent:#1f1e1d;--sheet:#1f1e1d;--sheet-line:#393733;--sheet-dim:#98948b;--sheet-soft:#c6c3bb;--sheet-shadow:0 10px 30px #0008',
  light: '--line:rgba(41,40,36,.14);--line-soft:rgba(41,40,36,.07);--ornament-dim:color-mix(in srgb,var(--accent) 60%,transparent);--text:#292824;--text-2:#514e47;--muted:#736f66;--dim:#817c72;--hover:rgba(41,40,36,.04);--active:rgba(41,40,36,.07);--on:#ffffff;--on-accent:#ffffff;--sheet:#fdfcf9;--sheet-line:#d9d6cd;--sheet-dim:#79766c;--sheet-soft:#46443e;--sheet-shadow:0 10px 30px #302f2a24',
}
export const paletteCss = (root: string, color: PaneModel['color']): string => {
  // Soft accent washes for the picker's highlighted and chosen rows.
  const wash = ';--accent-20:color-mix(in srgb,var(--accent) 20%,transparent);--accent-34:color-mix(in srgb,var(--accent) 34%,transparent);--accent-44:color-mix(in srgb,var(--accent) 44%,transparent)'
  const dark = `${VARS.dark};--accent:${accentHex(color, true)}${wash}`, light = `${VARS.light};--accent:${accentHex(color, false)}${wash}`
  // Light only: a soft drop shadow lifts the pixel-art avatar off the light card; .theme-dark cancels it even when the OS is light.
  const a = `${root} .pane-top svg`, shadow = 'filter:drop-shadow(0 1px 1.5px rgba(31,30,29,.35))'
  return `${root}{${dark}}@media (prefers-color-scheme: light){${root}{${light}}}@media (prefers-color-scheme: light){${a}{${shadow}}}${root}.theme-light{${light}}${root}.theme-light .pane-top svg{${shadow}}${root}.theme-dark{${dark}}${root}.theme-dark .pane-top svg{filter:none}`
}

// Feature marks come from the standard set; row and control icons stay local.
const PATHS = {
  ...FEATURE_ICONS,
  chev: '<path d="M6 9l6 6 6-6"/>',
  chevl: '<path d="M15 6l-6 6 6 6"/>',
  prayer: '<circle cx="5.2" cy="14.8" r="1.9"/><path d="M7 12.8C9.5 8.5 12.5 6.5 15.5 6.5c2 0 3 1.5 3 4v5H21M9.5 11.2l1.5 3.6-3 2.2M2.5 17.2h19"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6"/>',
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
  back: '<path d="m10 6 6 6-6 6M16 12H4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/>',
  repeatseg: '<path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3M11 10h1v4"/>',
  prev: '<path d="M7 6v12"/><path d="M18 6.5v11L10 12z"/>',
  next: '<path d="M17 6v12"/><path d="M6 6.5v11L14 12z"/>',
} as const
const icon = (name: keyof typeof PATHS, cls = '') => `<svg xmlns="http://www.w3.org/2000/svg" class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.dp{position:relative;width:100%;height:100%;background:transparent;font-family:${TAJAWAL_FAMILY};font-size:14px;line-height:1.35;font-weight:400;color:var(--text);direction:rtl;user-select:none;-webkit-user-select:none;overflow:hidden}
${textCss()}
.ic{width:1.3em;height:1.3em;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.pane-top{position:absolute;right:${PAD+8}px;top:${TOP_Y}px;height:${TOP_H}px;display:flex;align-items:center;gap:10px;color:var(--text);font-size:24px;font-weight:700}.pane-top span{line-height:1;transform:translateY(.12em)}.pane-top svg{flex-shrink:0;image-rendering:pixelated}.pane-command{position:absolute;left:${PAD+8}px;top:${TOP_Y+(TOP_H-18)/2}px;line-height:18px;font-size:12px;white-space:nowrap;color:var(--dim)}
.dcard{position:absolute;left:${PAD}px;right:${PAD}px;border-radius:12px;background:transparent;box-shadow:inset 0 0 0 1px var(--line)}
.in{position:absolute;left:${SIDE}px;right:${SIDE}px}
.dh{display:flex;align-items:center;gap:8px;height:${HEAD_H}px;font-size:16px;font-weight:500;line-height:1.25;white-space:nowrap}
.dh .hi{width:20px;height:20px;color:var(--accent)}
.dh>.ar{line-height:1;transform:translateY(.12em)}
.dh .fold{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:var(--muted);flex:none;margin-inline-end:-6px}
.dh .fold .ic{width:16px;height:16px}
.dh .fold.hot{background:var(--hover);color:var(--text)}
.dh .dv{margin-inline-start:auto;font-size:12px;font-weight:400;color:var(--muted);margin-block:-.5em;transform:translateY(.12em)}
.nx{display:flex;align-items:center;justify-content:space-between;gap:12px;height:${NX_H}px;padding-bottom:8px;border-bottom:1px solid var(--line-soft)}
.nx-k{color:var(--muted);font-size:12px}
.nx-n{font-size:20px;font-weight:700;color:var(--accent);line-height:1.2}
.nx-r{direction:ltr;text-align:left}
.nx-t{font-size:20px;font-weight:500;line-height:1.2;font-variant-numeric:tabular-nums}
.nx-in{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.pr{position:absolute;left:${SIDE - 8}px;right:${SIDE - 8}px;height:${ROW_H}px;font-size:14px;display:flex;align-items:center;gap:11px;padding-inline:8px;border-radius:8px}
.pr .ic{width:16px;height:16px;color:var(--muted)}
.pr>span{line-height:1;transform:translateY(.12em)}
.pr .t{margin-inline-start:auto;font-variant-numeric:tabular-nums}
.pr.done{color:var(--dim)}.pr.done .ic{color:var(--dim)}
.pr.next{background:var(--hover);color:var(--accent);font-weight:500}.pr.next .ic{color:var(--accent)}
.note{position:absolute;left:${SIDE}px;right:${SIDE}px;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--muted);font-size:12px;direction:ltr}
.athan{display:flex;align-items:center;gap:12px;height:${ATHAN_H}px;border-top:1px solid var(--line-soft);border-radius:0 0 11px 11px;padding-top:2px}
.athan .ic{color:var(--text-2);width:18px;height:18px}
.athan>span:not(.tog){line-height:1;transform:translateY(.12em)}
.athan.hot{background:var(--hover)}
.athan.off{opacity:.55}
.prayer-city{position:absolute;left:${SIDE}px;right:${SIDE}px;top:${CITY_TOP}px;height:${CITY_H}px;text-align:center;font-size:12px;color:var(--muted);line-height:1}
.tog{direction:ltr;position:relative;width:38px;height:22px;border-radius:99px;background:var(--line);flex:none;margin-inline-start:auto}
.tog.on{background:var(--accent)}
.tog i{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--on);transition:transform .15s}
.tog.on i{transform:translateX(16px)}
.pbar{height:5px;border-radius:99px;background:var(--line);overflow:hidden;flex:1;min-width:0}
.pbar i{display:block;height:100%;background:var(--accent);border-radius:inherit}
.bar{position:absolute;left:${SIDE}px;right:${SIDE}px;direction:ltr}
.cb{position:absolute;border-radius:50%;background:transparent;box-shadow:inset 0 0 0 1px var(--line);display:grid;place-items:center;color:var(--text-2)}
.cb .ic{width:18px;height:18px}
.cb.hot{background:var(--hover)}
.cb.pl{background:var(--accent);box-shadow:none;color:var(--on-accent)}
.cb.pl.hot{filter:brightness(1.08)}
.cb.pl .ic{width:22px;height:22px}
.cb.off{opacity:.35}
.a-hero{position:absolute;top:${Q_HERO_TOP}px;left:${SIDE}px;right:${SIDE}px;height:${Q_HERO_H}px;display:flex;gap:8px;align-items:flex-start;justify-content:space-between}
.a-info{position:relative;flex:1;min-width:0;height:${Q_HERO_H}px}
.a-status{position:absolute;top:0;right:0;left:0;height:28px;font-size:12px;color:var(--muted);display:flex;align-items:center;white-space:nowrap}
.a-status.live{color:var(--accent)}
.a-status>span{line-height:1;transform:translateY(.12em)}
.a-title{position:absolute;top:${Q_TITLE_TOP - Q_HERO_TOP}px;right:0;left:0;height:${Q_TITLE_H}px;display:flex;align-items:center;gap:3px;min-width:0;border-radius:8px;font-size:20px;font-weight:700;white-space:nowrap}
.a-title>span{margin-block:-.5em;transform:translateY(.12em)}
.a-title .ic{width:13px;height:13px;color:var(--muted)}
.a-avatar{width:${Q_AVATAR_W}px;height:${Q_AVATAR_H}px;flex:none}.a-avatar svg{display:block}
.below-seg{position:absolute;right:${SIDE}px;left:${Q_SEG_LEFT}px;top:${Q_SEG_TOP}px;height:${Q_SEG_H}px;display:flex;align-items:center;gap:6px;border-radius:8px;font-size:13px;color:var(--text-2);white-space:nowrap}
.below-seg small{font-size:12px;color:var(--muted);flex:none}
.below-seg .ic{width:12px;height:12px;color:var(--muted);flex:none}
.segment-label{flex:0 1 auto;margin-block:-.325em}
.a-reciter{position:absolute;right:${SIDE}px;left:${SIDE}px;height:${Q_RECITER_H}px;display:flex;gap:8px;align-items:center;border-radius:8px;color:var(--text-2);font-size:14px}
.a-reciter .ic{width:16px;height:16px;flex:none}
.a-reciter .name{min-width:0;flex:1;line-height:14px}
.a-reciter .name.off{color:var(--dim)}
.a-reciter .tail{width:12px;height:12px;color:var(--muted)}
.a-title.hot,.below-seg.hot,.a-reciter.hot{background:var(--hover)}
.a-times{position:absolute;left:${SIDE}px;right:${SIDE}px;height:${Q_TIMES_H}px;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;direction:ltr;color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.a-times .total{text-align:right}.a-times .quiet{font-size:10px;text-align:center;direction:rtl}
.cb.rep .ic{width:16px;height:16px}
.cb.rep.on{color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.cb-label{position:absolute;width:48px;font-size:10px;line-height:13px;text-align:center;color:var(--muted)}
.sheet{position:absolute;left:${PAD}px;right:${PAD}px;height:${SHEET_H}px;background:var(--sheet);border:${SHEET_BORDER}px solid var(--sheet-line);border-radius:12px;z-index:4;box-shadow:var(--sheet-shadow);overflow:hidden;color:var(--text)}
.sheet-head{position:absolute;top:${SHEET_HEAD_TOP}px;right:12px;left:12px;height:${SHEET_HEAD_H}px;display:flex;align-items:center;gap:8px;font-size:16px}
.sheet-head>span:not(.back){flex:1;line-height:1;transform:translateY(.12em)}
.sheet-head>.ic{color:var(--accent)}
.back{width:${SHEET_BACK_W}px;height:${SHEET_HEAD_H}px;border-radius:8px;box-shadow:inset 0 0 0 1px var(--line);font-size:14px;display:flex;gap:5px;align-items:center;justify-content:center}
.back .ic{width:14px;height:14px}.back.hot{background:var(--hover)}
.search{position:absolute;left:12px;right:12px;top:${SHEET_SEARCH_TOP}px;height:${SHEET_SEARCH_H}px;display:flex;align-items:center;padding:0 10px;border:1px solid var(--sheet-line);border-radius:8px;font-size:14px;white-space:nowrap;gap:4px}
.search .ic{width:16px;height:16px;color:var(--muted);margin-inline-end:3px}.placeholder{color:var(--sheet-dim)}.caret{height:17px;width:1px;background:var(--accent);flex:none}
.rows{position:absolute;top:${SHEET_ROWS_TOP}px;right:${SHEET_ROWS_RIGHT}px;left:${SHEET_ROWS_LEFT}px;height:${SHEET_ROWS_H}px;overflow:hidden}
.orow{position:absolute;height:${SHEET_ROW_H}px;right:0;left:0;border-radius:5px;display:flex;align-items:center;gap:8px;padding:0 10px;font-size:14px;white-space:nowrap}
.orow .lbl{flex:1;margin-block:-.325em}.orow .num{flex:none;min-width:22px;color:var(--muted)}
.orow .tick{color:var(--accent);width:16px;text-align:center;flex:none}
.orow.hot{background:var(--accent-20)}
.orow.chosen{background:var(--accent-34);border-inline-start:3px solid var(--accent)}
.orow.chosen.hot{background:var(--accent-44)}
.sbar{position:absolute;top:${SHEET_ROWS_TOP}px;left:${SHEET_BAR_LEFT}px;width:${SHEET_BAR_W}px;height:${SHEET_ROWS_H}px}
.sbar:before{content:'';position:absolute;left:6px;width:6px;top:0;bottom:0;border-radius:4px;background:var(--sheet-line)}
.thumb{position:absolute;left:6px;width:6px;min-height:${SHEET_MIN_THUMB}px;border-radius:4px;background:var(--accent)}
.sfoot{position:absolute;top:${SHEET_FOOT_TOP}px;right:0;left:0;height:${SHEET_FOOT_H}px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-top:1px solid var(--sheet-line);font-size:12px;color:var(--sheet-soft);gap:8px}
.sfoot .count{font-size:11px;color:var(--sheet-dim);white-space:nowrap}.sfoot .hint{white-space:nowrap;direction:ltr}
.nores{position:absolute;top:0;right:0;padding:15px;font-size:14px;color:var(--muted)}
@media(max-width:420px){.a-title{font-size:16px}.a-times{grid-template-columns:40px 1fr 40px}.sfoot{padding:0 8px;gap:4px}.sfoot .hint{font-size:11px}}
.dbtn{display:flex;align-items:center;justify-content:center;background:transparent;box-shadow:inset 0 0 0 1px var(--line);color:var(--text);border-radius:10px;font-weight:500;text-align:center;white-space:nowrap}
.dbtn.tertiary{box-shadow:none;color:var(--text-2)}
.dbtn.hot{background:var(--hover);color:var(--text)}
.dbtn.off{opacity:.45}
.krow{display:flex;align-items:center;gap:${KROW_GAP}px;height:${KROW_H}px;font-size:14px}
.krow .ic{color:var(--text-2);width:18px;height:18px}
.krow .dbtn{height:${KROW_H - 4}px;flex:none;padding-inline:0;font-size:12px}
.krow .pbar{min-width:40px}
.krow .none{flex:1;color:var(--muted);font-size:12px;direction:ltr;line-height:1;transform:translateY(.12em)}
`

// Icon and title at the start (the right, in RTL), the muted meta at the far end, and the fold control last.
const header = (name: keyof typeof PATHS, title: string, value: string, isFolded: boolean, isHot: boolean, isLtr = false) =>
  `<div class="in dh" style="top:${HEAD_TOP}px" role="button" aria-expanded="${!isFolded}">${icon(name, 'hi')}<span class="ar">${escape(title)}</span>${drawText(value, { className: 'dv', raw: true, ...(isLtr ? { dir: 'ltr' as const } : {}) })}<span class="fold${isHot ? ' hot' : ''}">${icon(isFolded ? 'chevl' : 'chev')}</span></div>`

const prayerCard = (m: PaneModel, hover: PaneAct | null): string => {
  const p = m.prayer, r = cardRects(m.folds, m.settings.state, m.settings.options, quranLayout(m), m.athkarMenu)
  if (m.folds.prayer) return `<section class="dcard" style="top:${r.prayerY}px;height:${r.prayerH}px">${header('sujoodreal', 'الصلاة', '', true, hover === 'fold-prayer')}</section>`
  let body: string
  if (!p.isSet) {
    body = `<div class="note" style="top:${NX_TOP}px;height:${NX_H + 5 * ROW_H + 10}px">Choose a city first: /salah city</div>`
  } else {
    const rows = p.rows.map((r, i) => `<div class="pr ${r.state === 'upcoming' ? '' : r.state}" style="top:${ROWS_TOP + i * ROW_H}px">${icon(r.state === 'done' ? 'check' : r.state === 'next' ? 'now' : 'ring')}<span class="ar">${escape(r.name)}</span><span class="t ar">${ltr(r.time)}</span></div>`).join('')
    body = `<div class="in nx" style="top:${NX_TOP}px"><div><div class="nx-k ar">الصلاة القادمة</div><div class="nx-n ar">${escape(p.nextName)}</div></div><div class="nx-r"><div class="nx-t ar">${ltr(p.nextTime)}</div><div class="nx-in ar" dir="rtl">${escape(p.until)}</div></div></div>${rows}`
  }
  const athan = `<div class="in athan${hover === 'athan' ? ' hot' : ''}${p.isSet ? '' : ' off'}" style="top:${ATHAN_TOP}px" role="switch" aria-checked="${p.isAthan}" aria-label="الأذان">${icon('bell')}<span>الأذان</span><span class="tog${p.isAthan ? ' on' : ''}"><i></i></span></div>`
  const city = p.isSet ? `<div class="prayer-city">مواقيت <bdi>${escape(p.city)}</bdi></div>` : ''
  return `<section class="dcard" style="top:${r.prayerY}px;height:${r.prayerH}px">${header('sujoodreal', 'الصلاة', '', false, hover === 'fold-prayer')}${body}${athan}${city}</section>`
}

// Digit runs and ayah ranges stay left-to-right inside Arabic text.
const ltrDigits = (escaped: string) => escaped.replace(/[٠-٩]+(?:–[٠-٩]+)?/g, run => `<bdi dir="ltr">${run}</bdi>`)

const quranCard = (m: PaneModel, hover: PaneAct | null): string => {
  // The open sheet covers the hero, so the avatar is left out of the picture then (it keeps the pane under the Client tree limit).
  const q = m.quran, layout = quranLayout(m), r = cardRects(m.folds, m.settings.state, m.settings.options, layout)
  // Folded, the header says which segment is playing; open, «ابدأ من» does.
  if (m.folds.quran) return `<section class="dcard" style="top:${r.quranY}px;height:${r.quranH}px">${header('qpane', 'القرآن الكريم', q.isAvailable ? ltrDigits(escape(q.part)) : '', true, hover === 'fold-quran')}</section>`
  const ok = q.isAvailable, segmented = ok && q.segmented, off = quranOffset(segmented)
  const cls = (act: PaneAct, extra = '', disabled = false) => `${extra}${hover === act ? ' hot' : ''}${disabled ? ' off' : ''}`
  const label = ok ? ltrDigits(escape(q.part)) : ''
  const hero = `<div class="a-hero"><div class="a-info"><div class="a-status${ok && q.isLive ? ' live' : ''}"><span>${ok ? escape(q.status) : 'متوقف'}</span></div>`
    + `<div class="a-title ${cls('quran-pick-surah')}" role="button" aria-haspopup="listbox" aria-label="اختيار السورة">${drawText(ok ? q.surah : '—', { className: 'ar' })}${icon('chev')}</div></div><div class="a-avatar">${ok && !m.picker ? q.avatar : ''}</div></div>`
  const start = segmented ? `<div class="below-seg ${cls('quran-pick-segment')}" role="button" aria-haspopup="listbox" aria-label="ابدأ من"><small>ابدأ من</small>${drawText(label, { className: 'segment-label', raw: true })}${icon('chev')}</div>` : ''
  const reciter = `<div class="a-reciter ${cls('quran-pick-reciter')}" style="top:${Q_RECITER_BASE + off}px" role="button" aria-haspopup="listbox" aria-label="اختيار القارئ">${icon('mic')}<span class="name ar${ok ? '' : ' off'}">${ok ? escape(q.reciter) : '—'}</span>${icon('chev', 'tail')}</div>`
  const bar = `<div class="bar" style="top:${Q_BAR_BASE + off}px"><div class="pbar"><i style="width:${ok ? Math.round(q.progress * 1000) / 10 : 0}%"></i></div></div>`
  const times = `<div class="a-times" style="top:${Q_TIMES_BASE + off}px"><bdi dir="ltr">${ok ? escape(q.elapsed) : '--:--'}</bdi><span class="quiet">الوقت تقريبي</span><bdi class="total" dir="ltr">${ok ? escape(q.total) : '--:--'}</bdi></div>`
  const mid = Q_CONTROLS_BASE + off + Q_CONTROLS_H / 2, s = controlScale(m.width)
  const on = ok && q.isPlaying
  const controls = CONTROL_SPECS.map(c => {
    const left = `calc(50% + ${Math.round((c.dx * s - c.r) * 100) / 100}px)`, top = mid + c.dy - c.r
    const size = `width:${c.r * 2}px;height:${c.r * 2}px;top:${top}px;left:${left}`
    if (c.act === 'quran-repeat-segment' || c.act === 'quran-repeat-surah') {
      const isSegment = c.act === 'quran-repeat-segment'
      const pressed = ok && q.repeat === (isSegment ? 'segment' : 'surah'), disabled = !ok || isSegment && !segmented
      return `<div class="cb rep ${cls(c.act, pressed ? 'on' : '', disabled)}" role="button" aria-pressed="${pressed}" aria-disabled="${disabled}" aria-label="${isSegment ? 'تكرار المقطع' : 'تكرار السورة'}" style="${size}">${icon(isSegment ? 'repeatseg' : 'repeat')}</div>`
        + `<span class="cb-label" style="top:${top + c.r * 2 + 3}px;left:calc(50% + ${Math.round((c.dx * s - 24) * 100) / 100}px)">${isSegment ? 'المقطع' : 'السورة'}</span>`
    }
    const name = c.act === 'quran-prev' ? 'prev' : c.act === 'quran-next' ? 'next' : on ? 'stop' : 'play'
    const disabled = !ok || c.act === 'quran-prev' && !q.canPrev || c.act === 'quran-next' && !q.canNext
    const aria = c.act === 'quran-prev' ? 'Previous' : c.act === 'quran-next' ? 'Next' : on ? 'Stop' : 'Play'
    return `<div class="cb ${cls(c.act, c.act === 'quran-toggle' ? 'pl' : '', disabled)}" role="button" aria-label="${aria}" style="${size}">${icon(name)}</div>`
  }).join('')
  const error = ok && q.error ? `${quietLine(q.error, Q_ERROR_TOP + off, Q_ERROR_H)}<div class="dbtn ${cls('quran-retry')}" role="button" aria-label="إعادة المحاولة" style="position:absolute;top:${Q_RETRY_TOP + off}px;left:${SIDE}px;right:${SIDE}px;height:${Q_RETRY_H}px"><span>إعادة المحاولة</span></div>` : ''
  const noteTop = quranNoteTop(layout)
  const note = ok && q.audioNote ? `${quietLine(q.audioNote, noteTop, Q_NOTE_H)}<div class="dbtn ${cls('quran-browser')}" role="button" aria-label="استمع في المتصفح" style="position:absolute;top:${noteTop + Q_BROWSER_DY}px;left:${SIDE}px;right:${SIDE}px;height:${Q_BROWSER_H}px"><span>استمع في المتصفح ↗</span></div>` : ''
  const sheet = m.picker ? quranSheet(m, r.quranY, hover) : ''
  return `<section class="dcard" style="top:${r.quranY}px;height:${r.quranH}px">${header('qpane', 'القرآن الكريم', '', false, hover === 'fold-quran')}${hero}${start}${reciter}${bar}${times}${controls}${error}${note}</section>${sheet}`
}

// The open picker: a sheet over the card with the list's head, a search box, eight rows, a scrollbar and a footer.
const quranSheet = (m: PaneModel, quranY: number, hover: PaneAct | null): string => {
  const p = m.picker!
  const title = p.list === 'reciter' ? 'اختر القارئ' : p.list === 'surah' ? 'اختر السورة' : 'ابدأ من'
  const placeholder = p.list === 'reciter' ? 'ابحث عن قارئ أو رقم' : p.list === 'surah' ? 'ابحث عن سورة أو رقمها' : 'ابحث عن موضع أو آية'
  const hoverRow = hover?.startsWith('quran-row:') ? Number(hover.slice(10)) : null
  const rows = p.rows.map((o, i) => {
    const hot = hoverRow !== null ? hoverRow === i : p.scroll + i === p.highlight
    const text = p.list === 'segment' ? ltrDigits(escape(o.label)) : escape(o.label)
    return `<div class="orow${o.selected ? ' chosen' : ''}${hot ? ' hot' : ''}" role="option" aria-selected="${o.selected}" style="top:${i * SHEET_ROW_H}px">${o.number ? `<span class="num"><bdi dir="ltr">${escape(o.number)}</bdi></span>` : ''}${drawText(text, { className: 'lbl', raw: true })}<span class="tick">${o.selected ? '✓' : ''}</span></div>`
  }).join('')
  const thumbH = Math.max(SHEET_MIN_THUMB, SHEET_ROWS_H * 8 / Math.max(1, p.count)), max = p.count - 8
  const bar = p.count > 8 ? `<div class="sbar" role="scrollbar" aria-label="موضع القائمة" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${p.scroll}"><div class="thumb" style="height:${Math.round(thumbH * 10) / 10}px;top:${Math.round(p.scroll / max * (SHEET_ROWS_H - thumbH) * 10) / 10}px"></div></div>` : ''
  const query = p.query ? escape(p.query).replace(/[0-9٠-٩]+/g, digits => `<bdi dir="ltr">${digits}</bdi>`) : `<span class="placeholder">${placeholder}</span>`
  const count = p.count ? `<bdi dir="ltr">${arabicDigits(String(p.highlight + 1))} / ${arabicDigits(String(p.count))}</bdi>` : '<bdi dir="ltr">٠ / ٠</bdi>'
  return `<div class="sheet" style="top:${quranY}px" role="region" aria-label="${title}"><div class="sheet-head">${icon(p.list === 'reciter' ? 'mic' : 'qpane')}<span class="ar">${title}</span><span class="back${hover === 'quran-back' ? ' hot' : ''}" role="button" aria-label="رجوع">${icon('back')}رجوع</span></div>`
    + `<div class="search" role="searchbox" aria-label="${placeholder}">${icon('search')}${query}<i class="caret"></i></div>`
    + `<div class="rows" role="listbox" aria-label="${title}">${rows}${p.count ? '' : '<div class="nores">لا توجد نتائج</div>'}</div>${bar}`
    + `<div class="sfoot"><span class="count">${count}</span><span class="hint" dir="ltr">Use ↑ ↓ for scrolling</span></div></div>`
}

const athkarCard = (m: PaneModel, hover: PaneAct | null): string => {
  const k = m.athkar, r = cardRects(m.folds, m.settings.state, m.settings.options, quranLayout(m), m.athkarMenu)
  // The card's mark is the athkar horizon for every set; the per-set icons live only in the menu rows.
  const mark = 'horizon' as const
  const foldedHead = header(mark, 'الأذكار', '', true, hover === 'fold-athkar')
  if (m.folds.athkar) return `<section class="dcard" style="top:${r.athkarY}px;height:${r.athkarH}px">${foldedHead}</section>`
  const kr = athkarRow(m.width)
  const head = k.isAvailable
    ? `<div class="in dh" style="top:${HEAD_TOP}px" role="group"><div class="picker-title${hover === 'athkar-picker' ? ' hot' : ''}" role="button" aria-expanded="${m.athkarMenu}" aria-haspopup="menu" aria-label="${escape(k.title)}، اختر الورد">${icon(mark, 'hi')}${drawText(k.title, { className: 'title ar' })}${icon('chev', 'tail')}</div>`
      + `${drawText(ltr(k.fraction), { className: 'dv', raw: true, dir: 'ltr' })}<span class="fold${hover === 'fold-athkar' ? ' hot' : ''}" role="button" aria-label="طي الأذكار" aria-expanded="true">${icon('chev')}</span></div>`
    : foldedHead
  const menu = m.athkarMenu && k.isAvailable
    ? `<div class="in menu" role="menu" aria-label="اختر الورد" style="top:${KMENU_TOP}px">${ATHKAR_SETS.map((s, i) => `<div class="menu-row${hover === `athkar-set:${s.key}` ? ' hot' : ''}" role="menuitemradio" aria-checked="${s.key === k.set}" style="top:${KMENU_PAD - 1 + i * (KMENU_ROW_H + KMENU_GAP)}px">${icon(s.icon)}<span>${s.title}</span>${s.key === k.set ? '<span class="tick">✓</span>' : ''}</div>`).join('')}</div>` : ''
  const bar = k.isAvailable
    ? `<div class="pbar" role="progressbar" aria-label="تقدّم ${escape(k.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(k.progress * 100)}"><i style="width:${Math.round(k.progress * 1000) / 10}%"></i></div>`
    : `<span class="none">Not ready: /athkar</span>`
  const btn = (act: string, cls: string, width: number, aria: string, inner: string) => `<span class="dbtn ${cls}${hover === act ? ' hot' : ''}" role="button" aria-label="${aria}" style="width:${width}px">${inner}</span>`
  const openLabel = k.isAvailable && k.hasCounts ? 'أكمل' : 'ابدأ'
  const undo = k.isAvailable && k.canUndo
  const buttons = !k.isAvailable
    ? `<span class="dbtn primary off" role="button" aria-label="${openLabel}" style="width:${kr.openW}px">${openLabel}</span>`
    : (k.isDone ? '' : btn('athkar-open', 'primary', kr.openW, `${openLabel} ${escape(k.title)}`, openLabel) + btn('athkar-finish', 'finish', kr.finishW, `أتممتُ ${escape(k.title)}`, kr.compact ? icon('check') : '✓ أتممتُها'))
      + (k.isDone ? `<span class="done-note" style="width:${kr.doneW}px">أتممتَ وردك ✓</span>` : '')
      + btn('athkar-reset', `reset${undo ? ' undo' : ''}`, kr.resetW, `${undo ? 'تراجع عن إعادة' : 'إعادة بدء'} ${escape(k.title)}`, `${icon('reset')}${kr.compact ? '' : `<span>${undo ? 'تراجع' : 'إعادة'}</span>`}`)
  return `<section class="dcard ${m.athkarMenu ? 'picker-open' : 'compact'}" style="top:${r.athkarY}px;height:${r.athkarH}px">${head}${menu}`
    + `<div class="in krow" style="top:${athkarRowTop(m.athkarMenu)}px;gap:${kr.gap}px">${icon(mark)}${bar}${buttons}</div></section>`
}

// Only tab labels stay at 11px: at 240px, «الأذكار» needs 28.572px at 12px,
// but a 31.6px tab has 27.6px after its horizontal padding.
const ATHKAR_CSS = `
.picker-title{display:flex;align-items:center;justify-content:flex-start;gap:5px;border-radius:5px;min-width:0;flex:1;height:${HEAD_H}px;font-size:16px;font-weight:500;white-space:nowrap}
.picker-title .hi{width:20px;height:20px;color:var(--accent);flex:none}.picker-title .title{margin-block:-.5em;transform:translateY(.12em)}.picker-title .tail{width:14px;height:14px;color:var(--muted);flex:none}
.picker-title.hot,.menu-row.hot{background:var(--hover);color:var(--text)}
.dbtn.reset{gap:4px;color:var(--muted);font-size:12px;padding-inline:0}.dbtn.reset .ic{width:16px;height:16px}.dbtn.reset.undo{color:var(--accent)}
.dbtn.primary{color:var(--text)}.dbtn.finish{color:var(--text-2)}.dbtn.finish .ic{width:16px;height:16px}
.menu{border-top:1px solid var(--line-soft)}.menu-row{position:absolute;left:0;right:0;display:flex;align-items:center;gap:9px;height:${KMENU_ROW_H}px;border-radius:6px;padding:0 8px;text-align:right;font-size:14px}.menu-row .ic{width:18px;height:18px}.menu-row[aria-checked=true]{background:var(--active)}.menu .tick{margin-inline-start:auto;color:var(--accent)}
.done-note{font-size:12px;color:var(--muted);white-space:nowrap}.krow .done-note{flex:none;text-align:center}
`

const SETTINGS_CSS = `
.settings-tabs{position:absolute;left:${TAB_INSET}px;right:${TAB_INSET}px;top:${SETTINGS_TOP}px;height:${TABS_H}px;border:1px solid transparent;border-bottom-color:var(--line);padding:4px;background:transparent;overflow:visible}
.setting-tab{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px 2px;min-width:0;border-radius:8px 8px 0 0;background:transparent;color:var(--muted)}
.setting-tab .ic{width:20px;height:20px}.setting-tab span{font-size:11px;line-height:14px;text-align:center;white-space:nowrap;overflow:visible;height:14px}
.setting-tab.hot{background:var(--hover);color:var(--text)}.setting-tab[aria-selected=true]{color:var(--text);font-weight:700}
.setting-tab[aria-selected=true]::after{content:'';position:absolute;left:10px;right:10px;bottom:-${TAB_PAD}px;height:2px;border-radius:2px;background:var(--text)}
.settings-body{position:absolute;left:0;right:0}
.setting-label{position:absolute;right:16px;max-width:calc(100% - 32px);height:${LABEL_H}px;display:flex;align-items:center;white-space:nowrap;font-size:14px}
.setting-label span{margin-block:-.5em;transform:translateY(.12em)}
.setting-hint{position:absolute;left:16px;right:16px;text-align:right;direction:rtl;line-height:${HINT_H}px;font-size:12px;color:var(--muted)}
.hint-line{display:block;white-space:nowrap;margin-block:-4px}
.setting-divider{position:absolute;left:16px;right:16px;height:18px;display:flex;direction:ltr;gap:10px;align-items:center;color:var(--accent)}.setting-divider .arm{flex:1;height:1px;opacity:.8}.setting-divider .a1{background:linear-gradient(to right,transparent,var(--ornament-dim))}.setting-divider .a2{background:linear-gradient(to left,transparent,var(--ornament-dim))}.setting-divider svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8}
.setting-extra{position:absolute;right:16px;max-width:calc(100% - 142px);font-size:12px;line-height:14px;color:var(--muted)}
.sc{position:absolute;display:flex;align-items:center;justify-content:center;gap:4px;border-radius:7px;font-size:14px;color:var(--text-2);white-space:nowrap}
.sc.pill,.sc.value,.sc.inline{background:transparent;box-shadow:inset 0 0 0 1px var(--line);padding:3px 6px}.sc.inline{font-size:12px;padding:0 6px}
.sc.hot{background:var(--hover);color:var(--text)}.sc.pill.on{background:var(--active);color:var(--text)}.sc.field.on{background:var(--active)}.sc.disabled{opacity:.38}.sc.field{box-shadow:inset 0 0 0 1px var(--line);direction:rtl;border-radius:6px;gap:1px;color:var(--text)}.sc.field.editing{box-shadow:inset 0 0 0 1.5px var(--accent)}.sc.field .ph{color:var(--muted)}.sc.field .unit{margin-inline-start:4px;font-size:12px;color:var(--muted)}
.sc.pill .value-text,.sc.value .value-text,.sc.inline .value-text{margin-block:-.5em;transform:translateY(.12em)}
.sc.copied{color:var(--text)}.sc.command{direction:ltr}.sc.command .value-text{transform:none}.sc .value-text{margin-block:-.325em}.sc .ic{width:12px;height:12px;flex:none}.sc .tog{margin:0}.sc.swatch::before{content:'';width:16px;height:16px;border-radius:50%;background:var(--sw)}.sc.swatch.on::before{outline:1.5px solid var(--text-2);outline-offset:3px}
.list-choice{position:absolute;left:16px;right:16px;padding:6px 10px;border-radius:8px;height:${LIST_CHOICE_H}px;font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:6px}
.list-choice>.lc{min-width:0}.list-choice .lc>.tx-line{display:block;margin-block:-.325em}.list-choice small{margin-top:-1px;margin-bottom:-5px;font-size:12px;color:var(--muted)}.list-choice.hot{background:var(--hover)}.list-choice.on{color:var(--text);background:var(--active)}
.settings-subtitle{position:absolute;right:16px;top:4px;font-size:14px}.settings-page{position:absolute;top:476px;left:94px;right:94px;text-align:center;font-size:12px;color:var(--muted)}
.command-sheet{position:absolute;left:16px;right:16px;top:46px;font-size:12px;color:var(--muted)}.command-sheet p{direction:rtl;text-align:right;line-height:18px;height:126px;margin-bottom:16px}.command-sheet code{display:block;direction:ltr;text-align:left;font:12px/18px monospace;padding:12px;background:transparent;box-shadow:inset 0 0 0 1px var(--line);border-radius:9px;overflow-wrap:anywhere}

`
const settingControl = (t: SettingsTarget, hover: PaneAct | null): string => {
  const c = t.control
  const selected = c.selected ? ' on' : '', hot = hover === t.act ? ' hot' : ''
  const attr = c.style === 'switch' ? `role="switch" aria-checked="${!!c.selected}"` : c.style === 'field' ? 'role="textbox" inputmode="numeric"' : `role="button" aria-pressed="${!!c.selected}"`
  const swatch = c.style === 'swatch' ? `--sw:var(--${c.label});` : ''
  const command = c.effect.kind === 'copy' && c.label.startsWith('/')
  // A number box shows its value, or while typed in the typed text (its value dim when empty) and a caret,
  // then its unit; the number reads left to right inside the Arabic box.
  const unit = c.unit ? `<span class="unit">${escape(c.unit)}</span>` : ''
  const field = c.editing ? `${c.label ? `<bdi dir="ltr">${escape(c.label)}</bdi>` : `<span class="ph">${escape(c.placeholder ?? '')}</span>`}<i class="caret"></i>${unit}` : `${c.label ? `<bdi dir="ltr">${escape(c.label)}</bdi>` : `<span class="ph">${escape(c.placeholder ?? '')}</span>`}${unit}`
  const content = c.style === 'switch' ? `<span class="tog${selected}"><i></i></span>` : c.style === 'swatch' ? '' : c.style === 'field' ? field : `${drawText(c.label, { className: 'value-text' })}${c.style === 'value' && c.effect.kind === 'face' && c.effect.face !== 'main' ? icon('chevl') : ''}`
  return `<div class="sc ${c.style}${command ? ' command' : ''}${selected}${hot}${c.done ? ' copied' : ''}${c.disabled ? ' disabled' : ''}${c.editing ? ' editing' : ''}" ${attr} aria-disabled="${!!c.disabled}" aria-label="${escape(c.label || (c.placeholder ?? ''))}" style="left:${t.x0-PAD}px;top:${t.y0}px;width:${t.x1-t.x0}px;height:${t.y1-t.y0}px;${swatch}">${content}</div>`
}
const settingRow = (row: SettingRow, y: number): string => {
  if (row.kind === 'divider') return `<div class="setting-divider" aria-hidden="true" style="top:${y}px"><span class="arm a1"></span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="m20 4 4 6 7-1 1 7 5 4-5 4-1 7-7-1-4 6-4-6-7 1-1-7-5-4 5-4 1-7 7 1Z"/><path d="m20 11 9 9-9 9-9-9Z"/><circle cx="20" cy="20" r="3"/></svg><span class="arm a2"></span></div>`
  const inline = row.controls[0]?.style === 'switch' ? 82 : row.controls[0]?.style === 'swatch' ? 144 : row.controls[0]?.style === 'inline' ? row.controls[0].width + 44 : 32
  // The authored phrase stays on its own short first line at 12px, never cut; only the chrome second line may ellipsize.
  const note = row.hintNote ? ` · ${escape(row.hintNote)}` : ''
  const hint = row.hintSecondLine ? `${drawText(row.hint, { className: 'hint-line', kind: 'wrap' })}${drawText(row.hintSecondLine, { className: 'hint-line' })}`
    : drawText((row.hintLtr ? `<bdi dir="ltr">${escape(row.hint)}</bdi>` : escape(row.hint).replace(/\/muslim/g, '<bdi dir="ltr">/muslim</bdi>')) + note, { className: 'hint-line', raw: true, dir: 'rtl' })
  return `<span class="setting-label" style="top:${y}px;max-width:calc(100% - ${inline}px)">${drawText(row.label)}</span><span class="setting-hint${row.hintSecondLine ? '' : ' chrome-hint'}" style="top:${y+HINT_TOP}px">${hint}</span>${row.extra?.controls.length?`<span class="setting-extra" style="top:${y+EXTRA_TOP+7}px">${escape(row.extra.label)}</span>`:''}`
}
const settingsCard = (m: PaneModel, hover: PaneAct | null): string => {
  const model=m.settings, s=model.state, r=cardRects(m.folds,s,model.options,quranLayout(m), m.athkarMenu), b=settingsBody(m.width,model)
  let content=header('gearteeth','الإعدادات','٤ أقسام',!s.open,hover==='settings:fold')
  if (s.open) {
    content+=`<div class="settings-tabs" role="tablist" aria-label="الإعدادات">${categoryTabs(m.width).map(c=>`<div class="setting-tab${hover===`settings:tab:${c.category}`?' hot':''}" style="left:${c.x0-PAD-TAB_INSET-1}px;top:${c.y0-SETTINGS_TOP-1}px;width:${c.x1-c.x0}px;height:${c.y1-c.y0}px" role="tab" aria-selected="${s.category===c.category}" aria-label="${c.label}">${icon(c.icon)}<span>${c.label}</span></div>`).join('')}</div>`
    let body=''
    if (s.face==='main') {
      body=b.rows.map(({row,y})=>settingRow(row,y)).join('')
    } else {
      const title=s.face==='methods'?'طريقة الحساب':s.face==='adjust'?'تعديل المواقيت':'اختيار المدينة'
      body=`<strong class="settings-subtitle">${title}</strong>`
      if (s.face==='methods') {
        body+=b.choices.map(c=>`<div class="list-choice${c.control.selected?' on':''}${hover===c.control.id?' hot':''}" style="top:${c.y}px" role="button" aria-pressed="${!!c.control.selected}"><span class="lc">${drawText(c.label)}${drawText(c.note, { tag: 'div' }).replace('<div class="', '<small class="').replace('</div>', '</small>')}</span>${c.control.selected?icon('check'):''}</div>`).join('')
        body+=`<span class="settings-page">${escape(String(b.page+1))} / ${b.pages}</span>`
        body+=`<span class="setting-hint chrome-hint" style="top:510px">${drawText('كل طرق الحساب العشرين · يُطبّق فورًا', { className: 'hint-line' })}</span>`
      } else if (s.face==='adjust') {
        body+=b.rows.map(({row,y})=>settingRow(row,y)).join('')
        body+=`<span class="setting-hint chrome-hint" style="top:${ADJUST_NOTE_TOP}px">${drawText('دقائق صحيحة: <bdi dir="ltr">٣</bdi> تأخير، <bdi dir="ltr">-٣</bdi> تقديم، ثم Enter.', { className: 'hint-line', raw: true, dir: 'rtl' })}${drawText('الترتيب: الفجر، الشروق، الظهر، العصر، المغرب، العشاء.', { className: 'hint-line' })}</span>`
      } else body+=`<div class="command-sheet"><p>يفتح سؤال المدينة في Claude. اكتب اسمها بأي لغة أو خط العرض والطول، أو شغّل الأمر التالي.</p><code>/salah city</code></div>`

    }
    body+=b.controls.filter(t=>!t.act.startsWith('settings:pick:')).map(t=>settingControl(t,hover)).join('')
    const noteHeight=settingsNoteHeight(quranLayout(m).isPlaying)
    if (noteHeight) content+=`<span class="setting-hint chrome-hint" style="top:${SETTINGS_BODY_TOP}px">${drawText(QURAN_SETTINGS_NOTE, { className: 'hint-line' })}</span>`
    content+=`<div class="settings-body" style="top:${SETTINGS_BODY_TOP+noteHeight}px">${body}</div>`
  }
  // Swatches use the shared light/dark accent palette, not a second palette.
  const swatches=(['orange','green','yellow','blue'] as const).map(color=>`--${color}:${accentHex(color,true)}`).join(';')
  const light=(['orange','green','yellow','blue'] as const).map(color=>`--${color}:${accentHex(color,false)}`).join(';')
  return `<section class="dcard settings-card" style="top:${r.settingsY}px;height:${r.settingsH}px"><style>.settings-card{${swatches}}@media(prefers-color-scheme:light){.settings-card{${light}}}.theme-light .settings-card{${light}}.theme-dark .settings-card{${swatches}}</style>${content}</section>`
}

// The pane's heading: the full avatar and «مسلم» at the right edge, `/muslim` at the left edge, never hidden.
const paneTop = `<div class="pane-top">${avatar(AVATAR_H)}<span>مُسلِم</span></div><div class="pane-command" dir="ltr">${ltr('/muslim')}</div>`

export const paneSvg = (m: PaneModel, hover: PaneAct | null = null): string => {
  const width = m.width, height = cardRects(m.folds, m.settings.state, m.settings.options, quranLayout(m), m.athkarMenu).height
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="dp${m.theme ? ` theme-${m.theme}` : ''}" dir="rtl"><style>${tajawalFontFaceCss()}${paletteCss('.dp', m.color)}${CSS}${ATHKAR_CSS}${m.width <= 380 ? ".reset-label{display:none}" : ""}${SETTINGS_CSS}</style>${paneTop}${prayerCard(m, hover)}${quranCard(m, hover)}${athkarCard(m, hover)}${settingsCard(m, hover)}</div></foreignObject></svg>`
}

export const paneAlt = (m: PaneModel): string =>
  `مسلم، الصلاة${m.prayer.isSet ? `، ${m.prayer.nextName} ${m.prayer.nextTime}، ${m.prayer.until}` : ''}، القرآن${m.quran.isAvailable ? `، ${m.quran.surah}، ${m.quran.elapsed} / ${m.quran.total}` : ''}، ${m.athkar.isAvailable ? `${m.athkar.title} ${m.athkar.fraction}` : 'أذكار'}، الإعدادات`

