# Contributing

Thanks for helping improve AI Agent Swarm Codex-only.

## Branch Boundary

This branch keeps all default work inside Codex:

- Codex orchestrates, edits, tests, reviews, writes RAG, and decides.
- Codex Custom Agents may be used for visible role separation.
- The default MCP server exposes only config status and local RAG tools.

Do not add default external provider requirements to this branch.

## Before Coding

For non-trivial changes:

1. Use `templates/engineering-design.template.md`.
2. Use `templates/development-plan.template.md`.
3. Apply `docs/OFFICIAL_DOCS_GATE.md` when external facts matter.
4. Run `codex-reviewer` plan-review.
5. Keep Progress Ledger updated.

## Verification

Run relevant local tests and record command evidence. At minimum:

```powershell
node scripts/mcp-smoke-test.mjs
node scripts/rag-self-test.mjs
node scripts/codex-only-self-test.mjs
```
