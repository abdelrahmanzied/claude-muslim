# Quran recording catalogs

## Problem and scope

Claude Code refuses audio clips larger than 26,214,400 bytes (25 MiB). Playback uses the more conservative `AUDIO_LIMIT_BYTES` of 24 MiB in `segments.ts`: files smaller than that play whole; files at or above it need splitting. Whole-surah MP3s come from [MP3Quran API v3](https://www.mp3quran.net/api/v3). The source catalog is `filterReciters()` applied to `reciters?language=ar`: complete Hafs recordings, keyed by the same `reciter:moshaf` IDs as `reciter.key`.

The shipped numeric `QURAN_QUARTER_BOUNDARIES` map defines hizb-quarter intersections. `timingRead()` matches a recording to one read by exact `folder_url === server`. `timedSegments()` validates ayah timings and plans quarter segments, subdividing oversized quarters at ayah boundaries when necessary. It includes the introduction in the first segment, tolerates missing final ayat and zero-length ayat, and uses `shiftedTimings()` to correct surah 9's one-low numbering when its file duration confirms the shift. No religious text is generated or changed.

Every recording in the earlier 155-recording audit had at least surah 2 above the limit. That audit found 88 recordings splitting correctly, eight with timing defects, and 59 without a timing read. Most defects have since been accommodated by the planner. For v1, large surahs are split into hizb quarters at the MP3Quran ayah timings, mapped to MP3 frame boundaries. Timing drift can put a quarter edge mid-word for some reciters. Measured examples: Minshawi surah 9 is about 9 s late after ayah ~91; Hudhaifi drifts up to +30 s in surah 2 and +8.5 s in surah 9. This is accepted for v1. The next quarter continues from the same source byte boundary, with the small preceding MP3 reservoir context retained, so nothing is lost. Availability metadata does not certify audible boundary alignment.

## Why ship metadata

Without shipped availability metadata, users would discover unsupported surahs only after selecting them and waiting for an error. Checking every recording and surah at runtime would require thousands of remote requests, add delay, and repeat work on each user's machine. Instead, the support tool generates compact metadata for review and distribution with the plugin. Catalog-generation probes never run on users' machines. The hooks module has no Node APIs; the scripts run separately under Node 24.

The plugin imports the shipped support catalog to filter unavailable surahs. The support tool and its offline tests remain the source of availability metadata. Existing playback checks remain necessary because remote files can change after generation.

## Support tool and format

`scripts/quran/support.ts` fetches recordings and timing reads, then performs HEAD requests for every recording × all 114 surahs. Six workers bound all requests. Each request has a 15-second timeout, an explicit User-Agent, and an initial attempt plus three retries with 0.5/1/2-second backoff. Invalid or missing content-length is retried as a failed HEAD.

For a large file with a matching read, it fetches `ayat_timing?surah=S&read=R` and a Range prefix of at most 128 KiB. It rejects an ignored or inconsistent Range before consuming the body and bounds the body length. `cbrStream()` supplies the bitrate and audio start; duration is rounded from `(size - audioStart) * 8000 / bitrate`. A non-CBR prefix or failed prefix leaves duration unknown, matching playback's optional-duration path; the run reports unknown durations and failed requests. This tool never downloads a full MP3 or decodes audio.

`src/features/quran/support.ts` is pure classification and data types. It delegates timing correction and the conservative size/time estimate to `timedSegments()`, including its existing `CLIP_ERROR`, rather than duplicating playback logic.

The generated `src/features/quran/reciter-support.ts` exports `QURAN_SUPPORT_VERSION = 1` and `QURAN_SUPPORT: Readonly<Record<string, RecordingSupport>>`. For example, the format is:

```ts
"112:112": {
  name: "<name copied from the API>",
  server: "<exact recording server>",
  timingReadId: 112,
  split: { 2: 50000000 },
  unavailable: { 3: "timing-error" }
}
```

This is a schema illustration, not an audit result. `split` stores the full source size for each playable large surah, not clip offsets. `unavailable` stores one reason per unplayable surah. All other surahs from 1 through 114 are implicitly playable whole. Reasons are:

| Reason | Meaning |
| --- | --- |
| `no-timing` | The file needs splitting but its recording has no unique exact timing read. |
| `timing-error` | Timing metadata is missing, cannot be fetched, or fails the existing planner. |
| `clip-too-big` | The existing planner raises `CLIP_ERROR` because a segment cannot fit its conservative time/size estimate. |
| `unreachable` | HEAD still fails or has no usable size after retries. |

Output has sorted recording and surah keys, one compact line per recording, and no dates or timestamps. Identical API results generate identical bytes. Whole files are implicit to keep the file small. A complete run replaces the catalog atomically only after scanning finishes; source-catalog failures abort without overwriting it. A partial run merges checked recordings into an existing output. It cannot replace the shipped file on a partial first run; use a separate `--out` path. Changes in availability are printed per recording, together with totals, reason counts, audit cross-checks, elapsed time and request-attempt counts. Automatic HTTP redirects are handled by fetch and are not separate entries in that count.

The shipped catalog is populated. Its offline validity test rejects an empty placeholder. No new package or dependency is needed: `scripts/tsconfig.json` uses small Node ambient declarations because this checkout has no `@types/node`; the root tsconfig excludes scripts already.

## Local runs

Run from the repository root with Node 24 and network access:

```sh
node --experimental-strip-types scripts/quran/support.ts
node --experimental-strip-types scripts/quran/support.ts --only 112:112 --out /tmp/quran-support.ts
npx tsc -p scripts
npx tsc -p .
claude plugin validate .
claude plugin test .
```

`--only` accepts comma-separated moshaf keys and still checks all 114 surahs for each selected recording. `--out` accepts an alternate generated TypeScript path, with a relative type import adjusted for that location. Review the printed availability changes and source failures before replacing shipped metadata. A full run is required for the first catalog. No live remote audit belongs in normal CI; CI checks the shipped file offline (keys, surah bounds, reason union, size bounds, disjoint split/unavailable maps, and nonempty data).

## Automatic support refresh

Automatically refreshing the support catalog is tracked in [issue #13](https://github.com/abdelrahmanzied/claude-muslim/issues/13). No schedule or workflow is installed here; remote files can change while the shipped metadata stays unchanged.

## Plugin behavior

For the selected recording, unavailable surahs are hidden from the dropdown with one dim unavailable-count note. Whole-surah playback stays whole; supported large surahs use the MP3Quran timing boundaries accepted for v1. Recording selection remains available so a user can choose another reader. Saved unavailable selections are repaired, and navigation and auto-advance skip unavailable surahs without wrapping. Recordings absent from the shipped catalog retain runtime checks and all 114 choices. See [quran.md](quran.md#recording-availability) for the behavior and staleness limits.

## Known source issues and review boundaries

- Read 87, surah 27 returns no timing rows and should classify as `timing-error` when the file needs splitting.
- Read 232, surah 14 contains about 42 minutes of other audio before the surah; its first segment should classify as `clip-too-big`. The tool does not silently discard that introduction.
- The earlier audit found 59 recordings with no matching timing read. Their small surahs remain playable; only large surahs become `no-timing`.
- Minshawi `112:112`, surah 9 should remain playable after the existing numbering correction. Its measured timing drift is accepted for v1 as described above.
- HEAD failures may be transient, and prefix duration inference cannot certify VBR audio or acoustic correctness. Human review must distinguish source outages, changed data, structural timing defects and acoustic timing drift. The generated support file is availability metadata, not proof of audible playback or mid-word-free quarter boundaries.
