# Athkar content

The religious text shown by the athkar feature: 25 morning and evening athkar, 11 athkar after salah, and the fixed titles, closing greeting and done rows, each with its count and source. The code is the source of truth for what is displayed; this file must stay identical to it (see the rule in CLAUDE.md). Arabic is authored with tashkeel and is never generated or reworded. Hadith references are the ones listed on sunnah.com for each Hisn al-Muslim number.

Sources in the code: `src/features/athkar/data.ts`, `src/features/athkar/after-salah.ts`, `src/features/athkar/logic.ts`.

## أذكار الصباح والمساء — Morning and evening athkar

Hisn al-Muslim chapter 27 (`src/features/athkar/data.ts`, `ATHKAR`). 25 items.

### 1. 75

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 75](https://sunnah.com/hisn:75)
- Reference: Al-Hakim 1/562; Al-Albani, Sahihut-Targhib 1/273
- Quran: آية الكرسي · البقرة ٢٥٥

> اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ (٢٥٥)

### 2. 76-ikhlas

- Count: 3 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 76](https://sunnah.com/hisn:76)
- Reference: Al-Ikhlas 112:1-4, Al-Falaq 113:1-5, An-Nas 114:1-6; Abu Dawud 4/322, At-Tirmidhi 5/567; Sahih At-Tirmidhi 3/182
- Quran: سورة الإخلاص

> بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ  
> قُلْ هُوَ اللَّهُ أَحَدٌ (١) اللَّهُ الصَّمَدُ (٢) لَمْ يَلِدْ وَلَمْ يُولَدْ (٣) وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ (٤)

### 3. 76-falaq

- Count: 3 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 76](https://sunnah.com/hisn:76)
- Reference: Al-Ikhlas 112:1-4, Al-Falaq 113:1-5, An-Nas 114:1-6; Abu Dawud 4/322, At-Tirmidhi 5/567; Sahih At-Tirmidhi 3/182
- Quran: سورة الفلق

> بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ  
> قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ (١) مِنْ شَرِّ مَا خَلَقَ (٢) وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ (٣) وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ (٤) وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ (٥)

### 4. 76-nas

- Count: 3 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 76](https://sunnah.com/hisn:76)
- Reference: Al-Ikhlas 112:1-4, Al-Falaq 113:1-5, An-Nas 114:1-6; Abu Dawud 4/322, At-Tirmidhi 5/567; Sahih At-Tirmidhi 3/182
- Quran: سورة الناس

> بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ  
> قُلْ أَعُوذُ بِرَبِّ النَّاسِ (١) مَلِكِ النَّاسِ (٢) إِلَهِ النَّاسِ (٣) مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ (٤) الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ (٥) مِنَ الْجِنَّةِ وَالنَّاسِ (٦)

### 5. 77

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 77](https://sunnah.com/hisn:77)
- Reference: Muslim 4/2088

الصباح:

> أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ

المساء:

> أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ

### 6. 78

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 78](https://sunnah.com/hisn:78)
- Reference: Sahih At-Tirmidhi 3/142

الصباح:

> اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ

المساء:

> اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ

### 7. 79

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 79](https://sunnah.com/hisn:79)
- Reference: Al-Bukhari 7/150

> اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ

### 8. 80

- Count: 4 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 80](https://sunnah.com/hisn:80)
- Reference: Abu Dawud 4/317; Al-Bukhari, Al-Adab Al-Mufrad; An-Nasa'i, 'Amalul-Yawm wal-Laylah; Ibn As-Sunni

الصباح:

> اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ

المساء:

> اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ

### 9. 81

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 81](https://sunnah.com/hisn:81)
- Reference: Abu Dawud 4/318; An-Nasa'i, 'Amalul-Yawm wal-Laylah no. 7; Ibn As-Sunni no. 41; Ibn Hibban no. 2361

الصباح:

> اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ

المساء:

> اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ

### 10. 82

- Count: 3 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 82](https://sunnah.com/hisn:82)
- Reference: Abu Dawud 4/324, Ahmad 5/42; An-Nasa'i, 'Amalul-Yawm wal-Laylah no. 22; Ibn As-Sunni no. 69; Al-Adab Al-Mufrad

> اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ

### 11. 83

- Count: 7 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 83](https://sunnah.com/hisn:83)
- Reference: Ibn As-Sunni no. 71, Abu Dawud 4/321

> حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ

### 12. 84

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 84](https://sunnah.com/hisn:84)
- Reference: Sahih Ibn Majah 2/332, Abu Dawud

> اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي

### 13. 85

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 85](https://sunnah.com/hisn:85)
- Reference: Sahih At-Tirmidhi 3/142, Abu Dawud

> اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ

### 14. 86

- Count: 3 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 86](https://sunnah.com/hisn:86)
- Reference: Abu Dawud 4/323, At-Tirmidhi 5/465, Ibn Majah 2/332, Ahmad

> بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ

### 15. 87

- Count: 3 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 87](https://sunnah.com/hisn:87)
- Reference: Ahmad 4/337; An-Nasa'i, 'Amalul-Yawm wal-Laylah p. 4; Ibn As-Sunni no. 68; At-Tirmidhi 5/465

> رَضِيتُ بِاللَّهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا

### 16. 88

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 88](https://sunnah.com/hisn:88)
- Reference: Al-Hakim 1/545; Al-Albani, Sahihut-Targhib 1/273

> يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ

### 17. 89

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 89](https://sunnah.com/hisn:89)
- Reference: Abu Dawud 4/322; Zad al-Ma'ad 2/273

الصباح:

> أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ فَتْحَهُ وَنَصْرَهُ وَنُورَهُ وَبَرَكَتَهُ وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ

المساء:

> أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ فَتْحَهَا وَنَصْرَهَا وَنُورَهَا وَبَرَكَتَهَا وَهُدَاهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا

### 18. 90

- Count: once
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 90](https://sunnah.com/hisn:90)
- Reference: Ahmad 3/406-7, 5/123; An-Nasa'i, 'Amalul-Yawm wal-Laylah no. 34; At-Tirmidhi 4/209

الصباح:

> أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ وَعَلَى كَلِمَةِ الْإِخْلَاصِ وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ

المساء:

> أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ وَعَلَى كَلِمَةِ الْإِخْلَاصِ وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ

### 19. 91

- Count: 100 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 91](https://sunnah.com/hisn:91)
- Reference: Muslim 4/2071

> سُبْحَانَ اللَّهِ وَبِحَمْدِهِ

### 20. 92

- Count: 100 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 92](https://sunnah.com/hisn:92)
- Reference: An-Nasa'i, 'Amalul-Yawm wal-Laylah no. 24; Al-Albani, Sahihut-Targhib 1/272

> لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ

### 21. 94

- Count: 3 times
- When: Morning only
- Hisn al-Muslim: [Hisn al-Muslim 94](https://sunnah.com/hisn:94)
- Reference: Muslim 4/2090

> سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ

### 22. 95

- Count: once
- When: Morning only
- Hisn al-Muslim: [Hisn al-Muslim 95](https://sunnah.com/hisn:95)
- Reference: Ibn As-Sunni no. 54, Ibn Majah no. 925

> اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا

### 23. 96

- Count: 100 times
- When: Morning only
- Hisn al-Muslim: [Hisn al-Muslim 96](https://sunnah.com/hisn:96)
- Reference: Al-Bukhari, cf. Al-Asqalani, Fathul-Bari 11/101, Muslim 4/2075
- Note: the book says 100 times during the day, so it is in the morning only.

> أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ

### 24. 97

- Count: 3 times
- When: Evening only
- Hisn al-Muslim: [Hisn al-Muslim 97](https://sunnah.com/hisn:97)
- Reference: Ahmad 2/290; An-Nasa'i, 'Amalul-Yawm wal-Laylah no. 590; At-Tirmidhi 3/187; Ibn As-Sunni no. 68

> أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ

### 25. 98

- Count: 10 times
- When: Morning and evening
- Hisn al-Muslim: [Hisn al-Muslim 98](https://sunnah.com/hisn:98)
- Reference: At-Tabarani; Majma' Az-Zawa'id 10/120; Al-Albani, Sahihut-Targhib 1/273

> اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ

## أذكار بعد الصلاة — Athkar after salah

Hisn al-Muslim chapter 25 (`src/features/athkar/after-salah.ts`, `AFTER_SALAH`). 11 items. The order follows Sheikh Ibn Baz's fatwa, [binbaz.org.sa/fatwas/9879](https://binbaz.org.sa/fatwas/9879); the text stays from Hisn al-Muslim chapter 25. Ayat al-Kursi and the three Quls reuse the text of the morning and evening athkar above.

### 1. 66-istighfar

- Count: 3 times after every prayer
- Hisn al-Muslim: [Hisn al-Muslim 66](https://sunnah.com/hisn:66)
- Reference: Muslim 1/414

> أَسْتَغْفِرُ اللَّهَ

### 2. 66-salam

- Count: once after every prayer
- Hisn al-Muslim: [Hisn al-Muslim 66](https://sunnah.com/hisn:66)
- Reference: Muslim 1/414

> اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ

### 3. 67

- Count: once after every prayer
- Hisn al-Muslim: [Hisn al-Muslim 67](https://sunnah.com/hisn:67)
- Reference: Al-Bukhari 1/255, Muslim 1/414

> لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ

### 4. 68

- Count: once after every prayer
- Hisn al-Muslim: [Hisn al-Muslim 68](https://sunnah.com/hisn:68)
- Reference: Muslim 1/415

> لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَهَ إِلَّا اللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ

### 5. 72

- Count: 10 times, only after Fajr and Maghrib
- Hisn al-Muslim: [Hisn al-Muslim 72](https://sunnah.com/hisn:72)
- Reference: At-Tirmidhi 5/515, Ahmad 4/227; Zad al-Ma'ad 1/300

> لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، يُحْيِي وَيُمِيتُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ

### 6. 69-tasbih

- Count: 33 times after every prayer
- Hisn al-Muslim: [Hisn al-Muslim 69](https://sunnah.com/hisn:69)
- Reference: Muslim 1/418

> سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ

### 7. 69-tahlil

- Count: once after every prayer
- Hisn al-Muslim: [Hisn al-Muslim 69](https://sunnah.com/hisn:69)
- Reference: Muslim 1/418

> لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ

### 8. 71

- Count: once after every prayer
- Hisn al-Muslim: [Hisn al-Muslim 71](https://sunnah.com/hisn:71)
- Reference: An-Nasa'i, 'Amalul-Yawm wal-Laylah no. 100; Ibn As-Sunni no. 121; Al-Albani, Sahihul-Jami' 5/339, As-Sahihah 2/697 (no. 972)
- Quran: آية الكرسي · البقرة ٢٥٥

> اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ (٢٥٥)

### 9. 70-ikhlas

- Count: once after Dhuhr, Asr, Isha; 3 times after Fajr, 3 times after Maghrib
- Hisn al-Muslim: [Hisn al-Muslim 70](https://sunnah.com/hisn:70)
- Reference: Abu Dawud 2/86, An-Nasa'i 3/68; Al-Albani, Sahih At-Tirmidhi 2/8
- Quran: سورة الإخلاص

> بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ  
> قُلْ هُوَ اللَّهُ أَحَدٌ (١) اللَّهُ الصَّمَدُ (٢) لَمْ يَلِدْ وَلَمْ يُولَدْ (٣) وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ (٤)

### 10. 70-falaq

- Count: once after Dhuhr, Asr, Isha; 3 times after Fajr, 3 times after Maghrib
- Hisn al-Muslim: [Hisn al-Muslim 70](https://sunnah.com/hisn:70)
- Reference: Abu Dawud 2/86, An-Nasa'i 3/68; Al-Albani, Sahih At-Tirmidhi 2/8
- Quran: سورة الفلق

> بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ  
> قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ (١) مِنْ شَرِّ مَا خَلَقَ (٢) وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ (٣) وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ (٤) وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ (٥)

### 11. 70-nas

- Count: once after Dhuhr, Asr, Isha; 3 times after Fajr, 3 times after Maghrib
- Hisn al-Muslim: [Hisn al-Muslim 70](https://sunnah.com/hisn:70)
- Reference: Abu Dawud 2/86, An-Nasa'i 3/68; Al-Albani, Sahih At-Tirmidhi 2/8
- Quran: سورة الناس

> بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ  
> قُلْ أَعُوذُ بِرَبِّ النَّاسِ (١) مَلِكِ النَّاسِ (٢) إِلَهِ النَّاسِ (٣) مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ (٤) الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ (٥) مِنَ الْجِنَّةِ وَالنَّاسِ (٦)

## نصوص ثابتة — Fixed text

Other Arabic religious text shown by the athkar reader (UI labels are not listed).

### Athkar titles (`TITLE`, `src/features/athkar/logic.ts`)

- afterSalah:

> أَذْكَارُ بَعْدَ الصَّلَاةِ

- morning:

> أَذْكَارُ الصَّبَاحِ

- evening:

> أَذْكَارُ الْمَسَاءِ

### Closing greeting (`END`, `src/features/athkar/logic.ts`)

A short du’a shown as a closing greeting to the reader after morning, evening and after-salah readings, not one of the athkar. No source citation is needed. The words are followed by one space and 🤲; terminal display strips tashkeel through the shared Arabic path and retains the emoji.

> تَقَبَّلَ اللَّهُ 🤲

### Done row (`END_NOTE`, `src/features/athkar/logic.ts`)

- afterSalah:

> أَتْمَمْتَ وِرْدَكَ ✓

- morning:

> أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الْمَسَاءُ

- evening:

> أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الصَّبَاحُ
