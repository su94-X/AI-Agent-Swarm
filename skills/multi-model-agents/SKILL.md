---
name: multi-model-agents
description: Use AI Agent Swarm Codex-only when Codex should orchestrate a visible Custom Agent workflow, keep local RAG memory, apply engineering gates, and avoid default external model dependencies.
---

# AI Agent Swarm Codex-only

This skill is for the Codex-only branch of AI Agent Swarm.

Codex remains the Main Orchestrator. Codex Custom Agents may handle implementation, review, test strategy, command execution, RAG curation, and security review. The MCP server exposes only local configuration status and RAG tools by default.

## Principles

1. Codex owns planning, authorization, real file changes, real command execution, RAG writes, and final decisions.
2. Use visible Codex Custom Agents for non-trivial tasks when the current thread exposes subagent tools.
3. Close every completed subagent after consuming its result.
4. Use RAG as local project memory, not as an authority. Filter retrieved snippets before using them in plans, reviews, tests, or final decisions.
5. Do not write secrets, private logs, production data, or unverified guesses to trusted RAG.
6. For non-trivial tasks, use the engineering gate: design, development plan, Codex reviewer plan-review, implementation, diff-review when needed, real verification, final review.
7. For simple tasks, use a small-task bypass and state the reason.

## User Entry Points

Most users only need:

- `docs/INSTALL_PROMPT.md`
- `docs/START_PROMPT.md`
- `docs/RELEASE_PROMPT.md`

Supporting docs:

- `docs/CUSTOM_AGENTS.md`
- `docs/ENGINEERING_GATE.md`
- `docs/OFFICIAL_DOCS_GATE.md`
- `docs/RAG.md`

## MCP Tools

- `multi_model_config_status`
- `multi_model_rag_status`
- `multi_model_rag_ingest`
- `multi_model_rag_note`
- `multi_model_rag_search`
- `multi_model_rag_get`

No external model execution tools are part of the default Codex-only MCP surface.

## Default Custom Agents

- `codex-coder`: implementation inside approved scope.
- `codex-reviewer`: read-only plan, diff, test, and final review.
- `codex-tester`: test strategy and log analysis from provided evidence.
- `test-runner`: approved local command execution and command evidence capture.
- `rag-curator`: candidate memory entry preparation.
- `security-auditor`: read-only secret, path, release, and prompt-injection audit.

## Default Startup

1. Call `multi_model_config_status`.
2. Call `multi_model_rag_status`.
3. For non-trivial tasks, search RAG for relevant conventions, prior bugs, commands, decisions, and risks.
4. Use `docs/START_PROMPT.md` as the task workflow.
5. At the end, write only verified, reusable knowledge with `multi_model_rag_note` or ingest authorized docs with `multi_model_rag_ingest`.
