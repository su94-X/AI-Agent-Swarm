# Environment

Codex-only 版默认不需要外部模型 API key。

可选环境变量：

| Variable | Default | Meaning |
| --- | --- | --- |
| `MMA_MCP_PROGRESS_NOTIFICATIONS` | `true` | 是否发送 MCP 日志通知 |
| `MMA_WORKSPACE_FILE_CHAR_LIMIT` | `200000` | RAG ingest 读取单文件字符上限 |
| `MMA_RAG_ROOT` | empty | 自定义 RAG 根目录 |
| `MMA_RAG_WRITE_ENABLED` | `true` | 是否允许 RAG 写入 |
| `MMA_RAG_MAX_RESULT_CHARS` | `4000` | RAG 默认输出字符上限 |

建议把 RAG root 留空，使用稳定的 Codex 用户目录。不要把 RAG 数据目录放到项目仓库或 release 输出目录。
