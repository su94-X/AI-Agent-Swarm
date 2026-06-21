# AI Agent Swarm Lite 1.4.5-lite.1 Release Notes

AI Agent Swarm Lite 是 AI Agent Swarm 的精简分支版本。它保留 Codex 主控、本地项目记忆库（轻量 RAG）、受控 MCP 工具和可见角色流程，但移除 Gemini tester 工作环节，把 Opus/Claude 定位为外部 reviewer/scorer。

## Highlights

- Codex 主控：规划、授权、真实文件修改、真实命令执行、RAG 写入和最终决策仍由 Codex 完成。
- Opus/Claude reviewer/scorer：通过 `multi_model_reviewer_findings` 和 `multi_model_reviewer_score` 提供证据绑定审查、风险判断和 0-100 评分。
- 无 Gemini tester 工作流：Lite 版不暴露 `multi_model_tester_plan`。
- 本地项目记忆库：JSONL + 词法检索，支持 confidence、verified_by、expires_at、scope、aliases、status。
- 可见角色流程：Main Orchestrator、Reviewer / Scorer、RAG Curator；Coder 工具仅作为可选兼容能力。
- 安全边界：forbidden paths、secret scan、checksum、防 symlink 逃逸、`.env`/RAG 数据发布排除。
- 无 npm 依赖：MCP server、打包、zip 校验、自测均使用 Node 内置模块。

## What Changed

- Changed plugin identity to `AI Agent Swarm Lite` with version `1.4.5-lite.1`.
- Changed default reviewer/scorer to Anthropic-compatible Opus/Claude.
- Added `multi_model_reviewer_score` for external review scoring.
- Removed the Gemini tester tool from the exposed MCP tool list.
- Updated Chinese docs, startup prompts, role prompts, README, CI self-test, and release packaging for the Lite workflow.

## Release Asset

Attach:

```text
ai-agent-swarm-lite-1.4.5-lite.1.zip
```

Do not attach `.env`, local RAG data, or any generated package that was not produced by:

```powershell
node scripts/package-release.mjs C:\path\to\outputs
```

## Verification

Offline validation should include:

```text
node --check for all .mjs files
node scripts/mcp-smoke-test.mjs
node scripts/http-retry-self-test.mjs
node scripts/rag-self-test.mjs
node scripts/rag-metadata-self-test.mjs
node scripts/rag-security-self-test.mjs
node scripts/rag-text-self-test.mjs
node scripts/workspace-edit-json-self-test.mjs
node scripts/workspace-edit-repair-self-test.mjs
node scripts/reviewer-score-self-test.mjs
plugin validation
skill quick validation
release zip audit
```

Real API smoke test is optional and should only be run locally with intentionally configured keys:

```powershell
node scripts/api-smoke-test.mjs
```

## Install

1. Download and unzip `ai-agent-swarm-lite-1.4.5-lite.1.zip`.
2. Copy `.env.example` to `.env` locally and fill only the API keys you intend to use.
3. Send `docs/PACKAGE_INSTALL_PROMPT.md` to Codex for installation checks.
4. Open a new Codex thread and send `docs/FIRST_INSTALL_PROMPT.md` to verify skill and MCP tool visibility.
