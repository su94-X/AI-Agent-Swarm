# 已有项目接手分析提示词

当一个已有开发项目第一次使用 multi-model-agents 插件时，先把下面这段提示词发送给 Codex。目标是让 Codex 读取和分析当前项目，输出一组接手开发所需的总结文档，并把确认后的关键信息写入本地 RAG。

## 提示词

```text
请使用 multi-model-agents 插件接手分析这个已有开发项目。

目标：
1. 读取项目结构和关键文件，形成可供后续开发使用的项目总结文档。
2. 识别项目架构、运行方式、测试方式、开发约定、已知风险和后续接手建议。
3. 使用本地项目记忆库（轻量 RAG）沉淀已确认的项目知识，降低后续上下文压缩导致的遗忘和漂移。

请先执行：
1. 调用 multi_model_config_status，确认角色配置，不要打印任何 API key。
2. 调用 multi_model_rag_status，确认本地 RAG 状态。
3. 只读取与项目理解相关的文件，不要读取 .env、.git、node_modules、dist、build、coverage、凭据文件、私有日志或无关大文件。

请分析这些内容：
- 项目技术栈和主要入口。
- 目录结构和模块职责。
- 安装、启动、构建、测试、打包命令。
- 配置文件和环境变量模板。
- 关键业务流程或核心模块。
- 代码风格、约定和命名习惯。
- 现有测试覆盖和测试缺口。
- 已知风险、易踩坑点和可疑技术债。
- 后续使用 Opus/Claude 编码时应授权的典型读写边界。
- 后续使用 Gemini 做测试分析时应提供的 known_test_commands。

请在项目中输出或更新这些文档：
- docs/PROJECT_OVERVIEW.md：项目整体说明、技术栈、入口、模块地图。
- docs/DEVELOPMENT_GUIDE.md：本地安装、启动、构建、测试、打包命令。
- docs/ARCHITECTURE_NOTES.md：架构约定、关键数据流、重要设计决策。
- docs/TESTING_GUIDE.md：已验证测试命令、测试策略、测试缺口。
- docs/KNOWN_ISSUES.md：已知问题、风险、技术债、踩坑记录。
- docs/AGENT_MEMORY.md：给 Codex/Opus/Gemini 后续使用的精简项目记忆。

写文档前请先说明计划和拟写入文件路径。不要覆盖已有重要文档；如果文件已存在，请在保留原内容的前提下增量整理，或先说明合并策略。

RAG 写入规则：
1. 只有已经从项目文件、真实命令输出或用户明确确认中得到的事实，才能写入 RAG。
2. 可以把项目约定写入 convention，把真实命令写入 command，把架构决策写入 decision，把已知问题写入 bug/risk。
3. 不要把未验证的模型猜测写入 trusted RAG。
4. 不要把密钥、.env、生产数据或私有日志写入 RAG。

角色使用建议：
- Main Orchestrator 负责项目读取、判断和最终文档输出。
- 可以使用 RAG Curator Subagent 整理候选 RAG 条目。
- 只有需要复杂代码理解时，才让 Coder Subagent 调用 Opus/Claude 做有限范围分析；不要让 Opus 修改文件。
- 只有需要测试策略或失败日志分析时，才让 Tester Subagent 调用 Gemini。

最终请输出：
1. 已生成/更新的文档列表。
2. 已确认的启动/测试命令。
3. 写入 RAG 的条目摘要。
4. 仍需用户确认的问题。
5. 后续开发任务推荐流程。
```

## 预期结果

Codex 应生成一组接手文档，并把可复用、已验证的项目知识写入本地 RAG。后续开发时可先读 `docs/AGENT_MEMORY.md`，再用 `multi_model_rag_search` 检索历史知识。
