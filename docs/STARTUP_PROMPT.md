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
```
