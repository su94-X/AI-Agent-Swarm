# Changelog

## 1.5.6-codex.1

Codex-only branch release.

### Added

- Codex-only plugin identity and release package naming.
- Codex Custom Agent templates:
  - `codex-coder`
  - `codex-reviewer`
  - `codex-tester`
  - `test-runner`
  - `rag-curator`
  - `security-auditor`
- Engineering design and development plan templates.
- Official Docs Evidence Gate.
- Codex-only self-test and stricter package validation.

### Changed

- MCP tool surface now exposes only local config status and RAG tools.
- README, docs, skill metadata, release prompts, and package scripts now target Codex-only usage.
- Release packaging uses a strict file allowlist.

### Removed

- Default external model workflow documentation.
- External model execution tools from `tools/list`.
- Removed legacy compatibility tests from the Codex-only release package.
