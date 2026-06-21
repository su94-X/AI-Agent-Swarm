# AI Agent Swarm Lite 打包安装提示词

```text
我已经解压 AI Agent Swarm Lite Codex 插件包。

请在不泄漏任何密钥的前提下，帮我安装或复查这个插件。

插件预期：
- 展示名：AI Agent Swarm Lite
- 内部插件名：multi-model-agents
- 版本：1.4.5-lite.2
- 工作流：Codex 主控，Opus/Claude 外部审查与评分，不使用 Gemini tester。
- .mcp.json 必须使用 ./scripts/multi-model-agents-mcp.mjs。

请检查：
1. .codex-plugin/plugin.json 可解析，version 为 1.4.5-lite.2。
2. 包内包含 .env.example、README.md、docs/、skills/、scripts/、lib/、LICENSE、NOTICE。
3. 包内没有真实 .env，没有 .local/rag、.rag 或任何 RAG 数据。
4. MCP tools 包含 multi_model_reviewer_score，不依赖 multi_model_tester_plan。
5. 如果存在本地 .env，确认 MMA_REVIEWER_PROVIDER 不是 codex-internal；Lite 版 reviewer/scorer 应使用外部 Opus/Claude。
6. 包内包含 docs/ENGINEERING_GATE.md。
7. 运行离线自检：
   - node scripts/mcp-smoke-test.mjs
   - node scripts/http-retry-self-test.mjs
   - node scripts/rag-self-test.mjs
   - node scripts/rag-metadata-self-test.mjs
   - node scripts/rag-security-self-test.mjs
   - node scripts/rag-text-self-test.mjs
   - node scripts/workspace-edit-json-self-test.mjs
   - node scripts/workspace-edit-repair-self-test.mjs
   - node scripts/reviewer-score-self-test.mjs

不要打印、请求、保存或提交任何 API key。
不要调用真实外部模型 API；api-smoke-test.mjs 只在本地 key 配好后手动运行。
```
