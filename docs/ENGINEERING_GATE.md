# AI Agent Swarm Lite 工程闸门

本文件定义 Lite 版在非简单任务中的强制工程闸门。目标是让 Codex 在正式编码前先把设计、计划、风险和验证路径讲清楚，再由 Opus/Claude 做外部审查与评分，降低上下文压缩、计划漂移和无证据完成声明的风险。

## 适用范围

默认适用于这些任务：

- 涉及多个文件、公共接口、发布包、安装流程、RAG、MCP 工具、权限边界或安全逻辑的改动。
- 需要真实测试、迁移、兼容性判断或回归风险评估的改动。
- 用户明确要求严谨执行、自动推进或不可跳步的任务。

可以跳过工程闸门的任务：

- 简单问答、解释、单条命令查询。
- 只读审查且用户明确不要求修改。
- 不触碰文件的轻量文案建议。

## 设计闸门

正式编码前，Codex 必须先产出工程设计文档或等价的任务设计段落，至少包含：

- 目标和非目标。
- 当前状态和相关文件。
- 角色分工：Codex 做什么，Opus/Claude reviewer/scorer 做什么。
- 读写边界和禁止触碰路径。
- 实现方案和备选方案。
- 风险、回退策略和验证方法。
- 开发计划，拆分为大小适中的步骤，每步都有可验证结果。

Codex 随后必须调用 Opus/Claude 做 `plan-review`。推荐使用 `multi_model_reviewer_score`，并传入：

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

如果 `multi_model_reviewer_score` 不存在、调用失败、缺少 key、外部 reviewer/scorer 不可用或连续超时，Codex 不得绕过设计闸门进入正式编码。此时必须输出阻塞报告，除非用户明确批准降级为 Codex-only 设计审查。

## Lite 实现计划

本次 Lite 版工程闸门落地应修改：

- `scripts/multi-model-agents-mcp.mjs`：扩展 `multi_model_reviewer_score` schema，增加 `review_stage`、`test_evidence`、`must_fix_items`、`approved_to_continue` 输出要求。
- `scripts/reviewer-score-self-test.mjs`：断言 prompt 包含 `review_stage`、`approved_to_continue`、`must_fix_items`、`plan-review`、`diff-review` 和 `test-review`。
- `skills/multi-model-agents/SKILL.md`、`README.md`、`docs/STARTUP_PROMPT.md`、`docs/SUBAGENT_WORKFLOW.md`、`docs/roles/REVIEWER_SUBAGENT_PROMPT.md`：同步工程闸门默认规则。
- `.codex-plugin/plugin.json`、`CHANGELOG.md`、release note、`scripts/package-release.mjs`：版本升到 `1.4.5-lite.2` 并打包新文档。

实现验收：

- `multi_model_reviewer_score` 的工具 schema 包含 `review_stage`。
- reviewer score prompt 明确要求 `approved_to_continue`、`must_fix_items` 和不同阶段输出。
- 离线自测 `scripts/reviewer-score-self-test.mjs` 能发现 prompt 退化。
- release package 包含 `docs/ENGINEERING_GATE.md`。
- 所有离线 self-test、plugin validation、skill quick validation 和 release package validation 通过。

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

## 阻塞条件

只有遇到以下情况，Codex 才允许停止自动推进并输出阻塞报告：

- 缺少必要 API key、权限或工具。
- 外部服务不可用，且重试后仍无法恢复。
- 需求冲突或用户新要求改变已批准计划。
- 自动继续会扩大外部模型读取范围、写入范围或泄漏敏感信息。
- 存在破坏性操作风险，需要用户明确授权。
- 连续失败后无法自愈，例如同一类格式修复、测试失败或模型调用失败连续出现 3 次。

阻塞报告必须包含：

- 已完成步骤。
- 当前阻塞点。
- 已尝试的恢复动作。
- 需要用户确认或提供的内容。
- 建议的下一步。
