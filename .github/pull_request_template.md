## Summary

- 

## Validation

- [ ] `node --check` for changed `.mjs` files
- [ ] `node scripts/mcp-smoke-test.mjs`
- [ ] `node scripts/rag-self-test.mjs`
- [ ] `node scripts/workspace-edit-json-self-test.mjs`
- [ ] `node scripts/reviewer-score-self-test.mjs`
- [ ] Release package validation, if packaging changed

## Security Checklist

- [ ] No `.env`, API keys, private logs, RAG data, or release zips are committed
- [ ] `.codex-plugin/plugin.json` remains ASCII-only and parseable
- [ ] `.mcp.json` uses `./scripts/multi-model-agents-mcp.mjs`
