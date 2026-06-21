---
name: multi-model-agents
description: 当 Codex 需要使用 AI Agent Swarm Lite 精简工作流时使用：Codex 保持主控，负责规划、授权、真实测试和最终决策；Opus/Claude 通过 MCP 工具提供外部审查、风险判断和 0-100 评分；不使用 Gemini tester 工作环节。
---

# AI Agent Swarm Lite

使用本 skill 通过 `multi-model-agents` MCP 工具运行精简多模型工作流。

Lite 版原则：

1. Codex 始终是主控，负责方案、授权、文件修改、命令执行、测试结果判断、RAG 写入和最终决策。
2. Opus/Claude 是外部 reviewer/scorer，负责 plan-review、diff-review、test-review、final-review，只提供审查 findings、风险判断、评分、must-fix items 和建议动作。
3. 不使用 Gemini tester 环节；真实测试由 Codex 本地执行。
4. 外部模型不直接写 RAG，不直接决定接受/拒绝。
5. RAG 是 Codex 主控的本地项目记忆库；检索结果必须由 Codex 筛选后再进入上下文。

## 工具

- `multi_model_reviewer_findings`：让 Opus/Claude 审查方案、diff 或结果，返回证据绑定 findings。
- `multi_model_reviewer_score`：让 Opus/Claude 对 `plan`、`diff`、`test` 或 `final` 闸门给出 0-100 总分、分项评分、阻塞问题、must-fix items、`approved_to_continue` 和 Codex 下一步动作。
- `multi_model_coder_patch`：可选补丁建议，不直接写文件。
- `multi_model_coder_workspace_edit`：保留受控 workspace edit 能力，但 Lite 默认不作为主流程。
- `multi_model_role_call`：调用 custom 或指定外部模型角色。
- `multi_model_config_status`：查看角色配置，不打印 API key。
- `multi_model_rag_status` / `multi_model_rag_search` / `multi_model_rag_get` / `multi_model_rag_note` / `multi_model_rag_ingest`：本地项目记忆库工具。

## 默认流程

1. 调用 `multi_model_config_status`，确认 reviewer/scorer 的 Opus/Claude 配置可用。
2. 调用 `multi_model_rag_status`。非简单任务先用 `multi_model_rag_search` 检索项目记忆。
3. 非简单任务正式编码前，Codex 必须产出工程设计和开发计划，并调用 `multi_model_reviewer_score` 做 `review_stage: "plan"` 审查。存在阻断项、must-fix items 或 `approved_to_continue: false` 时，必须先修计划并复审。
4. Codex 按批准计划执行必要文件修改或命令；重要步骤后做 diff 检查，高风险或非平凡改动调用 `review_stage: "diff"`。
5. 真实测试完成后，把 command、exit code、stdout、stderr 和变更摘要作为 `test_evidence` 传给 `review_stage: "test"`。
6. Codex 根据评分、findings、must-fix items 和真实测试结果决定接受、继续修改或回退。
7. 任务结束后，只把已验证结论写入 RAG。

## 边界

- 不要调用 `multi_model_tester_plan`；Lite 版不暴露 Gemini tester 工具。
- 不要把 Opus/Claude 的评分当作最终结论。
- 不要在工程闸门未通过时进入正式编码，除非用户明确批准降级为 Codex-only 审查。
- 不要把未验证的外部模型输出写入 trusted RAG。
- 不要向外部模型发送 `.env`、API key、生产数据或无关仓库内容。
