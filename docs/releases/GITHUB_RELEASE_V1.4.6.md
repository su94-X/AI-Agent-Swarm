# AI Agent Swarm V1.4.6 Release Notes

AI Agent Swarm V1.4.6 是主体版工程闸门版本。它在 V1.4.5 的多模型编排、workspace patch/edit、本地项目记忆库、MCP 可见日志和可见角色子智能体基础上，加入正式编码前的设计审查门、开发阶段 diff-review 门和真实测试证据门。

## Highlights

- Codex 仍是 Main Orchestrator：负责规划、授权、审查、真实测试执行、RAG 写入和最终决策。
- Opus/Claude 仍是 primary coder：正式编码前必须先通过工程设计和开发计划的 plan-review。
- Gemini 仍是 tester：负责测试策略、失败日志分析和 test-review，不声称自己运行过真实命令。
- Codex internal reviewer 仍是默认 reviewer：高风险 diff 可额外请求外部第二意见。
- 工程闸门默认适用于非简单任务：多文件、发布包、MCP、RAG、权限边界、安全逻辑或真实测试相关改动。
- 发布包继续保持无 npm 依赖、无 `.env`、无 RAG 数据、无用户绝对路径。

## What Changed in V1.4.6

- Added `docs/ENGINEERING_GATE.md`.
- Added `docs/ENGINEERING_GATE_IMPLEMENTATION_PLAN.md`.
- Updated README, skill instructions, startup prompts, project prompts, subagent workflow docs, and role prompts to include engineering gate rules.
- Updated package install prompt to require engineering gate documents.
- Updated `scripts/package-release.mjs` required-file validation for V1.4.6.
- Updated plugin manifest metadata to version `1.4.6`.

## Runtime Impact

V1.4.6 does not intentionally change core MCP tool runtime behavior. The functional change is the documented engineering gate workflow and stricter release package validation for required engineering-gate documents.

## Release Asset

Attach:

```text
ai-agent-swarm-1.4.6.zip
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

Real API smoke test is optional for public release packaging but recommended locally before announcing the release:

```powershell
node scripts/api-smoke-test.mjs
```

API keys are never included in the release package.

## Install

1. Download and unzip `ai-agent-swarm-1.4.6.zip`.
2. Copy `.env.example` to `.env` locally and fill only the API keys you intend to use.
3. Send `docs/PACKAGE_INSTALL_PROMPT.md` to Codex for installation checks.
4. Open a new Codex thread and send `docs/FIRST_INSTALL_PROMPT.md` to verify skill and MCP tool visibility.
5. For non-simple development work, follow `docs/ENGINEERING_GATE.md`.
