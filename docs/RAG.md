# Local RAG Memory

本地 RAG 是 Codex 主控的项目记忆库，用于沉淀：

- 项目约定
- 历史 bug
- 修复方案
- 真实测试命令
- 架构决策
- 长期风险

当前实现是 JSONL 存储和本地词法检索，不做 embedding，不调用外部服务。

## 工具

- `multi_model_rag_status`
- `multi_model_rag_ingest`
- `multi_model_rag_note`
- `multi_model_rag_search`
- `multi_model_rag_get`

## 写入规则

只写入已验证知识：

- 来自真实命令输出。
- 来自已审查 diff。
- 来自用户明确确认。
- 来自仓库内可核验文档。

不要写入：

- secrets、tokens、`.env`。
- 私有日志或生产数据。
- 未验证推测。
- 无关仓库内容。
- RAG 数据目录本身。

## 检索规则

默认搜索只返回 active、trusted、未过期内容。把 RAG 结果用于执行或决策前，建议：

- 设置 `scope`。
- 设置 `min_confidence >= 0.9`。
- 设置 `verified_by`。
- 限制 `limit` 和 `max_chars`。

RAG 结果只是候选上下文，Codex 必须筛选后再使用。
