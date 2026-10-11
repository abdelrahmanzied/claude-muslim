// The thikr line's phrases, each group played in this order.
// STARTING opens a turn; THINKING plays through thinking and tools; WRITING
// while Claude writes the answer; LONG while Claude waits on something long
// (a long tool run, a subagent, compacting). Original Arabic with tashkeel;
// display may strip the marks, never the words.

export const STARTING = [
  'بِسْمِ اللَّهِ',
  'تَوَكَّلْتُ عَلَى اللَّهِ',
  'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
  'رَبِّ يَسِّرْ وَلَا تُعَسِّرْ',
]

export const THINKING = [
  'سُبْحَانَ اللَّهِ',
  'الْحَمْدُ لِلَّهِ',
  'لَا إِلَٰهَ إِلَّا اللَّهُ',
  'اللَّهُ أَكْبَرُ',
  'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ',
  'أَسْتَغْفِرُ اللَّهَ',
  'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
]

export const WRITING = [
  'رَبِّ زِدْنِي عِلْمًا',
  'اللَّهُمَّ عَلِّمْنَا مَا يَنْفَعُنَا',
]

export const LONG = [
  'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
  'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنَّا',
  'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
  'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
]

// Salawat mode: one of these for a whole turn, the next one each turn.
export const SALAWAT = [
  'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
  'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ',
  'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ',
  'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ عَبْدِكَ وَرَسُولِكَ',
  'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَىٰ سَيِّدِنَا مُحَمَّدٍ',
]

// Opens the thikr turn inside a pray's reminder window, before the usual
// phrases: the call to pray, then the pray and the minutes left.
export const CALL_TO_PRAY = 'حَيَّ عَلَى الصَّلَاةِ'

export const END_OF_TURN = 'تَمَّ بِحَمْدِ اللَّهِ'

export const USAGE_LIMIT = 'حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ'
