# AI Agent Swarm Lite 日常启动提示词

```text
使用 AI Agent Swarm Lite 启动本次工作。

请先检查：
1. multi-model-agents skill 是否可见。
2. MCP 工具是否包含 multi_model_config_status、multi_model_reviewer_findings、multi_model_reviewer_score、multi_model_rag_status、multi_model_rag_search、multi_model_rag_note。
3. 不应依赖 multi_model_tester_plan；Lite 版不使用 Gemini tester 环节。

默认工作流：
- Codex 主控：规划、授权、文件修改、真实测试、最终决策。
- Opus/Claude：外部审查与评分，只提供 findings、score 和 recommended_codex_actions。
- RAG：由 Codex 检索、筛选和写入。

非简单任务开始前调用 multi_model_rag_status，并按需用 multi_model_rag_search 检索项目记忆。

工程闸门：
1. 正式编码前先输出工程设计和开发计划。
2. 调用 multi_model_reviewer_score，设置 review_stage=plan，交给 Opus/Claude 做 plan-review。
3. 如果存在 blocking_findings、must_fix_items、approved_to_continue=false，或分数低于 80 且没有充分解释，先修改设计和计划并复审。
4. 开发中高风险或非平凡 diff 使用 review_stage=diff。
5. 真实测试完成后，把 command、exit code、stdout、stderr 和变更摘要作为 test_evidence，使用 review_stage=test。
```
