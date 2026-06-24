# Contributing

Thanks for helping improve AI Agent Swarm Lite.

## Development Rules

- Keep the plugin dependency-free. Use Node built-ins unless there is a strong reason to add a dependency.
- Do not commit `.env`, local RAG data, release zip files, credentials, logs with secrets, or generated build output.
- Keep `.env.example` as a template only.
- Keep `.codex-plugin/plugin.json` valid JSON and ASCII-only.
- Keep `.mcp.json` portable. It must use `./scripts/multi-model-agents-mcp.mjs`, not a user-specific absolute path.
- Preserve the Lite role boundary: Codex orchestrates, edits, tests, and decides; Opus/Claude provides external review, risk analysis, and scoring; the Gemini tester workflow is not part of this branch.
- For non-trivial changes, use `templates/engineering-design.template.md` and `templates/development-plan.template.md`, run Opus/Claude plan-review before coding, keep the Progress Ledger current, and use `docs/OFFICIAL_DOCS_GATE.md` when third-party behavior or external facts matter.

## Local Validation

Run these before opening a pull request:

```powershell
Get-ChildItem -Recurse -Path . -Include *.mjs | ForEach-Object { node --check $_.FullName }
node scripts/mcp-smoke-test.mjs
node scripts/http-retry-self-test.mjs
node scripts/rag-self-test.mjs
node scripts/rag-metadata-self-test.mjs
node scripts/rag-security-self-test.mjs
node scripts/rag-text-self-test.mjs
node scripts/workspace-edit-json-self-test.mjs
node scripts/workspace-edit-repair-self-test.mjs
node scripts/reviewer-score-self-test.mjs
node scripts/custom-agents-self-test.mjs
node scripts/engineering-gate-docs-self-test.mjs
node scripts/package-release.mjs C:\path\to\outputs
```

`scripts/api-smoke-test.mjs` uses real external model APIs. Run it only when you intentionally want to verify configured keys locally.

## Pull Request Checklist

- Tests and self-tests pass.
- No `.env`, secret, cache, RAG data, or release zip is included.
- Documentation is updated when behavior changes.
- Release packaging still excludes `.env` and RAG data.
