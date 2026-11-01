# Friday content

The religious text shown by the Friday feature. The code is the source of truth for what is displayed; this file must stay identical to it (see the rule in CLAUDE.md). Arabic is never generated or reworded.

Sources in the code: `plugin/src/features/friday/logic.ts` (`KAHF_TITLE`), `plugin/src/shared/pray/names.ts` (`JUMUAH`). Friday's salawat reuse thikr's authored phrases (`plugin/src/features/thikr/phrases.ts`, `SALAWAT`, five phrases listed in [thikr content](../thikr/thikr-content.md)); Friday adds none.

## The Al-Kahf card

The title on the reminder card (desktop and terminal): Friday, Surat al-Kahf (Quran, surah 18).

> الجمعة · سورة الكهف

## The Jumu'ah name

The Arabic name of the Dhuhr slot on a device Friday, wherever a prayer name shows (for example the athan call «حان وقت صلاة الجمعة», listed in [salah content](../salah/salah-content.md)).

> الجمعة

## The Quran card button

The Muslim pane's Quran card on a Friday has a button that picks Surat al-Kahf; its label is the surah's name.

> سورة الكهف
