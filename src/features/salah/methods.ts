// Prayer time calculation methods: each authority's twilight angles and
// minute adjustments. The numbers are each authority's published parameters,
// as listed by adhan-js (MIT, Batoul Apps) and the AlAdhan API's methods list.
// Asr follows the majority (shadow equals the object) for every method. Sunni
// authorities only: a country whose official method is not gets mwl.

export type MethodId =
  | 'mwl'
  | 'egypt'
  | 'ummAlQura'
  | 'karachi'
  | 'isna'
  | 'dubai'
  | 'kuwait'
  | 'qatar'
  | 'singapore'
  | 'jakim'
  | 'kemenag'
  | 'turkey'
  | 'france'
  | 'russia'
  | 'tunisia'
  | 'algeria'
  | 'morocco'
  | 'jordan'
  | 'portugal'

export type Prayer = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

export type Method = {
  name: string
  nameAr: string
  // Degrees of the sun below the horizon at Fajr.
  fajrAngle: number
  // Degrees below the horizon at Isha; absent when Isha is ishaMinutes after Maghrib.
  ishaAngle?: number
  ishaMinutes?: number
  // Isha's minutes after Maghrib in Ramadan, where the authority changes it.
  ramadanIshaMinutes?: number
  // Minutes added to each computed time.
  adjust?: Partial<Record<Prayer, number>>
}

export const METHODS: Readonly<Record<MethodId, Method>> = {
  mwl: { name: 'Muslim World League', nameAr: 'رابطة العالم الإسلامي', fajrAngle: 18, ishaAngle: 17, adjust: { dhuhr: 1 } },
  egypt: { name: 'Egyptian General Authority of Survey', nameAr: 'الهيئة المصرية العامة للمساحة', fajrAngle: 19.5, ishaAngle: 17.5, adjust: { dhuhr: 1 } },
  ummAlQura: { name: 'Umm al-Qura University, Makkah', nameAr: 'تقويم أم القرى', fajrAngle: 18.5, ishaMinutes: 90, ramadanIshaMinutes: 120 },
  karachi: { name: 'University of Islamic Sciences, Karachi', nameAr: 'جامعة العلوم الإسلامية بكراتشي', fajrAngle: 18, ishaAngle: 18, adjust: { dhuhr: 1 } },
  isna: { name: 'Islamic Society of North America', nameAr: 'الجمعية الإسلامية لأمريكا الشمالية', fajrAngle: 15, ishaAngle: 15, adjust: { dhuhr: 1 } },
  dubai: { name: 'Dubai', nameAr: 'دبي', fajrAngle: 18.2, ishaAngle: 18.2, adjust: { sunrise: -3, dhuhr: 3, asr: 3, maghrib: 3 } },
  kuwait: { name: 'Kuwait', nameAr: 'الكويت', fajrAngle: 18, ishaAngle: 17.5 },
  qatar: { name: 'Qatar', nameAr: 'قطر', fajrAngle: 18, ishaMinutes: 90 },
  singapore: { name: 'Majlis Ugama Islam Singapura', nameAr: 'المجلس الإسلامي في سنغافورة', fajrAngle: 20, ishaAngle: 18, adjust: { dhuhr: 1 } },
  jakim: { name: 'Jabatan Kemajuan Islam Malaysia', nameAr: 'إدارة التنمية الإسلامية الماليزية', fajrAngle: 20, ishaAngle: 18 },
  kemenag: { name: 'Kementerian Agama Republik Indonesia', nameAr: 'وزارة الشؤون الدينية الإندونيسية', fajrAngle: 20, ishaAngle: 18 },
  turkey: { name: 'Diyanet İşleri Başkanlığı', nameAr: 'رئاسة الشؤون الدينية التركية', fajrAngle: 18, ishaAngle: 17, adjust: { sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 } },
  france: { name: 'Union des Organisations Islamiques de France', nameAr: 'اتحاد المنظمات الإسلامية في فرنسا', fajrAngle: 12, ishaAngle: 12 },
  russia: { name: 'Spiritual Administration of Muslims of Russia', nameAr: 'الإدارة الدينية لمسلمي روسيا', fajrAngle: 16, ishaAngle: 15 },
  tunisia: { name: 'Tunisia', nameAr: 'تونس', fajrAngle: 18, ishaAngle: 18 },
  algeria: { name: 'Algeria', nameAr: 'الجزائر', fajrAngle: 18, ishaAngle: 17 },
  morocco: { name: 'Morocco', nameAr: 'المغرب', fajrAngle: 19, ishaAngle: 17 },
  jordan: { name: 'Ministry of Awqaf, Jordan', nameAr: 'وزارة الأوقاف الأردنية', fajrAngle: 18, ishaAngle: 18, adjust: { maghrib: 5 } },
  portugal: { name: 'Comunidade Islâmica de Lisboa', nameAr: 'الجماعة الإسلامية في لشبونة', fajrAngle: 18, ishaMinutes: 77, adjust: { maghrib: 3 } },
}

// The method each country's own authority uses; any country not here gets mwl.
export const COUNTRY_METHODS: Readonly<Record<string, MethodId>> = {
  AE: 'dubai',
  AF: 'karachi',
  BD: 'karachi',
  BH: 'ummAlQura',
  BN: 'singapore',
  CA: 'isna',
  DZ: 'algeria',
  EG: 'egypt',
  FR: 'france',
  ID: 'kemenag',
  IN: 'karachi',
  JO: 'jordan',
  KW: 'kuwait',
  MA: 'morocco',
  MY: 'jakim',
  OM: 'ummAlQura',
  PK: 'karachi',
  PT: 'portugal',
  QA: 'qatar',
  RU: 'russia',
  SA: 'ummAlQura',
  SG: 'singapore',
  TN: 'tunisia',
  TR: 'turkey',
  US: 'isna',
}

export const DEFAULT_METHOD: MethodId = 'mwl'

export const methodFor = (country: string): MethodId => COUNTRY_METHODS[country] ?? DEFAULT_METHOD
