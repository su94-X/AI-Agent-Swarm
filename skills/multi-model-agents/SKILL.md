---
name: multi-model-agents
description: 当 Codex 需要编排多模型协作工作流时使用：Opus/Claude 作为主要编码角色，Gemini 作为测试策略和失败日志分析角色，Codex 内部 gpt-5.5 默认负责审查，也可通过 MCP 工具调用可选外部 reviewer 或 custom 模型角色。适用于让 Opus/Claude 在授权边界内执行编码、让 Codex 审查结果、让 Gemini 规划测试或分析失败日志，或运行 planner-coder-reviewer-tester 循环，同时由 Codex 保留任务边界、真实测试执行、审查和最终决策权。
---

# AI Agent Swarm

使用本 skill 通过 `multi-model-agents` MCP 工具协调外部模型角色。

V1.5.2 是 AI Agent Swarm 的当前正式版本，用于把 Opus/Claude 主编码、Gemini 测试分析、Codex 内部审查、工程闸门、官方 Custom Agent 模板、MCP 可见进度/日志通知、workspace patch/edit 局部编辑模式和本地项目记忆库（轻量 RAG）纳入 Codex 主控的授权、审查和真实测试流程。本版继续使用 `docs/INSTALL_PROMPT.md`、`docs/START_PROMPT.md` 和 `docs/RELEASE_PROMPT.md` 三个用户入口，并强化 Custom Agent 创建时的 MCP 调用合同：`primary-coder` 必须调用 Opus/Claude coder 工具，`tester` 必须调用 Gemini tester 工具，不能由 Codex 子智能体自己代替外部模型完成这些角色工作。

开发者：Su94。项目主页：https://github.com/su94-X/AI-Agent-Swarm。

## 工作流

1. Codex 始终是主控：负责制定方案、决定文件范围、授权读写边界、运行真实命令、审查结果并做最终决策。
2. 发送给外部模型的上下文必须有边界，只包含相关文件、diff、日志和约束。
3. Opus/Claude coder 是主要实现角色。只要 Codex 能安全授权文件范围，必须通过 `primary-coder` 子智能体调用 `multi_model_coder_workspace_edit`。
4. Gemini 负责测试策略和失败日志分析；必须通过 `tester` 子智能体调用 `multi_model_tester_plan`。真实本地测试仍由 Codex 执行。没有命令输出时，不接受“测试已通过”的模型声明。
5. 写权限必须很窄。coder 只能写 Codex 当前任务授权的 workspace 路径，Codex 必须审查返回的 diff。
6. RAG 是 Codex 主控的本地项目记忆库（轻量 RAG）。Codex 负责检索、筛选和写入；Opus/Gemini 不直接写 RAG，也不自动读取全库。
7. 默认强制使用可见角色子智能体工作流。除非任务只是简单问答、纯解释、单条命令查询，或当前线程明确没有子智能体工具，否则所有非简单任务必须创建可见 Codex 子智能体活动记录。优先使用 `.codex/agents/*.toml` 或用户级 `~/.codex/agents/*.toml` 中的官方 Custom Agent：`primary-coder`、`reviewer`、`tester`、`test-runner`、`rag-curator`、`security-auditor`。Main Orchestrator 不得用主线程直接调用 MCP 工具来替代应出现的 Coder、Tester、Test Runner、Reviewer、Security Auditor 或 RAG Curator 子智能体；各角色按任务阶段和风险触发。子智能体完成后必须关闭以释放并发槽位。降级时必须明确说明原因。
8. 创建 `primary-coder` 子智能体时，spawn message 必须写明：必须调用 `multi_model_coder_workspace_edit`，不得自己直接实现代码，不得用 Codex 自己代替 Opus/Claude；工具、key 或授权边界不可用时输出阻塞报告。创建 `tester` 子智能体时，spawn message 必须写明：必须调用 `multi_model_tester_plan`，不得自己直接生成测试策略或失败分析，不得用 Codex 自己代替 Gemini；工具、key 或输入证据不足时输出阻塞或降级报告。
9. 非简单任务正式编码前必须先过工程闸门：Codex 产出设计文档和开发计划，交给 Opus/Claude 做 plan-review；存在 blocking findings 或 must-fix items 时，先修计划并复审。

V1.4.5 起实测准则：

- 小范围、目标清楚、低歧义修改优先让 coder 使用 `edits` 局部编辑。审查时记录 `changed_files`、变更行数、无关 diff 噪声、`changed_file_details.mode` 和 `repairEvents`。
- RAG 默认搜索只用于探索背景。进入 plan、constraints、known_test_commands、review context 或外部模型上下文前，必须显式过滤 `scope`，建议 `min_confidence >= 0.9`，并在可用时设置 `verified_by`。
- 可见子智能体只提高过程可读性，不改变最终权责。Coder 不做最终决策，Tester 不改代码，Reviewer 不运行测试或实现代码，Test Runner 不做测试策略，Security Auditor 不实现代码，RAG Curator 不直接写入 trusted RAG。完成的子智能体必须关闭，避免继续占用并发槽位。

V1.4.6 工程闸门准则：

- Gate 0：开始非简单任务前调用 `multi_model_config_status` 和 `multi_model_rag_status`，确认工具和角色配置，不打印 key。
- plan-review：正式编码前把工程设计和开发计划交给 Opus/Claude 审查；阻断项或必须修改项未清零前不得编码。
- diff-review：高风险、非平凡或触碰安全/RAG/MCP/发布逻辑的 diff 必须审查。
- test-review：真实测试由 Codex/Test Runner 执行，必须记录 command、exit code、stdout、stderr，并交给 Gemini 分析测试证据或失败日志。
- 自动推进：进入开发后按批准计划推进，未完成当前批准计划 100% 前不得声明完成；需求变更时先生成 amended plan。

## 工具

- `multi_model_coder_patch`：让配置好的 coder 模型生成统一 diff。用于实现建议，不直接写文件。
- `multi_model_coder_workspace_edit`：让配置好的 coder 模型执行有边界的 workspace 编辑。Codex 必须提供 `workspace_root`、`allowed_read_paths` 和 `allowed_write_paths`；server 会校验路径、阻止默认禁用路径、要求 coder 返回严格 JSON 文件编辑，在 JSON 不合规时做一次修复重试，只写授权文本文件，并返回 diff。小改动优先使用 `edits` 局部编辑模式，支持 `replace`、`insert_after`、`insert_before`；新文件或大范围重写再使用完整 `files` 内容模式。
- `multi_model_reviewer_findings`：调用可选外部 reviewer 模型返回可执行 findings。默认 reviewer 是 `codex-internal`，因此通常使用 Codex 主智能体或 Codex Reviewer Subagent 审查，不额外消耗外部 reviewer API。
- `multi_model_tester_plan`：让 Gemini 给出测试策略、具体命令、边界用例或失败日志分析。tester 必须区分 verified commands、suggested commands 和基于证据的风险。真实命令由 Codex 本地执行。
- `multi_model_role_call`：在默认三类角色不够时，调用 custom role/provider/model。
- `multi_model_config_status`：查看各角色配置以及对应 API key 环境变量是否存在。
- `multi_model_rag_status`：查看本地项目记忆库（轻量 RAG）状态，不返回正文。
- `multi_model_rag_ingest`：把 Codex 授权读取的本地文件导入 RAG。
- `multi_model_rag_note`：写入 Codex 已验证的 bug、决策、命令、约定、风险等知识条目。
- `multi_model_rag_search`：本地词法检索 RAG，不调用外部模型。
- `multi_model_rag_get`：按 chunk/document id 获取有限上下文。

## 默认角色

- Coder：Anthropic-compatible 角色，默认模型 `claude-opus-4-8`，API key 环境变量 `ANTHROPIC_API_KEY`。
- Reviewer：默认 `codex-internal`。小 diff 由 Codex 主智能体直接审查；较大 diff 可使用短生命周期 Codex Reviewer Subagent。不要调用 `mcp__codex`，不要创建嵌套智能体，也不要使用 `multi_model_reviewer_findings`，除非用户明确需要外部第二意见。
- Test strategist / failure analyst：Gemini 角色，默认模型 `gemini-3.5-flash`，API key 环境变量 `GEMINI_API_KEY`。需要更强 Gemini 模型或兼容网关模型时，通过 `MMA_TESTER_MODEL` 覆盖。

这些名称可通过环境变量配置。如果账号不支持默认模型 ID，请设置对应 `MMA_*_MODEL` 变量。

## 环境变量

在 MCP server 环境或插件根目录 `.env` 中配置：

- `MMA_CODER_PROVIDER`、`MMA_CODER_MODEL`、`MMA_CODER_API_KEY_ENV`、`MMA_CODER_BASE_URL`
- 可选外部 reviewer：`MMA_REVIEWER_PROVIDER`、`MMA_REVIEWER_MODEL`、`MMA_REVIEWER_API_KEY_ENV`、`MMA_REVIEWER_BASE_URL`
- `MMA_TESTER_PROVIDER`、`MMA_TESTER_MODEL`、`MMA_TESTER_API_KEY_ENV`、`MMA_TESTER_BASE_URL`
- `MMA_HTTP_TIMEOUT_MS`

内置 server 支持的 provider：

- `openai` 或 `openai-compatible`：chat completions endpoint at `<base_url>/chat/completions`。
- `anthropic`：messages endpoint at `<base_url>/v1/messages`。
- `gemini`：generateContent endpoint at `<base_url>/v1beta/models/<model>:generateContent`。

## 调用模式

编码：

1. Codex 判断相关文件和安全路径边界。
2. Opus 主编码时，创建 Coder / primary-coder Subagent，并在 spawn message 中声明必须调用 `multi_model_coder_workspace_edit`；该工具必须获得 `workspace_root`、`allowed_read_paths`、`allowed_write_paths` 和 constraints。
3. 高风险改动先使用 `dry_run: true`；否则可让 coder 在授权范围内直接写入。
4. 如果 coder 返回格式错误的 JSON，MCP server 会自动做一次修复重试。如果仍失败，缩小任务范围或改用 `multi_model_coder_patch`。
5. 接受前审查返回的 diff。`changed_file_details.mode` 会标明 `full_file` 或 `patch_edit`。
6. workspace edit JSON repair 或 patch/edit apply repair 会额外调用一次 coder 模型。成本敏感任务先使用 `dry_run: true`，并缩小 `allowed_read_paths` / `allowed_write_paths`。
7. 只有需要“补丁建议但不写文件”时，使用 `multi_model_coder_patch`。

审查：

1. 小 diff 优先由 Codex 主智能体审查。
2. 较大任务可启动短生命周期 Codex Reviewer Subagent，只审查提供的 diff。
3. Reviewer Subagent 不得调用 `mcp__codex`、不得生成嵌套智能体、不得等待外部模型调用、不得运行测试、不得做最终决策。
4. 只有用户明确要求外部第二意见时，才使用 `multi_model_reviewer_findings`。
5. 要过滤掉通用、无证据或不适用于当前 diff 的 findings。

测试：

1. 提供 task、diff、changed files、已知测试命令和任何真实测试日志。
2. 创建 Tester Subagent，并在 spawn message 中声明必须调用 `multi_model_tester_plan`，让 Gemini 给出 verified commands、suggested commands、cases to inspect 和 failure analysis。
3. 只有 `verified_commands` 可视为项目真实命令。`suggested_commands` 和 `cases_to_inspect` 在 Codex 本地确认前都只是建议。
4. 拒绝没有绑定当前任务、diff、变更文件、已知命令或日志证据的通用风险提醒。
5. Codex 本地运行命令，并把真实失败日志交回 Gemini 分析。

RAG：

1. 会话开始或非简单任务开始时，先调用 `multi_model_rag_status`。
2. 在规划、调用 Opus、调用 Gemini 或审查 diff 前，可调用 `multi_model_rag_search` 检索项目约定、历史 bug、测试命令和架构决策。
3. Codex 必须筛选检索结果，只把当前任务必要的少量片段加入 plan、constraints、known_test_commands 或 review context。
4. 默认搜索只用于探索。执行或决策上下文必须使用 `scope`、建议 `min_confidence >= 0.9`，并在可用时使用 `verified_by`。`include_expired`、`deprecated` 和 `superseded` 结果只用于审计、排障或历史对比。
5. 任务结束后，只有已验证的 bug、修复、命令、决策、约定和风险才可通过 `multi_model_rag_note` 写入 trusted RAG。
6. 本地文档入库使用 `multi_model_rag_ingest`，必须传入 `workspace_root` 和明确的 `allowed_read_paths`。
7. 不要把 `.env`、密钥、生产数据、私有日志、未验证外部模型输出或无关仓库内容写入 RAG。

可见角色子智能体：

1. 默认强制启用可见角色子智能体。日常使用统一入口 `docs/START_PROMPT.md`，不需要再单独区分项目启动、已有项目接手或子智能体启动提示词。
2. 官方 Custom Agent 模板位于 `.codex/agents/*.toml`。这些模板需要存在于当前项目 `.codex/agents/` 或用户级 `~/.codex/agents/` 才会被 Codex 作为 Custom Agent 加载。Skill 是工作流，不是子智能体创建机制；MCP 是工具层；Plugin 是分发包。
3. 对非简单任务，如果当前线程有可见子智能体工具，必须先创建或复用任务阶段需要的角色子智能体，再进入计划、编码或测试执行；不得用 Main Orchestrator 主线程直接调用 MCP 工具来替代应出现的角色子智能体。
4. 非简单实现任务必须创建 Coder / primary-coder；涉及测试策略或失败日志时创建 Tester；涉及真实命令、发布或验证时创建 Test Runner；高风险、非平凡、较大 diff 或触碰安全/RAG/MCP/发布逻辑时创建 Reviewer；触碰密钥、发布包、路径授权或 prompt injection surface 时创建 Security Auditor；涉及 RAG 写入、项目接手或长期记忆沉淀时创建 RAG Curator。
5. Coder Subagent 是 Codex 可见壳子，必须调用 `multi_model_coder_workspace_edit`，由 Opus/Claude 执行主要编码；不得自己直接实现代码。
6. Tester Subagent 是 Codex 可见壳子，必须调用 `multi_model_tester_plan`，由 Gemini 生成测试策略和失败分析；不得自己直接生成测试策略。
7. Reviewer Subagent 使用 Codex 内部审查，不调用 `mcp__codex`，不创建嵌套智能体。
8. Test Runner Subagent 只运行主控批准的真实命令。
9. RAG Curator Subagent 只整理候选知识，最终写入由 Main Orchestrator 调用 RAG 工具完成。
10. 子智能体完成任务并返回结果后，必须调用 `close_agent` 或等价能力关闭，释放并发槽位。
11. 如果当前线程没有子智能体工具，必须在任务开头明确说明“当前线程没有可见子智能体工具，降级为 Main Orchestrator 直接调用 MCP 工具”，然后再继续保留角色边界。不得在有子智能体工具可用时静默由主智能体独自完成非简单任务。

## 安全边界

- 不要把密钥、API key、生产数据或无关仓库内容发送给外部模型。
- 不要授予宽泛 workspace 访问权限。始终传入窄范围的 `allowed_read_paths` 和 `allowed_write_paths`。
- 不要允许 coder 读写 `.env`、`.git`、`node_modules`、生成产物、凭据文件或无关文件。
- 不要允许 coder 读写 `.local/rag`、`.rag` 或其他 RAG 数据目录。
- 不要把未验证的外部模型输出直接写入 trusted RAG。
- 不要让多个角色同时编辑同一组文件。
- 外部模型输出或写入结果不能直接视为权威结论，必须经过 Codex 本地审查和测试。
