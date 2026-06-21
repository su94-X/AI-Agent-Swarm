# AI Agent Swarm 打包安装提示词

解压 AI Agent Swarm（内部包名 `multi-model-agents`）发布包之后，先把下面这段提示词发送给 Codex，用于安装或复查插件。这个提示词只做结构、版本和 MCP 启动检查，不要求你在对话里粘贴任何密钥。

## 提示词

```text
我已经解压 AI Agent Swarm Codex 插件包。

请在不泄漏任何密钥的前提下，帮我安装或复查这个插件。

插件预期：
- 插件展示名：AI Agent Swarm
- 内部插件名：multi-model-agents
- 版本：1.4.5（正式版 V1.4.5）
- 开发者：Su94
- 项目主页：https://github.com/su94-X/AI-Agent-Swarm
- 包内必须包含 .env.example 和 docs/ 目录。
- 包内不能包含真实 .env 文件。
- .mcp.json 必须使用可移植的插件根相对路径 ./scripts/multi-model-agents-mcp.mjs，不能包含某台机器上的用户绝对路径。

请执行这些检查：
1. 确认插件目录包含：
   - .codex-plugin/plugin.json
   - .mcp.json
   - .env.example
   - README.md
   - LICENSE
   - NOTICE
   - docs/ENVIRONMENT.md
   - docs/PACKAGE_INSTALL_PROMPT.md
   - docs/PROJECT_START_PROMPT.md
   - docs/EXISTING_PROJECT_HANDOFF_PROMPT.md
   - docs/NEW_PROJECT_BOOTSTRAP_PROMPT.md
   - docs/FIRST_INSTALL_PROMPT.md
   - docs/STARTUP_PROMPT.md
   - docs/SUBAGENT_START_PROMPT.md
   - docs/SUBAGENT_WORKFLOW.md
   - docs/RAG.md
   - docs/roles/CODER_SUBAGENT_PROMPT.md
   - docs/roles/TESTER_SUBAGENT_PROMPT.md
   - docs/roles/REVIEWER_SUBAGENT_PROMPT.md
   - docs/roles/TEST_RUNNER_SUBAGENT_PROMPT.md
   - docs/roles/RAG_CURATOR_SUBAGENT_PROMPT.md
   - lib/mcp.mjs
   - lib/model.mjs
   - lib/workspace.mjs
   - lib/rag.mjs
   - lib/rag-metadata.mjs
   - lib/rag-security.mjs
   - lib/rag-text.mjs
   - scripts/multi-model-agents-mcp.mjs
   - scripts/mcp-smoke-test.mjs
   - scripts/rag-self-test.mjs
   - scripts/rag-metadata-self-test.mjs
   - scripts/rag-security-self-test.mjs
   - scripts/rag-text-self-test.mjs
   - scripts/workspace-edit-json-self-test.mjs
   - scripts/workspace-edit-repair-self-test.mjs
   - scripts/tester-prompt-self-test.mjs
   - scripts/package-release.mjs
   - skills/multi-model-agents/SKILL.md
2. 确认 .codex-plugin/plugin.json 是可解析 JSON，并且其中的版本是 1.4.5，展示名是 AI Agent Swarm，开发者是 Su94。
3. 确认包内没有真实 .env 文件。
4. 确认包内没有 .local/rag 或任何 RAG 数据文件。
5. 确认 .mcp.json 中没有 C:/Users/... 或其他用户专属硬编码路径。
6. 如需本地配置，请提醒我复制 .env.example 为 .env，并只在 .env 里填写真实值。
7. 提醒我：*_API_KEY_ENV 字段应填写环境变量名，不是密钥值本身。
8. 如果个人 marketplace 已经指向这个插件源码，请安装或重新安装 multi-model-agents@personal。
9. 如可用，请运行插件校验和以下离线自检：
   - node scripts/mcp-smoke-test.mjs
   - node scripts/rag-self-test.mjs
   - node scripts/rag-metadata-self-test.mjs
   - node scripts/rag-security-self-test.mjs
   - node scripts/rag-text-self-test.mjs
   - node scripts/workspace-edit-json-self-test.mjs
   - node scripts/workspace-edit-repair-self-test.mjs
   - node scripts/tester-prompt-self-test.mjs
10. 安装完成后，提醒我新开一个 Codex 线程，让 skill 和 MCP tools 重新加载。

不要打印、请求、保存或提交任何 API key。
不要调用真实外部模型 API；这一步只做安装与离线 MCP 自检。scripts/api-smoke-test.mjs 是需要真实外部 API 的可选连通性测试，不要在安装结构检查阶段运行。scripts/http-retry-self-test.mjs 只启动本地临时 HTTP server，不访问外部模型，可作为离线自检运行。
```

## 预期结果

Codex 应确认包结构完整、manifest 可解析、版本为 `1.4.5`、展示名为 `AI Agent Swarm`、没有 `.env`、没有 `.local/rag`、zip entry 使用 `/` 而不是 Windows 反斜杠、`.mcp.json` 使用相对 MCP 路径，然后完成安装或重新安装，并运行不访问外部模型的 MCP smoke test、HTTP retry self-test、RAG self-test、RAG 子模块 self-test、workspace edit JSON self-test、workspace edit repair self-test 和 tester prompt self-test。

安装完成后，继续使用 `docs/FIRST_INSTALL_PROMPT.md` 做新线程可见性检查。
