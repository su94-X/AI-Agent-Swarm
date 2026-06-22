# AI Agent Swarm V1.4.10 Release Notes

AI Agent Swarm `V1.4.10` 是文档体验修复版：不改变核心 MCP runtime，重点把 `docs/` 目录从多入口提示词收敛为清晰的三入口结构。

## What Changed

- Added `docs/README.md` as the documentation navigation page.
- Kept `docs/INSTALL_PROMPT.md` as the single install/check prompt.
- Kept `docs/START_PROMPT.md` as the single daily workflow prompt for daily development, new project bootstrap, existing project handoff, engineering gates, and visible subagents.
- Kept `docs/RELEASE_PROMPT.md` as the maintainer release prompt.
- Moved older wrapper prompt files into `docs/legacy/`.
- Moved GitHub Release notes into `docs/releases/`.
- Updated package validation and release sync scripts for the new docs layout.
- Changed GitHub Release verification in `scripts/sync-github-release.mjs` to use the already-loaded token, avoiding anonymous API rate-limit failures.

## User-Facing Docs

普通用户只需要记住：

```text
docs/INSTALL_PROMPT.md
docs/START_PROMPT.md
docs/RELEASE_PROMPT.md
```

完整导航：

```text
docs/README.md
```

## Runtime

Core workflow is unchanged:

- Codex remains the orchestrator and final decision maker.
- Opus/Claude remains the primary coder inside authorized workspace boundaries.
- Gemini remains the tester/failure-log analyst.
- Codex internal reviewer remains the default reviewer.
- RAG remains a Codex-curated local project memory layer.
- Visible subagent workflow remains required for non-simple tasks when subagent tools are available.

## Package

```text
ai-agent-swarm-1.4.10.zip
```

The package must include:

- `docs/README.md`
- `docs/INSTALL_PROMPT.md`
- `docs/START_PROMPT.md`
- `docs/RELEASE_PROMPT.md`
- `docs/legacy/`
- `docs/releases/GITHUB_RELEASE_V1.4.10.md`

The package must exclude:

- `.env`
- GitHub token files
- `.local/rag`
- `.rag`
- `.git`
- `node_modules`
- credential/token-like files
- local absolute paths

## Verification

```powershell
Get-ChildItem -Recurse -Path . -Include *.mjs | ForEach-Object { node --check $_.FullName }
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
python C:/Users/su94/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py C:/Users/su94/plugins/multi-model-agents
$env:PYTHONUTF8='1'; python C:/Users/su94/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/su94/plugins/multi-model-agents/skills/multi-model-agents
node scripts/package-release.mjs C:/path/to/outputs
```
