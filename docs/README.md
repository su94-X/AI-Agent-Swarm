# AI Agent Swarm 文档导航

普通用户只需要看前三个入口。

| 场景 | 使用文档 | 说明 |
| --- | --- | --- |
| 首次安装或换新线程检查插件 | [INSTALL_PROMPT.md](./INSTALL_PROMPT.md) | 发送给 Codex，检查 skill、MCP 工具、外部模型角色、RAG 和离线自检。 |
| 日常开发、新项目、已有项目接手 | [START_PROMPT.md](./START_PROMPT.md) | 发送给 Codex，自动判断任务类型、工程闸门、可见子智能体、RAG、Opus/Claude 编码和 Gemini 测试分析。 |
| 维护者打包和同步 GitHub Release | [RELEASE_PROMPT.md](./RELEASE_PROMPT.md) | 发送给 Codex，执行打包、tag、Release、asset 上传和验证。 |

## 进阶文档

| 文档 | 用途 |
| --- | --- |
| [ENGINEERING_GATE.md](./ENGINEERING_GATE.md) | 非简单任务的 plan-review、diff-review、test-review 和阻塞报告规则。 |
| [OFFICIAL_DOCS_GATE.md](./OFFICIAL_DOCS_GATE.md) | 第三方依赖、SDK、CLI、API 和外部事实的官方文档证据闸门。 |
| [CUSTOM_AGENTS.md](./CUSTOM_AGENTS.md) | 官方 Codex Custom Agent 模板说明：`.codex/agents/*.toml`、Skill、MCP 和 Plugin 的区别。 |
| [SUBAGENT_WORKFLOW.md](./SUBAGENT_WORKFLOW.md) | 可见子智能体工作流和角色说明。 |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | `.env`、外部模型、RAG、HTTP、GitHub Release token 配置说明。 |
| [RAG.md](./RAG.md) | 本地项目记忆库使用规则和安全边界。 |
| [ROADMAP.md](./ROADMAP.md) | 后续路线图。 |
| [templates/](../templates/) | 工程设计文档和开发计划模板。 |
| [roles/](./roles/) | 各可见角色子智能体的详细提示词。 |
| [ENGINEERING_GATE_IMPLEMENTATION_PLAN.md](./ENGINEERING_GATE_IMPLEMENTATION_PLAN.md) | 工程闸门最初落地计划，主要用于维护者回溯。 |

## 归档文档

[legacy/](./legacy/) 里是旧版拆分提示词，保留用于兼容和查历史。普通用户不要再从这些文件里选择入口。

[releases/](./releases/) 里是历史 GitHub Release note。维护当前版本时优先使用 [RELEASE_PROMPT.md](./RELEASE_PROMPT.md)。
