# Changelog

All notable changes to AI Agent Swarm are documented here.

## [1.4.9] - 2026-06-22

### Added

- Added `scripts/sync-github-release.mjs` to create/update GitHub Releases and upload the versioned zip asset.
- Added user-level GitHub Release token support via `GITHUB_TOKEN`/`GH_TOKEN`, `MMA_GITHUB_TOKEN_FILE`, or `%USERPROFILE%\.codex\multi-model-agents\github-release-token`.
- Added shared token detection and redaction helpers in `lib/redaction.mjs`.
- Added `scripts/model-secret-self-test.mjs` for GitHub token and direct-key redaction coverage.

### Changed

- Extended RAG secret scanning and error redaction to cover GitHub fine-grained tokens such as `github_pat_...`.
- Extended direct `*_API_KEY_ENV` secret detection to catch GitHub token formats.
- Updated release documentation to keep GitHub Release tokens outside the plugin repository, workspace, output directory, `.env`, and `.env.example`.

## [1.4.8] - 2026-06-22

### Changed

- Strengthened `docs/START_PROMPT.md` so non-simple tasks must create visible Codex role subagents when subagent tools are available.
- Updated `skills/multi-model-agents/SKILL.md` and `docs/SUBAGENT_WORKFLOW.md` to forbid silent fallback to Main Orchestrator-only execution when visible subagent tools are exposed.
- Added `scripts/subagent-prompt-self-test.mjs` to guard the visible subagent startup contract.
- Updated README, plugin metadata, skill UI metadata, roadmap, and release notes for V1.4.8.

### Notes

- Core MCP runtime behavior is unchanged. This release tightens workflow policy so users can see Coder, Reviewer, Tester, Test Runner, and RAG Curator activity in Codex when the current thread supports visible subagents.

## [1.4.7] - 2026-06-22

### Added

- Added three universal user prompts:
  - `docs/INSTALL_PROMPT.md`
  - `docs/START_PROMPT.md`
  - `docs/RELEASE_PROMPT.md`
- Added release notes for V1.4.7.

### Changed

- Simplified the public prompt UX from many task-specific prompt files to three primary entry points.
- Converted older prompt files into short compatibility wrappers pointing to the new universal prompts.
- Updated README, skill metadata, environment docs, roadmap, and package validation to make the new prompts canonical.
- Kept core MCP runtime behavior unchanged; this release focuses on documentation and release UX.

## [1.4.6] - 2026-06-22

### Added

- Added the main-version engineering gate workflow in `docs/ENGINEERING_GATE.md`.
- Added a task-specific implementation plan record in `docs/ENGINEERING_GATE_IMPLEMENTATION_PLAN.md`.
- Added release notes for V1.4.6.

### Changed

- Updated README, skill metadata, startup prompts, subagent workflow docs, role prompts, and install prompts to make engineering gates the default for non-simple development work.
- Updated release packaging validation to require the engineering gate documents and V1.4.6 release note.
- Kept core MCP tool runtime behavior unchanged; this release focuses on workflow policy, documentation, metadata, and release package validation.

### Verified

- Engineering gate plan-review completed with Opus/Claude before implementation.
- Offline validation and package audit are required before publishing `ai-agent-swarm-1.4.6.zip`.

## [1.4.5] - 2026-06-21

### Added

- Added independent RAG submodule self-tests:
  - `scripts/rag-metadata-self-test.mjs`
  - `scripts/rag-security-self-test.mjs`
  - `scripts/rag-text-self-test.mjs`
- Added release package validation coverage for the new RAG self-tests.

### Changed

- Synchronized public documentation and plugin metadata for V1.4.5.
- Kept `plugin.json` ASCII-only while preserving Chinese display fields through Unicode escapes.

### Verified

- Offline MCP smoke test.
- HTTP retry and SSE aggregation self-test.
- RAG end-to-end self-test and RAG submodule self-tests.
- Workspace edit JSON and repair self-tests.
- Tester prompt self-test.
- Plugin manifest validation and skill quick validation.
- Release zip audit: no `.env`, no RAG data, no backslash paths, no cachebuster suffix.

## [1.4.4] - 2026-06-21

### Changed

- Split the RAG implementation into smaller modules:
  - `lib/rag.mjs`
  - `lib/rag-metadata.mjs`
  - `lib/rag-security.mjs`
  - `lib/rag-text.mjs`
- Kept local lexical RAG as the safe default; semantic embedding remains on the roadmap.

## [1.3.0] - 2026-06-21

### Added

- Added `lib/mcp.mjs` for MCP stdio protocol helpers, schema helpers, `.env` loading, and progress/log notifications.
- Added workspace `edits` mode with `replace`, `insert_after`, and `insert_before`.
- Added MCP visible progress/log notifications through `notifications/message`.

## [1.1.0] - 2026-06-21

### Added

- First formal public release line.
- Added modular model, workspace, and RAG layers.
- Added local project memory store, visible role subagent workflow, and cross-platform release packaging.
