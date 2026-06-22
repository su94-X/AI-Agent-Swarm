# AI Agent Swarm V1.4.7 Release Notes

AI Agent Swarm V1.4.7 是提示词体验简化版本。它保留 V1.4.6 的工程闸门、Opus/Claude 主编码、Gemini 测试分析、Codex 内部审查、本地项目记忆库和安全发布流程，同时把普通用户需要面对的提示词入口收敛为三份通用文档。

## Highlights

- `docs/INSTALL_PROMPT.md`：安装、复查、MCP 可见性和离线自检统一入口。
- `docs/START_PROMPT.md`：日常开发、新项目、已有项目接手、工程闸门和可见子智能体统一入口。
- `docs/RELEASE_PROMPT.md`：维护者发布入口，要求 branch、tag、GitHub Release、zip asset 和页面核查全部完成。
- 旧提示词文件仍保留，但只作为兼容 wrapper，避免旧链接失效。
- 核心 MCP runtime 行为不变。

## What Changed in V1.4.7

- Added `docs/INSTALL_PROMPT.md`.
- Added `docs/START_PROMPT.md`.
- Added `docs/RELEASE_PROMPT.md`.
- Converted old prompt files into short compatibility wrappers.
- Updated README, SKILL, openai.yaml, ENVIRONMENT, ROADMAP, CHANGELOG, and release packaging validation.
- Updated plugin manifest metadata to version `1.4.7`.

## Runtime Impact

V1.4.7 does not intentionally change core MCP tool runtime behavior. The functional change is a simpler user-facing prompt workflow and stricter release package validation for the three universal prompts.

## Release Asset

Attach:

```text
ai-agent-swarm-1.4.7.zip
```

Do not attach `.env`, local RAG data, generated cache folders, or any zip that was not produced by:

```powershell
node scripts/package-release.mjs C:\path\to\outputs
```

## Verification

Before publishing, run:

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
node scripts/tester-prompt-self-test.mjs
plugin validation
skill quick validation
release zip audit
```

## Install

1. Download and unzip `ai-agent-swarm-1.4.7.zip`.
2. Copy `.env.example` to `.env` locally and fill only the API keys you intend to use.
3. Send `docs/INSTALL_PROMPT.md` to Codex for installation checks.
4. Open a new Codex thread and send `docs/START_PROMPT.md` for daily work.
