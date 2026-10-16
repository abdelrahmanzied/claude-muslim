// Each thikr's width on one line in CSS pixels, at 16px Tajawal: per line of
// its text, the morning wording then the evening one where it differs. The
// desktop band is a picture of fixed height, so the height is worked out from
// these. Measured in a browser with the fonts in fonts.ts; remeasure when the
// text changes.
// '75' and '76-*' include the verse-end markers ((١)): their widths are an
// ESTIMATE (old width, minus ~20px per old ۝ separator, plus ~32px per marker),
// not measured; remeasure when convenient.

export const TEXT_WIDTH: Record<string, { m: readonly number[]; e?: readonly number[] }> = {
  '75': { m: [1658] },
  '76-ikhlas': { m: [150, 513] },
  '76-falaq': { m: [150, 853] },
  '76-nas': { m: [150, 930] },
  '77': { m: [1815], e: [1843] },
  '78': { m: [407], e: [409] },
  '79': { m: [1143] },
  '80': { m: [908], e: [909] },
  '81': { m: [604], e: [608] },
  '82': { m: [983] },
  '83': { m: [372] },
  '84': { m: [1596] },
  '85': { m: [1230] },
  '86': { m: [528] },
  '87': { m: [261] },
  '88': { m: [519] },
  '89': { m: [889], e: [946] },
  '90': { m: [800], e: [800] },
  '91': { m: [127] },
  '92': { m: [468] },
  '94': { m: [425] },
  '95': { m: [328] },
  '96': { m: [146] },
  '97': { m: [253] },
  '98': { m: [208] },
}

// Closing greeting (logic.ts END), measured with CoreText at 16px using
// TAJAWAL_REGULAR from fonts.ts: words plus trailing space = 60.432px with
// tashkeel, 60.336px without. Divide by the 10 visible characters (including
// spaces), not UTF-16 length: Arabic marks have no independent advance.
// The emoji uses the platform fallback, not Tajawal: measured 21px on macOS;
// reserve 1.5em (24px at 16px) for fallback differences across platforms.
// Remeasure when the end message changes.
export const END_TEXT_CHAR = 60.432 / 10
export const END_EMOJI_EM = 1.5
export const HINT_CHAR = 0.602

// After-salah widths: reuse the identical Quran passages above. New duas
// measured with CoreText at 16px using the embedded Tajawal Regular font,
// with the authored tashkeel and punctuation retained.
TEXT_WIDTH['66-istighfar'] = { m: [77] }
TEXT_WIDTH['66-salam'] = { m: [376] }
TEXT_WIDTH['67'] = { m: [938] }
TEXT_WIDTH['68'] = { m: [1354] }
TEXT_WIDTH['69-tasbih'] = { m: [212] }
TEXT_WIDTH['69-tahlil'] = { m: [468] }
TEXT_WIDTH['70-ikhlas'] = TEXT_WIDTH['76-ikhlas']!
TEXT_WIDTH['70-falaq'] = TEXT_WIDTH['76-falaq']!
TEXT_WIDTH['70-nas'] = TEXT_WIDTH['76-nas']!
TEXT_WIDTH['71'] = TEXT_WIDTH['75']!
TEXT_WIDTH['72'] = { m: [552] }
TEXT_WIDTH['73'] = { m: [335] }
