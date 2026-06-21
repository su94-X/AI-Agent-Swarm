# 新项目启动文档生成提示词

当一个新开发项目开始使用 multi-model-agents 插件时，发送下面这段提示词，让 Codex 自动生成项目初始文档、记忆文档和后续 RAG 使用规则。

## 提示词

```text
请使用 multi-model-agents 插件为这个新开发项目生成初始项目文档和长期记忆结构。

目标：
1. 建立后续 Codex、Opus/Claude、Gemini 协作开发所需的项目文档。
2. 明确项目目标、技术栈、目录约定、开发命令、测试策略和 RAG 记忆规则。
3. 让未来新线程或上下文压缩后，可以快速恢复项目状态。

请先执行：
1. 调用 multi_model_config_status，确认角色配置，不要打印任何 API key。
2. 调用 multi_model_rag_status，确认本地 RAG 状态。
3. 阅读当前项目已有文件。如果是空项目或文件很少，请基于用户提供的需求和当前目录情况生成初始文档。
4. 不要读取或写入 .env、.git、node_modules、dist、build、coverage、凭据文件或 RAG 数据目录。

请生成或更新这些文档：
- docs/PROJECT_BRIEF.md：项目目标、用户、核心功能、非目标。
- docs/PROJECT_OVERVIEW.md：技术栈、目录结构、主要入口、模块规划。
- docs/DEVELOPMENT_GUIDE.md：安装、启动、构建、测试、打包命令；未知命令标记为待确认。
- docs/ARCHITECTURE_NOTES.md：架构原则、边界、数据流、关键决策。
- docs/TESTING_GUIDE.md：测试策略、已知命令、需要补齐的测试类型。
- docs/AGENT_MEMORY.md：给 Codex/Opus/Gemini 使用的长期项目记忆摘要。
- docs/RAG_MEMORY_GUIDE.md：哪些内容应写入 RAG、哪些内容禁止写入 RAG、标签规范。
- docs/KNOWN_ISSUES.md：初始风险、技术债、待确认问题。

如果用户尚未提供完整需求，请先根据已有信息生成可用的初版文档，并把未知项明确标记为“待确认”，不要编造事实。

RAG 初始化规则：
1. 将项目目标、明确技术选型、已确认命令、架构决策和开发约定写入 RAG。
2. 使用 multi_model_rag_note 写入已确认的 convention、decision、command、risk 或 workflow。
3. 未确认的假设只能写入文档中的“待确认”部分，不要写入 trusted RAG。
4. 不要把密钥、.env、生产数据、私有日志或无关内容写入 RAG。

角色使用建议：
- Main Orchestrator 负责生成文档和最终判断。
- RAG Curator Subagent 可整理候选记忆条目。
- Coder Subagent 只在需要创建初始代码骨架时调用 Opus/Claude；文档生成优先由 Codex 完成。
- Tester Subagent 可让 Gemini 设计测试策略，但真实测试命令必须由 Codex 本地确认。

最终请输出：
1. 已生成/更新的文档列表。
2. 初始项目记忆摘要。
3. 已写入 RAG 的条目摘要。
4. 待用户确认的问题。
5. 下一步建议开发流程。
```

## 预期结果

Codex 应为新项目生成可维护的初始文档体系，并把已确认的目标、决策、命令和约定写入本地 RAG。后续任何新线程都可以通过 `docs/AGENT_MEMORY.md` 和 `multi_model_rag_search` 快速恢复项目上下文。
