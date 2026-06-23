# AI Agent Swarm Lite 1.5.4-lite.1 Release Notes

AI Agent Swarm Lite `1.5.4-lite.1` strengthens optional workspace edit repair for malformed coder output.

Lite's default workflow remains unchanged:

- Codex is the orchestrator and implementation owner.
- Opus/Claude is the external reviewer/scorer.
- Gemini tester workflow is not included.

## What Changed

- Optional `multi_model_coder_workspace_edit` repair instructions now explicitly handle:
  - markdown output;
  - prose explanations;
  - unified diffs;
  - partial JSON;
  - JSON-like output with unsupported top-level fields.
- Added MCP-level `workspace-edit-malformed-repair-self-test.mjs`.
- The new test verifies that malformed first output is repaired into valid workspace edit JSON, applied to disk, and returned through `written_files`.

## Boundary

This does not make unsafe or unrecoverable malformed output acceptable. If the repair attempt still cannot produce valid and safe workspace edit JSON, the plugin refuses to write files.

## Release Asset

```text
ai-agent-swarm-lite-1.5.4-lite.1.zip
```
