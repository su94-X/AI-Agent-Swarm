# AI Agent Swarm V1.5.4 Release Notes

AI Agent Swarm `V1.5.4` fixes Coder Subagent workspace edit handoff visibility.

## What Changed

- `multi_model_coder_workspace_edit` now returns `written_files` after real writes.
- Each returned written file includes:
  - path, mode, created/applied flags;
  - before/after SHA256 metadata;
  - readback SHA256 verification;
  - bounded, redacted content preview.
- `dry_run: true` now returns `proposed_files` with the same bounded content preview shape.
- Added `MMA_WORKSPACE_EDIT_RETURN_FILE_CHARS` to control returned content length.
- Content previews pass through the existing secret redaction layer before returning to the MCP caller.
- Added MCP-level `workspace-edit-result-self-test.mjs` to verify that the tool writes to disk and exposes written content in the tool response.

## Why It Matters

Visible Coder Subagents often need to hand their work back to the Main Orchestrator. Previously, `multi_model_coder_workspace_edit` returned diff and hash metadata, but not the written content itself. If a subagent could not read the file immediately after the tool call, it could look like the write result was unavailable.

This release makes the handoff explicit: successful writes return readback-verified content previews, and dry runs return proposed content previews.

## Configuration

```text
MMA_WORKSPACE_EDIT_RETURN_FILE_CHARS=6000
```

Set this to `0` to return only path/hash metadata without content previews.

## Release Asset

```text
ai-agent-swarm-1.5.4.zip
```
