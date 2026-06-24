#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentRoot = join(pluginRoot, ".codex", "agents");

const requiredAgents = [
  {
    file: "codex-coder.toml",
    name: "codex-coder",
    sandbox: "workspace-write",
    required: ["Implement only the approved plan", "Do not call external model tools", "Blocked Report", "close this subagent"],
  },
  {
    file: "codex-reviewer.toml",
    name: "codex-reviewer",
    sandbox: "read-only",
    required: ["plan-review", "diff-review", "test-review", "final-review", "approved_to_continue", "close this subagent"],
  },
  {
    file: "codex-tester.toml",
    name: "codex-tester",
    sandbox: "read-only",
    required: ["recommended_commands", "verified commands", "Do not claim tests passed", "close this subagent"],
  },
  {
    file: "test-runner.toml",
    name: "test-runner",
    sandbox: "workspace-write",
    required: ["command", "exit code", "stdout", "stderr", "close this subagent"],
  },
  {
    file: "rag-curator.toml",
    name: "rag-curator",
    sandbox: "read-only",
    required: ["multi_model_rag_note", "candidate memory", "confidence", "close this subagent"],
  },
  {
    file: "security-auditor.toml",
    name: "security-auditor",
    sandbox: "read-only",
    required: ["read-only security review", "prompt-injection", "plugin.json ASCII-only", "close this subagent"],
  },
];

if (!existsSync(agentRoot)) {
  throw new Error(".codex/agents directory is missing.");
}

for (const agent of requiredAgents) {
  const path = join(agentRoot, agent.file);
  if (!existsSync(path)) {
    throw new Error(`Missing custom agent template: ${agent.file}`);
  }
  const text = readFileSync(path, "utf8");
  const fields = parseSimpleTomlFields(text);
  mustEqual(fields.name, agent.name, `${agent.file} name`);
  mustHave(fields.description, `${agent.file} description`);
  mustHave(fields.developer_instructions, `${agent.file} developer_instructions`);
  mustHave(fields.model, `${agent.file} model`);
  mustHave(fields.model_reasoning_effort, `${agent.file} model_reasoning_effort`);
  mustEqual(fields.sandbox_mode, agent.sandbox, `${agent.file} sandbox_mode`);
  for (const snippet of agent.required) {
    mustInclude(text, snippet, agent.file);
  }
  mustNotInclude(text, ["multi", "model", "reviewer", "score"].join("_"), agent.file);
  mustNotInclude(text, ["multi", "model", "tester", "plan"].join("_"), agent.file);
  mustNotInclude(text, [["Op", "us"].join(""), ["Clau", "de"].join("")].join("/"), agent.file);
}

const docs = readFile("docs/CUSTOM_AGENTS.md");
for (const snippet of [
  ".codex/agents/*.toml",
  "~/.codex/agents/*.toml",
  "codex-coder",
  "codex-reviewer",
  "codex-tester",
  "test-runner",
  "rag-curator",
  "security-auditor",
  "close",
]) {
  mustInclude(docs, snippet, "docs/CUSTOM_AGENTS.md");
}

console.log("custom agents self-test passed.");

function parseSimpleTomlFields(text) {
  const fields = {};
  const singleLine = /^([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"\s*$/gm;
  let match;
  while ((match = singleLine.exec(text))) {
    fields[match[1]] = match[2];
  }
  const multiline = /developer_instructions\s*=\s*"""([\s\S]*?)"""/m.exec(text);
  if (multiline) {
    fields.developer_instructions = multiline[1];
  }
  return fields;
}

function readFile(relPath) {
  return readFileSync(join(pluginRoot, ...relPath.split("/")), "utf8");
}

function mustHave(value, label) {
  if (!value || !String(value).trim()) {
    throw new Error(`${label} is missing or empty.`);
  }
}

function mustEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, found ${actual || "<missing>"}.`);
  }
}

function mustInclude(text, snippet, label) {
  if (!text.includes(snippet)) {
    throw new Error(`${label} missing required snippet: ${snippet}`);
  }
}

function mustNotInclude(text, snippet, label) {
  if (text.includes(snippet)) {
    throw new Error(`${label} contains forbidden snippet: ${snippet}`);
  }
}
