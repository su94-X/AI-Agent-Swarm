# Engineering Gate

Codex-only 版的工程闸门用于防止长任务在上下文压缩、多人/多代理协作或发布流程中漂移。

## 小任务绕过标准

满足全部条件可以绕过，并写明：

```text
small-task bypass: <reason>
```

- 单小文件、文档、注释或简单命令查询。
- 不改变架构、API、schema、配置、工作流、依赖、构建、部署、认证、安全或持久化行为。
- 不需要多步计划。
- 预期 diff 小且容易回滚。

## 非简单任务必需文件

- `docs/engineering/<task-slug>-engineering-design.md`
- `docs/engineering/<task-slug>-development-plan.md`

从模板复制：

- `templates/engineering-design.template.md`
- `templates/development-plan.template.md`

## Gate 0: 启动

- 调用 `multi_model_config_status`。
- 调用 `multi_model_rag_status`。
- 非简单任务检索 RAG。
- 需要外部事实时执行 Official Docs Evidence Gate：`docs/OFFICIAL_DOCS_GATE.md`。

## Gate 1: Plan Review

正式编码前必须：

1. 完成工程设计和开发计划。
2. 创建 `codex-reviewer` 做 plan-review。
3. 清零 blocking findings 和 must-fix items。
4. Codex 主控确认计划可执行。

## Gate 2: Implementation

- 按批准计划推进，不跳过步骤。
- 每个重要步骤更新 Progress Ledger。
- 需要编码时使用 `codex-coder` 或主控直接执行小范围修改。
- 非平凡或高风险 diff 交给 `codex-reviewer` 做 diff-review。

## Gate 3: Verification

真实命令必须记录：

- command
- exit code
- stdout
- stderr
- 生成或修改的产物

命令可由主控运行，也可交给 `test-runner` 运行。

## Gate 4: Final Review

合并最终结论前，检查：

- 计划步骤是否 100% 完成。
- 测试证据是否真实。
- 文档和 RAG 是否同步。
- 发布包是否通过验证。
- 残余风险是否明确。

## Progress Ledger

开发计划中维护：

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

## Version Rules

- `v0.1`, `v0.2`：设计迭代。
- `v1.0`：通过 Codex Reviewer plan-review 且 Codex 主控确认可执行。
- `v1.0.1`：实现中小修正，不改变 scope。
- `v1.1`：scope、架构、验收标准或风险边界变化，必须重新 review。
