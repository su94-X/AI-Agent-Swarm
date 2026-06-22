#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentRoot = join(pluginRoot, ".codex", "agents");

const requiredAgents = [
  {
    file: "primary-coder.toml",
    name: "primary-coder",
    required: ["multi_model_coder_workspace_edit", "allowed_read_paths", "allowed_write_paths", "plan-review"],
  },
  {
    file: "reviewer.toml",
    name: "reviewer",
    sandbox: "read-only",
    required: ["Codex 内部", "不要调用 mcp__codex", "不运行测试", "Blocking findings"],
  },
  {
    file: "tester.toml",
    name: "tester",
    sandbox: "read-only",
    required: ["multi_model_tester_plan", "Gemini", "不得声称测试已通过", "verified_commands"],
  },
  {
    file: "test-runner.toml",
    name: "test-runner",
    required: ["command", "exit code", "stdout", "stderr", "Main Orchestrator"],
  },
  {
    file: "rag-curator.toml",
    name: "rag-curator",
    sandbox: "read-only",
    required: ["不直接把 Opus/Gemini 输出写成 trusted 知识", "evidence", "confidence", "verified_by"],
  },
  {
    file: "security-auditor.toml",
    name: "security-auditor",
    sandbox: "read-only",
    required: ["secret", "path", "package-release", "prompt injection"],
  },
];

const forbiddenSecretPatterns = [
  /sk-[A-Za-z0-9_-]{12,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
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
  for (const pattern of forbiddenSecretPatterns) {
    if (pattern.test(text)) {
      throw new Error(`${agent.file} appears to contain a secret-like value.`);
    }
  }
}

const workflow = readFile("docs/CUSTOM_AGENTS.md");
for (const snippet of [".codex/agents/*.toml", "~/.codex/agents/*.toml", "Skill", "MCP", "Plugin"]) {
  if (!workflow.includes(snippet)) {
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
