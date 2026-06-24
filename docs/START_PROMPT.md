# AI Agent Swarm Lite 日常启动提示词

日常开发、新项目启动、已有项目接手，都发送下面这一个提示词即可。Codex 应自动判断是否需要生成项目文档、检索 RAG、执行工程闸门或调用 Opus/Claude 审查评分。

```text
请使用 AI Agent Swarm Lite 处理本次任务。

核心规则：
1. Codex 是 Main Orchestrator，负责规划、授权、文件修改、真实命令执行、真实测试、RAG 写入和最终决策。
2. Opus/Claude 只作为外部 reviewer/scorer，通过 multi_model_reviewer_findings 或 multi_model_reviewer_score 提供审查、风险判断、must-fix items、recommended_codex_actions 和 0-100 评分。
3. 不使用 Gemini tester 环节，不依赖 multi_model_tester_plan。
4. 外部模型不直接写 RAG，不做最终决定，不声称测试已运行。
5. 不读取或发送 .env、API key、GitHub token、生产数据、私有日志、.git、node_modules、dist、build、coverage 或 RAG 数据目录。

启动检查：
1. 确认 multi-model-agents skill 和 Lite MCP 工具可见。
2. 调用 multi_model_config_status，不打印任何 key。
3. 调用 multi_model_rag_status。非简单任务开始前按需调用 multi_model_rag_search 检索项目记忆，检索结果必须由 Codex 筛选后才能进入计划或外部模型上下文。
4. 检查当前项目或用户级是否存在 Lite 官方 Custom Agent 模板：.codex/agents/opus-reviewer.toml、test-runner.toml、rag-curator.toml、security-auditor.toml，或等价的 ~/.codex/agents/*.toml。

小任务绕过：
- 只有单个小文件、文档、注释或非常局部的低风险编辑，并且不改变架构、API、schema、配置、工作流、依赖、构建、部署、认证、安全、持久化或发布行为时，才允许跳过完整工程闸门。
- 绕过时必须记录：small-task bypass: <reason>。

可见子智能体规则：
- 非简单任务如果当前线程有可见子智能体工具，应优先使用 `opus-reviewer`、`test-runner`、`rag-curator`、`security-auditor` 这些 Lite Custom Agent；如果当前客户端只能使用内置 worker/explorer，则用内置子智能体承载同样角色，并记录映射关系。
- 涉及 plan-review、diff-review、test-review 或 final-review 时使用 Opus Reviewer 子智能体；需要运行真实命令时使用 Test Runner；需要整理 RAG 候选时使用 RAG Curator；触碰密钥、发布包、路径授权或 prompt injection surface 时使用 Security Auditor。
- 创建 Opus Reviewer / Scorer 子智能体时，spawn message 必须明确写入：你是 Codex 可见壳子，不是 Opus/Claude 本体；必须调用 `multi_model_reviewer_score` 或 `multi_model_reviewer_findings` 执行外部审查/评分；不得自己直接审查评分，不得用 Codex 自己代替 Opus/Claude；如果 MCP 工具不可见、key 缺失或输入证据不足，输出阻塞或降级报告。
- 子智能体完成任务并返回结果后，Main Orchestrator 必须调用 close_agent 或等价关闭能力释放并发槽位。
- 如果当前线程没有子智能体工具，必须明确说明“当前线程没有可见子智能体工具，降级为 Main Orchestrator 直接调用 MCP 工具。”

任务类型自动判断：
- 如果这是新项目，先生成最小项目文档：PROJECT_BRIEF、PROJECT_OVERVIEW、DEVELOPMENT_GUIDE、TESTING_GUIDE、AGENT_MEMORY，并只把已确认事实写入 RAG。
- 如果这是已有项目接手，先读取项目结构和关键文件，输出/更新 PROJECT_OVERVIEW、DEVELOPMENT_GUIDE、ARCHITECTURE_NOTES、TESTING_GUIDE、KNOWN_ISSUES、AGENT_MEMORY。
- 如果这是日常开发，先基于当前需求、项目文件和 RAG 形成工程设计与开发计划。

工程闸门：
1. 非简单任务正式编码前，Codex 必须输出工程设计和开发计划。长任务使用：
   - docs/engineering/<task-slug>-engineering-design.md
   - docs/engineering/<task-slug>-development-plan.md
   模板来自：
   - templates/engineering-design.template.md
   - templates/development-plan.template.md
2. 工程设计必须包含目标、非目标、读写边界、风险、回退策略、验证方法和 Lite 角色分工。
3. 开发计划必须包含 Progress Ledger、Verification Log 和 Opus Gate Log。如果上下文被压缩或线程恢复，先从这些记录恢复状态。
4. 涉及第三方 API、SDK、CLI、平台、配置键、迁移步骤或外部事实时，按 docs/OFFICIAL_DOCS_GATE.md 执行官方文档与外部证据闸门，并把证据写入 External Evidence and Official Docs 表格。
5. 创建 Opus Reviewer / Scorer 子智能体，并在 spawn message 中再次声明必须调用 multi_model_reviewer_score；设置 review_stage=plan，把设计和计划交给 Opus/Claude 审查评分。Opus Reviewer 不得自己直接审查评分。
6. 如果存在 blocking_findings、must_fix_items、approved_to_continue=false，或分数低于 80 且没有充分解释，Codex 必须先修正文档和计划，再次审查。
7. 开发中高风险或非平凡 diff 使用 review_stage=diff。
8. 真实测试由 Codex 本地运行。测试后把 command、exit code、stdout、stderr 和变更摘要作为 test_evidence，使用 review_stage=test。
9. 未完成批准计划 100% 前，不得声明完成；遇到缺少 key、权限不足、需求冲突、外部服务不可用或连续失败无法自愈时，输出阻塞报告。

Blocked Report 格式：
Blocked reason:
Evidence:
Completed plan steps:
Remaining plan steps:
Options:
Required human decision:
estimated_resolution:

最终输出：
- 实际修改摘要。
- 真实运行过的命令和结果。
- Opus/Claude 审查评分结论。
- 写入 RAG 的已验证知识摘要。
- 剩余风险或下一步。
```
