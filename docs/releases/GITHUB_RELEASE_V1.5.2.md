# AI Agent Swarm V1.5.2 Release Notes

AI Agent Swarm `V1.5.2` is a Custom Agent execution-contract bugfix release.

This release fixes a workflow gap where visible Codex child agents could be created for `primary-coder` or `tester`, but the task prompt did not force those child agents to call the external model MCP tools. The intended design is unchanged: `primary-coder` is a visible Codex shell that calls Opus/Claude through MCP, and `tester` is a visible Codex shell that calls Gemini through MCP.

## What Changed

- Strengthened `.codex/agents/primary-coder.toml`:
  - must call `multi_model_coder_workspace_edit`;
  - must not directly implement code as Codex;
  - must report a blocker if MCP, key, or authorized boundaries are unavailable.
- Strengthened `.codex/agents/tester.toml`:
  - must call `multi_model_tester_plan`;
  - must not directly generate test strategy or failure analysis as Codex;
  - must report blocker/degraded status if MCP, key, or evidence is unavailable.
- Updated `docs/START_PROMPT.md` so Main Orchestrator must put the same execution contract into the `spawn_agent` message when creating `primary-coder` or `tester`.
- Updated README, skill metadata, Custom Agent docs, role prompts, install/release prompts, and self-tests.
- Added regression coverage to prevent this prompt-contract gap from returning.

## Runtime Changes

No intentional MCP runtime behavior changes.

## Release Asset

```text
ai-agent-swarm-1.5.2.zip
```
