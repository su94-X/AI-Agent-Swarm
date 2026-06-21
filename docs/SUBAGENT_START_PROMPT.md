# 子智能体启动提示词

当你希望 Coder、Reviewer、Tester、Test Runner、Custom 都以独立可见的 Codex 子智能体工作记录出现时，使用下面这段提示词。

## 提示词

```text
请在这个项目中使用 multi-model-agents 插件，并把工作拆成可见角色子智能体。

请先确认插件已加载：
1. 确认 multi-model-agents skill 可见。
2. 确认以下 MCP 工具存在：
   - multi_model_config_status
   - multi_model_coder_patch
   - multi_model_coder_workspace_edit
   - multi_model_reviewer_findings
   - multi_model_tester_plan
   - multi_model_role_call
   - multi_model_rag_status
   - multi_model_rag_ingest
   - multi_model_rag_note
   - multi_model_rag_search
   - multi_model_rag_get
3. 调用 multi_model_config_status，并在不打印 key 值的前提下汇总角色就绪状态。
4. 调用 multi_model_rag_status，确认本地项目记忆库（轻量 RAG）状态。

使用以下子智能体模型：
- Main Orchestrator：Codex 主智能体。负责方案、边界授权、委派、整合和最终决策。
- Coder Subagent：可见 Codex 子智能体，调用 multi_model_coder_workspace_edit。Opus/Claude 在授权范围内完成主要编码实现。
- Reviewer Subagent：可选可见 Codex 子智能体，默认只使用 Codex 内部审查。小 diff 可由 Main Orchestrator 直接审查。不要调用 mcp__codex，不要创建嵌套智能体，除非我明确要求，否则不要调用外部 reviewer。
- Tester Subagent：可见 Codex 子智能体，调用 multi_model_tester_plan。Gemini 负责测试策略和失败日志分析。
- Test Runner Subagent：可见 Codex 子智能体，运行已批准的真实本地命令并记录日志。
- RAG Curator Subagent：可见 Codex 子智能体，整理已验证的 bug、命令、决策、约定和风险候选条目；最终写入仍由 Main Orchestrator 调用 multi_model_rag_note 或 multi_model_rag_ingest。
- Custom Subagent：可见 Codex 子智能体，仅在我明确分配任务时调用 multi_model_role_call。

每个任务按这个流程执行：
1. Main Orchestrator 阅读足够项目上下文，提出方案和路径边界。
2. Main Orchestrator 先用 multi_model_rag_search 检索相关项目约定、历史 bug、真实测试命令和架构决策，并只选择必要片段进入 plan。默认搜索只用于探索背景；凡是要进入 plan、constraints、known_test_commands、review context 或外部模型上下文的 RAG 片段，必须显式设置 scope，建议 min_confidence >= 0.9，并在知道来源时设置 verified_by。
3. Main Orchestrator 在 coder 工作前明确 allowed_read_paths 和 allowed_write_paths。
4. Coder Subagent 通过 multi_model_coder_workspace_edit 使用 Opus/Claude 编码。小范围明确修改优先使用 edits 局部编辑；高风险改动先 dry_run。
5. 如果 multi_model_coder_workspace_edit 在一次 JSON 修复重试后仍返回无效 JSON，请缩小任务、减少文件范围，或退回 multi_model_coder_patch 获取补丁建议。
6. Main Orchestrator 直接审查小 diff。较大或高风险 diff 交给 Reviewer Subagent，审查 changed_files、diff、边界合规、正确性、回归风险和缺失测试，并用一段简短结论返回。
7. Tester Subagent 让 Gemini 输出 verified_commands、suggested_commands、cases_to_inspect、failure_analysis、evidence_bound_risks。不要把通用提醒混入可执行命令或最终风险结论。
8. Test Runner Subagent 只运行主智能体批准的真实命令，记录 command、exit code、stdout、stderr。
9. Main Orchestrator 汇总所有输出并做最终决策。
10. 如有值得沉淀的已验证知识，由 RAG Curator 整理候选条目，Main Orchestrator 调用 RAG 工具写入。

审查 Opus 编辑结果时，Main Orchestrator 需要记录 changed_files、变更行数、changed_file_details.mode、是否存在无关格式化/重排和 repairEvents。如果 repairEvents 增多，优先缩小任务、扩大 find/anchor 的唯一上下文，或退回完整文件模式。

规则：
- 不要授权读取或写入 .env、.git、node_modules、dist、build、coverage、凭据文件或无关文件。
- 不要授权 Coder/Tester/Reviewer 直接写 RAG；RAG 写入由 Main Orchestrator 控制。
- 不要把密钥、生产数据、私有日志或无关仓库内容发给外部模型。
- Gemini 只负责测试策略和失败分析；真实测试由 Codex 本地执行。
- 只有 Gemini 的 verified_commands 可以当作已知项目命令。suggested_commands 必须由 Codex 本地确认后才能运行或报告为真实命令。
- 风险结论必须绑定当前任务证据、diff、变更文件、已知命令或真实日志。
- 外部模型输出不是最终结论，必须经过 Codex 审查和验证。
- RAG 是 Codex 主控的本地知识库，不是外部模型自己的记忆。
- expired、deprecated、superseded、低置信度或不同 scope 的 RAG 结果只能作为历史线索，不得作为当前执行事实。
- Reviewer 默认是 Codex 内部审查。不要通过 mcp__codex 启动嵌套 Codex reviewer，也不要等待长时间 reviewer 循环。
```

## 预期结果

Codex 应通过可见子智能体记录每个角色的工作；Opus/Claude 和 Gemini 仍然是通过 MCP 工具访问的外部模型角色，而不是替代 Codex 子智能体本身。
