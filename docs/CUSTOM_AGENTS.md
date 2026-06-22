# 官方 Custom Agents 模板（Lite）

AI Agent Swarm Lite V1.5.0-lite.1 起随包提供官方 Codex Custom Agent 模板：

```text
.codex/agents/
  opus-reviewer.toml
  test-runner.toml
  rag-curator.toml
  security-auditor.toml
```

Lite 版不包含 Gemini tester 工作流，也不默认让 Opus/Claude 编码。Codex 仍是主控，Opus/Claude 主要做外部审查和评分。

## 三层关系

| 层 | 文件/入口 | 作用 |
| --- | --- | --- |
| Custom Agent | `.codex/agents/*.toml` 或 `~/.codex/agents/*.toml` | 定义可被 Codex spawn 的可见子智能体角色。 |
| Skill | `skills/multi-model-agents/SKILL.md` | 定义 Lite 工作流、工程闸门和角色边界。 |
| MCP | `.mcp.json` + `scripts/multi-model-agents-mcp.mjs` | 提供 Opus/Claude reviewer/scorer、RAG、workspace 兼容工具。 |
| Plugin | `.codex-plugin/plugin.json` | 打包分发 Skill、MCP、文档、脚本和模板。 |

## 加载位置

Codex 只会从当前受信项目或用户级配置读取 Custom Agent：

```text
项目级：<你的项目>/.codex/agents/*.toml
用户级：~/.codex/agents/*.toml
Windows 用户级：C:\Users\<你的用户名>\.codex\agents\*.toml
```

插件安装后，模板会随发布包存在，但不应宣传为“自动全局创建子智能体”。如果你希望某个开发项目默认使用这些角色，请把本插件的 `.codex/agents/` 复制到该项目根目录，或复制到用户级 `~/.codex/agents/`。

## Lite 角色

| Agent | 权限建议 | 职责 |
| --- | --- | --- |
| `opus-reviewer` | `read-only` | 调用 Opus/Claude reviewer/scorer MCP 工具做 plan-review、diff-review、test-review 和 final-review。 |
| `test-runner` | `workspace-write` | 只运行主控批准的本地命令，记录 command、exit code、stdout、stderr。 |
| `rag-curator` | `read-only` | 整理可写入 RAG 的候选知识，最终写入由主控决定。 |
| `security-auditor` | `read-only` | 审计密钥泄漏、路径边界、发布包和 prompt injection surface。 |

所有子智能体完成后，Main Orchestrator 必须调用 `close_agent` 或等价能力关闭，释放并发槽位。
