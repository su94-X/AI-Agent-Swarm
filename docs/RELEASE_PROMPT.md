# AI Agent Swarm Lite 发布提示词

维护者发布 Lite 版本时发送下面这段提示词。发布前请确认当前分支是 `lite-opus-review`。

```text
请发布 AI Agent Swarm Lite 当前版本。

要求：
1. 当前分支必须是 lite-opus-review。
2. 不读取、不打印、不提交 .env、API key、GitHub token、RAG 数据或本地缓存。
3. 确认 .codex-plugin/plugin.json 可解析，version 与本次 tag 一致，plugin.json 为 ASCII-only。
4. 确认 .mcp.json 仍使用 ./scripts/multi-model-agents-mcp.mjs，不含本机绝对路径。
5. 确认 Lite 版不暴露 multi_model_tester_plan，不使用 Gemini tester 工作流。
6. 确认 docs/README.md、docs/INSTALL_PROMPT.md、docs/START_PROMPT.md、docs/RELEASE_PROMPT.md 存在。
7. 确认 .codex/agents/*.toml Lite 官方 Custom Agent 模板存在，且文档说明 Custom Agents 从项目级 .codex/agents/ 或用户级 ~/.codex/agents/ 加载，Skill 不是子智能体创建机制。
8. 确认 Opus Reviewer 执行合同没有回归：`opus-reviewer` 必须调用 `multi_model_reviewer_score` 或 `multi_model_reviewer_findings` 且不得自己直接审查评分；`START_PROMPT.md` 必须要求 Main Orchestrator 在 spawn message 中重复这个合同。
9. GitHub Release token 只能从环境变量或用户级凭据文件读取，不得写入仓库、.env、README、release note、RAG、issue、PR、截图或聊天记录。

请运行离线验证：
- node --check 所有 .mjs 文件
- node scripts/mcp-smoke-test.mjs
- node scripts/http-retry-self-test.mjs
- node scripts/model-secret-self-test.mjs
- node scripts/rag-self-test.mjs
- node scripts/rag-metadata-self-test.mjs
- node scripts/rag-security-self-test.mjs
- node scripts/rag-text-self-test.mjs
- node scripts/workspace-edit-json-self-test.mjs
- node scripts/workspace-edit-repair-self-test.mjs
- node scripts/reviewer-score-self-test.mjs
- node scripts/custom-agents-self-test.mjs
- python validate_plugin.py
- python quick_validate.py

请生成发布包：
node scripts/package-release.mjs <outputs-dir>

发布包必须：
- 包名为 ai-agent-swarm-lite-<version>.zip。
- 包内路径统一使用 /。
- 包含 .codex/agents/*.toml、.env.example、README.md、docs/、skills/、scripts/、lib/、assets/、LICENSE、NOTICE。
- 包含 docs/README.md、INSTALL_PROMPT.md、START_PROMPT.md、RELEASE_PROMPT.md。
- 排除 .env、.env.*、.local/rag、.rag、.git、node_modules、dist、build、coverage、zip/tar 包、token-like 文件和本机绝对路径。

请提交并推送：
1. git status 确认无意外文件。
2. git commit。
3. git push origin lite-opus-review。
4. 创建 tag v<version> 并推送。
5. node scripts/sync-github-release.mjs <outputs-dir>

Release 同步后请验证：
- GitHub Release 存在。
- zip asset 存在且名称正确。
- target_commitish 是 lite-opus-review。
- GitHub latest 可以保持主体版 main，不强制让 Lite 抢 latest。
- 启动验收时，创建 opus-reviewer 的 spawn message 必须要求调用 reviewer/scorer MCP 工具，不能由子智能体自己代替 Opus/Claude；任务完成后必须 close_agent 或等价关闭。

最终只输出发布摘要、commit、tag、release URL、asset URL、验证结果。不要输出任何 token。
```
