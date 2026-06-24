# AI Agent Swarm Lite 安装检查提示词

把下面这段发送给 Codex，用于首次安装、更新插件后，或新线程里确认插件是否可用。

```text
请检查 AI Agent Swarm Lite 是否在当前 Codex 线程中可用。

检查要求：
1. 确认 multi-model-agents skill 可见。
2. 确认 MCP 工具可见：
   - multi_model_config_status
   - multi_model_reviewer_findings
   - multi_model_reviewer_score
   - multi_model_role_call
   - multi_model_rag_status
   - multi_model_rag_search
   - multi_model_rag_get
   - multi_model_rag_note
   - multi_model_rag_ingest
3. Lite 版不应依赖 multi_model_tester_plan，也不使用 Gemini tester 工作流。
4. 调用 multi_model_config_status，只汇总 provider、model、apiKeyEnv、apiKeySource、hasApiKey，不打印 key。
5. 调用 multi_model_rag_status，确认本地项目记忆库状态。
6. 如果 reviewer provider 显示为 codex-internal，说明可能沿用了完整版旧 .env；Lite 版应改为 MMA_REVIEWER_PROVIDER=anthropic。
7. 确认 docs/ENGINEERING_GATE.md、docs/OFFICIAL_DOCS_GATE.md 和 templates/ 存在；非简单任务默认需要 plan-review、diff-review、test-review、Progress Ledger 和必要的官方证据闸门。
8. 确认 Lite 官方 Custom Agent 模板存在：.codex/agents/opus-reviewer.toml、test-runner.toml、rag-curator.toml、security-auditor.toml。说明这些模板需要位于当前项目 .codex/agents/ 或用户级 ~/.codex/agents/ 才会被 Codex 作为 Custom Agents 加载。
9. 检查 Opus Reviewer 执行合同：opus-reviewer 必须声明调用 multi_model_reviewer_score 或 multi_model_reviewer_findings，不得自己直接审查评分。START_PROMPT.md 也必须要求 Main Orchestrator 在 spawn message 中重复这个合同。
10. 如可用，运行 custom-agents-self-test 和 engineering-gate-docs-self-test。

请输出：
- Lite 插件是否加载成功。
- Opus/Claude reviewer/scorer 是否具备 API key。
- RAG 是否可写。
- 工程闸门是否可用。
- 工程模板和官方文档证据闸门是否可用。
- Custom Agent 模板是否存在。
- 如果不可用，给出最小修复步骤，不要请求或打印任何密钥。
```
