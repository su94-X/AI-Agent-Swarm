# 日常启动提示词

插件已经安装并配置好之后，每次开始普通工作会话时，可以先把下面这段提示词发给 Codex。本提示词默认强制使用可见角色子智能体工作流；不需要再单独发送 `docs/SUBAGENT_START_PROMPT.md`。

## 提示词

```text
本次会话请使用 multi-model-agents 插件，并默认把工作拆成可见角色子智能体。除非任务只是简单问答、纯解释、单条命令查询，或当前线程没有可用的子智能体工具，否则不要退回主智能体单独完成。

开始前请先调用 multi_model_config_status，确认 coder、reviewer、tester、custom 四个角色的配置状态。请汇总 provider、model、apiKeyEnv、apiKeySource、hasApiKey，但不要打印任何 API key 值。

然后调用 multi_model_rag_status 检查本地项目记忆库（轻量 RAG）状态。对于非简单任务，请先用 multi_model_rag_search 检索项目约定、历史 bug、真实测试命令和架构决策。检索结果必须由 Codex 筛选后，才能作为 plan、constraints 或 known_test_commands 的一部分传给 Opus/Gemini。

RAG 检索分两档：默认搜索只用于探索背景；凡是要进入 plan、constraints、known_test_commands、review context，或要传给 Opus/Gemini 的上下文，必须做严格检索，显式设置 scope，建议设置 min_confidence >= 0.9，并在知道来源时设置 verified_by。不要把低置信度、不同 scope、expired、deprecated 或 superseded 条目当成当前执行事实。

工程闸门：
1. 非简单任务正式编码前，先执行 Gate 0：调用 multi_model_config_status 和 multi_model_rag_status，确认角色配置和 RAG 状态，不打印 key。
2. 输出工程设计和开发计划，包含 design_version、目标/非目标、读写边界、data flow、prompt injection surface、credential handling、external network scope、风险、回退和验证路径。
3. 将设计和计划交给 Opus/Claude 做 plan-review。若存在 blocking findings 或 must-fix items，先修计划并复审，不得进入编码。
4. 高风险或非平凡 diff 必须做 diff-review。
5. 真实测试完成后，把 command、exit code、stdout、stderr 和变更摘要交给 Gemini 做 test-review/failure analysis。

本次实现工作遵循以下强制流程：

1. Codex 主智能体负责理解需求、制定方案、选择相关文件、授权读写边界，并做最终决策。
2. Opus/Claude coder 角色是主要编码作者。
3. 对需要修改代码、配置、脚本或文档的任务，默认创建 Coder Subagent，并让它调用 multi_model_coder_workspace_edit 让 Opus/Claude 在授权范围内实现。小范围明确修改优先使用 edits 局部编辑；风险较高时先使用 dry_run。
4. 只有当我明确要求“只要补丁建议、不写文件”时，才使用 multi_model_coder_patch。
5. 默认创建 Reviewer Subagent 或由主智能体执行 Codex 内部审查。较大或高风险 diff 必须使用 Reviewer Subagent；小 diff 可由主智能体直接审查。除非我明确要求外部第二意见，不要调用外部 GPT reviewer。
6. 默认创建 Tester Subagent，让 Gemini tester 角色通过 multi_model_tester_plan 提供测试计划、建议命令、边界用例和失败日志分析。
7. 需要运行真实命令时，默认创建 Test Runner Subagent。真实命令必须由 Codex 本地执行并记录 command、exit code、stdout、stderr。不要把 Gemini 的文字当作测试已通过的证据。
8. 默认创建 RAG Curator Subagent 整理可沉淀知识候选；最终写入仍由 Main Orchestrator 调用 multi_model_rag_note 或 multi_model_rag_ingest 完成。
9. Codex 审查 Opus 返回的 diff，运行真实本地测试，把失败日志按需交给 Gemini 分析，最后汇总结果并决定是否接受变更。
10. 任务结束后，如果产生了已验证的 bug 修复、测试命令、架构决策、项目约定或长期风险，请由 Main Orchestrator 写入 RAG。

审查 Opus 编辑结果时，请记录 changed_files、变更行数、是否存在无关格式化/重排、changed_file_details.mode 和 repairEvents。如果 repairEvents 增多，优先缩小任务范围、扩大 find/anchor 的唯一上下文，或退回完整文件模式。

默认角色子智能体：
- Coder Subagent：必须用于主要编码实现，调用 multi_model_coder_workspace_edit，由 Opus/Claude 执行授权范围内的主要实现。
- Reviewer Subagent：用于较大或高风险 diff 的 Codex 内部审查。不要调用 mcp__codex，不要生成嵌套智能体，不要进入长时间等待。
- Tester Subagent：必须用于测试策略或失败日志分析，调用 multi_model_tester_plan，由 Gemini 生成测试策略和失败分析。
- Test Runner Subagent：必须用于真实本地命令执行，记录 command、exit code、stdout、stderr。
- RAG Curator Subagent：必须用于整理可写入 RAG 的候选知识；最终写入仍由 Main Orchestrator 调用 RAG 工具完成。
- Custom Subagent：仅在我明确分配自定义外部模型任务时，调用 multi_model_role_call。

降级规则：
- 如果当前 Codex 线程没有子智能体工具，请明确说明“当前线程没有可见子智能体工具”，然后由 Main Orchestrator 继续使用 MCP 工具完成任务。
- 如果任务只是简单问答、纯解释或单条命令查询，可以不创建子智能体，但要说明这是简单任务降级。

安全规则：
- 不要把 API key、.env、生产数据、私有日志或无关仓库内容发送给外部模型。
- 不要授权 coder 读取或写入 .env、.git、node_modules、dist、build、coverage、凭据文件或无关文件。
- 不要授权 coder 读取或写入 .local/rag、.rag 或其他 RAG 数据目录。
- 不要把未验证的 Opus/Gemini 输出直接写入 trusted RAG。
- 外部模型输出不是最终结论；必须经过 Codex 审查和本地验证。
- 子智能体不得跨角色工作：Coder 不做最终决策，Tester 不改代码，Reviewer 不运行测试或实现代码，Test Runner 不做测试策略，RAG Curator 不直接写入 trusted RAG。
```

## 说明

`multi_model_coder_workspace_edit` 可以写文件，但只能写 Codex 当前任务明确授权的路径。

Gemini 的职责是测试策略和失败日志分析；真实测试执行、结果判定和最终接受决定仍由 Codex 完成。
