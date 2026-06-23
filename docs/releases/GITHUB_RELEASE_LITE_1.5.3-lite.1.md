# AI Agent Swarm Lite 1.5.3-lite.1 Release Notes

AI Agent Swarm Lite `1.5.3-lite.1` fixes workspace edit result visibility for the optional coder compatibility path.

Lite's default workflow remains unchanged:

- Codex is the orchestrator and implementation owner.
- Opus/Claude is the external reviewer/scorer.
- Gemini tester workflow is not included.

## What Changed

- `multi_model_coder_workspace_edit` now returns `written_files` after real writes.
- Returned written file entries include readback SHA256 verification and bounded, redacted content previews.
- `dry_run: true` returns `proposed_files` with the same bounded preview shape.
- Added `MMA_WORKSPACE_EDIT_RETURN_FILE_CHARS` to control returned content length.
- Added MCP-level `workspace-edit-result-self-test.mjs` to verify that the tool writes to disk and exposes written content in the tool response.

## Configuration

```text
MMA_WORKSPACE_EDIT_RETURN_FILE_CHARS=6000
```

Set this to `0` to return only path/hash metadata without content previews.

## Release Asset

```text
ai-agent-swarm-lite-1.5.3-lite.1.zip
```
