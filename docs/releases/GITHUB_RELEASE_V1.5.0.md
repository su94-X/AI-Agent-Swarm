# AI Agent Swarm V1.5.0 Release Notes

AI Agent Swarm `V1.5.0` 是官方 Custom Agents 模板版本。它把此前文档中的“可见角色子智能体”落到 Codex 官方 Subagents / Custom Agents 配置层：发布包现在包含 `.codex/agents/*.toml`，用于让用户在项目级或用户级启用稳定的角色子智能体。

## What Changed in V1.5.0

- Added official Codex Custom Agent templates:
  - `.codex/agents/primary-coder.toml`
  - `.codex/agents/reviewer.toml`
  - `.codex/agents/tester.toml`
  - `.codex/agents/test-runner.toml`
  - `.codex/agents/rag-curator.toml`
  - `.codex/agents/security-auditor.toml`
- Added `docs/CUSTOM_AGENTS.md` to clarify the distinction between Custom Agents, Skills, MCP tools, and Plugins.
- Updated the main startup prompt to prefer named Custom Agents when `.codex/agents/*.toml` or user-level agents are available.
- Updated installation and release prompts to validate Custom Agent templates.
- Added `scripts/custom-agents-self-test.mjs`.
- Updated release packaging so `.codex/agents/*.toml` is included and validated.

## Important Behavior Note

Custom Agent templates do not mean Codex automatically spawns subagents in every thread. Codex subagents are loaded from the active project `.codex/agents/` or user-level `~/.codex/agents/`, and Codex only spawns subagents when the prompt or workflow explicitly asks it to. AI Agent Swarm keeps that request in `docs/START_PROMPT.md`.

## Validation

Run before publishing:

```powershell
node scripts/mcp-smoke-test.mjs
node scripts/http-retry-self-test.mjs
node scripts/model-secret-self-test.mjs
node scripts/rag-self-test.mjs
node scripts/rag-metadata-self-test.mjs
node scripts/rag-security-self-test.mjs
node scripts/rag-text-self-test.mjs
node scripts/workspace-edit-json-self-test.mjs
node scripts/workspace-edit-repair-self-test.mjs
node scripts/tester-prompt-self-test.mjs
node scripts/subagent-prompt-self-test.mjs
node scripts/custom-agents-self-test.mjs
```

## Release Asset

```text
ai-agent-swarm-1.5.0.zip
```
