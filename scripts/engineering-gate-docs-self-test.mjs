#!/usr/bin/env node

import { readFileSync } from "node:fs";

const files = {
  manifest: readText(".codex-plugin/plugin.json"),
  mcp: readText(".mcp.json"),
  packageRelease: readText("scripts/package-release.mjs"),
  rootReadme: readText("README.md"),
  docsReadme: readText("docs/README.md"),
  start: readText("docs/START_PROMPT.md"),
  gate: readText("docs/ENGINEERING_GATE.md"),
  officialDocs: readText("docs/OFFICIAL_DOCS_GATE.md"),
  workflow: readText("docs/SUBAGENT_WORKFLOW.md"),
  reviewerPrompt: readText("docs/roles/REVIEWER_SUBAGENT_PROMPT.md"),
  reviewerAgent: readText(".codex/agents/codex-reviewer.toml"),
  designTemplate: readText("templates/engineering-design.template.md"),
  planTemplate: readText("templates/development-plan.template.md"),
};

const manifest = JSON.parse(files.manifest);
const mcp = JSON.parse(files.mcp);
const nonAscii = [...files.manifest].filter((char) => char.charCodeAt(0) > 127).length;

if (manifest.version !== "1.5.6-codex.1") {
  throw new Error(`Expected Codex-only version 1.5.6-codex.1, found ${manifest.version}`);
}
if (nonAscii !== 0) {
  throw new Error(`plugin.json must be ASCII-only, found ${nonAscii} non-ASCII characters.`);
}
const server = mcp.mcpServers?.["multi-model-agents"];
if (!server?.args?.includes("./scripts/multi-model-agents-mcp.mjs")) {
  throw new Error(".mcp.json must use ./scripts/multi-model-agents-mcp.mjs");
}

mustInclude(files.designTemplate, [
  "Task:",
  "Slug:",
  "Version: v0.1",
  "Status: draft",
  "Codex reviewer plan-review:",
  "## External Evidence and Official Docs",
  "## Codex-only Role Boundary",
  "## Version History",
]);

mustInclude(files.planTemplate, [
  "Task:",
  "Slug:",
  "Version: v0.1",
  "Status: draft",
  "Codex reviewer plan-review:",
  "## Plan Rules",
  "## Progress Ledger",
  "Reviewer gates:",
  "## Verification Log",
  "## Reviewer Gate Log",
  "Blocked reason:",
  "Required human decision:",
  "estimated_resolution:",
]);

mustInclude(files.officialDocs, [
  "何时必须运行",
  "何时可以跳过",
  "证据表格",
  "Dependency/Surface",
  "Reviewer 检查",
]);

mustInclude(files.gate, [
  "docs/engineering/<task-slug>-engineering-design.md",
  "docs/engineering/<task-slug>-development-plan.md",
  "templates/engineering-design.template.md",
  "templates/development-plan.template.md",
  "small-task bypass: <reason>",
  "Official Docs",
  "Version Rules",
  "Progress Ledger",
  "Blocked Report",
  "Required human decision:",
  "estimated_resolution:",
]);

mustInclude(files.start, [
  "small-task bypass: <reason>",
  "docs/engineering/<task-slug>-engineering-design.md",
  "docs/engineering/<task-slug>-development-plan.md",
  "templates/engineering-design.template.md",
  "templates/development-plan.template.md",
  "docs/OFFICIAL_DOCS_GATE.md",
  "codex-reviewer",
  "Progress Ledger",
  "Blocked Report",
]);

mustInclude(files.workflow, ["Progress Ledger", "Blocked Report", "codex-reviewer", "close"]);
mustInclude(files.reviewerPrompt, ["verdict: pass / block", "approved_to_continue", "Blocked Report"]);
mustInclude(files.reviewerAgent, ["plan-review", "diff-review", "test-review", "final-review", "approved_to_continue"]);
mustInclude(files.docsReadme, ["OFFICIAL_DOCS_GATE.md", "templates/", "engineering-design.template.md", "development-plan.template.md"]);
mustInclude(files.docsReadme, ["SUBAGENT_WORKFLOW.md"]);
mustInclude(files.rootReadme, ["templates/engineering-design.template.md", "templates/development-plan.template.md", "1.5.6-codex.1"]);
mustInclude(files.packageRelease, ["releaseFiles", "docs/OFFICIAL_DOCS_GATE.md", "scripts/engineering-gate-docs-self-test.mjs"]);

for (const [label, text] of Object.entries(files)) {
  mustNotInclude(text, ["multi", "model", "tester", "plan"].join("_"), label);
  mustNotInclude(text, ["multi", "model", "reviewer", "score"].join("_"), label);
  mustNotInclude(text, [["Op", "us"].join(""), ["Clau", "de"].join("")].join("/"), label);
  mustNotInclude(text, [["Gem", "ini"].join(""), "tester"].join(" "), label);
}

console.log("engineering gate docs self-test passed.");

function readText(relPath) {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), "utf8");
}

function mustInclude(text, required) {
  for (const snippet of required) {
    if (!text.includes(snippet)) {
      throw new Error(`Missing required engineering gate text: ${snippet}`);
    }
  }
}

function mustNotInclude(text, snippet, label) {
  if (text.includes(snippet)) {
    throw new Error(`${label} contains prohibited engineering gate text: ${snippet}`);
  }
}
