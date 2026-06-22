# 维护发布提示词

只有维护者发布新版本时使用这个提示词。普通开发不需要发送它。

## 提示词

```text
请使用 multi-model-agents / AI Agent Swarm 执行一次完整发布。

发布不是只推代码。必须把这些步骤全部做完并逐项核查：
1. 确认工作树干净或只包含本次发布范围内的改动。
2. 确认 plugin.json 版本、README、CHANGELOG、release note、package-release 必需文件一致。
3. 确认 `.codex/agents/*.toml` 官方 Custom Agent 模板存在，并且安装/启动文档明确：Custom Agents 从项目级 `.codex/agents/` 或用户级 `~/.codex/agents/` 加载，Skill 不是子智能体创建机制。
4. 确认 Custom Agent 执行合同没有回归：`primary-coder` 必须调用 `multi_model_coder_workspace_edit` 且不得自己直接实现代码；`tester` 必须调用 `multi_model_tester_plan` 且不得自己直接生成测试策略；`START_PROMPT.md` 必须要求 Main Orchestrator 在 spawn message 中重复这些合同。
5. 运行离线验证：node --check、mcp-smoke-test、http-retry-self-test、RAG self-tests、workspace edit self-tests、tester prompt self-test、subagent prompt self-test、custom agents self-test、plugin validation、skill quick validation。
6. 运行 package-release 生成 zip，并审计 zip：包含 `.codex/agents/*.toml`，无 .env、无 RAG 数据、无凭据文件、无反斜杠路径、plugin.json ASCII-only、.mcp.json 相对路径。
7. 创建本地 commit。
8. push 目标分支。
9. 创建并 push tag。
10. 优先运行 scripts/sync-github-release.mjs 创建或更新 GitHub Release，并上传对应 zip asset。
11. 如果 sync 脚本不可用，才手动调用 GitHub API；不得跳过 Release 或 zip asset。
12. 用公开 GitHub API 或网页反查 Release 页面，确认 tag、release name、zip asset 和 latest 状态正确。
13. 在新的 Codex 线程中发送 docs/START_PROMPT.md 做一次启动验收：非简单任务必须先出现可见 Coder/Reviewer/Tester 子智能体；创建 primary-coder/tester 时 spawn message 必须要求调用对应 MCP 工具，不能由子智能体自己代替 Opus/Gemini；任务完成后必须 close_agent 或等价关闭已完成子智能体；如果该线程没有子智能体工具，必须明确输出降级说明。
14. 如果有 Lite 分支或其他发布分支，也要同步完成 branch、tag、GitHub Release 和 zip asset。

安全规则：
- 不要打印、提交或上传 .env、API key、token、RAG 数据或本地缓存。
- GitHub token 优先从 GITHUB_TOKEN/GH_TOKEN、MMA_GITHUB_TOKEN_FILE 或 `%USERPROFILE%\.codex\multi-model-agents\github-release-token` 读取；不要放进插件仓库。
- 临时 token 文件只作为兼容方案；使用后删除临时 token 文件。长期 token 建议使用 fine-grained token，并只授权当前仓库。
- Release 未创建、zip asset 未上传、release 页面未反查通过之前，不得声明发布完成。

最终回复必须给出：分支、commit、tag、release URL、asset URL、验证命令摘要和失败/跳过项。
```
