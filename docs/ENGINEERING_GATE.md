# AI Agent Swarm Lite 工程闸门

本文件定义 Lite 版在非简单任务中的强制工程闸门。目标是让 Codex 在正式编码前先把设计、计划、风险和验证路径讲清楚，再由 Opus/Claude 做外部审查与评分，降低上下文压缩、计划漂移和无证据完成声明的风险。

Lite 边界保持不变：

- Codex 是 Main Orchestrator，负责实现、授权、真实命令、真实测试、RAG 写入和最终决策。
- Opus/Claude 只做 plan-review、diff-review、test-review、final-review 的外部审查与评分。
- Lite 不使用 Gemini tester 工作流，也不默认让 Opus/Claude 做 primary coder。

## 适用范围

默认适用于这些任务：

- 涉及多个文件、公共接口、发布包、安装流程、RAG、MCP 工具、权限边界或安全逻辑的改动。
- 需要真实测试、迁移、兼容性判断或回归风险评估的改动。
- 用户明确要求严谨执行、自动推进或不可跳步的任务。

## 小任务绕过标准

只有同时满足以下条件，才可以跳过完整工程闸门：

- 单个小文件、文档、注释或非常局部的低风险编辑。
- 不改变架构、API、schema、配置、工作流、依赖、构建、部署、认证、安全、持久化或发布行为。
- 不需要多步计划。
- 预期 diff 小、可逆、容易人工检查。

绕过时，Codex 必须在回复或开发计划里记录：

```text
small-task bypass: <reason>
```

小任务绕过不等于跳过基本安全边界：仍然不得读取或发送 `.env`、token、生产数据、RAG 数据目录或无关仓库内容。

## 工程文档模板

非简单任务建议创建并维护这两个文档：

```text
docs/engineering/<task-slug>-engineering-design.md
docs/engineering/<task-slug>-development-plan.md
```

模板位于：

```text
templates/engineering-design.template.md
templates/development-plan.template.md
```

如果任务较小，可以在对话中使用等价结构；如果任务较长、可能上下文压缩、涉及发布或多人审查，必须写入 `docs/engineering/`。

设计文档至少包含：

- 目标和非目标。
- 当前状态和相关文件。
- Lite 角色分工：Codex 做什么，Opus/Claude reviewer/scorer 做什么。
- 读写边界和禁止触碰路径。
- 实现方案和备选方案。
- 风险、回退策略和验证方法。
- `External Evidence and Official Docs` 表格。

开发计划至少包含：

- 拆分合理的步骤。
- 每步的 scope、expected files、acceptance、verification、Opus gates、external evidence。
- Progress Ledger。
- Verification Log。
- Opus Gate Log。
- Blocked Report 模板。

## Official Docs Evidence Gate

涉及第三方 API、SDK、CLI、平台、框架、版本兼容、配置键、迁移步骤或外部事实时，必须执行 [docs/OFFICIAL_DOCS_GATE.md](./OFFICIAL_DOCS_GATE.md)。

证据写入设计文档的 `External Evidence and Official Docs` 表格：

| Dependency/Surface | Version/Target | Claim or usage rule | Official source | Checked date | Applies to plan step | Stale trigger | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

可以跳过新的外部检索，只有在仓库已有同版本同 API surface 的可靠工作模式、设计文档已有证据、且没有测试失败或 Opus/Claude 质疑时成立。

## Version Rules

工程文档必须显式记录版本和状态：

```text
Version: v0.1
Status: draft / opus-review / approved / in-progress / complete / superseded
```

版本演进规则：

- `v0.1`、`v0.2`：设计迭代。
- `v1.0`：Opus/Claude plan-review 和 Codex 自审都通过，可以进入实现。
- `v1.0.1`：实现中不改变 scope 的小修正。
- `v1.1`：scope、架构、验收标准或外部依赖发生实质变化，必须重新 plan-review。

## 设计闸门

正式编码前，Codex 必须先产出工程设计和开发计划，然后调用 Opus/Claude 做 `plan-review`。推荐通过 `opus-reviewer` 子智能体调用 `multi_model_reviewer_score`，并传入：

```json
{
  "review_stage": "plan",
  "task": "...",
  "plan": "...",
  "rubric": ["correctness", "security", "regression", "maintainability", "scope_control", "tests"]
}
```

`review_stage` 取值必须是：

- `plan`：正式编码前的工程设计和开发计划审查。
- `diff`：重要实现步骤后的 diff 审查。
- `test`：真实测试完成后的测试证据审查。
- `final`：最终接受前的综合审查。

如果 Opus/Claude 返回 blocking findings、must-fix items、`approved_to_continue: false`，或明确要求修改，Codex 必须先修改设计文档和开发计划，再次提交 `plan-review`。只有满足以下条件后才能进入正式编码：

- Opus/Claude 不再提出阻断问题或必须修改项。
- `approved_to_continue` 不是 `false`。
- `overall_score` 不低于 80；如果低于 80，Codex 必须说明是否存在真实阻断项，并优先修正计划后复审。
- Codex 自己确认计划可执行、边界足够窄、验证路径真实。

如果 `multi_model_reviewer_score` 不存在、调用失败、缺少 key、外部 reviewer/scorer 不可用或连续超时，Codex 不得假装已经完成外部审查。此时必须输出阻塞报告，除非用户明确批准降级为 Codex-only 设计审查。

## Progress Ledger

开发计划必须维护 Progress Ledger。每个重要步骤完成后更新：

```text
Step:
Status: pending / in_progress / done / blocked
Files:
Acceptance:
Verification:
Opus gates:
External evidence:
Notes:
```

如果上下文被压缩或线程恢复，Codex 必须先从 Progress Ledger、Verification Log 和 Opus Gate Log 恢复状态，不得从记忆重新猜测进度。

## 开发执行

进入开发后，Codex 必须按批准计划自动推进，直到计划完成或遇到明确阻塞条件。未完成开发计划 100% 前，不得声明完成，不得跳过剩余步骤。

每个重要实现步骤后，Codex 应进行 diff 检查：

- 检查实际触碰文件是否符合批准计划。
- 检查是否存在无关格式化、重排、生成文件或越界改动。
- 记录关键 changed files 和风险。

高风险或非平凡改动必须调用 Opus/Claude 做 `diff-review`，重点检查正确性、安全、回归、范围控制和缺失测试。

## 测试闸门

真实测试必须由 Codex 本地执行。测试完成后，Codex 必须把以下内容交给 Opus/Claude 做 `test-review`：

- command
- exit code
- stdout
- stderr
- 变更摘要
- 已知风险或跳过的测试

Opus/Claude 只能判断证据是否充分、失败日志含义和剩余风险，不能声称自己运行过测试。

Codex 最终接受前必须同时满足：

- 计划步骤已完成或有明确用户批准的范围调整。
- 必要 diff-review 没有未解决阻断项。
- 真实测试结果已记录。
- test-review 没有未解决阻断项，或 Codex 明确说明为什么可以接受剩余风险。

## Blocked Report

只有遇到以下情况，Codex 才允许停止自动推进并输出阻塞报告：

- 缺少必要 API key、权限或工具。
- 外部服务不可用，且重试后仍无法恢复。
- 需求冲突或用户新要求改变已批准计划。
- 自动继续会扩大外部模型读取范围、写入范围或泄漏敏感信息。
- 存在破坏性操作风险，需要用户明确授权。
- 连续失败后无法自愈，例如同一类格式修复、测试失败或模型调用失败连续出现 3 次。

阻塞报告必须使用这个格式：

```text
Blocked reason:
Evidence:
Completed plan steps:
Remaining plan steps:
Options:
Required human decision:
estimated_resolution:
```
