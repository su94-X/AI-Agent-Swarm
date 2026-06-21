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
| `MMA_MODEL_STREAMING` | `false` |
| `MMA_MCP_PROGRESS_NOTIFICATIONS` | `true` |

HTTP retry 可提升瞬时网络错误下的稳定性，但如果上游模型已经处理请求而连接在返回阶段中断，重试可能造成重复调用和额外计费。成本敏感场景可设置 `MMA_HTTP_MAX_ATTEMPTS=1`。

## RAG

| 变量 | 默认值 |
| --- | --- |
| `MMA_RAG_ROOT` | 空，使用 Codex 用户目录 |
| `MMA_RAG_WRITE_ENABLED` | `true` |
| `MMA_RAG_MAX_RESULT_CHARS` | `4000` |

不要把 `.env`、API key、生产数据、私有日志或未验证的外部模型输出写入 RAG。
