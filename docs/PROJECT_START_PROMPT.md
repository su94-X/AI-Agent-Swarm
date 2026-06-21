# 项目启动提示词

在目标项目目录中开始真实编码任务时，可以使用下面这段提示词。本提示词默认强制使用可见角色子智能体工作流；不需要再单独发送 `docs/SUBAGENT_START_PROMPT.md`。

## 提示词

```text
请在这个项目中使用 multi-model-agents 插件，并默认把 Coder、Reviewer、Tester、Test Runner、RAG Curator 拆成可见 Codex 子智能体。除非任务只是简单问答、纯解释、单条命令查询，或当前线程没有可用的子智能体工具，否则不要退回主智能体单独完成。

请先确认插件已加载：
1. 确认 multi-model-agents skill 可见。
2. 确认以下工具存在：
   - multi_model_config_status
   - multi_model_coder_patch
   - multi_model_coder_workspace_edit
   - multi_model_reviewer_findings
   - multi_model_tester_plan
   - multi_model_role_call
3. 调用 multi_model_config_status，并在不打印 key 值的前提下汇总各角色就绪状态。
4. 调用 multi_model_rag_status。非简单任务先用 multi_model_rag_search 做探索检索；凡是要进入 plan、constraints、known_test_commands、review context，或要传给 Opus/Gemini 的 RAG 片段，必须用严格检索：显式设置 scope，建议设置 min_confidence >= 0.9，并在知道来源时设置 verified_by。expired、deprecated、superseded、低置信度或不同 scope 的结果只能作为历史线索，不得作为当前执行事实。

角色分工：
- Codex 是主控：负责方案、边界授权、diff 审查、真实本地测试执行和最终决策。
- Opus/Claude 是主要编码作者：安全时使用 multi_model_coder_workspace_edit 让它在授权范围内实现代码。
- Codex 内部 gpt-5.5 是默认 reviewer：除非我明确要求外部第二意见，不要调用外部 reviewer。
- Gemini 是测试策略和失败日志分析角色：使用 multi_model_tester_plan 获取测试建议、边界用例和失败分析。
- Custom 是可选外部模型角色：只有我明确分配任务时才使用 multi_model_role_call。

工程闸门：
- 非简单任务正式编码前必须先输出工程设计和开发计划。
- 计划必须交给 Opus/Claude 做 plan-review；有阻断项或必须修改项时，先修计划并复审。
- 高风险或非平凡 diff 必须做 diff-review。
- 真实测试必须记录 command、exit code、stdout、stderr，并交给 Gemini 做 test-review/failure analysis。

默认必须使用的可见角色子智能体：
- Coder Subagent 调用 multi_model_coder_workspace_edit，由 Opus/Claude 执行主要编码。
- Reviewer Subagent 做 Codex 内部审查；小 diff 可以由主智能体直接审查。Reviewer 不要调用 mcp__codex，也不要生成嵌套智能体。
- Tester Subagent 调用 multi_model_tester_plan，由 Gemini 生成测试计划和失败分析。
- Test Runner Subagent 运行批准后的真实本地命令。
- RAG Curator Subagent 整理可写入 RAG 的候选知识；最终写入仍由 Main Orchestrator 完成。
- Main Orchestrator 汇总所有角色输出并做最终判断。

降级规则：
- 如果当前 Codex 线程没有子智能体工具，请明确说明“当前线程没有可见子智能体工具”，然后继续用主智能体和 MCP 工具完成任务。
- 如果任务只是简单问答、纯解释或单条命令查询，可以不创建子智能体，但要说明这是简单任务降级。

编码任务流程：
1. 先阅读足够的项目上下文，识别相关文件。
2. 给出简洁方案，并明确准备授权的 allowed_read_paths 和 allowed_write_paths。
3. 不要授权读取或写入 .env、.git、node_modules、dist、build、coverage、凭据文件或无关文件。
4. 优先调用 multi_model_coder_workspace_edit，并传入：
   - workspace_root
   - allowed_read_paths
   - allowed_write_paths
   - constraints
   - dry_run：高风险改动先设为 true
5. 小范围明确修改优先让 coder 使用 edits 局部编辑。审查返回的 diff 后再接受结果，并记录 changed_files、变更行数、changed_file_details.mode、是否有无关格式化/重排和 repairEvents。
6. 需要时请 Gemini 给出测试策略。
7. 真实测试由 Codex 在本地运行。
8. 如果测试失败，把真实日志交给 Gemini 分析，或把明确修复任务交给 Opus/Claude。
9. 最后汇总变更、实际运行的测试、剩余风险和最终结论。

任何时候都不要把密钥、.env、无关仓库内容或私有数据发给外部模型。
子智能体不得跨角色工作：Coder 不做最终决策，Tester 不改代码，Reviewer 不运行测试或实现代码，Test Runner 不做测试策略，RAG Curator 不直接写入 trusted RAG。
```

## 预期结果

Codex 应在明确边界内让 Opus/Claude 负责主要代码实现，让 Gemini 提供测试计划和失败分析，并由 Codex 保留真实执行、审查和最终接受权。
