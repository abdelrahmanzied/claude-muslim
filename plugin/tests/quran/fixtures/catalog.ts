// JSON fixture mirrored here because the engine loader accepts code imports only.
export const reciters = JSON.parse(String.raw`{
  "reciters": [
    { "id": 10, "name": "محمد صديق المنشاوي", "moshaf": [
      { "id": 20, "name": "حفص عن عاصم - مرتل", "rewaya_id": 1, "surah_total": 114, "surah_list": "1,2,...,114", "server": "https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/" },
      { "id": 21, "name": "حفص عن عاصم - مجود", "rewaya_id": 1, "surah_total": 114, "server": "https://cdn.mp3quran.net/audio/muhammad-minshawi/r2/" },
      { "id": 22, "name": "ورش", "rewaya_id": 2, "surah_total": 114, "server": "https://cdn.mp3quran.net/other/" },
      { "id": 23, "name": "حفص", "rewaya_id": 1, "surah_total": 113, "server": "https://cdn.mp3quran.net/partial/" }
    ] },
    { "id": 11, "name": "عبد الباسط عبد الصمد", "moshaf": [
      { "id": 24, "name": "حفص عن عاصم", "rewaya_id": 1, "surah_total": 114, "server": "https://cdn.mp3quran.net/basit/" },
      { "id": 25, "name": "invalid server", "rewaya_id": 1, "surah_total": 114, "server": "file:///tmp/" }
    ] }
  ]
}`)
import { filterReciters, type Catalog } from '../../../src/features/quran/catalog.ts'
// Synthetic full catalog for engine tests; authored names used by matching cases.
export const surahs = Array.from({ length: 114 }, (_, i) => ({ id: i + 1, name: ({ 1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 18: 'الكهف', 114: 'الناس' } as Record<number, string>)[i + 1] ?? `Fixture ${i + 1}` }))
export const fixtureCatalog: Catalog = { reciters: filterReciters(reciters), surahs }

