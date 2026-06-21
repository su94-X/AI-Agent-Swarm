# 本地项目记忆库（轻量 RAG）

AI Agent Swarm 的本地项目记忆库是 Codex 主控的轻量 RAG 层，用于沉淀项目约定、历史 bug、修复方案、真实测试命令、架构决策和风险记录。

当前实现是本地 JSONL 存储和词法检索，不调用外部模型，不引入 embedding 或向量数据库。它的目标是给 Codex 提供可审查、可控、可逐步沉淀的项目记忆，而不是替代完整语义检索系统。V1.4.5 增加知识质量元数据和默认过滤，避免过期、废弃或低置信度知识在上下文压缩后继续误导新线程。

## 核心原则

- 本地项目记忆库是 Codex 的工具，不是外部模型自己的记忆。
- Opus/Claude 和 Gemini 不直接写本地项目记忆库。
- Codex 先检索、筛选，再把少量相关片段传给外部模型。
- 本地项目记忆库默认存储在稳定的 Codex 用户目录：`$CODEX_HOME/multi-model-agents/rag`。未设置 `CODEX_HOME` 时使用用户目录下 `.codex/multi-model-agents/rag`。RAG 数据不进入项目仓库、不提交、不打包。
- `.env`、密钥、生产数据、私有日志和无关仓库内容不得写入本地项目记忆库。

## 工具

- `multi_model_rag_status`：查看知识库状态，不返回正文。
- `multi_model_rag_ingest`：导入 Codex 授权读取的本地文件。
- `multi_model_rag_note`：写入 Codex 已验证的会话知识条目。
- `multi_model_rag_search`：本地词法检索，不调用外部模型。
- `multi_model_rag_get`：按 chunk/document id 获取有限上下文。

## V1.4.5 知识质量元数据

`multi_model_rag_note` 和 `multi_model_rag_ingest` 支持这些可选字段：

- `confidence`：0 到 1 的置信度，默认 `1`。检索可用 `min_confidence` 过滤。
- `verified_by`：验证者，默认 `codex`。建议写成 `codex`、`codex-self-test`、`user-confirmed` 或项目内约定名称。
- `expires_at`：ISO 时间戳。过期条目默认不会出现在 `multi_model_rag_search` 和 `multi_model_rag_get` 结果里，除非显式设置 `include_expired: true`。
- `scope`：适用范围数组，例如 `["plugin"]`、`["frontend"]`、`["backend/auth"]`。检索可按 scope 精确过滤。
- `aliases`：搜索别名或同义词，用于改善本地词法检索召回。
- `status`：`active`、`superseded` 或 `deprecated`，默认 `active`。搜索默认只返回 `active`。

搜索默认行为：

- `trusted_only: true`
- `include_expired: false`
- `status: "active"`
- `min_confidence: 0`

这意味着历史知识不会因为存在于库里就自动进入当前任务上下文。Codex 仍需要按任务筛选少量结果，再传给 Opus/Gemini。

## 检索分级

实测结论：默认搜索适合探索背景，但不够严格，仍可能返回低置信度或不同 scope 的 active 条目。把 RAG 结果用于执行、决策、上下文注入或 known test commands 前，必须使用严格检索。

探索检索：

- 用于了解项目背景、查找线索、回顾历史。
- 可以使用默认 `multi_model_rag_search`。
- 低置信度、不同 scope 或历史结果只能当作候选线索，不能直接作为执行事实。

执行/决策检索：

- 用于 plan、constraints、known_test_commands、review context，或传给 Opus/Gemini 的上下文。
- 必须显式设置 `scope`，避免跨项目或跨模块知识漂移。
- 建议设置 `min_confidence: 0.9`。
- 如果知道验证来源，设置 `verified_by`，例如 `codex`、`codex-self-test`、`user-confirmed` 或项目约定名称。
- 不要设置 `include_expired: true`，除非正在审计、排障或做历史对比。
- `deprecated` 和 `superseded` 条目只能作为历史背景，不得作为当前执行依据。

严格检索示例：

```json
{
  "query": "发布包验证命令",
  "scope": ["plugin"],
  "min_confidence": 0.9,
  "verified_by": "codex",
  "limit": 5
}
```

## 推荐流程

任务开始：

1. Codex 调用 `multi_model_rag_status`。
2. 非简单任务调用 `multi_model_rag_search` 检索项目约定、历史 bug、测试命令和架构决策。
3. Codex 只选择当前任务必要的片段加入 plan、constraints 或 known_test_commands。

任务结束：

1. Codex 确认 diff、测试和最终结论。
2. 如产生可复用知识，调用 `multi_model_rag_note` 写入 bug、decision、command、convention、risk 等条目。
3. 如已有本地文档需要入库，调用 `multi_model_rag_ingest` 导入授权文件。

推荐写入示例：

```json
{
  "title": "Windows zip entry 必须使用正斜杠",
  "body": "发布包内路径必须使用 /，不能使用 Windows 反斜杠，否则部分安装器可能找不到 plugin.json。",
  "type": "bug",
  "tags": ["packaging", "zip"],
  "evidence": "已通过 package-release.mjs 和 zip entry 审计验证。",
  "confidence": 0.95,
  "verified_by": "codex",
  "scope": ["plugin"],
  "aliases": ["zip path separator", "plugin package path"],
  "status": "active"
}
```

## 配置

```text
MMA_RAG_ROOT=
MMA_RAG_WRITE_ENABLED=true
MMA_RAG_MAX_RESULT_CHARS=4000
```

`MMA_RAG_ROOT` 留空时使用稳定的 Codex 用户目录。不要把它设置到项目仓库、发布包目录或可被外部模型读取的临时目录中。

## 安全

RAG 写入和检索会执行敏感内容扫描。命中 API key、JWT、private key、OAuth token、数据库连接串等模式时，写入会被拒绝，检索输出也会被阻止。
