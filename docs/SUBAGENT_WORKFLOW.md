# AI Agent Swarm Lite 可见角色流程

Lite 版默认只保留必要角色，避免复杂多 Agent 流水线。

| 角色 | 底层能力 | 工具 | 职责 |
| --- | --- | --- | --- |
| Main Orchestrator | Codex | 本地工具 + RAG 工具 | 规划、授权、文件修改、真实测试、最终决策 |
| Reviewer / Scorer | Opus/Claude | `multi_model_reviewer_findings` / `multi_model_reviewer_score` | 外部审查、风险判断、0-100 评分 |
| RAG Curator | Codex | RAG 工具 | 整理候选知识，最终由主控写入 |
| Custom | 可配置 | `multi_model_role_call` | 非标准外部模型任务 |

## 主流程

1. Main Orchestrator 调用 `multi_model_config_status`。
2. Main Orchestrator 调用 `multi_model_rag_status`，必要时调用 `multi_model_rag_search`。
3. Codex 制定工程设计和开发计划。
4. Reviewer / Scorer 调用 `multi_model_reviewer_score`，设置 `review_stage: "plan"`，做 plan-review。
5. 只有没有 blocking findings、must-fix items 且 Codex 确认计划可执行后，才进入文件修改或命令执行。
6. 高风险或非平凡 diff 调用 `review_stage: "diff"`。
7. 真实测试完成后调用 `review_stage: "test"`，传入 command、exit code、stdout、stderr 和变更摘要。
8. Codex 根据真实测试和外部评分做最终决定。
9. 已验证的 bug、命令、决策或风险由 Codex 写入 RAG。

## Reviewer / Scorer 输出要求

- `overall_score`：0-100。
- `dimension_scores`：正确性、安全、回归、可维护性、范围控制、测试证据。
- `blocking_findings`：应阻塞接受的问题。
- `non_blocking_findings`：可后续处理的问题。
- `evidence`：每条结论绑定 task、plan、diff、changed_files 或真实日志证据。
- `recommended_codex_actions`：Codex 下一步应检查、测试或决策的动作。
- `must_fix_items`：继续前必须处理的问题。
- `approved_to_continue`：外部 reviewer/scorer 是否建议进入下一阶段。
- `stage_specific_review`：针对 plan-review、diff-review、test-review 或 final-review 的阶段结论。

## 禁止事项

- 不使用 Gemini tester 环节。
- 不把 Opus/Claude 评分当作最终决定。
- 不让外部模型直接写 RAG。
- 不向外部模型发送 `.env`、API key、生产数据或无关仓库内容。
