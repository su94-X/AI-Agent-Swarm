# 环境变量配置

本文档说明 AI Agent Swarm Codex 插件使用的环境变量。它不包含真实密钥，可以安全放入发布包。

开发者：Su94。项目主页：https://github.com/su94-X/AI-Agent-Swarm

## 本地配置

复制模板文件，然后只在本地副本中填写真实值：

```powershell
Copy-Item .env.example .env
```

`.env` 必须只保存在本地。不要提交、不要打包、不要粘贴到聊天里，也不要发送给外部模型。发布包只包含 `.env.example` 和本文档。

MCP server 启动时会自动读取插件根目录的 `.env`。你也可以通过 Codex 进程环境变量提供同样的配置。

## API Key 规则

`*_API_KEY_ENV` 变量必须填写“保存 key 的环境变量名”，不是 key 值本身。

正确示例：

```text
MMA_CODER_API_KEY_ENV=ANTHROPIC_API_KEY
ANTHROPIC_API_KEY=你的真实 key 只保存在本地环境或本地 .env 中
```

| 变量 | 用途 | 是否必需 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 默认 coder 角色的 key。 | coder 调用 Anthropic/Opus 时需要。 |
| `OPENAI_API_KEY` | 可选外部 OpenAI reviewer 的 key。 | 默认 Codex 内部 reviewer 不需要。 |
| `GEMINI_API_KEY` | 默认 tester 角色的 key。 | tester 调用 Gemini 时需要。 |
| `EXTERNAL_MODEL_API_KEY` | 可选 custom OpenAI-compatible 角色的 key。 | 只在使用 custom 角色时需要。 |

## Coder 角色

默认：Anthropic-compatible Claude / Opus 角色。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MMA_CODER_PROVIDER` | `anthropic` | provider 类型。 |
| `MMA_CODER_MODEL` | `claude-opus-4-8` | 账号或网关暴露的模型 ID。 |
| `MMA_CODER_API_KEY_ENV` | `ANTHROPIC_API_KEY` | 保存 API key 的环境变量名。 |
| `MMA_CODER_BASE_URL` | `https://api.anthropic.com` | provider base URL。 |

## Reviewer 角色

默认：Codex 内部 reviewer。默认流程不需要额外 OpenAI API key。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MMA_REVIEWER_PROVIDER` | `codex-internal` | 只有需要外部第二意见时才改成 `openai` 或 `openai-compatible`。 |
| `MMA_REVIEWER_MODEL` | `gpt-5.5` | reviewer 模型 ID。 |
| `MMA_REVIEWER_API_KEY_ENV` | 空 | 只有外部 reviewer 才需要设置。 |
| `MMA_REVIEWER_BASE_URL` | 空 | 只有外部 reviewer 才需要设置。 |

## Tester 角色

默认：Gemini 角色。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MMA_TESTER_PROVIDER` | `gemini` | provider 类型。 |
| `MMA_TESTER_MODEL` | `gemini-3.5-flash` | 默认使用 Gemini 稳定模型，优先保证新用户 API 可用性；账号、网关或任务需要更强模型时可覆盖。 |
| `MMA_TESTER_API_KEY_ENV` | `GEMINI_API_KEY` | 保存 API key 的环境变量名。 |
| `MMA_TESTER_BASE_URL` | `https://generativelanguage.googleapis.com` | provider base URL。 |
| `MMA_GEMINI_API_KEY_IN_HEADER` | `true` | 默认用 `x-goog-api-key` header 传递 Gemini key，避免 key 出现在 URL query；如兼容网关只支持 query，可设为 `false`。 |

## 可选 Custom 角色

custom 角色可用于 OpenAI-compatible 网关、本地代理、LiteLLM、OpenRouter 或其他兼容 endpoint。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MMA_CUSTOM_PROVIDER` | `openai-compatible` | custom 角色 provider 类型。 |
| `MMA_CUSTOM_MODEL` | `gpt-5.5` | 网关暴露的模型 ID。 |
| `MMA_CUSTOM_API_KEY_ENV` | `EXTERNAL_MODEL_API_KEY` | 保存 API key 的环境变量名。 |
| `MMA_CUSTOM_BASE_URL` | `https://api.openai.com/v1` | gateway base URL。 |

## HTTP 设置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MMA_HTTP_TIMEOUT_MS` | `120000` | 外部模型调用超时时间，单位毫秒。 |
| `MMA_HTTP_MAX_ATTEMPTS` | `3` | 外部模型 HTTP 调用最大尝试次数，范围 1-5。仅对 408、429、5xx、超时和短暂网络错误重试。 |
| `MMA_HTTP_RETRY_BASE_DELAY_MS` | `500` | HTTP 重试基础延迟，单位毫秒，使用指数退避和少量 jitter。设为 `0` 时不等待。 |
| `MMA_MODEL_STREAMING` | `false` | 设为 `true` 时，模型层会优先使用 provider 的 SSE/stream endpoint 并在 server 内聚合为完整文本返回。MCP 工具返回形态不变，不会边流边写文件。 |
| `MMA_MCP_PROGRESS_NOTIFICATIONS` | `true` | 控制 MCP server 是否发送客户端可见进度/日志通知。当前实现使用 MCP `notifications/message`，不是标准进度条 token。设为 `false` 可关闭工具开始、模型调用、流式片段、JSON 校验和完成/失败提示。 |

HTML 响应、401/403、404、JSON 结构错误、SSE 解析错误和模型输出格式错误通常表示配置或模型返回问题，默认不会作为瞬时网络错误重试。流式响应只有在尚未收到有效文本前，才会对 408、429、5xx、超时和短暂网络错误重试。

注意：HTTP retry 会提升临时网络错误下的稳定性，但如果上游模型已经处理请求而连接在返回阶段中断，重试可能造成重复调用和额外计费。成本敏感场景可设置 `MMA_HTTP_MAX_ATTEMPTS=1`。

注意：workspace edit JSON repair 或 patch/edit apply repair 会额外调用一次 coder 模型。成本敏感场景建议先使用 `dry_run: true`，并缩小 `allowed_read_paths` / `allowed_write_paths`。

## 本地项目记忆库（轻量 RAG）设置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MMA_RAG_ROOT` | `$CODEX_HOME/multi-model-agents/rag`；未设置 `CODEX_HOME` 时为用户目录下 `.codex/multi-model-agents/rag` | 本地项目记忆库（轻量 RAG）存储目录。不要放入项目仓库或发布包。 |
| `MMA_RAG_WRITE_ENABLED` | `true` | 设为 `false` 时禁用 `multi_model_rag_ingest` 和 `multi_model_rag_note` 写入。 |
| `MMA_RAG_MAX_RESULT_CHARS` | `4000` | RAG 检索默认最大返回字符数，上限为 `12000`。 |

V1.4.5 起，RAG 条目可携带 `confidence`、`verified_by`、`expires_at`、`scope`、`aliases` 和 `status`。这些不是环境变量，而是 `multi_model_rag_note` / `multi_model_rag_ingest` 的参数。`multi_model_rag_search` 默认只返回 trusted、active、未过期知识，可用 `min_confidence`、`verified_by`、`scope`、`type`、`status` 和 `include_expired` 精确过滤。

## 验证

配置完成后，让 Codex 调用 `multi_model_config_status`。它会报告 provider、model、base URL、key 环境变量名、key 来源和是否存在 key，但不会打印 key 值。

连通性检查：

```powershell
node scripts/mcp-smoke-test.mjs
node scripts/http-retry-self-test.mjs
node scripts/model-secret-self-test.mjs
node scripts/workspace-edit-repair-self-test.mjs
node scripts/subagent-prompt-self-test.mjs
node scripts/api-smoke-test.mjs
node scripts/rag-self-test.mjs
```

`mcp-smoke-test.mjs`、`http-retry-self-test.mjs`、`model-secret-self-test.mjs`、`workspace-edit-repair-self-test.mjs`、`subagent-prompt-self-test.mjs` 和 `rag-self-test.mjs` 不调用外部模型。`http-retry-self-test.mjs` 和 `workspace-edit-repair-self-test.mjs` 只启动本地临时 HTTP server 验证重试或修复逻辑。`api-smoke-test.mjs` 会调用已配置的 coder、tester 和 custom 角色，只应在本地 key 配好后运行。

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

## 打包规则

应包含：

- `.codex-plugin/`
- `.env.example`
- `.mcp.json`
- `README.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `NOTICE`
- `SECURITY.md`
- `assets/`
- `.codex/agents/`
- `docs/`
- `lib/`
- `scripts/`
- `skills/`

关键必需文件至少包括：

- `docs/INSTALL_PROMPT.md`
- `docs/START_PROMPT.md`
- `docs/RELEASE_PROMPT.md`
- `docs/CUSTOM_AGENTS.md`
- `docs/ENVIRONMENT.md`
- `docs/ENGINEERING_GATE.md`
- `docs/ENGINEERING_GATE_IMPLEMENTATION_PLAN.md`
- `docs/releases/GITHUB_RELEASE_V版本号.md`
- `docs/SUBAGENT_WORKFLOW.md`
- `docs/RAG.md`
- `docs/ROADMAP.md`
- `docs/roles/`
- `.codex/agents/primary-coder.toml`
- `.codex/agents/reviewer.toml`
- `.codex/agents/tester.toml`
- `.codex/agents/test-runner.toml`
- `.codex/agents/rag-curator.toml`
- `.codex/agents/security-auditor.toml`
- `lib/mcp.mjs`
- `lib/model.mjs`
- `lib/workspace.mjs`
- `lib/workspace-edit-flow.mjs`
- `lib/rag.mjs`
- `lib/rag-metadata.mjs`
- `lib/rag-security.mjs`
- `lib/rag-text.mjs`
- `lib/redaction.mjs`
- `scripts/multi-model-agents-mcp.mjs`
- `scripts/mcp-smoke-test.mjs`
- `scripts/http-retry-self-test.mjs`
- `scripts/model-secret-self-test.mjs`
- `scripts/custom-agents-self-test.mjs`
- `scripts/rag-self-test.mjs`
- `scripts/rag-metadata-self-test.mjs`
- `scripts/rag-security-self-test.mjs`
- `scripts/rag-text-self-test.mjs`
- `scripts/workspace-edit-json-self-test.mjs`
- `scripts/package-release.mjs`
- `scripts/workspace-edit-repair-self-test.mjs`
- `scripts/tester-prompt-self-test.mjs`
- `scripts/subagent-prompt-self-test.mjs`
- `scripts/sync-github-release.mjs`
- `skills/multi-model-agents/agents/openai.yaml`
- `assets/ai-agent-swarm-icon.png`
- `skills/multi-model-agents/assets/ai-agent-swarm-icon.png`

`PACKAGE_INSTALL_PROMPT.md`、`FIRST_INSTALL_PROMPT.md`、`STARTUP_PROMPT.md`、`PROJECT_START_PROMPT.md`、`SUBAGENT_START_PROMPT.md`、`EXISTING_PROJECT_HANDOFF_PROMPT.md` 和 `NEW_PROJECT_BOOTSTRAP_PROMPT.md` 已归档到 `docs/legacy/`。普通用户入口是 `INSTALL_PROMPT.md`、`START_PROMPT.md` 和 `RELEASE_PROMPT.md`，完整导航见 `docs/README.md`。

必须排除：

- `.env`
- `.local/rag`
- API keys
- 包含密钥的终端日志
- 包含 provider 响应的临时 smoke-test 输出

正式发布包应使用白名单脚本生成：

```powershell
node scripts/package-release.mjs C:\path\to\outputs
```

不要直接压缩插件源码根目录，因为本地开发目录可能包含只供本机使用的 `.env`。`scripts/package-release.mjs` 会在生成 zip 后再次检查包内条目，确保 `.env`、RAG 数据目录、凭据类文件和用户专属 MCP 绝对路径没有进入发布包。
输出文件名格式为 `ai-agent-swarm-版本号.zip`。
