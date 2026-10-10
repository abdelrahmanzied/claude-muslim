# adhan

[adhan-js](https://github.com/batoulapps/adhan-js) v4.4.6 by Batoul Apps, MIT
(see `LICENSE`), copied in because a mod imports only its own files.

Changes from upstream, nothing else:

- Imports name `.ts` files instead of `.js`, and `ValueOf` with `import type`.
- `DateUtils.ts` `dayOfYear`: `months[i]!` for `noUncheckedIndexedAccess`.

To update: copy `src/` of a newer tag over these files and redo the changes.
