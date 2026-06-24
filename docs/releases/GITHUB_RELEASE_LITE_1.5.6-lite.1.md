# AI Agent Swarm Lite 1.5.6-lite.1 Release Notes

AI Agent Swarm Lite `1.5.6-lite.1` aligns the Lite branch with the main `v1.5.6` engineering workflow while preserving Lite's shorter role model:

- Codex remains the main orchestrator, implementer, real test runner, RAG writer, and final decision maker.
- Opus/Claude remains the external reviewer/scorer for plan-review, diff-review, test-review, and final-review.
- Gemini tester workflow remains intentionally removed.

No `1.5.5-lite.1` release was published. Lite jumps directly from `1.5.4-lite.1` to `1.5.6-lite.1` so the branch version signals parity with the main `v1.5.6` engineering-gate feature set.

## Added

- `templates/engineering-design.template.md`
- `templates/development-plan.template.md`
- `docs/OFFICIAL_DOCS_GATE.md`
- `scripts/engineering-gate-docs-self-test.mjs`

## Workflow Improvements

- Engineering design and development plan templates now include version/status headers, external evidence tables, Opus gate logs, verification logs, and Progress Ledger.
- The startup prompt now has explicit small-task bypass criteria and a required `small-task bypass: <reason>` record.
- Official documentation and external evidence checks are now first-class for third-party APIs, SDKs, CLIs, platforms, config keys, migration steps, or external facts.
- Blocked Report now has a standard format: Blocked reason, Evidence, Completed plan steps, Remaining plan steps, Options, Required human decision, and estimated_resolution.
- Custom Agent and reviewer prompts now require the Opus Reviewer shell to verify templates, Progress Ledger, official evidence, and test evidence without pretending Codex ran external model work as a substitute.

## Lite Boundary

Unchanged:

- Codex implements code and decides final acceptance.
- Opus/Claude only reviews and scores through `multi_model_reviewer_score` or `multi_model_reviewer_findings`.
- The optional coder tools remain compatibility helpers and are not the default Lite workflow.
- `multi_model_tester_plan` is not exposed in Lite.

## Validation

Recommended offline validation:

```powershell
Get-ChildItem -Recurse -Path . -Include *.mjs | ForEach-Object { node --check $_.FullName }
node scripts/mcp-smoke-test.mjs
node scripts/http-retry-self-test.mjs
node scripts/model-secret-self-test.mjs
node scripts/rag-self-test.mjs
node scripts/rag-metadata-self-test.mjs
node scripts/rag-security-self-test.mjs
node scripts/rag-text-self-test.mjs
node scripts/workspace-edit-json-self-test.mjs
node scripts/workspace-edit-repair-self-test.mjs
node scripts/workspace-edit-malformed-repair-self-test.mjs
node scripts/workspace-edit-result-self-test.mjs
node scripts/reviewer-score-self-test.mjs
node scripts/custom-agents-self-test.mjs
node scripts/streaming-default-self-test.mjs
node scripts/engineering-gate-docs-self-test.mjs
node scripts/package-release.mjs <outputs-dir>
```

## Package

Expected asset:

```text
ai-agent-swarm-lite-1.5.6-lite.1.zip
```
