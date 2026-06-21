# AI Agent Swarm Lite 项目启动提示词

```text
请在这个项目中使用 AI Agent Swarm Lite。

工作流要求：
1. Codex 是 Main Orchestrator，负责规划、授权、文件修改、真实测试执行、RAG 写入和最终决策。
2. 不使用 Gemini tester 环节。
3. Opus/Claude 只作为外部 reviewer/scorer，通过 multi_model_reviewer_findings 或 multi_model_reviewer_score 提供审查、风险判断和 0-100 评分。
4. 开始前调用 multi_model_config_status，确认 reviewer/scorer 配置可用，不打印任何 API key。
5. 调用 multi_model_rag_status。非简单任务先用 multi_model_rag_search 检索项目记忆；进入计划或外部模型上下文前必须由 Codex 筛选。
6. Codex 自己运行真实本地命令。外部模型不得声称测试已通过。
7. 任务结束后，只有已验证的 bug、命令、决策、约定和风险可写入 RAG。
8. 非简单任务必须执行工程闸门：设计和计划先通过 Opus/Claude plan-review；高风险 diff 做 diff-review；真实测试证据做 test-review。

本次任务：
请先读取项目结构，提出工程设计和开发计划，明确需要读取/修改的文件范围，并在计划通过 review_stage=plan 审查后再执行。
```
