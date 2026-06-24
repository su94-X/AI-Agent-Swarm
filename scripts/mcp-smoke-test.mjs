#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const pluginRoot = fileURLToPath(new URL("../", import.meta.url));
const mcpConfigPath = fileURLToPath(new URL("../.mcp.json", import.meta.url));
const mcpConfig = JSON.parse(await readFile(mcpConfigPath, "utf8"));
const servers = mcpConfig.mcpServers ?? mcpConfig.mcp_servers ?? mcpConfig;
const config = servers["multi-model-agents"];

if (!config || config.command !== "node" || !Array.isArray(config.args)) {
  throw new Error(".mcp.json must expose a multi-model-agents stdio server with command and args.");
}

const resolvedArgs = config.args.map((arg) => arg.replaceAll("${PLUGIN_ROOT}", pluginRoot.replace(/\\/g, "/")));
const child = spawn(config.command, resolvedArgs, {
  cwd: pluginRoot,
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";
const responses = new Map();
const notifications = [];

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  while (true) {
    const index = buffer.indexOf("\n");
    if (index === -1) {
      return;
    }
    const raw = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!raw) {
      continue;
    }
    const message = JSON.parse(raw);
    if (message.id !== undefined) {
      responses.set(message.id, message);
    } else if (message.method) {
      notifications.push(message);
    }
  }
});

function send(id, method, params) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
}

async function waitFor(id) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    if (responses.has(id)) {
      return responses.get(id);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for response ${id}`);
}

try {
  send(1, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "mcp-smoke-test", version: "0.1.0" },
  });
  const init = await waitFor(1);
  assertNoError(init, "initialize");

  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  send(2, "tools/list", {});
  const list = await waitFor(2);
  assertNoError(list, "tools/list");
  const toolNames = list.result.tools.map((tool) => tool.name);
  const expectedTools = [
    "multi_model_config_status",
    "multi_model_rag_status",
    "multi_model_rag_ingest",
    "multi_model_rag_note",
    "multi_model_rag_search",
    "multi_model_rag_get",
  ];
  const sortedActual = [...toolNames].sort();
  const sortedExpected = [...expectedTools].sort();
  if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
    throw new Error(`Codex-only tools/list mismatch. Expected ${sortedExpected.join(", ")}, got ${sortedActual.join(", ")}`);
  }
  for (const expected of expectedTools) {
    if (!toolNames.includes(expected)) {
      throw new Error(`Missing tool ${expected}`);
    }
  }
  for (const forbidden of [
    ["multi", "model", "coder", "patch"].join("_"),
    ["multi", "model", "coder", "workspace", "edit"].join("_"),
    ["multi", "model", "reviewer", "findings"].join("_"),
    ["multi", "model", "reviewer", "score"].join("_"),
    ["multi", "model", "role", "call"].join("_"),
    ["multi", "model", "tester", "plan"].join("_"),
  ]) {
    if (toolNames.includes(forbidden)) {
      throw new Error(`Codex-only branch must not expose external model tool ${forbidden}.`);
    }
  }

  send(3, "tools/call", {
    name: "multi_model_config_status",
    arguments: {},
  });
  const status = await waitFor(3);
  assertNoError(status, "multi_model_config_status");
  assertNotification(/multi_model_config_status: started/);
  assertNotification(/multi_model_config_status: completed/);

  send(4, "tools/call", {
    name: "multi_model_rag_status",
    arguments: {},
  });
  const ragStatus = await waitFor(4);
  assertNoError(ragStatus, "multi_model_rag_status");

  send(5, "tools/call", {
    name: "multi_model_rag_ingest",
    arguments: {
      workspace_root: pluginRoot,
      allowed_read_paths: [".env"],
    },
  });
  const forbiddenIngest = await waitFor(5);
  assertNoError(forbiddenIngest, "multi_model_rag_ingest forbidden ingest");
  const ingestJson = JSON.parse(forbiddenIngest.result.content[0].text);
  if (!Array.isArray(ingestJson.skipped) || ingestJson.skipped.length === 0) {
    throw new Error("multi_model_rag_ingest should skip forbidden .env path.");
  }

  console.log("MCP smoke test passed.");
  console.log(status.result.content[0].text);
  console.log(ragStatus.result.content[0].text);
} finally {
  child.stdin.end();
  child.kill();
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 500))]);
}

function assertNoError(message, label) {
  if (message.error) {
    throw new Error(`${label} failed: ${message.error.message}`);
  }
}

function assertError(message, label, pattern) {
  if (!message.error) {
    throw new Error(`${label} unexpectedly succeeded.`);
  }
  if (!pattern.test(message.error.message)) {
    throw new Error(`${label} returned unexpected error: ${message.error.message}`);
  }
}

function assertNotification(pattern) {
  const found = notifications.some((message) => pattern.test(String(message.params?.data || "")));
  if (!found) {
    throw new Error(`Missing expected MCP notification: ${pattern}`);
  }
}
