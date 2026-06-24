# Changelog

All notable changes to AI Agent Swarm and its Lite branch are documented here.

## [1.5.6-lite.1] - 2026-06-24

### Added

- Added Lite engineering templates:
  - `templates/engineering-design.template.md`
  - `templates/development-plan.template.md`
- Added `docs/OFFICIAL_DOCS_GATE.md` for official documentation and external evidence checks.
- Added Progress Ledger, Verification Log, Opus Gate Log, Blocked Report, and versioned design rules to the Lite engineering workflow.
- Added `scripts/engineering-gate-docs-self-test.mjs` to verify Lite engineering docs, templates, plugin manifest constraints, release packaging requirements, and role-boundary wording.

### Changed

- Updated `docs/START_PROMPT.md`, `docs/ENGINEERING_GATE.md`, `docs/SUBAGENT_WORKFLOW.md`, `docs/CUSTOM_AGENTS.md`, role prompts, README, docs navigation, skill metadata, and release prompts for the stricter Lite engineering workflow.
- Updated package validation so Lite release bundles include `templates/`, `docs/OFFICIAL_DOCS_GATE.md`, and the new engineering docs self-test.
- Clarified that MCP progress is a visible log notification, not a standard progress-token progress bar.

### Notes

- No `1.5.5-lite.1` release was published. Lite intentionally jumps from `1.5.4-lite.1` to `1.5.6-lite.1` to align with the main `v1.5.6` engineering-gate feature set.
- Lite role boundaries remain unchanged: Codex implements, tests, writes RAG, and decides; Opus/Claude reviews and scores; Gemini tester workflow remains removed.

## [1.5.4-lite.1] - 2026-06-23

### Fixed

- Strengthened optional `multi_model_coder_workspace_edit` repair instructions for malformed coder output, including markdown, prose, unified diffs, partial JSON, and JSON-like output with unsupported fields.
- Added `workspace-edit-malformed-repair-self-test.mjs`, an MCP-level regression test that verifies malformed first output is repaired into valid workspace edit JSON, applied to disk, and returned through `written_files`.

## [1.5.3-lite.1] - 2026-06-23

### Fixed

- `multi_model_coder_workspace_edit` now returns readback-verified, redacted `written_files` content previews after real writes for the optional coder compatibility path.
- Dry runs now return `proposed_files` content previews instead of only diff/hash metadata.
- Added `MMA_WORKSPACE_EDIT_RETURN_FILE_CHARS` to bound returned file content and `workspace-edit-result-self-test.mjs` to cover MCP-level writeback behavior.

## [1.5.2-lite.1] - 2026-06-22

### Changed

- Enabled model-layer streaming by default with `MMA_MODEL_STREAMING=true` for Lite Opus/Claude reviewer/scorer calls.
- Kept MCP tool outputs unchanged: streamed provider responses are still aggregated inside the server before returning tool results.
- Documented `MMA_MODEL_STREAMING=false` as the fallback for gateways that do not support SSE/stream endpoints.

### Verified

- Offline HTTP retry and SSE aggregation self-test passed.
- Streaming default self-test passed.

## [1.5.1-lite.1] - 2026-06-22

### Fixed

- Strengthened the Lite `opus-reviewer` Custom Agent prompt so the visible Codex subagent must call `multi_model_reviewer_score` or `multi_model_reviewer_findings` and must not directly perform review/scoring as a substitute for Opus/Claude.
- Updated `docs/START_PROMPT.md` to require Main Orchestrator to include the reviewer/scorer MCP execution contract in each `opus-reviewer` spawn message.
- Updated README, Custom Agent docs, role prompt, installation/release prompts, skill metadata, and self-tests for the stricter Lite review contract.

### Notes

- No intentional MCP runtime behavior changes. Lite still removes the Gemini tester workflow and keeps Codex as the only final decision maker.

## [1.5.0-lite.1] - 2026-06-22

### Added

- Added Lite official Codex Custom Agent templates under `.codex/agents/`:
  - `opus-reviewer`
  - `test-runner`
  - `rag-curator`
  - `security-auditor`
- Added `docs/CUSTOM_AGENTS.md` for Lite.
- Added `scripts/custom-agents-self-test.mjs`.
- Added release packaging validation for `.codex/agents/*.toml`.

### Changed

- Updated Lite startup, subagent workflow, installation, release, README, skill metadata, and roadmap docs for Custom Agents.
- Documented that completed subagents must be closed with `close_agent` or equivalent to release concurrency slots.
- Strengthened Lite package-release validation with content-level secret scanning and symlink/reparse-point rejection.

## [1.4.9-lite.2] - 2026-06-22

### Changed

- Simplified Lite documentation into three user-facing prompt entries: `docs/INSTALL_PROMPT.md`, `docs/START_PROMPT.md`, and `docs/RELEASE_PROMPT.md`.
- Added `docs/README.md` as the documentation navigation page.
- Moved older split prompt files into `docs/legacy/`.
- Moved Lite release notes into `docs/releases/`.
- Updated release packaging and GitHub Release sync scripts for the new docs layout.

## [1.4.9-lite.1] - 2026-06-22

### Added

- Added `scripts/sync-github-release.mjs` for Lite GitHub Release creation/update and zip asset upload.
- Added user-level GitHub Release token support via environment variables, `MMA_GITHUB_TOKEN_FILE`, `$CODEX_HOME`, or `%USERPROFILE%\.codex\multi-model-agents\github-release-token`.
- Added `lib/redaction.mjs` and `scripts/model-secret-self-test.mjs` for GitHub token detection and redaction coverage.

### Changed

- Extended RAG secret scanning and direct `*_API_KEY_ENV` mistake detection to cover GitHub token formats including `github_pat_...`.
- Updated package validation to require Lite 1.4.9 release notes, release sync scripts, redaction helpers, icon assets, and skill UI metadata.
- Kept Lite workflow unchanged: no Gemini tester workflow; Opus/Claude remains reviewer/scorer.

## [1.4.5-lite.2] - 2026-06-22

### Added

- Added Lite engineering gate documentation in `docs/ENGINEERING_GATE.md`.
- Extended `multi_model_reviewer_score` with `review_stage` and `test_evidence` support for plan-review, diff-review, test-review, and final-review.
- Added reviewer prompt requirements for `must_fix_items`, `approved_to_continue`, and `stage_specific_review`.

### Changed

- Updated Lite startup, project, role, README, skill, release, and packaging docs to require design gate review before non-trivial coding.
- Strengthened reviewer-score self-test to guard engineering gate prompt fields.

### Verified

- Lite plan-review was performed with Opus/Claude before implementation.
- Core syntax, MCP smoke, and reviewer-score self-test passed during implementation.

## [1.4.5-lite.1] - 2026-06-22

### Added

- Added AI Agent Swarm Lite branch identity and release packaging.
- Added `multi_model_reviewer_score` for Opus/Claude external review, risk analysis, and 0-100 scoring.
- Added Lite-specific README, install prompts, startup prompts, role prompts, and release notes.

### Changed

- Changed the default workflow to Codex main control plus Opus/Claude reviewer/scorer.
- Removed the Gemini tester workflow from the Lite MCP tool surface.
- Updated CI and package validation to use `scripts/reviewer-score-self-test.mjs`.
- Kept RAG, workspace safety, package validation, and no-npm-dependency architecture from the full V1.4.5 line.

### Verified

- Offline MCP smoke test should confirm `multi_model_reviewer_score` exists and `multi_model_tester_plan` is not exposed.
- Real API smoke test is optional and should be run only with intentionally configured local keys.

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
