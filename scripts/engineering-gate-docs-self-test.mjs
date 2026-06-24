#!/usr/bin/env node

import { readFileSync } from "node:fs";

const files = {
  rootReadme: readText("README.md"),
  docsReadme: readText("docs/README.md"),
  start: readText("docs/START_PROMPT.md"),
  gate: readText("docs/ENGINEERING_GATE.md"),
  officialDocs: readText("docs/OFFICIAL_DOCS_GATE.md"),
  workflow: readText("docs/SUBAGENT_WORKFLOW.md"),
  coderPrompt: readText("docs/roles/CODER_SUBAGENT_PROMPT.md"),
  primaryCoderAgent: readText(".codex/agents/primary-coder.toml"),
  designTemplate: readText("templates/engineering-design.template.md"),
  planTemplate: readText("templates/development-plan.template.md"),
};

mustInclude(files.designTemplate, [
  "Task:",
  "Slug:",
  "Version: v0.1",
  "Status: draft",
  "Opus plan-review:",
  "## External Evidence and Official Docs",
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
  "## Version History",
]);

mustInclude(files.officialDocs, [
  "何时必须运行",
  "何时允许跳过",
  "证据记录格式",
  "Dependency/Surface",
  "查询路由",
  "禁止事项",
]);

mustInclude(files.gate, [
  "docs/engineering/<task-slug>-engineering-design.md",
  "docs/engineering/<task-slug>-development-plan.md",
  "templates/engineering-design.template.md",
  "templates/development-plan.template.md",
  "小任务绕过标准",
  "small-task bypass: <reason>",
  "Version Rules",
  "Progress Ledger",
  "Blocked reason:",
  "Required human decision:",
  "estimated_resolution:",
  "docs/OFFICIAL_DOCS_GATE.md",
]);

mustInclude(files.start, [
  "small-task bypass: <reason>",
  "docs/engineering/<task-slug>-engineering-design.md",
  "docs/engineering/<task-slug>-development-plan.md",
  "templates/engineering-design.template.md",
  "templates/development-plan.template.md",
  "docs/OFFICIAL_DOCS_GATE.md",
]);

mustInclude(files.workflow, [
  "Progress Ledger",
  "如果上下文被压缩或线程恢复",
  "Blocked Report",
  "Blocked reason:",
  "Required human decision:",
  "estimated_resolution:",
]);

mustInclude(files.coderPrompt, [
  "Progress Ledger",
  "如果 development plan 文件在 allowed_write_paths 内",
  "如果上下文被压缩或线程恢复",
  "Blocked reason:",
  "Required human decision:",
  "estimated_resolution:",
]);

mustInclude(files.primaryCoderAgent, [
  "Progress Ledger",
  "如果 development plan 文件在 allowed_write_paths 内",
  "如果上下文被压缩或线程恢复",
  "Blocked reason:",
  "Required human decision:",
  "estimated_resolution:",
]);

mustInclude(files.docsReadme, [
  "OFFICIAL_DOCS_GATE.md",
  "templates/",
]);

mustInclude(files.rootReadme, [
  "templates/engineering-design.template.md",
  "templates/development-plan.template.md",
  "docs/OFFICIAL_DOCS_GATE.md",
]);

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
