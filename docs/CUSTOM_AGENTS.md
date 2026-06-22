# 官方 Custom Agents 模板

AI Agent Swarm V1.5.0 起随包提供官方 Codex Custom Agent 模板：

```text
.codex/agents/
  primary-coder.toml
  reviewer.toml
  tester.toml
  test-runner.toml
  rag-curator.toml
  security-auditor.toml
```

这些文件的作用是给 Codex 官方 Subagents / Custom Agents 机制提供角色配置。它们不是 Skill，也不是 MCP tool。

## 三层关系

| 层 | 文件/入口 | 作用 |
| --- | --- | --- |
| Custom Agent | `.codex/agents/*.toml` 或 `~/.codex/agents/*.toml` | 定义可被 Codex spawn 的可见子智能体角色。 |
| Skill | `skills/multi-model-agents/SKILL.md` | 定义 AI Agent Swarm 工作流、边界、何时调用 MCP 工具。 |
| MCP | `.mcp.json` + `scripts/multi-model-agents-mcp.mjs` | 提供 Opus/Claude、Gemini、RAG、workspace edit 等工具。 |
| Plugin | `.codex-plugin/plugin.json` | 把 Skill、MCP、文档、脚本和模板打包分发。 |

## 加载位置

Codex 只会从当前受信项目或用户级配置读取 Custom Agent：

```text
项目级：<你的项目>/.codex/agents/*.toml
用户级：~/.codex/agents/*.toml
Windows 用户级：C:\Users\<你的用户名>\.codex\agents\*.toml
```

插件安装后，模板会随发布包存在，但不应宣传为“自动全局创建子智能体”。如果你希望某个开发项目默认使用这些角色，请把本插件的 `.codex/agents/` 复制到该项目根目录，或复制到用户级 `~/.codex/agents/`。

示例：

```powershell
Copy-Item -Recurse C:\Users\su94\plugins\multi-model-agents\.codex\agents .\.codex\
```

## 角色说明

| Agent | 权限建议 | 职责 |
| --- | --- | --- |
| `primary-coder` | `workspace-write` | Codex 可见壳子，通过 `multi_model_coder_workspace_edit` 调用 Opus/Claude 完成主要编码。 |
| `reviewer` | `read-only` | Codex 内部审查 diff、边界、安全、测试缺口，不调用外部 reviewer。 |
| `tester` | `read-only` | 通过 `multi_model_tester_plan` 调用 Gemini 生成测试策略和失败日志分析，不运行真实测试。 |
| `test-runner` | `workspace-write` | 只运行主控批准的本地命令，记录 command、exit code、stdout、stderr。 |
| `rag-curator` | `read-only` | 整理可写入 RAG 的候选知识，最终写入由主控决定。 |
| `security-auditor` | `read-only` | 审计密钥泄漏、路径边界、发布包和 prompt injection surface。 |

Main Orchestrator 仍然是当前 Codex 主线程，不建议做成常驻子智能体。它负责规划、授权、整合、真实测试决策、RAG 写入和最终判断。

## 使用方式

在日常开发里仍然只发送：

```text
docs/START_PROMPT.md
```

`START_PROMPT.md` 会要求 Codex 优先使用这些官方 Custom Agent 名称。可见子智能体是否真的出现，取决于当前 Codex 客户端是否暴露 subagent 工具，以及这些 `.toml` 是否位于当前项目或用户级 agent 目录。

如果当前线程没有可见子智能体工具，Codex 必须明确降级为 Main Orchestrator 直接调用 MCP 工具，不能静默假装已经创建子智能体。
