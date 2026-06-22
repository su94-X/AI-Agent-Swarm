# 安装检查提示词

首次安装或重新安装 AI Agent Swarm 后，把下面这段提示词发给一个新的 Codex 线程。它只做安装、结构、MCP 可见性和离线自检，不要求你把密钥粘贴到聊天里。

## 提示词

```text
请使用 multi-model-agents / AI Agent Swarm 做一次安装检查。

目标：
1. 确认 multi-model-agents skill 可见。
2. 确认 MCP 工具可见：multi_model_config_status、multi_model_coder_workspace_edit、multi_model_tester_plan、multi_model_role_call、multi_model_rag_status、multi_model_rag_search、multi_model_rag_note。
3. 调用 multi_model_config_status，只汇总 provider、model、apiKeyEnv、apiKeySource、hasApiKey，不要打印任何 API key 值。
4. 调用 multi_model_rag_status，只报告状态，不输出知识库正文。
5. 检查插件包结构：.codex-plugin/plugin.json、.mcp.json、.env.example、README.md、LICENSE、NOTICE、docs/、lib/、scripts/、skills/ 是否存在。
6. 确认 plugin.json 可解析，版本和展示名正确；确认 .mcp.json 使用 ./scripts/multi-model-agents-mcp.mjs 相对路径。
7. 确认包内没有 .env、.local/rag、.rag、node_modules、.git、凭据文件或本地绝对路径。
8. 如可用，运行离线自检：mcp-smoke-test、http-retry-self-test、RAG self-tests、workspace edit self-tests、tester prompt self-test。
9. 提醒我把 .env.example 复制为 .env，真实 key 只保存在本地 .env 或本机环境变量中。
10. 安装检查完成后，提醒我新开线程并发送 docs/START_PROMPT.md 开始日常开发。

不要请求、打印、保存或提交任何 API key。
不要调用真实外部模型 API；api-smoke-test 只在我明确要求真实连通性测试时运行。
```

## 预期结果

Codex 应给出插件是否安装成功、MCP 工具是否可见、角色配置是否完整、离线自检是否通过，以及下一步应该使用 `docs/START_PROMPT.md`。
