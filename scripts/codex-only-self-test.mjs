#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = fileURLToPath(new URL("../", import.meta.url));
const manifestText = readText(".codex-plugin/plugin.json");
const manifest = JSON.parse(manifestText);
const nonAscii = [...manifestText].filter((char) => char.charCodeAt(0) > 127).length;

if (manifest.version !== "1.5.6-codex.1") {
  throw new Error(`Expected Codex-only version 1.5.6-codex.1, found ${manifest.version}`);
}
if (manifest.interface?.displayName !== "AI Agent Swarm Codex-only") {
  throw new Error("plugin.json displayName must be AI Agent Swarm Codex-only.");
}
if (nonAscii !== 0) {
  throw new Error(`plugin.json must be ASCII-only, found ${nonAscii} non-ASCII characters.`);
}

const server = readText("scripts/multi-model-agents-mcp.mjs");
for (const required of [
  "Codex-only",
  "externalModelToolsEnabled",
  "multi_model_config_status",
  "multi_model_rag_status",
  "multi_model_rag_ingest",
  "multi_model_rag_note",
  "multi_model_rag_search",
  "multi_model_rag_get",
]) {
  mustInclude(server, required, "MCP server");
}

for (const forbidden of forbiddenToolAndProviderSnippets()) {
  mustNotInclude(server, forbidden, "MCP server");
}

const requiredFiles = [
  ".codex/agents/codex-coder.toml",
  ".codex/agents/codex-reviewer.toml",
  ".codex/agents/codex-tester.toml",
  ".codex/agents/test-runner.toml",
  ".codex/agents/rag-curator.toml",
  ".codex/agents/security-auditor.toml",
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "NOTICE",
  "docs/README.md",
  "docs/CUSTOM_AGENTS.md",
  "docs/ENGINEERING_GATE.md",
  "docs/OFFICIAL_DOCS_GATE.md",
  "docs/RAG.md",
  "docs/START_PROMPT.md",
  "docs/releases/GITHUB_RELEASE_CODEX_1.5.6-codex.1.md",
  "templates/engineering-design.template.md",
  "templates/development-plan.template.md",
  "skills/multi-model-agents/SKILL.md",
  "skills/multi-model-agents/agents/openai.yaml",
];

for (const rel of requiredFiles) {
  if (!existsSync(join(pluginRoot, ...rel.split("/")))) {
    throw new Error(`Missing Codex-only file: ${rel}`);
  }
}

const scannedFiles = listFiles(pluginRoot).filter((rel) => shouldScan(rel));
for (const rel of scannedFiles) {
  const text = readText(rel);
  for (const forbidden of codexOnlyForbiddenText(rel)) {
    mustNotInclude(text, forbidden, rel);
  }
  if (!isAllowedExternalNameException(rel) && new RegExp(`\\b(${externalModelWords().join("|")})\\b`).test(text)) {
    throw new Error(`${rel} contains external model wording.`);
  }
  if (text.includes("\uFFFD")) {
    throw new Error(`${rel} contains Unicode replacement characters, likely encoding damage.`);
  }
}

mustInclude(readText("scripts/package-release.mjs"), "releaseFiles", "package-release");
mustInclude(readText("scripts/package-release.mjs"), "assertCodexOnlyContent", "package-release");
mustInclude(readText("scripts/sync-github-release.mjs"), "codex-only", "sync-github-release");
mustInclude(readText("scripts/sync-github-release.mjs"), "ai-agent-swarm-codex", "sync-github-release");

console.log("codex-only self-test passed.");

function readText(relPath) {
  return readFileSync(join(pluginRoot, ...relPath.split("/")), "utf8");
}

function listFiles(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    if ([".git", ".local", ".rag", "node_modules"].includes(name)) {
      continue;
    }
    const path = join(root, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      out.push(...listFiles(path));
    } else {
      out.push(toPosix(relative(pluginRoot, path)));
    }
  }
  return out;
}

function shouldScan(rel) {
  if (rel.startsWith("assets/") || rel.includes("/assets/")) {
    return false;
  }
  if (rel.endsWith(".png")) {
    return false;
  }
  return /\.(mjs|js|json|md|toml|yaml|yml|txt|example)$/.test(rel) || !rel.includes(".");
}

function codexOnlyForbiddenText(rel) {
  if (isAllowedExternalNameException(rel)) {
    return [];
  }
  return [
    ["AI Agent Swarm", ["Li", "te"].join("")].join(" "),
    [["li", "te"].join(""), ["op", "us"].join(""), "review"].join("-"),
    ["ai", "agent", "swarm", ["li", "te"].join("")].join("-"),
    ["GITHUB", "RELEASE", ["LI", "TE"].join(""), ""].join("_"),
    ["docs", "legacy"].join("/"),
    ["opus", "reviewer"].join("-"),
    [["Op", "us"].join(""), ["Clau", "de"].join("")].join("/"),
    [["Gem", "ini"].join(""), "tester"].join(" "),
    ...forbiddenToolAndProviderSnippets(),
  ];
}

function forbiddenToolAndProviderSnippets() {
  return [
    ["multi", "model", "coder", "patch"].join("_"),
    ["multi", "model", "coder", "workspace", "edit"].join("_"),
    ["multi", "model", "reviewer", "findings"].join("_"),
    ["multi", "model", "reviewer", "score"].join("_"),
    ["multi", "model", "role", "call"].join("_"),
    ["multi", "model", "tester", "plan"].join("_"),
    [["ANTH", "ROPIC"].join(""), "API", "KEY"].join("_"),
    [["GEM", "INI"].join(""), "API", "KEY"].join("_"),
    ["EXTERNAL", "MODEL", "API", "KEY"].join("_"),
  ];
}

function externalModelWords() {
  return [["Op", "us"].join(""), ["Clau", "de"].join(""), ["Gem", "ini"].join("")];
}

function isAllowedExternalNameException(rel) {
  return [
    "scripts/codex-only-self-test.mjs",
    "scripts/package-release.mjs",
    "lib/redaction.mjs",
    "lib/rag-security.mjs",
  ].includes(rel);
}

function mustInclude(text, snippet, label) {
  if (!text.includes(snippet)) {
    throw new Error(`${label} missing required Codex-only text: ${snippet}`);
  }
}

function mustNotInclude(text, snippet, label) {
  if (text.includes(snippet)) {
    throw new Error(`${label} contains prohibited Codex-only text: ${snippet}`);
  }
}

function toPosix(value) {
  return String(value || "").split(sep).join("/").replace(/\\/g, "/");
}
