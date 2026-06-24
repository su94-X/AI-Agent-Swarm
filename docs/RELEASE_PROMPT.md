# Release Prompt

按 AI Agent Swarm Codex-only 发布流程执行。

## 必查项

1. 当前分支必须是 `codex-only`。
2. 版本必须是 `1.5.6-codex.1` 或本次发布明确指定的后续版本。
3. `plugin.json` 必须是 ASCII-only 且可 JSON.parse。
4. `.mcp.json` 必须使用相对路径 `./scripts/multi-model-agents-mcp.mjs`。
5. 发布包不得包含：
   - `.env`
   - `.local`
   - `.rag`
   - RAG 数据
   - token 文件
   - `.git`
   - `node_modules`
   - 旧历史提示词目录
   - 外部模型或 workspace edit 兼容测试
6. 发布包必须包含：
   - `.codex-plugin/plugin.json`
   - `.mcp.json`
   - `.env.example`
   - `README.md`
   - `LICENSE`
   - `NOTICE`
   - `docs/`
   - `templates/`
   - `.codex/agents/`
   - `lib/`
   - `scripts/`
   - `skills/`
   - `assets/`

## 验证命令

```powershell
git diff --check
node --check scripts/multi-model-agents-mcp.mjs
node --check scripts/package-release.mjs
node --check scripts/sync-github-release.mjs
node scripts/mcp-smoke-test.mjs
node scripts/rag-self-test.mjs
node scripts/rag-security-self-test.mjs
node scripts/rag-metadata-self-test.mjs
node scripts/rag-text-self-test.mjs
node scripts/custom-agents-self-test.mjs
node scripts/engineering-gate-docs-self-test.mjs
node scripts/codex-only-self-test.mjs
node scripts/package-release.mjs
```

## GitHub 同步

发布时必须一起完成：

1. commit
2. push `codex-only`
3. tag
4. push tag
5. 运行 `scripts/sync-github-release.mjs`
6. 验证 Release 页面和 zip asset URL

不要在输出、文档、日志或仓库中暴露 GitHub token。
