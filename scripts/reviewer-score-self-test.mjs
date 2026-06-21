#!/usr/bin/env node

import { readFileSync } from "node:fs";

const serverText = readFileSync(new URL("./multi-model-agents-mcp.mjs", import.meta.url), "utf8");

for (const required of [
  "multi_model_reviewer_score",
  "overall_score",
  "dimension_scores",
  "blocking_findings",
  "non_blocking_findings",
  "review_stage",
  "plan-review",
  "diff-review",
  "test-review",
  "final-review",
  "must_fix_items",
  "approved_to_continue",
  "test_evidence",
  "Test evidence from Codex",
  "test-review requires test_evidence",
  "hasTestEvidence",
  "Opus/Claude did not run tests and did not edit files",
]) {
  if (!serverText.includes(required)) {
    throw new Error(`Reviewer score prompt is missing required text: ${required}`);
  }
}

if (serverText.includes("multi_model_tester_plan")) {
  throw new Error("Lite branch must not expose multi_model_tester_plan.");
}

console.log("reviewer score self-test passed.");
