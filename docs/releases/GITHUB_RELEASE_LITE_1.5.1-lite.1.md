# AI Agent Swarm Lite 1.5.1-lite.1 Release Notes

AI Agent Swarm Lite `1.5.1-lite.1` is an Opus Reviewer Custom Agent execution-contract bugfix release.

This release fixes a workflow gap where a visible Codex child agent could be created for `opus-reviewer`, but the task prompt did not force that child agent to call the external Opus/Claude reviewer/scorer MCP tools. The intended Lite design is unchanged: Codex remains the main orchestrator and final decision maker; Opus/Claude provides external review and scoring through MCP.

## What Changed

- Strengthened `.codex/agents/opus-reviewer.toml`:
  - must call `multi_model_reviewer_score` or `multi_model_reviewer_findings`;
  - must not directly review/score as Codex;
  - must report blocker/degraded status if MCP, key, or input evidence is unavailable.
- Updated `docs/START_PROMPT.md` so Main Orchestrator must put the same execution contract into the `spawn_agent` message when creating `opus-reviewer`.
- Updated README, Custom Agent docs, Subagent Workflow docs, Reviewer role prompt, install/release prompts, skill metadata, and Custom Agent self-test.

## Lite Boundary

Lite remains Codex-led:

- Codex plans, edits, runs real commands, writes verified RAG notes, and makes final decisions.
- Opus/Claude reviews and scores plans, diffs, test evidence, and final summaries through MCP.
- Gemini tester workflow remains intentionally removed.

## Runtime Changes

No intentional MCP runtime behavior changes.

## Release Asset

```text
ai-agent-swarm-lite-1.5.1-lite.1.zip
```
