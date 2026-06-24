# Codex Custom Agents

Codex-only 版随包提供官方 Custom Agent 模板：

```text
.codex/agents/
  codex-coder.toml
  codex-reviewer.toml
  codex-tester.toml
  test-runner.toml
  rag-curator.toml
  security-auditor.toml
```

这些文件需要位于当前项目 `.codex/agents/` 或用户级 `~/.codex/agents/` 才会被 Codex 加载。

项目级模板路径可以写成 `.codex/agents/*.toml`，用户级模板路径可以写成 `~/.codex/agents/*.toml`。

## 角色

| Agent | 权限 | 用途 |
| --- | --- | --- |
| `codex-coder` | workspace-write | 按批准计划实现代码或文档改动 |
| `codex-reviewer` | read-only | plan-review、diff-review、test-review、final-review |
| `codex-tester` | read-only | 设计测试策略、分析已提供日志 |
| `test-runner` | workspace-write | 运行主控批准的真实命令并记录证据 |
| `rag-curator` | read-only | 整理可写入 RAG 的候选知识 |
| `security-auditor` | read-only | 检查密钥、路径、发布包和注入风险 |

## 使用规则

- Main Orchestrator 负责创建、授权、汇总和最终决策。
- 子智能体不得创建嵌套子智能体。
- 子智能体完成后必须关闭，避免持续占用并发槽位。
- 在支持对应能力的客户端里，主控应调用 `close_agent` 或等价能力释放槽位。
- `rag-curator` 只整理候选条目，最终写入仍由 Main Orchestrator 调用 RAG 工具。
- `test-runner` 只运行批准命令，不设计测试策略，不做最终验收。
- `codex-reviewer` 只审查，不改代码，不运行测试，不做最终决定。

## Spawn Message 建议

创建子智能体时，主控应明确：

- 任务目标。
- 允许读取或修改的文件范围。
- 禁止事项。
- 预期输出格式。
- 完成后必须提醒主控关闭该子智能体。

示例：

```text
请作为 codex-reviewer 做 diff-review。只读审查当前 diff，重点检查正确性、回归风险、安全边界、无关改动和缺失测试。不要改文件，不要运行命令。输出 verdict、blocking_findings、must_fix_items、recommended_codex_actions 和 residual_risks。完成后提醒我关闭本子智能体。
```
