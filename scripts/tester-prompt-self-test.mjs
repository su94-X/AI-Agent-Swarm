#!/usr/bin/env node

import { readFileSync } from "node:fs";

const serverText = readFileSync(new URL("./multi-model-agents-mcp.mjs", import.meta.url), "utf8");

for (const required of [
  "verified_commands",
  "suggested_commands",
  "cases_to_inspect",
  "failure_analysis",
  "evidence_bound_risks",
  "Do not include generic best-practice reminders.",
]) {
  if (!serverText.includes(required)) {
    throw new Error(`Tester prompt is missing required text: ${required}`);
  }
}

console.log("tester prompt self-test passed.");
