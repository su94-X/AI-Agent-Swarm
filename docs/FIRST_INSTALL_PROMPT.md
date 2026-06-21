# 首次安装检查提示词

第一次在新的 Codex 环境中安装或注册 AI Agent Swarm 插件后，把下面这段提示词发送给一个新 Codex 线程。它只检查插件、skill 和 MCP tools 是否可见，不会要求你在对话里提供密钥。

## 提示词

```text
请使用 multi-model-agents 插件做一次首次安装检查。

我刚安装 AI Agent Swarm Codex 插件。请在正式使用前确认它已经正确加载。

请检查：
1. 确认 multi-model-agents skill 当前可见。
2. 确认以下 MCP 工具当前可用：
   - multi_model_coder_patch
   - multi_model_coder_workspace_edit
   - multi_model_reviewer_findings
   - multi_model_tester_plan
   - multi_model_role_call
   - multi_model_config_status
   - multi_model_rag_status
3. 调用 multi_model_config_status。
4. 调用 multi_model_rag_status，只报告 RAG 根目录、collection 数量、文档数量、chunk 数量和 writeEnabled，不要输出知识库正文。
5. 按 coder、reviewer、tester、custom 四个角色汇总 provider、model、apiKeyEnv、apiKeySource、hasApiKey。
6. 不要打印任何 API key 值。
7. 如果某个角色缺少 key，只告诉我应该配置哪个环境变量名，不要要求我把 key 粘贴到聊天里。
8. 提醒我把 .env.example 复制为 .env，并且真实 key 只保存在本地 .env 中。
9. 提醒我 .env 不能提交、不能打包、不能发送到对话里。
10. 提醒我：非简单开发任务默认启用 docs/ENGINEERING_GATE.md 中的工程闸门；正式编码前需要设计文档、开发计划和 Opus/Claude plan-review。
11. 本次检查不要调用任何真实外部模型 API。
```

## 预期结果

Codex 应报告 skill 和 MCP tools 是否可见，并安全展示 `multi_model_config_status` 的角色配置摘要。

默认 reviewer 是 `codex-internal`，因此 reviewer 的 `apiKeyEnv` 为空、`hasApiKey` 为 false 是正常情况。

`multi_model_coder_workspace_edit` 是 Opus/Claude 主编码工具。只有当 Codex 明确授权 `workspace_root`、`allowed_read_paths` 和 `allowed_write_paths` 后，才应该使用它写文件。

## 下一步

首次检查通过后，普通工作会话使用 `docs/STARTUP_PROMPT.md`。该启动提示词已经默认强制使用可见角色子智能体工作流，不需要再单独发送 `docs/SUBAGENT_START_PROMPT.md`。`docs/SUBAGENT_START_PROMPT.md` 只作为角色工作流的详细说明或排障备用提示词。

涉及多个文件、发布包、权限边界、RAG、MCP 工具或真实测试的任务，应同时遵守 `docs/ENGINEERING_GATE.md`。简单问答、只读解释和单条命令查询可以跳过工程闸门。
