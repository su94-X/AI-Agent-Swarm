#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentRoot = join(pluginRoot, ".codex", "agents");

const requiredAgents = [
  {
    file: "opus-reviewer.toml",
    name: "opus-reviewer",
    sandbox: "read-only",
    required: ["multi_model_reviewer_score", "multi_model_reviewer_findings", "approved_to_continue", "关闭本子智能体"],
  },
  {
    file: "test-runner.toml",
    name: "test-runner",
    required: ["command", "exit code", "stdout", "stderr", "关闭本子智能体"],
  },
  {
    file: "rag-curator.toml",
    name: "rag-curator",
    sandbox: "read-only",
    required: ["不调用 multi_model_rag_note", "候选条目", "confidence", "关闭本子智能体"],
  },
  {
    file: "security-auditor.toml",
    name: "security-auditor",
    sandbox: "read-only",
    required: ["不打开、读取、打印或转述真实 .env", "package-release", "prompt injection", "关闭本子智能体"],
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
  mustHave(fields.sandbox_mode, `${agent.file} sandbox_mode`);
  if (agent.sandbox) {
    mustEqual(fields.sandbox_mode, agent.sandbox, `${agent.file} sandbox_mode`);
  }
  for (const snippet of agent.required) {
    if (!text.includes(snippet)) {
      throw new Error(`${agent.file} missing required instruction snippet: ${snippet}`);
    }
  }
}

const docs = readFile("docs/CUSTOM_AGENTS.md");
for (const snippet of [".codex/agents/*.toml", "~/.codex/agents/*.toml", "Skill", "MCP", "Plugin", "Lite 版不包含 Gemini"]) {
  if (!docs.includes(snippet)) {
    throw new Error(`docs/CUSTOM_AGENTS.md missing required snippet: ${snippet}`);
  }
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
