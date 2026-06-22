# 维护发布提示词

只有维护者发布新版本时使用这个提示词。普通开发不需要发送它。

## 提示词

```text
请使用 multi-model-agents / AI Agent Swarm 执行一次完整发布。

发布不是只推代码。必须把这些步骤全部做完并逐项核查：
1. 确认工作树干净或只包含本次发布范围内的改动。
2. 确认 plugin.json 版本、README、CHANGELOG、release note、package-release 必需文件一致。
3. 运行离线验证：node --check、mcp-smoke-test、http-retry-self-test、RAG self-tests、workspace edit self-tests、tester prompt self-test、plugin validation、skill quick validation。
4. 运行 package-release 生成 zip，并审计 zip：无 .env、无 RAG 数据、无凭据文件、无反斜杠路径、plugin.json ASCII-only、.mcp.json 相对路径。
5. 创建本地 commit。
6. push 目标分支。
7. 创建并 push tag。
8. 创建或更新 GitHub Release。
9. 上传对应 zip asset。
10. 用公开 GitHub API 或网页反查 Release 页面，确认 tag、release name、zip asset 和 latest 状态正确。
11. 在新的 Codex 线程中发送 docs/START_PROMPT.md 做一次启动验收：非简单任务必须先出现可见 Coder/Reviewer/Tester 子智能体；如果该线程没有子智能体工具，必须明确输出降级说明。
12. 如果有 Lite 分支或其他发布分支，也要同步完成 branch、tag、GitHub Release 和 zip asset。

安全规则：
- 不要打印、提交或上传 .env、API key、token、RAG 数据或本地缓存。
- 如果需要 GitHub token，只能从本地环境变量或临时文件读取；使用后删除临时 token 文件。
- Release 未创建、zip asset 未上传、release 页面未反查通过之前，不得声明发布完成。

最终回复必须给出：分支、commit、tag、release URL、asset URL、验证命令摘要和失败/跳过项。
```
