# AI Agent Swarm 工程闸门

本文件定义主体版在非简单任务中的强制工程闸门。主体版仍保持原有角色边界：Codex 是主控，Opus/Claude 是主要编码角色，Gemini 是测试策略和失败日志分析角色，Codex 内部 reviewer 默认负责代码审查。

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

### Gate 0：预检

正式设计前，Codex 必须先完成预检：

- `multi_model_config_status` 可调用。
- `multi_model_rag_status` 可调用。
- plan-review 所需工具可用：优先 `multi_model_role_call`，可选 `multi_model_reviewer_findings`。
- 当前任务需要 Opus/Claude coder 时，确认 coder provider、model、apiKeyEnv、hasApiKey 状态。
- 当前任务需要 Gemini tester 时，确认 tester provider、model、apiKeyEnv、hasApiKey 状态。
- 当前线程是否有可见子智能体工具。非简单任务如果有子智能体工具，必须先创建或复用 Coder / `primary-coder`、Reviewer、Tester；涉及真实命令时创建 Test Runner；涉及 RAG 写入或长期记忆沉淀时创建 RAG Curator；触碰密钥、发布包、路径授权或 prompt injection surface 时创建 Security Auditor。
- 官方 Custom Agent 模板是否位于当前项目 `.codex/agents/` 或用户级 `~/.codex/agents/`。模板不存在时仍可用内置 `worker` / `explorer` 承载角色，但必须记录映射关系。
- 子智能体完成后必须调用 `close_agent` 或等价能力关闭，释放并发槽位。
- 如果当前线程没有子智能体工具，必须把降级原因写入 Gate 0 结果：“当前线程没有可见子智能体工具，降级为 Main Orchestrator 直接调用 MCP 工具。”

如果预检失败，不应继续写正式设计文档，必须直接输出阻塞报告。预检不得打印 API key。

### 设计文档要求

正式编码前，Codex 必须先产出工程设计文档或等价的任务设计段落，至少包含：

- design_version：从 `v1` 开始；每次按 plan-review 修改后递增。
- previous_version_changes：从上一版设计变更了什么；`v1` 可写 `initial`。
- 目标和非目标。
- 当前状态和相关文件。
- 角色分工：Codex 主控，Opus/Claude coder 做什么，Gemini tester 做什么，Codex reviewer 做什么。
- 读写边界和禁止触碰路径。
- data_flow：涉及 RAG、MCP、外部模型、文件读写或网络请求时必须说明数据流。
- prompt_injection_surface：外部模型会看到哪些输入，如何限制 prompt injection 或无关上下文。
- credential_handling：如何避免 `.env`、API key、凭据和私有日志泄漏。
- external_network_scope：会调用哪些外部服务，是否需要真实 API key。
- 实现方案和备选方案。
- 风险、回退策略和验证方法。
- 开发计划，拆分为大小适中的步骤，每步都有可验证结果。

Codex 随后必须调用 Opus/Claude 做 `plan-review`。主体版可通过 `multi_model_coder_patch` 或 `multi_model_role_call(role=custom/reviewer)` 获取外部第二意见；如果配置了外部 reviewer，也可使用 `multi_model_reviewer_findings`。plan-review 只审查设计和计划，不代表允许 Opus 立即开始编码。

如果 Opus/Claude 返回阻断问题、must-fix items 或明确要求修改，Codex 必须先修改设计文档和开发计划，再次提交 `plan-review`。只有满足以下条件后才能进入正式编码：

- Opus/Claude 不再提出阻断问题或必须修改项。
- Codex 生成并通过 gate_exit_checklist。
- Codex 记录被批准的 design_version。

gate_exit_checklist 必须包含：

```json
{
  "approved_design_version": "vN",
  "boundaries_documented": { "ok": true, "evidence": "..." },
  "verification_path_runnable": { "ok": true, "evidence": "..." },
  "no_open_blocking_items": { "ok": true, "evidence": "..." },
  "rollback_or_recovery_defined": { "ok": true, "evidence": "..." }
}
```

如果外部 plan-review 工具不可用、缺少 key、外部服务连续超时或返回不可用结果，Codex 不得绕过设计闸门进入正式编码。此时必须输出阻塞报告，除非用户明确批准降级为 Codex-only 设计审查。

外部 plan-review 调用重试规则：

- 单次超时建议不超过 120 秒。
- 最多尝试 3 次。
- 退避建议为 2 秒、4 秒、8 秒。
- 3 次失败后输出阻塞报告；不要自动跳过闸门。

## 开发执行

进入开发后，Codex 必须按批准计划自动推进，直到计划完成或遇到明确阻塞条件。未完成开发计划 100% 前，不得声明完成，不得跳过剩余步骤。

主体版默认让 Coder Subagent 调用 `multi_model_coder_workspace_edit`，由 Opus/Claude 在 Codex 授权边界内执行主要实现。每个重要实现步骤后，Codex 应进行 diff 检查：

- 检查实际触碰文件是否符合批准计划。
- 检查是否存在无关格式化、重排、生成文件或越界改动。
- 记录 changed files、变更摘要、风险和必要测试。

高风险或非平凡改动必须进入 diff-review。默认由 Codex 内部 reviewer 或 Reviewer Subagent 审查；如果用户要求外部第二意见或任务风险较高，可额外调用 Opus/Claude 做外部 diff-review。

diff-review 自动触发条件：

- 触碰权限、安全、认证、路径校验、secret scan、RAG 写入、MCP tool schema、发布打包或安装逻辑。
- 修改公共接口、环境变量、命令行行为或插件 manifest。
- 修改 3 个或更多文件。
- 新增依赖或改变外部网络请求。
- diff 中存在大范围重排、格式化噪声或生成产物。
- Codex 判断回归风险不低。

如果用户在执行中缩小或改变范围，Codex 必须生成 amended plan，递增 design_version，并说明未完成步骤是被用户批准移出范围。100% 完成要求适用于当前已批准的 amended plan。

## 测试闸门

Gemini 可以通过 `multi_model_tester_plan` 提供测试计划、建议命令、边界用例和失败日志分析，但真实测试必须由 Codex 本地执行。测试完成后，Codex 必须整理：

- command
- exit code
- stdout
- stderr
- 变更摘要
- 已知风险或跳过的测试

这些测试证据应交给 Gemini 做失败分析或测试证据审查。高风险任务也可交给 Opus/Claude 做额外 test-review。外部模型不能声称自己运行过测试。

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
- 同一类格式修复、测试失败或模型调用失败连续出现 3 次仍无法自愈。某一操作类型成功完成后，该类型失败计数重置为 0。

阻塞报告必须包含：

- 已完成步骤。
- 当前阻塞点。
- 已尝试的恢复动作。
- 需要用户确认或提供的内容。
- 建议的下一步。
- estimated_resolution：具体什么动作能解除阻塞，以及大致工作量。
