# Salah content

The religious text shown by the salah feature: the athan call, one line per prayer. The code is the source of truth for what is displayed; this file must stay identical to it (see the rule in CLAUDE.md). Arabic is never generated or reworded. City and method names are not listed.

Sources in the code: `plugin/src/shared/pray/line.ts` (`athanText`), with the Friday name in `plugin/src/shared/pray/names.ts` (`JUMUAH`) and Jumu'ah's verse in `plugin/src/shared/friday/jumuah-ayah.ts` (`JUMUAH_AYAH`, `JUMUAH_REF`, `ayahInBrackets`).

## أذكار وجمل إسلامية عامة — General Islamic phrases

"The time of the prayer of X has come", shown when a prayer comes in, with X the Arabic prayer name.

> حان وقت صلاة الفجر

> حان وقت صلاة الظهر

> حان وقت صلاة العصر

> حان وقت صلاة المغرب

> حان وقت صلاة العشاء

On a device Friday the Dhuhr line names Jumu'ah instead (the name is listed in [friday content](../friday/friday-content.md)).

> حان وقت صلاة الجمعة

## آية الجمعة — Jumu'ah's verse

Shown on the athan card (desktop) and after the athan line (terminal) for Dhuhr on a device Friday only, never for another prayer or day: Surat al-Jumu'ah, verse 9 (one verse, 22 words). It is authored data, taken letter for letter, with its tashkeel and stop sign, from the Tanzil Quran text, Simple edition (fetched from api.alquran.cloud, `quran-simple`, 62:9, and compared with the `quran-uthmani` edition: the same words, only the Uthmani spelling differs). The card draws it inside the ornate brackets ﴿ ﴾ (U+FD3F opens at the right, U+FD3E closes at the left). The desktop `tashkeel` setting may strip the marks, never change a word; on a terminal the tashkeel is always removed.

> يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا نُودِيَ لِلصَّلَاةِ مِنْ يَوْمِ الْجُمُعَةِ فَاسْعَوْا إِلَىٰ ذِكْرِ اللَّهِ وَذَرُوا الْبَيْعَ ۚ ذَٰلِكُمْ خَيْرٌ لَكُمْ إِنْ كُنْتُمْ تَعْلَمُونَ

The reference under or after it, with the Arabic-Indic digit:

> سورة الجمعة · الآية ٩
