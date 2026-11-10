# Friday content

The religious text shown by the Friday feature. The code is the source of truth for what is displayed; this file must stay identical to it (see the rule in CLAUDE.md). Arabic is never generated or reworded.

Sources in the code: `plugin/src/features/friday/logic.ts` (`ALKAHF_TITLE`, `ALKAHF_PLAY`, `ALKAHF_BROWSER`, `alkahfSubtitle`, `alkahfLine`), `plugin/src/shared/pray/names.ts` (`JUMUAH`). Friday's salawat reuse thikr's authored phrases (`plugin/src/shared/thikr/salawat.ts`, `SALAWAT`, re-exported by thikr's `phrases.ts`, five phrases listed in [thikr content](../thikr/thikr-content.md)); Friday adds none.

## The Al-Kahf card

The title on the reminder card (desktop and terminal): Surat al-Kahf (Quran, surah 18).

> سورة الكهف

The subtitle under it (desktop) or after it (terminal): Friday, and the reciter last used, by his short Arabic name as the Quran player's catalog gives it (the catalog's `name`, see the [quran catalog](../quran/quran-catalog.md)). Before the Quran player is ready: only the first part.

> يوم الجمعة · بصوت <reciter>
> يوم الجمعة

The terminal line joins them:

> سورة الكهف · يوم الجمعة · بصوت <reciter>

The desktop pill (button) beside the avatar:

> ▶ استمع

On Windows and Linux, where Claude Code plays no audio:

> ↗ افتح في المتصفح

## The Jumu'ah name

The Arabic name of the Dhuhr slot on a device Friday, wherever a prayer name shows (for example the athan call «حان وقت صلاة الجمعة», listed in [salah content](../salah/salah-content.md)).

> الجمعة

## The Quran card button

The Muslim pane's Quran card on a Friday has a button that picks Surat al-Kahf; its label is the surah's name.

> سورة الكهف
