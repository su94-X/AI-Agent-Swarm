# AI Agent Swarm V1.5.5 Release Notes

AI Agent Swarm `V1.5.5` strengthens workspace edit repair for malformed Opus/Claude coder output.

## What Changed

- `multi_model_coder_workspace_edit` repair instructions now explicitly handle:
  - markdown output;
  - prose explanations;
  - unified diffs;
  - partial JSON;
  - JSON-like output with unsupported top-level fields.
- Added MCP-level `workspace-edit-malformed-repair-self-test.mjs`.
- The new test verifies this full path:
  1. coder model first returns malformed non-JSON diff output;
  2. plugin triggers JSON repair;
  3. repaired output becomes valid workspace edit JSON;
  4. plugin writes the file;
  5. result returns readback-verified `written_files` content.

## Important Boundary

This does not mean every possible malformed or incomplete model response can be recovered. If the repair attempt still cannot produce valid and safe workspace edit JSON, the plugin refuses to write files. That refusal is intentional.

## Release Asset

```text
ai-agent-swarm-1.5.5.zip
```
