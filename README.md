# claude-muslim

A Claude Code mod for Muslim developers.

> Early development. Features coming soon.

## Install

In a Claude Code terminal session:

```
/plugin install muslim --marketplace abdelrahmanzied/claude-muslim
```

Answer `y` to add the marketplace, then pick a scope.

## Development

Run Claude Code with the mod loaded from this folder (hot-reloads on save):

```bash
claude --plugin-dir .
```

Check, test and type-check:

```bash
claude plugin validate .
claude plugin test .
npx tsc -p .
```

`.claude-plugin/types/` is written by Claude Code when it loads the mod; `tsc` needs it present (load the mod once first).

## Project layout

```
.claude-plugin/
  plugin.json        mod manifest (name: muslim)
  marketplace.json   makes this repo installable as a marketplace
hooks/
  hooks.json         names the hooks module
  register.tsx       entry point: wires every feature
src/
  constants.ts       shared constants
  features/          one file per feature, each exporting install(on, options)
types/
  index.d.ts         $.state contract
tests/               *.test.ts, run by `claude plugin test .`
```

## License

MIT
