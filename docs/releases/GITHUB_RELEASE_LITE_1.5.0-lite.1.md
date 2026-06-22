# AI Agent Swarm Lite 1.5.0-lite.1 Release Notes

AI Agent Swarm Lite `1.5.0-lite.1` adds official Codex Custom Agent templates for the Lite workflow.

## What Changed

- Added `.codex/agents/*.toml` templates:
  - `opus-reviewer`
  - `test-runner`
  - `rag-curator`
  - `security-auditor`
- Added `docs/CUSTOM_AGENTS.md` for Lite.
- Added `scripts/custom-agents-self-test.mjs`.
- Updated docs and packaging to include Custom Agent templates.
- Documented that completed subagents must be closed with `close_agent` or an equivalent client capability.

## Lite Boundary

Lite remains Codex-led:

- Codex plans, edits, runs real commands, writes verified RAG notes, and makes final decisions.
- Opus/Claude reviews and scores plans, diffs, test evidence, and final summaries.
- Gemini tester workflow remains intentionally removed.

## Release Asset

```text
ai-agent-swarm-lite-1.5.0-lite.1.zip
```
