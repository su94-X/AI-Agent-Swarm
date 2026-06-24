# AI Agent Swarm V1.5.6 Release Notes

AI Agent Swarm `V1.5.6` absorbs the core engineering-loop workflow from `gpt55-opus-engineering-loop` into the main multi-model orchestration plugin.

## What Changed

- Added standard engineering document templates:
  - `templates/engineering-design.template.md`
  - `templates/development-plan.template.md`
- Added `docs/OFFICIAL_DOCS_GATE.md` for official documentation and external evidence checks.
- Added Progress Ledger requirements for long tasks, subagent handoffs, and context compaction recovery.
- Added standardized Blocked Report format across engineering gate docs, startup prompt, subagent workflow, Coder role prompt, and `primary-coder` Custom Agent.
- Added explicit small-task bypass rules so simple local edits do not need the full engineering gate.
- Added versioned design and development-plan rules.
- Added `scripts/engineering-gate-docs-self-test.mjs` and release-package validation for the new templates and official-docs gate.
- Updated release packaging to resolve release notes correctly when local build metadata is present in a manifest version.

## Why It Matters

This release turns AI Agent Swarm from a multi-model collaboration layer into a more complete engineering workflow layer:

- Codex remains the orchestrator and final decision-maker.
- Opus/Claude remains the primary coding role through the visible `primary-coder` Custom Agent and MCP tool contract.
- Gemini remains the test strategy and failure-log analysis role.
- Non-simple work now has durable design, plan, evidence, progress, and blocker records.

## Release Asset

```text
ai-agent-swarm-1.5.6.zip
```
