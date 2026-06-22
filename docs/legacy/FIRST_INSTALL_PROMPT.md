# AI Agent Swarm Lite 首次安装检查提示词

```text
请检查 AI Agent Swarm Lite 是否在当前 Codex 线程中可用。

需要确认：
1. multi-model-agents skill 可见。
2. MCP 工具可见：
   - multi_model_config_status
   - multi_model_reviewer_findings
   - multi_model_reviewer_score
   - multi_model_role_call
   - multi_model_rag_status
   - multi_model_rag_search
   - multi_model_rag_get
   - multi_model_rag_note
   - multi_model_rag_ingest
3. multi_model_tester_plan 不应作为 Lite 工作流依赖。
4. 调用 multi_model_config_status，只汇总 provider、model、apiKeyEnv、apiKeySource、hasApiKey，不打印 key。
5. 调用 multi_model_rag_status，确认本地项目记忆库状态。
6. 如果 reviewer provider 显示为 codex-internal，说明沿用了完整版旧 .env；Lite 版应改为 MMA_REVIEWER_PROVIDER=anthropic。
7. 确认 docs/ENGINEERING_GATE.md 存在；非简单任务默认需要 plan-review、diff-review 和 test-review。

结论请说明：
- Lite 插件是否加载成功。
- Opus/Claude reviewer/scorer 是否具备 API key。
- RAG 是否可写。
- 工程闸门文档是否可用。
```
