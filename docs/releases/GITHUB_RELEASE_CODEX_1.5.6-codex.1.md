# AI Agent Swarm Codex-only 1.5.6-codex.1

This is the first Codex-only branch release.

## What Changed

- Keeps Codex as the only default execution and decision layer.
- Keeps official Codex Custom Agent templates for visible role separation.
- Keeps local RAG memory tools for verified project knowledge.
- Removes the default external model tool surface from MCP `tools/list`.
- Rewrites README, docs, templates, skill metadata, and release prompts for Codex-only usage.
- Uses strict release package validation and a Codex-only denylist scan.

## Included Tools

- `multi_model_config_status`
- `multi_model_rag_status`
- `multi_model_rag_ingest`
- `multi_model_rag_note`
- `multi_model_rag_search`
- `multi_model_rag_get`

## Package

```text
ai-agent-swarm-codex-1.5.6-codex.1.zip
```

## Verification

Run:

```powershell
node scripts/mcp-smoke-test.mjs
node scripts/rag-self-test.mjs
node scripts/codex-only-self-test.mjs
node scripts/package-release.mjs
```
