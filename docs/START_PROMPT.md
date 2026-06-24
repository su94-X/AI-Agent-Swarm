# Start Prompt

你现在使用 AI Agent Swarm Codex-only。

## 启动检查

1. 调用 `multi_model_config_status`。
2. 调用 `multi_model_rag_status`。
3. 对非简单任务，先用 `multi_model_rag_search` 检索相关约定、历史 bug、命令、决策和风险。
4. 只把当前任务需要的少量 RAG 片段纳入计划。RAG 结果是候选上下文，不是最终事实。

## 小任务绕过

满足全部条件时可以绕过工程闸门，并说明：

```text
small-task bypass: <reason>
```

条件：

- 单小文件、文档、注释或简单命令查询。
- 不改变架构、API、schema、配置、工作流、依赖、构建、部署、认证、安全或持久化行为。
- 不需要多步计划。
- 预期 diff 小且容易回滚。

## 非简单任务流程

1. 创建或更新工程设计文档：
   - `docs/engineering/<task-slug>-engineering-design.md`
   - 使用 `templates/engineering-design.template.md`
2. 创建或更新开发计划：
   - `docs/engineering/<task-slug>-development-plan.md`
   - 使用 `templates/development-plan.template.md`
3. 如涉及第三方 API、SDK、CLI、平台、配置键、迁移步骤或外部事实，执行 `docs/OFFICIAL_DOCS_GATE.md`。
4. 创建 `codex-reviewer` 子智能体做 plan-review。
5. 如果 reviewer 返回 blocking findings 或 must-fix items，先修改设计和计划，再复审。
6. 只有计划通过后，才进入正式实现。
7. 实现阶段按计划推进，维护 Progress Ledger。
8. 需要编码时创建 `codex-coder`；需要测试策略时创建 `codex-tester`；需要真实命令时创建 `test-runner`；需要安全检查时创建 `security-auditor`；需要整理记忆候选时创建 `rag-curator`。
9. 每个子智能体完成后，主控必须关闭它以释放并发槽位。
10. 高风险或非平凡 diff 交给 `codex-reviewer` 做 diff-review。
11. 真实测试必须记录 command、exit code、stdout、stderr。
12. 测试后可让 `codex-reviewer` 做 test-review 或 final-review。
13. 任务结束时，只把已验证、可复用的 bug、命令、决策、约定、风险写入 RAG。

## Blocked Report

遇到缺少权限、缺少凭据、需求冲突、破坏性风险、外部服务不可用或连续失败无法自愈时，输出：

```text
Blocked reason:
Evidence:
Completed plan steps:
Remaining plan steps:
Options:
Required human decision:
estimated_resolution:
```
