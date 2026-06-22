# AI Agent Swarm Lite 可见角色流程

Lite 版默认只保留必要角色，避免复杂多 Agent 流水线。

V1.5.0-lite.1 起，Lite 随包提供官方 Custom Agent 模板：`.codex/agents/*.toml`。这些模板需要位于当前项目 `.codex/agents/` 或用户级 `~/.codex/agents/` 才会被 Codex 作为 Custom Agent 加载。Skill 负责工作流，MCP 负责 Opus/Claude reviewer/scorer 与 RAG 工具，Plugin 负责打包分发。

| 角色 | 底层能力 | 工具 | 职责 |
| --- | --- | --- | --- |
| Main Orchestrator | Codex | 本地工具 + RAG 工具 | 规划、授权、文件修改、真实测试、最终决策 |
| Opus Reviewer / Scorer | Opus/Claude | `multi_model_reviewer_findings` / `multi_model_reviewer_score` | Codex 可见壳子，必须通过 MCP 调用 Opus/Claude 做外部审查、风险判断、0-100 评分 |
| Test Runner | Codex | 本地命令工具 | 运行主控批准的真实命令并记录证据 |
| RAG Curator | Codex | RAG 工具 | 整理候选知识，最终由主控写入 |
| Security Auditor | Codex | 只读审计 | 检查密钥、路径边界、发布包和 prompt injection surface |
| Custom | 可配置 | `multi_model_role_call` | 非标准外部模型任务 |

## 生命周期规则

- 非简单任务优先使用 `opus-reviewer`、`test-runner`、`rag-curator`、`security-auditor` 这些 Custom Agent。
- 如果只能使用内置 `worker` / `explorer`，则用内置子智能体承载同样角色，并记录映射关系。
- 创建 Opus Reviewer / Scorer 子智能体时，Main Orchestrator 的 spawn message 必须再次写明：必须调用 `multi_model_reviewer_score` 或 `multi_model_reviewer_findings`，不得自己直接审查评分，不得用 Codex 自己代替 Opus/Claude；工具、key 或输入证据不足时输出阻塞或降级报告。
- 子智能体完成任务并返回结果后，Main Orchestrator 必须调用 `close_agent` 或等价关闭能力释放并发槽位。
- Security Auditor 不得打开、读取、打印或转述真实 `.env`、token、凭据、私有日志或 RAG 正文；只能检查 diff、文件名、manifest、发布包条目、`.env.example`、文档说明、脚本逻辑和泄漏路径。

## 主流程

1. Main Orchestrator 调用 `multi_model_config_status`。
2. Main Orchestrator 调用 `multi_model_rag_status`，必要时调用 `multi_model_rag_search`。
3. Codex 制定工程设计和开发计划。
4. 创建 Reviewer / Scorer 子智能体时把“必须调用 `multi_model_reviewer_score`、不得自己直接审查评分”的执行合同写进 spawn message，然后由 Reviewer / Scorer 调用 `multi_model_reviewer_score`，设置 `review_stage: "plan"`，做 plan-review。
5. 只有没有 blocking findings、must-fix items 且 Codex 确认计划可执行后，才进入文件修改或命令执行。
6. 高风险或非平凡 diff 调用 `review_stage: "diff"`。
7. 真实测试完成后调用 `review_stage: "test"`，传入 command、exit code、stdout、stderr 和变更摘要。
8. Codex 根据真实测试和外部评分做最终决定。
9. 需要时由 RAG Curator 整理候选知识，由 Security Auditor 做只读安全审计。
10. Main Orchestrator 收集结果后关闭已完成子智能体。
11. 已验证的 bug、命令、决策或风险由 Codex 写入 RAG。

## Reviewer / Scorer 输出要求

- `overall_score`：0-100。
- `dimension_scores`：正确性、安全、回归、可维护性、范围控制、测试证据。
- `blocking_findings`：应阻塞接受的问题。
- `non_blocking_findings`：可后续处理的问题。
- `evidence`：每条结论绑定 task、plan、diff、changed_files 或真实日志证据。
- `recommended_codex_actions`：Codex 下一步应检查、测试或决策的动作。
- `must_fix_items`：继续前必须处理的问题。
- `approved_to_continue`：外部 reviewer/scorer 是否建议进入下一阶段。
- `stage_specific_review`：针对 plan-review、diff-review、test-review 或 final-review 的阶段结论。

## 禁止事项

- 不使用 Gemini tester 环节。
- 不把 Opus/Claude 评分当作最终决定。
- 不让外部模型直接写 RAG。
- 不向外部模型发送 `.env`、API key、生产数据或无关仓库内容。
- 不让已完成子智能体继续占用并发槽位。
