# Install Prompt

请按 AI Agent Swarm Codex-only 安装后验证流程执行：

1. 确认当前插件版本是 `1.5.6-codex.1`。
2. 调用 `multi_model_config_status`，确认 `mode` 为 `codex-only`，且只暴露 config/status 与 RAG 工具。
3. 调用 `multi_model_rag_status`，确认 RAG root、writeEnabled、collection 统计正常。
4. 检查 `.codex/agents/` 是否包含：
   - `codex-coder`
   - `codex-reviewer`
   - `codex-tester`
   - `test-runner`
   - `rag-curator`
   - `security-auditor`
5. 运行不访问外部服务的本地自测：

```powershell
node --check scripts/multi-model-agents-mcp.mjs
node scripts/mcp-smoke-test.mjs
node scripts/rag-self-test.mjs
node scripts/rag-security-self-test.mjs
node scripts/rag-metadata-self-test.mjs
node scripts/rag-text-self-test.mjs
node scripts/custom-agents-self-test.mjs
node scripts/engineering-gate-docs-self-test.mjs
node scripts/codex-only-self-test.mjs
```

如果缺少 MCP 工具、Custom Agent 模板或测试失败，请先报告失败命令、exit code、stdout、stderr，再继续修复。
