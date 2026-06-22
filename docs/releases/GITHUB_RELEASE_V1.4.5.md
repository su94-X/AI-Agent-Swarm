# AI Agent Swarm V1.4.5 Release Notes

AI Agent Swarm V1.4.5 是首个建议公开发布的稳定版本。它是一个本地 Codex 多模型编排插件，用于让 Codex 主控 Opus/Claude 编码、Gemini 测试分析、Codex 内部审查、可见角色子智能体和本地项目记忆库（轻量 RAG）。

## Highlights

- Codex 主控：规划、授权、审查、真实测试执行和最终决策仍由 Codex 完成。
- Opus/Claude primary coder：通过 MCP 在授权路径内执行 workspace edit。
- Gemini tester：生成测试计划、边界用例和失败日志分析，不伪装成真实测试执行结果。
- Codex internal reviewer：默认不调用外部 GPT reviewer。
- 本地项目记忆库：JSONL + 词法检索，支持 confidence、verified_by、expires_at、scope、aliases、status。
- 可见角色子智能体工作流：Coder、Reviewer、Tester、Test Runner、RAG Curator 都可在 Codex 中保持可见过程。
- 安全边界：forbidden paths、secret scan、checksum、防 symlink 逃逸、`.env`/RAG 数据发布排除。
- 无 npm 依赖：MCP server、打包、zip 校验、自测均使用 Node 内置模块。

## What Changed in V1.4.5

- Added independent RAG submodule self-tests:
  - `scripts/rag-metadata-self-test.mjs`
  - `scripts/rag-security-self-test.mjs`
  - `scripts/rag-text-self-test.mjs`
- Updated release package validation to require the new RAG self-tests.
- Synchronized plugin metadata and documentation for V1.4.5.

## Release Asset

Attach:

```text
ai-agent-swarm-1.4.5.zip
```

Do not attach `.env`, local RAG data, or any generated package that was not produced by:

```powershell
node scripts/package-release.mjs C:\path\to\outputs
```

## Verification

Offline validation passed:

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

Real API smoke test also passed locally for configured coder/tester/custom roles. API keys are not included in the release.

## Install

1. Download and unzip `ai-agent-swarm-1.4.5.zip`.
2. Copy `.env.example` to `.env` locally and fill only the API keys you intend to use.
3. Send `docs/PACKAGE_INSTALL_PROMPT.md` to Codex for installation checks.
4. Open a new Codex thread and send `docs/FIRST_INSTALL_PROMPT.md` to verify skill and MCP tool visibility.
