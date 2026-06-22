# 兼容提示词：子智能体启动

此文件仅为兼容旧链接保留。

请改用：

```text
docs/START_PROMPT.md
```

`START_PROMPT.md` 默认会在非简单任务中实际创建或复用可见角色子智能体。详细角色规则见 `docs/SUBAGENT_WORKFLOW.md` 和 `docs/roles/`。

如果当前线程暴露 `multi_agent_v1.spawn_agent` 等子智能体工具，Coder、Reviewer、Tester 必须先作为可见子智能体出现；涉及真实命令时创建 Test Runner，涉及 RAG 写入时创建 RAG Curator。没有子智能体工具时，Codex 必须明确说明降级原因。
