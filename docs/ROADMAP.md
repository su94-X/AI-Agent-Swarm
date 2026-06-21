# 后续路线图

本文档记录 AI Agent Swarm 在 V1.4.6 正式版之后的工程改进方向，以及 V1.4.5/V1.4.6 已完成的工程化事项。这里的未完成内容不是当前版本承诺，而是后续小版本或中版本的设计入口。

## 工程闸门

V1.4.6 已把非简单开发任务的工程闸门写入默认工作流：

- 正式编码前需要 Gate 0 预检、工程设计文档和开发计划。
- 设计和计划必须交给 Opus/Claude 做 plan-review；存在 blocking findings 或 must-fix items 时先修订再复审。
- 开发阶段按批准计划推进，高风险或非平凡 diff 进入 diff-review。
- 真实测试必须记录 command、exit code、stdout、stderr 和变更摘要，再交给 Gemini 做 test-review 或失败日志分析。
- 只有缺少 key、权限不足、破坏性风险、需求冲突、外部服务不可用或连续失败无法自愈时，才输出阻塞报告。

后续可选增强方向：

- 在 MCP server 内增加可选 gate state machine，让工具调用可以绑定 approved design version、allowed write set 和 test evidence。
- 给 RAG 写入工程闸门结果的模板，沉淀 approved plan、测试命令和阻塞报告。
- 增加 gate audit self-test，检查提示词、skill 和 release package 是否都包含工程闸门入口。

## MCP server 模块拆分

当前 MCP server 已完成多段拆分：外部模型 provider、HTTP JSON client、重试逻辑和 API key 状态已移动到 `lib/model.mjs`；workspace path validation、symlink 防逃逸、授权读写、JSON edit 校验、checksum、diff 生成和 patch/edit 应用已移动到 `lib/workspace.mjs`；workspace edit prompt、JSON repair 和 apply repair flow 已移动到 `lib/workspace-edit-flow.mjs`；本地项目记忆库工具编排和 JSONL 存储保留在 `lib/rag.mjs`，RAG 元数据/过滤、secret scan、分块和词法评分分别移动到 `lib/rag-metadata.mjs`、`lib/rag-security.mjs`、`lib/rag-text.mjs`；JSON-RPC stdio 协议、tool schema helper、`.env` loader 和 MCP progress/log notification 出口已移动到 `lib/mcp.mjs`。主入口 `scripts/multi-model-agents-mcp.mjs` 主要负责工具定义、路由和跨角色编排。

随着工具数量继续增加，主入口仍会有维护压力。

后续建议拆分为：

- `lib/model.mjs`：provider 配置、HTTP client、OpenAI-compatible、Anthropic、Gemini 调用。（已完成）
- `lib/workspace.mjs`：workspace path validation、symlink 防逃逸、授权读写、diff 生成、patch/edit 应用和 checksum 校验。（已完成）
- `lib/workspace-edit-flow.mjs`：workspace edit prompt、JSON repair 和 apply repair flow。（已完成）
- `lib/rag.mjs`：本地项目记忆库工具编排、JSONL 存储、ingest、note、search、get。（已完成）
- `lib/rag-metadata.mjs`：RAG collection、tags、type、confidence、scope、status 和检索过滤。（已完成）
- `lib/rag-security.mjs`：RAG forbidden paths、secret scan、安全输出和错误脱敏。（已完成）
- `lib/rag-text.mjs`：RAG 分块、词法 token 和本地评分。（已完成）
- `lib/mcp.mjs`：JSON-RPC stdio 协议、tool schema helper、`.env` loader 和 MCP progress/log notification 出口。（已完成）

拆分原则：

- 不引入 npm 依赖。
- 先移动纯函数和自测覆盖较高的逻辑。
- 每次拆分都跑完整离线自检和发布包校验。
- 保持 `.mcp.json` 入口仍指向 `./scripts/multi-model-agents-mcp.mjs`，入口文件只负责组装模块。

## 外部模型流式响应

当前外部模型调用默认仍使用非流式 HTTP JSON 请求。V1.4.5 已增加模型层内部 SSE 聚合模式，可通过 `MMA_MODEL_STREAMING=true` 启用：OpenAI-compatible 走 chat completions stream，Anthropic 走 messages stream，Gemini 走 streamGenerateContent。该模式仍会聚合为完整文本后返回给 MCP tool，不改变工具协议，也不会边流边写文件。

V1.4.5 已增加 Codex 客户端可见的 MCP 进度/日志通知：

- `lib/mcp.mjs` 通过 `notifications/message` 发送工具开始、模型调用、流式片段、JSON 校验、应用 diff、完成和失败提示。
- `multi_model_role_call`、`multi_model_tester_plan`、`multi_model_reviewer_findings`、`multi_model_coder_patch` 和 `multi_model_coder_workspace_edit` 都能产生可见进度/日志。
- 当前实现是 MCP `notifications/message` 日志通知，不是带 progress token 的标准进度条。
- `multi_model_coder_workspace_edit` 默认仍只返回最终完整 JSON edit、diff 和结构化结果。

设计边界：

- 默认仍使用非流式，避免破坏现有网关兼容性。
- 模型层流式只作为 `MMA_MODEL_STREAMING=true` 启用。
- MCP tool 最终仍返回完整文本、JSON edit、diff 和结构化结果。
- workspace edit 必须在完整 JSON 解析和校验通过后才允许写文件，不能边流边写。
- 保留当前 HTTP 重试逻辑；流式重试只能发生在没有开始产生有效内容之前。

## 语义 RAG / 增强检索

当前本地项目记忆库是 JSONL 存储加词法检索，不引入 embedding 或向量数据库。它适合安全、可审查、低依赖的项目记忆，但召回质量有上限。

V1.4.5 已完成本地知识质量层：

- `multi_model_rag_note` 和 `multi_model_rag_ingest` 支持 `confidence`、`verified_by`、`expires_at`、`scope`、`aliases`、`status`。
- `multi_model_rag_search` 支持 `trusted_only`、`include_expired`、`min_confidence`、`type`、`status`、`scope`、`verified_by` 过滤。
- 搜索默认只返回 trusted、active、未过期知识，避免历史结论在上下文压缩后继续误导新线程。
- `aliases` 参与本地词法评分，用于在不引入 embedding 的前提下改善同义词召回。

后续可选增强方向：

- 增加可配置 embedding provider，默认关闭。
- 保留词法检索作为 fallback 和安全基线。
- 增加冲突知识检测，例如同一命令或架构约定出现不同结论时提示 Codex 审查。
- 增加更严格的 RAG 写入审查门，要求 evidence、source、confidence、适用范围和过期策略。

安全边界：

- embedding 不应默认启用。
- 不向外部 embedding provider 发送 `.env`、凭据、生产数据、私有日志或未授权文件。
- 检索结果仍由 Codex 主控筛选后，才允许传给 Opus/Gemini。

## Patch/Edit 操作模式

V1.4.5 已为 `multi_model_coder_workspace_edit` 增加 patch/edit 局部编辑模式。完整文件内容加 `expected_sha256` 仍保留，用于新文件或大范围重写；小改动优先使用 `edits` 数组。

V1.4.5 已增强 workspace edit repair prompt：当 `find` / `anchor` 出现 0 次或多次匹配时，修复重试会要求模型扩大上下文、包含附近稳定代码，禁止 regex、模糊匹配、行号或占位符；如果无法保证唯一匹配，必须退回完整 `files` 模式或返回风险说明。

当前支持：

- `find` / `replace`
- `insert_after`
- `insert_before`

暂不支持直接应用 unified diff。统一 diff 仍作为审查输出，不作为自动写入格式。

验收标准：

- 每个编辑必须有明确目标文件和预期上下文。
- 找不到唯一匹配或匹配多处时拒绝写入。
- 仍保留 `expected_sha256` 前置状态校验。
- 返回可审查 diff，并由 Codex 运行真实测试后接受。
