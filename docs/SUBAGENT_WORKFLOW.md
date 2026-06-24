# Visible Subagent Workflow

Codex-only 版保留可见角色流程，但所有角色都由 Codex 执行。

## 角色表

| Role | Agent | Responsibility |
| --- | --- | --- |
| Main Orchestrator | main thread | 规划、授权、RAG 检索与写入、真实决策 |
| Coder | `codex-coder` | 按批准计划实现 |
| Reviewer | `codex-reviewer` | 只读审查计划、diff、测试证据和最终总结 |
| Tester | `codex-tester` | 设计测试策略、分析已提供日志 |
| Test Runner | `test-runner` | 运行批准命令并记录证据 |
| RAG Curator | `rag-curator` | 整理记忆候选，不直接写入 |
| Security Auditor | `security-auditor` | 只读安全审计 |

## 默认流程

1. Main Orchestrator 调用 config/RAG status。
2. 非简单任务先产出工程设计和开发计划。
3. 创建 `codex-reviewer` 做 plan-review。
4. 通过后创建需要的执行角色。
5. 每个重要步骤更新 Progress Ledger。
6. 高风险 diff 做 diff-review。
7. 真实命令记录 command、exit code、stdout、stderr。
8. 最终由 Main Orchestrator 决定是否完成。
9. 可复用知识由 Main Orchestrator 写入 RAG。
10. 每个子智能体完成后必须关闭；在支持对应能力的客户端里调用 `close_agent` 或等价能力。

## Progress Ledger

```text
Step:
Status: pending / in_progress / done / blocked
Files:
Acceptance:
Verification:
Reviewer gates:
External evidence:
Notes:
```

## Blocked Report

```text
Blocked reason:
Evidence:
Completed plan steps:
Remaining plan steps:
Options:
Required human decision:
estimated_resolution:
```

## 降级规则

如果当前线程没有可见子智能体工具，Main Orchestrator 可以直接完成任务，但必须说明降级原因，并继续保留角色边界、真实测试证据和 RAG 写入边界。
