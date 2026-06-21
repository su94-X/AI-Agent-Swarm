# AI Agent Swarm

V1.4.5 是 AI Agent Swarm 的当前正式版本。它是一个面向长期项目维护的本地 Codex 多模型编排插件，用于让 Codex 在同一个开发流程中主控 Opus/Claude 主编码、Gemini 测试分析、Codex 内部审查、可见角色子智能体和本地项目记忆库（轻量 RAG）。它的目标不是替换 Codex 主智能体，而是把外部模型能力纳入 Codex 可控的授权、审查、测试和记忆流程。

1.0.x 是正式发布前候选版本线，V1.4.5 是当前正式发布版本。这个版本已经完成跨平台打包验证、Gemini header key 传递、workspace checksum 防覆盖、symlink 防逃逸、RAG 安全扫描、MCP 协议层模块拆分、MCP 客户端可见进度/日志通知、workspace patch/edit 局部编辑模式、RAG 知识质量元数据与默认过滤、RAG 子模块独立自测、patch/edit 唯一匹配修复提示增强和可见角色子智能体工作流，并提供 `scripts/api-smoke-test.mjs` 用于在本地 key 配置完成后验证真实外部模型连通性，适合开始在真实项目中稳定内测和日常使用。

开发者：Su94  
项目主页：[su94-X/AI-Agent-Swarm](https://github.com/su94-X/AI-Agent-Swarm)

## 3 步快速开始

1. 安装或解压插件包，确认 `.codex-plugin/plugin.json`、`.mcp.json`、`skills/`、`docs/`、`scripts/`、`lib/`、`LICENSE`、`NOTICE` 和 `.env.example` 都在插件根目录。
2. 复制 `.env.example` 为 `.env`，只填写当前确实要用的外部模型 key；不需要外部 reviewer 时保持 reviewer 为 `codex-internal`。
3. 在目标项目线程中发送 `docs/PROJECT_START_PROMPT.md`，或明确要求“使用 AI Agent Swarm 处理本次任务”，由 Codex 主控授权文件范围、调用外部模型角色、审查 diff 并运行真实本地测试。

## 何时不要启用外部模型

- 任务只是简单问答、纯解释、单条命令查询或很小的局部修改。
- 当前任务涉及 `.env`、API key、生产数据、私有日志、客户数据或无法裁剪的敏感上下文。
- 不能明确给出窄范围的 `allowed_read_paths` 和 `allowed_write_paths`。
- 只需要 Codex 内部审查，或网络/API 成本、合规边界不允许调用外部模型。
- 需要最终验收、真实测试结论或安全结论时，不应让外部模型直接做最终决定；外部模型只能提供建议，最终仍由 Codex 本地审查和验证。

这个插件适合这些场景：

- 在已有项目中让 Codex 快速接手，生成项目说明、开发指南、测试指南和长期记忆文档。
- 在新项目启动时建立初始项目文档、项目记忆规则和多角色协作边界。
- 让 Opus/Claude 作为 primary coder，在明确授权的文件范围内完成主要编码。
- 让 Gemini 负责测试计划、边界用例和失败日志分析，但不伪装成真实测试执行者。
- 让 Codex 内部 reviewer 默认负责代码审查，避免重复调用外部 GPT reviewer。
- 通过本地项目记忆库（轻量 RAG）沉淀历史 bug、修复方案、真实命令、架构决策和项目约定，降低新线程和上下文压缩后的漂移。

角色边界：

- Codex 主智能体：负责方案、边界授权、审查、真实测试执行和最终决策。
- Opus/Claude coder：作为主要编码作者，在 Codex 授权的路径范围内实现代码。
- Codex 内部 reviewer：默认使用 Codex 内部 gpt-5.5 做代码审查，不额外消耗外部 GPT API。
- Gemini tester：负责测试计划、边界用例和失败日志分析。
- 本地项目记忆库（轻量 RAG）：由 Codex 主控检索和写入，沉淀项目约定、历史 bug、命令和决策。
- custom：可选外部模型角色，适配 OpenAI-compatible 网关或本地代理。

外部模型不会直接获得无限制仓库权限，也不会直接写入项目记忆库。所有真实文件修改、命令执行、测试结果判定和最终接受决定仍由 Codex 完成。

## 文档

- `docs/ENVIRONMENT.md`：环境变量和 `.env` 安全配置说明。
- `docs/PACKAGE_INSTALL_PROMPT.md`：从 zip 包安装时发送给 Codex 的中文提示词。
- `docs/FIRST_INSTALL_PROMPT.md`：首次安装后用于检查 skill 和 MCP tools 是否可见的中文提示词。
- `docs/STARTUP_PROMPT.md`：日常工作会话启动提示词，默认强制使用可见角色子智能体工作流。
- `docs/PROJECT_START_PROMPT.md`：在目标项目中开始编码任务的提示词，默认强制使用可见角色子智能体工作流。
- `docs/EXISTING_PROJECT_HANDOFF_PROMPT.md`：已有项目首次接入插件时的项目分析和接手文档生成提示词。
- `docs/NEW_PROJECT_BOOTSTRAP_PROMPT.md`：新项目启动时生成初始项目文档和记忆文档的提示词。
- `docs/SUBAGENT_START_PROMPT.md`：可见角色子智能体工作流的详细说明或排障备用提示词；日常通常不需要单独发送。
- `docs/SUBAGENT_WORKFLOW.md`：可见子智能体工作流和角色说明。
- `docs/RAG.md`：本地项目记忆库（轻量 RAG）说明。
- `docs/ROADMAP.md`：已完成的模块拆分、workspace edit flow 拆分、进度/日志通知、patch/edit 模式、RAG 知识质量元数据，以及语义 RAG 等后续路线。
- `docs/roles/`：各可见角色子智能体的中文提示词。

## 开源与贡献

GitHub 仓库：[su94-X/AI-Agent-Swarm](https://github.com/su94-X/AI-Agent-Swarm)

- 变更记录见 [CHANGELOG.md](./CHANGELOG.md)。
- 安全策略见 [SECURITY.md](./SECURITY.md)。
- 贡献说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
- 默认分支：`main`。
- 建议把 `ai-agent-swarm-*.zip` 作为 GitHub Release 附件发布，不提交到源码仓库。

## 打包规则

发布包应包含 `.env.example` 和 `docs/` 目录，但不能包含真实 `.env`、`.local/rag` 或任何含有 API key 的文件。

真实 `.env` 只留在本地安装目录。不要提交、打包、复制到对话里，或发送给外部模型。

正式发布包应使用白名单打包脚本生成：

```powershell
node scripts/package-release.mjs C:\path\to\outputs
```

该脚本只打包 `.codex-plugin`、`.mcp.json`、`.env.example`、`README.md`、`LICENSE`、`NOTICE`、`docs/`、`skills/`、`scripts/`、`lib/` 和 `assets/`，并在生成 zip 后再次校验：包内没有 `.env`、没有 RAG 数据目录、zip entry 统一使用 `/`、`plugin.json` 是 ASCII-only 可解析 JSON、版本为 `1.4.5`、`.mcp.json` 使用相对 MCP 路径。

V1.4.5 继续压低主入口和 RAG 维护压力：MCP 主入口只保留工具 schema、路由和通用角色编排；外部模型调用在 `lib/model.mjs`；RAG 工具编排和 JSONL 存储在 `lib/rag.mjs`，RAG 元数据/过滤在 `lib/rag-metadata.mjs`，RAG secret scan 在 `lib/rag-security.mjs`，RAG 分块和词法评分在 `lib/rag-text.mjs`；workspace 路径和 patch/edit 应用在 `lib/workspace.mjs`；workspace edit prompt、JSON repair 和 apply repair flow 在 `lib/workspace-edit-flow.mjs`；MCP stdio 协议在 `lib/mcp.mjs`。

打包和 zip 验证都只依赖 Node 内置模块，不依赖 PowerShell `Compress-Archive`、`tar`、`unzip` 或 `7z`。这保证同一发布脚本可以在 Windows、Linux 和 macOS 上一致运行。

## MCP 工具

- `multi_model_coder_patch`：让 coder 模型给出统一 diff 或实现建议，不直接写文件。
- `multi_model_coder_workspace_edit`：让 coder 模型在 Codex 授权的读写路径内执行主要编码实现。MCP server 会校验路径边界、阻止默认禁用路径、要求模型返回严格 JSON 文件编辑，并在 JSON 不合规时自动做一次修复重试。V1.4.5 支持完整文件写入和 `edits` 局部编辑模式：`replace`、`insert_after`、`insert_before`；当 `find` / `anchor` 不是唯一匹配时，repair prompt 会要求模型扩大上下文或退回完整文件模式。
- `multi_model_reviewer_findings`：可选外部 reviewer 工具。默认 reviewer 是 `codex-internal`，通常由 Codex 主智能体或 Reviewer Subagent 直接审查，不调用外部 GPT API。
- `multi_model_tester_plan`：让 Gemini 给出测试策略、建议命令、边界用例和失败日志分析。真实测试由 Codex 本地执行。
- `multi_model_role_call`：调用 custom 外部模型角色。
- `multi_model_config_status`：查看各角色 provider、model、baseUrl、apiKeyEnv、apiKeySource 和 hasApiKey。不会打印 key 值。
- `multi_model_rag_status`：查看本地项目记忆库（轻量 RAG）状态，不返回正文。
- `multi_model_rag_ingest`：把 Codex 授权读取的本地文件导入 RAG。
- `multi_model_rag_note`：写入 Codex 已验证的 bug、决策、命令、约定、风险等知识条目。
- `multi_model_rag_search`：本地词法检索 RAG，不调用外部模型。
- `multi_model_rag_get`：按 chunk/document id 获取有限上下文。

本地项目记忆库默认存储在稳定的 Codex 用户目录：`$CODEX_HOME/multi-model-agents/rag`。如果没有设置 `CODEX_HOME`，默认使用用户目录下的 `.codex/multi-model-agents/rag`。也可通过 `MMA_RAG_ROOT` 覆盖。当前实现是本地词法检索型轻量 RAG，不引入 embedding 或向量数据库。它是 Codex 主控工具，不是 Opus/Gemini 的自动记忆。Codex 应先检索、筛选，再把少量必要片段传给外部模型。V1.4.5 起，RAG 条目支持 `confidence`、`verified_by`、`expires_at`、`scope`、`aliases` 和 `status`，搜索默认只返回 trusted、active、未过期知识，并可按置信度、验证者、作用域和类型过滤。

## V1.4.5 实测使用准则

- Opus/Claude `edits` 局部编辑模式已通过小范围真实 dry-run 验证：3 次明确单文件编辑全部返回 `patch_edit`，`repairEvents` 为 0。适合小范围、目标清楚、低歧义修改；复杂任务仍应缩小授权文件范围，先 `dry_run: true`，再审查 diff。
- 观察 Opus 编辑质量时，不只看是否成功，还要看 `diff scope accuracy`：实际触碰文件、变更行数、是否有无关格式化/重排、是否触发 `repairEvents`。
- RAG 默认搜索适合探索背景，不适合直接注入执行上下文。传给 Opus/Gemini 或用于最终决策前，应显式设置 `scope`、`min_confidence`，并在可用时设置 `verified_by`；`include_expired`、`deprecated`、`superseded` 结果只用于审计、排障或历史对比。
- 可见子智能体能提高过程可读性，但角色必须收窄：Coder 只实现授权范围，Tester 只做测试策略/日志分析，Reviewer 只审查，Test Runner 只运行批准命令，RAG Curator 只整理候选知识，最终决策仍由 Main Orchestrator 完成。

## 默认角色

- Coder：`anthropic` / `claude-opus-4-8` / `ANTHROPIC_API_KEY`
- Reviewer：`codex-internal` / `gpt-5.5` / 默认不需要额外 API key
- Tester：`gemini` / `gemini-3.5-flash` / `GEMINI_API_KEY`
- Custom：`openai-compatible` / 可通过 `.env` 自定义

`gemini-3.5-flash` 是默认开箱模型，优先保证新用户 API 可用性。如果你的账号、网关或任务需要更强模型，请在 `.env` 中设置 `MMA_CODER_MODEL`、`MMA_TESTER_MODEL` 或对应角色变量。

## Opus 主编码流程

推荐工作流：

1. Codex 读取用户需求，确定任务边界。
2. Codex 指定 `workspace_root`、`allowed_read_paths`、`allowed_write_paths` 和 constraints。
3. Coder Subagent 调用 `multi_model_coder_workspace_edit`。
4. Opus/Claude 在授权范围内完成主要代码实现。
5. MCP server 阻止路径穿越，并默认禁止 `.env`、`.git`、`node_modules`、`dist`、`build`、`coverage`、`*.pem`、`*.key` 等路径。
6. MCP server 只写入授权文本文件；修改已存在文件时要求 `expected_sha256` 匹配当前内容，防止旧上下文覆盖新内容；小改动优先使用 `edits` 局部编辑模式，`find` 或 `anchor` 必须唯一匹配；返回 `changed_files`、`changed_file_details`、`diff`、`tests`、`risks`。
7. Codex 审查 diff，按需让 Gemini 制定测试策略，运行真实本地测试，并决定接受或退回修改。

高风险改动可先使用 `dry_run: true`，让 Opus/Claude 只生成拟写入内容和 diff，不实际写文件。

workspace edit JSON repair 或 patch/edit apply repair 会额外调用一次 coder 模型。成本敏感或上下文较大的任务，建议先使用 `dry_run: true`，并缩小 `allowed_read_paths` / `allowed_write_paths`。

实测中小范围 `edits` 表现稳定，但真实项目应持续记录 `changed_files`、变更行数、无关 diff 噪声和 `repairEvents`。如果 repair 频率升高，优先缩小任务、扩大 `find`/`anchor` 的唯一上下文，或退回完整文件模式。

## 可见子智能体工作流

正式版 V1.4.5 默认使用 Codex 子智能体作为角色包装器，让每个角色都有可见工作记录：

- Coder Subagent：调用 `multi_model_coder_workspace_edit`，由 Opus/Claude 执行授权范围内的主要编码。
- Reviewer Subagent：默认使用 Codex 内部审查，不调用外部 reviewer，除非用户明确要求。
- Tester Subagent：调用 `multi_model_tester_plan`，由 Gemini 给出测试计划和失败日志分析。
- Test Runner Subagent：运行主智能体批准的真实本地命令并记录输出。
- RAG Curator Subagent：整理可写入本地项目记忆库的候选知识，最终写入仍由 Main Orchestrator 决定。
- Custom Subagent：只在明确分配自定义模型任务时调用 `multi_model_role_call`。

外部模型不会替代 Codex 原生子智能体模型。可见子智能体只是负责调用对应 MCP 角色工具并记录过程。

`docs/STARTUP_PROMPT.md` 和 `docs/PROJECT_START_PROMPT.md` 已经内置这个默认流程。`docs/SUBAGENT_START_PROMPT.md` 保留为详细角色规范和排障备用，不再是日常必发提示词。

## 配置

复制模板：

```powershell
Copy-Item .env.example .env
```

只在 `.env` 中填写真实值。`*_API_KEY_ENV` 字段应填写环境变量名，不是密钥值本身：

```text
MMA_CODER_API_KEY_ENV=ANTHROPIC_API_KEY
ANTHROPIC_API_KEY=这里才是本地真实 key
```

RAG 可选配置：

```text
MMA_RAG_ROOT=
MMA_RAG_WRITE_ENABLED=true
MMA_RAG_MAX_RESULT_CHARS=4000
```

Gemini 默认用 `x-goog-api-key` header 传递 key，避免 key 出现在 URL query 中。如果某些 Gemini-compatible 网关只支持 query 参数，可以在 `.env` 中设置：

```text
MMA_GEMINI_API_KEY_IN_HEADER=false
```

外部模型调用默认使用非流式 JSON 请求。需要降低长输出等待风险时，可以启用模型层内部流式聚合：

```text
MMA_MODEL_STREAMING=true
```

启用后 server 会尝试使用 OpenAI-compatible、Anthropic 或 Gemini 的 stream endpoint，并把 SSE 内容聚合成完整文本后再返回给 MCP 工具。工具协议和写文件流程不变，`multi_model_coder_workspace_edit` 仍然必须等完整 JSON 解析、checksum 和路径校验通过后才会写入文件。

## MCP 路径

`.mcp.json` 使用可移植的插件根相对路径：

```text
./scripts/multi-model-agents-mcp.mjs
```

不要为了打包分发把它改成 `C:/Users/...` 这类用户专属绝对路径。Codex 会从已安装插件根目录启动 MCP server；本插件的 smoke test 也使用同样的工作目录行为。

## 本地自检

```powershell
node scripts/mcp-smoke-test.mjs
node scripts/http-retry-self-test.mjs
node scripts/rag-self-test.mjs
node scripts/rag-metadata-self-test.mjs
node scripts/rag-security-self-test.mjs
node scripts/rag-text-self-test.mjs
node scripts/workspace-edit-json-self-test.mjs
node scripts/workspace-edit-repair-self-test.mjs
node scripts/tester-prompt-self-test.mjs
```

这个 smoke test 只检查 MCP 初始化、工具列表和配置状态，不调用真实外部模型 API。

## License

This project is licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
