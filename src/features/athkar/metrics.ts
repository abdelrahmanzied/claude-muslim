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
  '97': { m: [253] },
  '98': { m: [208] },
}
