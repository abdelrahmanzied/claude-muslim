# Quran recording catalogs

## Problem and scope

Claude Code refuses audio clips larger than 26,214,400 bytes (25 MiB). Playback uses the more conservative `AUDIO_LIMIT_BYTES` of 24 MiB in `segments.ts`: files smaller than that play whole; files at or above it need splitting. Whole-surah MP3s come from [MP3Quran API v3](https://www.mp3quran.net/api/v3). The source catalog is `filterReciters()` applied to `reciters?language=ar`: complete Hafs recordings, keyed by the same `reciter:moshaf` IDs as `reciter.key`.

The shipped numeric `QURAN_QUARTER_BOUNDARIES` map defines hizb-quarter intersections. `timingRead()` matches a recording to one read by exact `folder_url === server`. `timedSegments()` validates ayah timings and plans quarter segments, subdividing oversized quarters at ayah boundaries when necessary. It includes the introduction in the first segment, tolerates missing final ayat and zero-length ayat, and uses `shiftedTimings()` to correct surah 9's one-low numbering when its file duration confirms the shift. No religious text is generated or changed.

Every recording in the earlier 155-recording audit had at least surah 2 above the limit. That audit found 88 recordings splitting correctly, eight with timing defects, and 59 without a timing read. Most defects have since been accommodated by the planner. Timings can also be structurally valid but acoustically wrong: Minshawi surah 9 jumps roughly nine seconds late after ayah 91, and Hudhaifi timings drift by up to 30 seconds. Availability and acoustic cut quality are separate checks.

## Why ship metadata

Users currently discover unsupported surahs only after selecting them and waiting for an error. Checking every recording and surah at runtime would require thousands of remote requests, add delay, and repeat work on each user's machine. Instead, developer tools generate compact metadata for review and distribution with the plugin. Network probes and ffmpeg never run as part of these catalogs on users' machines. The hooks module has no Node APIs; the scripts run separately under Node 24.

This PR builds only the support tool and its offline test. The plugin does not yet import the support catalog. The cuts tool, scheduled workflow, and catalog-driven UI are separate later changes. Existing playback checks remain necessary because remote files can change after generation.

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

The first generated catalog must be populated before this work ships. Its offline validity test intentionally rejects an empty placeholder. No new package or dependency is needed: `scripts/tsconfig.json` uses small Node ambient declarations because this checkout has no `@types/node`; the root tsconfig excludes scripts already.

## Cuts tool and format

`scripts/quran/cuts.ts` is the second developer tool. It reads `QURAN_SUPPORT` and scans only its `split` surahs, using each recording's stored read ID and exact server. It does not change playback. Node 24 and ffmpeg on PATH are developer prerequisites; neither is introduced into the hooks module. The checked-in `reciter-cuts.ts` is deliberately empty until the orchestrator performs the network audit.

Each surah gets a HEAD identity check, ayah timings, and a 128 KiB Range prefix. `cbrStream()` and `timedSegments()` supply the same CBR clock and planned quarter/ayah subdivisions as today's playback. For recomputed CBR files, an additional 8 KiB tail establishes the final complete frame and excludes an ID3v1 footer. Files with a non-CBR prefix retain their planned segments and null cuts with `unresolved: 'non-cbr'`; they require the existing runtime fallback. A failed source/plan scan writes an explicitly unusable `scan-error` entry and returns a nonzero exit code, so outages cannot leave apparently verified old cuts in a refreshed catalog.

For each internal cut the tool downloads approximately ±10 seconds, plus the runtime's three-second lead, four seconds of review-clip context on the right, and 8 KiB for frame synchronization. If the narrow cut is not confident (|shift| above 750 ms, pause below 400 ms, or an earlier confirmed local offset above 750 ms), it downloads one wider ±35-second window. The narrow pass always runs first; there is at most one wide fetch per cut. All audio requests are strict 206 ranges with bounded bodies, expected Content-Range, identity encoding and matching ETag; ignored ranges are rejected before their bodies are consumed. It never fetches a whole MP3. Four surah workers (configurable from 1–16) bound both requests and decoders. Requests have a 15-second timeout, explicit User-Agent, and three retries after the initial attempt with 0.5/1/2-second backoff. A worker holds its slot through retries. ffmpeg has a 30-second timeout and a 3 MiB output cap.

ffmpeg receives complete MP3 frames on stdin and produces mono 16 kHz signed 16-bit little-endian PCM on stdout. `aresample` with `first_pts=0` preserves the window's clock through decoder startup; decoded duration must match the frame clock within 60 ms. Startup and window-edge silence are excluded. The pure `findPauses()` computes RMS energy in 20 ms frames. `cutPauses()` preserves the original detector's intervals (10th-percentile energy +6 dB, capped at 85th-percentile energy −12 dB), then adds nonoverlapping intervals from a lower-percentile detector (3rd percentile +6 dB, capped at the 85th percentile −10 dB). The fallback recovers sparse pauses in windows whose original speech/floor contrast was insufficient. Constant sound, edge silence and pauses shorter than 200 ms remain rejected. Preserving the original intervals avoids moving accurate cuts because of a changed noise-floor estimate.

The narrow pass keeps the original distance/length-weighted chooser: pause midpoints within ±1.5 seconds, then ±3/6/10 seconds, with score `absolute distance − 0.75 × min(pause duration, 2000 ms)`. Confident cuts stay on that inexpensive path.

On escalation, `chooseCut()` uses **local offset alignment**. It scores candidate offsets δ in 40 ms steps against all distinct planned ayah start times within ±35 seconds of the cut and inside the decoded window. Each boundary contributes a triangular distance-to-pause-midpoint score, scaled by pause length (capped at two seconds) and weighted toward the target. A mild absolute-offset penalty of 0.01 discourages unnecessary shifts. The initial search is ±12 seconds around zero. A confirmed previous local offset centres later searches, allowing a slow ramp out to an absolute limit of 32 seconds without making the initial search vulnerable to unrelated distant pauses.

Alignment needs at least two boundaries and matches for 65% of them. The best peak must beat a competitor at least 1.5 seconds away by 0.025 in normalized score. Equal/near-equal peaks or insufficient evidence fall back to the original stepped chooser with stronger long-pause weighting (1.5, cap four seconds). A short near-target narrow cut cannot be displaced by only two boundaries of contrary evidence; three are required. Small changes (≤350 ms) within the same pause retain the original narrow frame. If a wide scan has no usable result, an existing safe narrow cut is retained.

After alignment, snap `target + δ` to a credible pause midpoint within 750 ms, map that midpoint to a real frame boundary, and record the **total** planned-to-chosen `shiftMs`. There are no per-reader exceptions and no Viterbi truth input in the cut tool. The benchmark's truth is used only to score results. Exact ayah alignment remains an estimate; silence detection and local consistency are acoustic evidence, not transcription. All tunables live in `CUT_OPTIONS` in `src/features/quran/cuts.ts`.

The tool scans window headers with the existing `parseFrame()`/`cbrCheckpoint()` helpers and maps the chosen pause back to a real frame boundary. It retains the same worst-case 511-byte (MPEG-1) or 255-byte (MPEG-2/2.5) reservoir context as `SegmentScanner`. Both the exclusive cut frame and the next segment's earlier reservoir start must lie inside the pause, with 60 ms margins. A pause that cannot fit that context is rejected before ranking. The three-second runtime lead is scan context, **not** a three-second playback overlap. Only the small reservoir context overlaps. Cuts that cross neighbours, exceed the maximum shift, or produce an oversized clip force fallback.

`src/features/quran/reciter-cuts.ts` exports `QURAN_CUTS_VERSION = 1`, `QURAN_CUTS_MAP_VERSION` and `QURAN_CUTS: CutsCatalog`. Recording keys and surahs are sorted, each surah occupies one compact line, and there are no timestamps. Each surah stores `sizeBytes`, exact `etag`, `readId`, `server`, `mapVersion`, `planHash`, an `algorithm` fingerprint, planned `segments`, frame points `first`/`last`, and `cuts`. `cuts[i]` is the internal boundary **before segment i + 1**; the first segment needs no internal cut. For example, an individual resolved cut has this shape:

```ts
{"byte":112557,"ms":7008,"shiftMs":10,"pauseMs":1940,"startByte":111789,"startMs":6960}
```

`byte`/`ms` identify the acoustic boundary and the preceding segment's exclusive end; `startByte`/`startMs` identify the next segment's reservoir start. Times retain frame precision; only `shiftMs` (chosen minus planned) is rounded to 10 ms. An unresolved boundary is `null`. Planned ayah labels and start/end times remain available for the UI but must not be mistaken for verified ayah alignment. The pure `cutsPlan(entry, liveSize, liveEtag, currentMapVersion, optionalLiveSource)` returns `Segment[]` with `startByte`, exclusive `endByte` and actual `decodedDurationMs`, retaining the original planned fields for the existing cache contract. It returns null for stale identities, missing ETags, unresolved cuts or invalid/oversized plans. Fallback is per surah, not a mix of raw and acoustic boundaries. The future runtime integration should supply `{ server, readId }` too, validate the exported schema version, and use that returned plan before fetching timings or starting a scanner.

Incremental runs still fetch HEAD, timings and prefix to compute the plan hash. They reuse an existing entry unchanged when size, nonempty ETag, exact server, map version, read ID, the deterministic eight-hex-digit planned-target hash, and the algorithm fingerprint match. The fingerprint incorporates all tunables, so entries from the original nearest-pause algorithm are recomputed automatically. Null acoustic cuts and non-CBR results are reused too; `scan-error` entries are retried. `--force` recomputes, and should be used after tuning the acoustic algorithm. Without a stable ETag no entry is reused or accepted by the runtime helper. Writes use a temporary file and atomic rename; identical content is not rewritten.

`--only` accepts comma-separated moshaf keys, rejects unknown/invalid keys, and scans all split surahs of those recordings. Like the support tool, a partial first run cannot replace the shipped catalog: give `--out` a separate path. Later partial runs merge unselected still-supported entries. A partial catalog is explicitly marked. `--out` adjusts the type import relative to its destination. `--clips <dir>` emits approximately four seconds before and after each chosen boundary as an original MP3 byte slice, bounded by whole frames, with no re-encoding. Files are named `<key>_<surah>_<segment>_<shiftMs>.mp3`. It emits clips for reused cuts too, fetching a small review range when needed. These filenames contain the literal key's colon; use a filesystem that supports that character.

Run from the repository root with network access:

```sh
node --experimental-strip-types scripts/quran/cuts.ts --only 112:112 --out /tmp/quran-cuts.ts --clips /tmp/quran-cut-clips
node --experimental-strip-types scripts/quran/cuts.ts
# Re-audit after changing acoustic tunables:
node --experimental-strip-types scripts/quran/cuts.ts --force --concurrency 4
npx tsc -p scripts
claude plugin test .
```

Before requests begin the tool prints an audio-download estimate. The current support file has 1,751 split surahs and at least 11,106 internal quarter cuts. At 128 kbps the narrow pass, prefix and tail cost approximately **4.78 GiB**, plus **12.83 GiB × the fraction of cuts escalated**. Scenarios are 4.78/7.99/11.19/17.61 GiB for 0/25/50/100% escalation. At 320 kbps with every cut widened, the estimate is 43.42 GiB. The Minshawi-only narrow pass remains about 57.4 MiB. Extra ayah subdivisions, retries, timing JSON and review clips add traffic; reuse avoids audio windows and tail probes. The benchmark's 29.4% escalation rate would imply **8.55 GiB** for the full catalog at 128 kbps, but the 14-read drift-focused sample is not evidence of the full catalog's actual rate. The run prints the measured escalation count/rate as well as received bytes, elapsed time, unresolved counts, |shift| buckets, largest shifts and drifted-recording diagnostics.

### Offline drift benchmark

`scripts/quran/cuts-bench.ts` takes a required `--data <dir>` containing `audio/<readId>_<surah>.mp3`, raw arrays in `timing/<readId>_<surah>.json`, and `viterbi.json`. It opens audio read-only and never fetches remote data. It reads the same prefix and windows, uses `timedSegments()` and the CBR clock, and runs the same `scanCut()` in the developer-only `scripts/quran/cuts-audio.ts` as the catalog tool. That shared path covers decoding, adaptive pause detection, confidence/escalation, local alignment, fallback and reservoir-safe frame mapping. Shifted surah 9 numbering remains the planner's responsibility; reference entries are matched by `round(ts × 1000)` to planned timing timestamps, never zipped to ayah or segment indices. Truth is planned start plus `sh × 1000`.

```sh
node --experimental-strip-types scripts/quran/cuts-bench.ts --data "$QURAN_DRIFT_DATA"
# Optional pause cache and numeric report, both outside the data directory:
node --experimental-strip-types scripts/quran/cuts-bench.ts --data "$QURAN_DRIFT_DATA" --cache /tmp/quran-cuts-bench-cache --out /tmp/quran-cuts-bench.json
# Focused diagnostic:
node --experimental-strip-types scripts/quran/cuts-bench.ts --data "$QURAN_DRIFT_DATA" --only 112_9
```

Default mode prints the frozen **before** results first, then **after**, with aggregate/per-read/per-file accuracy within 0.3 and 0.75 seconds, pause coverage, wide-window rate, the worst 15 cuts and the two Minshawi surah 9 cases. `--mode before|after|both` selects a pass. `--only` accepts fixture keys such as `112_9`. `--cache` stores detected pauses with a detector fingerprint and file size/mtime; frame windows are still read locally. `--out` writes numeric JSON for comparison. Output paths under the data directory are rejected. Null/missing reference shifts are explicitly unscored; unresolved cuts still count as misses when truth is known. “Inside a pause” means a resolved frame cut and reservoir start lie in a detected pause, not a separate transcription-based pause label.

The local 28-file benchmark (14 reads × surahs 2 and 9) has 378 cuts, 360 with non-null matched truth. Results, percentages **before → after**:

| Read | Within 0.3 s | Within 0.75 s | Resolved inside pause |
| --- | --- | --- | --- |
| 9 | 74.1 → 74.1% | 100.0 → 100.0% | 100.0 → 100.0% |
| 13 | 70.4 → 100.0% | 70.4 → 100.0% | 70.4 → 100.0% |
| 30 | 100.0 → 100.0% | 100.0 → 100.0% | 100.0 → 100.0% |
| 31 | 80.0 → 100.0% | 80.0 → 100.0% | 74.1 → 100.0% |
| 39 | 85.2 → 100.0% | 85.2 → 100.0% | 85.2 → 100.0% |
| 51 | 4.3 → 4.3% | 47.8 → 52.2% | 100.0 → 100.0% |
| 54 | 81.8 → 100.0% | 81.8 → 100.0% | 81.5 → 100.0% |
| 72 | 66.7 → 95.8% | 66.7 → 95.8% | 66.7 → 100.0% |
| 74 | 22.2 → 81.5% | 22.2 → 81.5% | 100.0 → 100.0% |
| 92 | 77.8 → 100.0% | 77.8 → 100.0% | 81.5 → 100.0% |
| 112 | 80.0 → 92.0% | 88.0 → 100.0% | 100.0 → 100.0% |
| 118 | 72.0 → 72.0% | 96.0 → 96.0% | 100.0 → 100.0% |
| 123 | 74.1 → 100.0% | 74.1 → 100.0% | 77.8 → 100.0% |
| 299 | 70.4 → 96.3% | 70.4 → 96.3% | 74.1 → 100.0% |
| **Overall** | **68.9 → 87.5%** | **75.8 → 94.7%** | **86.5 → 100.0%** |

Wide-window rate changed from 68/378 (18.0%, originally only unresolved cuts) to **111/378 (29.4%)**. Minshawi `112_9` segment 7 error changed from **14,663 ms to 9 ms**, and segment 8 from **10,271 ms to 57 ms**. There were **zero individual-cut regressions** at either accuracy threshold. The remaining 19 misses at 0.75 seconds are visible in the per-file and worst-cut reports; read 51 in particular still needs review. These are results on this local reference dataset, not a full-catalog audit or proof of native playback.

Offline unit tests cover PCM noise floors, the −9-second step across four boundaries despite a +2-second waqf, competing peaks and too-few-boundary fallback, accurate boundaries, a carried offset for a slow ramp, stale/valid runtime plans, synthetic MP3 frame/reservoir mapping and catalog validity. Unit tests require neither ffmpeg nor network. The local benchmark does require ffmpeg. Listen to fresh Minshawi clips and inspect unresolved/large shifts before wiring playback.


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

## Later: scheduled Action

A separate PR will add a scheduled GitHub Action, provisionally weekly on a standard Linux runner with manual dispatch. It will run support and then cuts, validate the files, and open or update one PR only when generated content changes. Use label `quran-catalog` and the fixed title `Update Quran recording catalogs`; a human reviews source failures, availability changes and cut results, then merges. The workflow never auto-merges. No schedule or workflow is installed here.

[GitHub Free includes 2,000 Actions minutes per month for private repositories](https://docs.github.com/en/billing/concepts/product-billing/github-actions), shared at the account level rather than reserved for this job. Measure the heavier cuts run before finalizing the schedule, and retain deterministic source-aware cut data to avoid repeated decoding of unchanged recordings.

## Later: plugin behavior

For the selected recording, hide unavailable surahs from the surah dropdown and show a dim note such as «٢٢ سورة غير متاحة لهذا القارئ». Whole-surah playback stays whole; supported large surahs use verified cuts when the later integration is ready. Recording selection remains available so a user can choose another reader. Behavior for stale sources, saved unavailable selections, playback auto-advance, and recordings absent from the shipped catalog needs to be decided in the integration PR. The current plugin behavior is unchanged.

## Known source issues and review boundaries

- Read 87, surah 27 returns no timing rows and should classify as `timing-error` when the file needs splitting.
- Read 232, surah 14 contains about 42 minutes of other audio before the surah; its first segment should classify as `clip-too-big`. The tool does not silently discard that introduction.
- The earlier audit found 59 recordings with no matching timing read. Their small surahs remain playable; only large surahs become `no-timing`.
- Minshawi `112:112`, surah 9 should remain playable after the existing numbering correction. Acoustic timing drift still belongs to the later cuts audit.
- HEAD failures may be transient, and prefix duration inference cannot certify VBR audio or acoustic correctness. Human review must distinguish source outages, changed data, structural timing defects and silence alignment. The generated support file is availability metadata, not proof of audible playback or verified cuts.
