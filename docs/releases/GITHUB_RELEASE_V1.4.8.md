# AI Agent Swarm V1.4.8 Release Notes

AI Agent Swarm V1.4.8 是可见子智能体启动契约修复版。它保留 V1.4.7 的三段式通用提示词，同时强化非简单任务的默认执行规则：如果当前 Codex 线程暴露可见子智能体工具，必须先创建或复用角色子智能体，再进入计划、编码或测试执行。

## What Changed in V1.4.8

- Strengthened `docs/START_PROMPT.md` with an explicit visible subagent requirement.
- Updated `skills/multi-model-agents/SKILL.md` so non-simple tasks cannot silently skip visible subagents when subagent tools are available.
- Updated `docs/SUBAGENT_WORKFLOW.md` with a dedicated mandatory creation rule.
- Added `scripts/subagent-prompt-self-test.mjs` to keep the visible subagent startup contract from regressing.
- Updated README, plugin manifest metadata, skill UI metadata, roadmap, and changelog to V1.4.8.

## Visible Subagent Contract

For non-simple tasks:

1. If the current Codex thread exposes visible subagent tools such as `multi_agent_v1.spawn_agent`, Main Orchestrator must create or reuse role subagents before engineering planning, coding, or test execution.
2. Default role subagents are Coder, Reviewer, and Tester.
3. Test Runner is required when real commands, validation, release, or packaging are involved.
4. RAG Curator is required when project memory, RAG writes, project handoff, or long-term knowledge capture are involved.
5. If no visible subagent tools are available, Codex must explicitly report the fallback instead of silently doing the whole task in the main agent.

## Runtime Notes

V1.4.8 does not intentionally change core MCP runtime behavior. It is a workflow-policy and release-metadata update designed to make visible subagent usage reliable from the default `docs/START_PROMPT.md` path.

## Package

```text
ai-agent-swarm-1.4.8.zip
```

The package is expected to include:

- `.codex-plugin/plugin.json`
- `.mcp.json`
- `.env.example`
- `README.md`
- `LICENSE`
- `NOTICE`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/`
- `skills/`
- `scripts/`
- `lib/`
- `assets/`

The package must exclude:

- `.env`
- `.local/rag`
- `.rag`
- `.git`
- `node_modules`
- credential/token-like files
- local absolute paths

## Upgrade Notes

1. Download and unzip `ai-agent-swarm-1.4.8.zip`.
2. Keep your local `.env` private and outside source control.
3. Reinstall the plugin from the updated package/source.
4. Open a new Codex thread.
5. Send `docs/INSTALL_PROMPT.md` once for installation checks.
6. Use `docs/START_PROMPT.md` for daily work.

## Verification

Recommended offline checks before publishing:

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
node scripts/tester-prompt-self-test.mjs
node scripts/subagent-prompt-self-test.mjs
python C:/Users/su94/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py C:/Users/su94/plugins/multi-model-agents
$env:PYTHONUTF8='1'; python C:/Users/su94/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/su94/plugins/multi-model-agents/skills/multi-model-agents
node scripts/package-release.mjs C:/path/to/outputs
```
