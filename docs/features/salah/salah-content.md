# Salah content

The religious text shown by the salah feature: the athan call, one line per prayer. The code is the source of truth for what is displayed; this file must stay identical to it (see the rule in CLAUDE.md). Arabic is never generated or reworded. City and method names are not listed.

Sources in the code: `plugin/src/shared/pray/line.ts` (`athanText`), with the Friday name in `plugin/src/shared/pray/names.ts` (`JUMUAH`).

## أذكار وجمل إسلامية عامة — General Islamic phrases

"The time of the prayer of X has come", shown when a prayer comes in, with X the Arabic prayer name.

> حان وقت صلاة الفجر

> حان وقت صلاة الظهر

> حان وقت صلاة العصر

> حان وقت صلاة المغرب

> حان وقت صلاة العشاء

On a device Friday the Dhuhr line names Jumu'ah instead (the name is listed in [friday content](../friday/friday-content.md)).

> حان وقت صلاة الجمعة
