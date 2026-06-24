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
  opusReviewerAgent: readText(".codex/agents/opus-reviewer.toml"),
  designTemplate: readText("templates/engineering-design.template.md"),
  planTemplate: readText("templates/development-plan.template.md"),
};

const manifest = JSON.parse(files.manifest);
const mcp = JSON.parse(files.mcp);
const nonAscii = [...files.manifest].filter((char) => char.charCodeAt(0) > 127).length;

if (manifest.version !== "1.5.6-lite.1") {
  throw new Error(`Expected Lite version 1.5.6-lite.1, found ${manifest.version}`);
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
  "Opus plan-review:",
  "## External Evidence and Official Docs",
  "## Lite Role Boundary",
  "Codex-owned Test Runner",
  "Codex-owned RAG Curator",
  "Codex-owned Security Auditor",
  "## Version History",
]);

mustInclude(files.planTemplate, [
  "Task:",
  "Slug:",
  "Version: v0.1",
  "Status: draft",
  "Opus plan-review:",
  "## Plan Rules",
  "## Progress Ledger",
  "Status: pending / in_progress / done / blocked",
  "## Verification Log",
  "## Opus Gate Log",
  "Blocked reason:",
  "Required human decision:",
  "estimated_resolution:",
  "## Version History",
]);

mustInclude(files.officialDocs, [
  "何时必须运行",
  "何时允许跳过",
  "证据记录格式",
  "Dependency/Surface",
  "查询路由",
  "Lite 审查要求",
  "禁止事项",
]);

mustInclude(files.gate, [
  "docs/engineering/<task-slug>-engineering-design.md",
  "docs/engineering/<task-slug>-development-plan.md",
  "templates/engineering-design.template.md",
  "templates/development-plan.template.md",
  "小任务绕过标准",
  "small-task bypass: <reason>",
  "Official Docs Evidence Gate",
  "Version Rules",
  "Progress Ledger",
  "Blocked Report",
  "Blocked reason:",
  "Required human decision:",
  "estimated_resolution:",
  "docs/OFFICIAL_DOCS_GATE.md",
  "Lite 不使用 Gemini tester 工作流",
]);

mustInclude(files.start, [
  "small-task bypass: <reason>",
  "docs/engineering/<task-slug>-engineering-design.md",
  "docs/engineering/<task-slug>-development-plan.md",
  "templates/engineering-design.template.md",
  "templates/development-plan.template.md",
  "docs/OFFICIAL_DOCS_GATE.md",
  "Progress Ledger",
  "Blocked Report 格式",
  "必须调用 `multi_model_reviewer_score`",
  "不得自己直接审查评分",
]);

mustInclude(files.workflow, [
  "Progress Ledger",
  "如果上下文被压缩或线程恢复",
  "Blocked Report",
  "Blocked reason:",
  "Required human decision:",
  "estimated_resolution:",
]);

mustInclude(files.reviewerPrompt, [
  "Progress Ledger",
  "docs/OFFICIAL_DOCS_GATE.md",
  "Blocked reason",
  "Required human decision",
  "estimated_resolution",
  "不得自己直接审查评分",
]);

mustInclude(files.opusReviewerAgent, [
  "Progress Ledger",
  "docs/OFFICIAL_DOCS_GATE.md",
  "Blocked Report",
  "Required human decision",
  "estimated_resolution",
  "不得自己直接审查评分",
]);

mustInclude(files.docsReadme, [
  "OFFICIAL_DOCS_GATE.md",
  "templates/",
  "engineering-design.template.md",
  "development-plan.template.md",
]);

mustInclude(files.rootReadme, [
  "templates/engineering-design.template.md",
  "templates/development-plan.template.md",
  "docs/OFFICIAL_DOCS_GATE.md",
  "1.5.6-lite.1",
]);

mustInclude(files.packageRelease, [
  "\"templates\"",
  "\"docs/OFFICIAL_DOCS_GATE.md\"",
  "\"scripts/engineering-gate-docs-self-test.mjs\"",
  "\"templates/engineering-design.template.md\"",
  "\"templates/development-plan.template.md\"",
]);

mustNotInclude(files.designTemplate, ["multi_model_tester_plan", "Gemini tester", "primary coder"]);
mustNotInclude(files.planTemplate, ["multi_model_tester_plan", "Gemini tester", "primary coder"]);
mustNotInclude(files.officialDocs, ["multi_model_tester_plan", "Gemini tester", "primary coder"]);

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

function mustNotInclude(text, forbidden) {
  for (const snippet of forbidden) {
    if (text.includes(snippet)) {
      throw new Error(`Found prohibited Lite engineering gate text: ${snippet}`);
    }
  }
}
