# Thikr content

The thikr phrases shown in the work line (`/thikr`): 26 phrases in five groups (starting 4, thinking 8, writing 2, long 4, salawat 5) and three single phrases (call to pray, end of turn, usage limit). The code is the source of truth for what is displayed; this file must stay identical to it (see the rule in CLAUDE.md). Arabic is authored with tashkeel and is never generated or reworded. Each group is played in the order listed, one phrase at a time; the code records no counts or hadith references for them, so only Quran citations are given.

Sources in the code: `plugin/src/features/thikr/phrases.ts`, with the end-of-turn phrase in `plugin/src/shared/thikr/end.ts` (also used verbatim in the pane’s settings example).

## STARTING: opens a turn

3. Quran, Taha 20:25-26

> رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي

### أذكار وجمل إسلامية عامة — General Islamic phrases

1.

> بِسْمِ اللَّهِ

2.

> تَوَكَّلْتُ عَلَى اللَّهِ

4.

> رَبِّ يَسِّرْ وَلَا تُعَسِّرْ

## THINKING: plays through thinking and tools

### أذكار وجمل إسلامية عامة — General Islamic phrases

1.

> سُبْحَانَ اللَّهِ

2.

> الْحَمْدُ لِلَّهِ

3.

> لَا إِلَٰهَ إِلَّا اللَّهُ

4.

> اللَّهُ أَكْبَرُ

5.

> لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ

6.

> سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ

7.

> أَسْتَغْفِرُ اللَّهَ

8.

> اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ

## WRITING: while Claude writes the answer

1. Quran, Taha 20:114

> رَبِّ زِدْنِي عِلْمًا

### أذكار وجمل إسلامية عامة — General Islamic phrases

2.

> اللَّهُمَّ عَلِّمْنَا مَا يَنْفَعُنَا

## LONG: while Claude waits on something long (a long tool run, a subagent, compacting)

1. Quran, Al-Anbiya 21:87

> لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ

3. Quran, Al-Baqarah 2:201

> رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ

### أذكار وجمل إسلامية عامة — General Islamic phrases

2.

> اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنَّا

4.

> يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ

## SALAWAT: salawat mode: one of these for a whole turn, the next one each turn

### أذكار وجمل إسلامية عامة — General Islamic phrases

1.

> اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ

2.

> اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ

3.

> اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ

4.

> اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ عَبْدِكَ وَرَسُولِكَ

5.

> اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَىٰ سَيِّدِنَا مُحَمَّدٍ

## Single phrases

- USAGE_LIMIT: shown when a usage limit is hit. Quran, Al Imran 3:173

> حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ

### أذكار وجمل إسلامية عامة — General Islamic phrases

- CALL_TO_PRAY: opens the thikr turn inside a pray's countdown window, then the pray and the minutes left.

> حَيَّ عَلَى الصَّلَاةِ

- END_OF_TURN: in place of Claude's word at the end of a turn. Help and status tables describe it in English; they do not show the phrase.

> تَمَّ بِحَمْدِ اللَّهِ
