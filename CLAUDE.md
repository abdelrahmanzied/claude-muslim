# claude-muslim

Claude Code mod (function-hooks plugin). Plugin name is `muslim` — Claude Code reserves names starting with `claude-`; the repo name `claude-muslim` is fine.

## Rules

- Hooks module runs with no DOM and no Node. Reach everything through `$`. No `import()`, no `require`.
- `hooks/register.tsx` is the only entry. Each feature goes in `src/features/<feature>.ts(x)`, exports `install(on, options)`, and is imported by name and called in `register`. The engine only allows passing `on` to functions imported from the mod's own files — no arrays/registries of features.
- Use string literals (not constants) for command names in `$.command.register` and `command.run` matchers, so `claude plugin validate` recognises the hook as answering its own command.
- Every value kept in `$.state` is declared in `types/index.d.ts` under `PluginState['muslim']`. The contract exports types only.
- Every feature gets a `tests/<feature>.test.ts`.
- Bump `version` in both `.claude-plugin/plugin.json` and `src/constants.ts`, and note it in `CHANGELOG.md`.

## Before committing

```bash
claude plugin validate .
claude plugin test .
npx tsc -p .
```

API reference: `.claude-plugin/types/claude-code/index.d.ts` (written by Claude Code on load; grep for the event or noun).
