# 安装检查提示词

首次安装或重新安装 AI Agent Swarm 后，把下面这段提示词发给一个新的 Codex 线程。它只做安装、结构、MCP 可见性和离线自检，不要求你把密钥粘贴到聊天里。

## 提示词

```text
请使用 multi-model-agents / AI Agent Swarm 做一次安装检查。

目标：
1. 确认 multi-model-agents skill 可见。
2. 确认 MCP 工具可见：multi_model_config_status、multi_model_coder_workspace_edit、multi_model_tester_plan、multi_model_role_call、multi_model_rag_status、multi_model_rag_search、multi_model_rag_note。
3. 检查当前线程是否暴露可见子智能体工具，例如 multi_agent_v1.spawn_agent / wait_agent / send_input / close_agent，或 Codex 客户端提供的等价能力。
4. 如果可见子智能体工具存在，请报告“可见子智能体能力可用”；如果不存在，请报告“当前线程没有可见子智能体工具，非简单任务会降级为 Main Orchestrator 直接调用 MCP 工具”。
5. 调用 multi_model_config_status，只汇总 provider、model、apiKeyEnv、apiKeySource、hasApiKey，不要打印任何 API key 值。
6. 调用 multi_model_rag_status，只报告状态，不输出知识库正文。
7. 检查插件包结构：.codex-plugin/plugin.json、.mcp.json、.env.example、README.md、LICENSE、NOTICE、docs/、lib/、scripts/、skills/ 是否存在。
8. 检查官方 Custom Agent 模板是否存在：.codex/agents/primary-coder.toml、reviewer.toml、tester.toml、test-runner.toml、rag-curator.toml、security-auditor.toml。说明这些模板需要位于当前项目 .codex/agents/ 或用户级 ~/.codex/agents/ 才会被 Codex 作为 Custom Agents 加载。
9. 检查 Custom Agent 执行合同：primary-coder 必须声明调用 multi_model_coder_workspace_edit，不得自己直接实现代码；tester 必须声明调用 multi_model_tester_plan，不得自己直接生成测试策略。START_PROMPT.md 也必须要求 Main Orchestrator 在 spawn message 中重复这些合同。
10. 确认 plugin.json 可解析，版本和展示名正确；确认 .mcp.json 使用 ./scripts/multi-model-agents-mcp.mjs 相对路径。
11. 确认包内没有 .env、.local/rag、.rag、node_modules、.git、凭据文件或本地绝对路径。
12. 如可用，运行离线自检：mcp-smoke-test、http-retry-self-test、RAG self-tests、workspace edit self-tests、tester prompt self-test、subagent prompt self-test、custom agents self-test。
13. 提醒我把 .env.example 复制为 .env，真实 key 只保存在本地 .env 或本机环境变量中。
14. 安装检查完成后，提醒我新开线程并发送 docs/START_PROMPT.md 开始日常开发。

不要请求、打印、保存或提交任何 API key。
不要调用真实外部模型 API；api-smoke-test 只在我明确要求真实连通性测试时运行。
```

## 预期结果

Codex 应给出插件是否安装成功、MCP 工具是否可见、角色配置是否完整、离线自检是否通过，以及下一步应该使用 `docs/START_PROMPT.md`。
