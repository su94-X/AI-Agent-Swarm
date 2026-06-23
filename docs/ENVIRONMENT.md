# AI Agent Swarm Lite 环境变量

开发者：Su94。项目主页：https://github.com/su94-X/AI-Agent-Swarm

Lite 版默认只需要 Anthropic/Claude/Opus-compatible key，用于 reviewer/scorer。

如果你从完整版 AI Agent Swarm 迁移过来，请特别检查 `.env` 中是否仍有 `MMA_REVIEWER_PROVIDER=codex-internal`。Lite 版的 reviewer/scorer 需要外部 Opus/Claude，因此应设置为 `MMA_REVIEWER_PROVIDER=anthropic`。

## Reviewer / Scorer

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 空 | 本地真实 key。不要提交。 |
| `MMA_REVIEWER_PROVIDER` | `anthropic` | Opus/Claude reviewer provider。 |
| `MMA_REVIEWER_MODEL` | `claude-opus-4-8` | 外部审查与评分模型。 |
| `MMA_REVIEWER_API_KEY_ENV` | `ANTHROPIC_API_KEY` | 保存 API key 的环境变量名。 |
| `MMA_REVIEWER_BASE_URL` | `https://api.anthropic.com` | provider base URL。 |

## Coder（可选）

Lite 主流程不要求外部模型写代码，但仍保留受控 coder 工具。

| 变量 | 默认值 |
| --- | --- |
| `MMA_CODER_PROVIDER` | `anthropic` |
| `MMA_CODER_MODEL` | `claude-opus-4-8` |
| `MMA_CODER_API_KEY_ENV` | `ANTHROPIC_API_KEY` |
| `MMA_CODER_BASE_URL` | `https://api.anthropic.com` |

## Custom（可选）

| 变量 | 默认值 |
| --- | --- |
| `EXTERNAL_MODEL_API_KEY` | 空 |
| `MMA_CUSTOM_PROVIDER` | `openai-compatible` |
| `MMA_CUSTOM_MODEL` | `gpt-5.5` |
| `MMA_CUSTOM_API_KEY_ENV` | `EXTERNAL_MODEL_API_KEY` |
| `MMA_CUSTOM_BASE_URL` | `https://api.openai.com/v1` |

## HTTP / Streaming

| 变量 | 默认值 |
| --- | --- |
| `MMA_HTTP_TIMEOUT_MS` | `120000` |
| `MMA_HTTP_MAX_ATTEMPTS` | `3` |
| `MMA_HTTP_RETRY_BASE_DELAY_MS` | `500` |
| `MMA_MODEL_STREAMING` | `true` |
| `MMA_MCP_PROGRESS_NOTIFICATIONS` | `true` |
| `MMA_WORKSPACE_EDIT_RETURN_FILE_CHARS` | `6000` |

HTTP retry 可提升瞬时网络错误下的稳定性，但如果上游模型已经处理请求而连接在返回阶段中断，重试可能造成重复调用和额外计费。成本敏感场景可设置 `MMA_HTTP_MAX_ATTEMPTS=1`。
`multi_model_coder_workspace_edit` 写入成功后会返回每个变更文件的受限、脱敏内容预览，方便子智能体把结果交回主控；如果只想返回路径和 hash 元数据，可设置 `MMA_WORKSPACE_EDIT_RETURN_FILE_CHARS=0`。

## RAG

| 变量 | 默认值 |
| --- | --- |
| `MMA_RAG_ROOT` | 空，使用 Codex 用户目录 |
| `MMA_RAG_WRITE_ENABLED` | `true` |
| `MMA_RAG_MAX_RESULT_CHARS` | `4000` |

不要把 `.env`、API key、生产数据、私有日志或未验证的外部模型输出写入 RAG。

## GitHub Release Token

GitHub Release 发布 token 不属于外部模型配置，不要写入插件根目录 `.env`、`.env.example`、README、release note、RAG、workspace 或聊天记录。

推荐使用 fine-grained token，只授权 `su94-X/AI-Agent-Swarm` 仓库的 Contents/Metadata 读写权限。长期保存位置：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\multi-model-agents"
Set-Content -NoNewline -Path "$env:USERPROFILE\.codex\multi-model-agents\github-release-token" -Value "你的 fine-grained token"
```

发布同步脚本读取顺序：

1. `GITHUB_TOKEN` 或 `GH_TOKEN` 环境变量。
2. `MMA_GITHUB_TOKEN_FILE` 指定的用户级 token 文件。
3. `$CODEX_HOME\multi-model-agents\github-release-token`，如果设置了 `CODEX_HOME`。
4. `%USERPROFILE%\.codex\multi-model-agents\github-release-token`。
5. 兼容旧临时文件：`%TEMP%\github_release_token.txt`。

`scripts/sync-github-release.mjs` 会拒绝读取插件仓库、当前 workspace 或输出目录内的 token 文件。GitHub token 只能通过 `Authorization: Bearer <token>` header 发送，不得放在 URL query、命令参数、release body、asset 名、日志、错误消息或最终回复中。

如果 GitHub Release token 曾经粘贴到聊天、issue、PR、日志、截图或 prompt 中，必须视为泄露，立即 revoke 并重新创建。

## 验证

```powershell
node scripts/mcp-smoke-test.mjs
node scripts/http-retry-self-test.mjs
node scripts/model-secret-self-test.mjs
node scripts/rag-self-test.mjs
node scripts/rag-metadata-self-test.mjs
node scripts/rag-security-self-test.mjs
node scripts/rag-text-self-test.mjs
node scripts/workspace-edit-json-self-test.mjs
node scripts/workspace-edit-repair-self-test.mjs
node scripts/reviewer-score-self-test.mjs
node scripts/custom-agents-self-test.mjs
```
