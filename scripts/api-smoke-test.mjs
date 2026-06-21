#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const pluginRoot = fileURLToPath(new URL("../", import.meta.url));
const mcpConfigPath = fileURLToPath(new URL("../.mcp.json", import.meta.url));
const manifestPath = fileURLToPath(new URL("../.codex-plugin/plugin.json", import.meta.url));
const mcpConfig = JSON.parse(await readFile(mcpConfigPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const pluginVersion = manifest.version || "0.0.0";
const servers = mcpConfig.mcpServers ?? mcpConfig.mcp_servers ?? mcpConfig;
const config = servers["multi-model-agents"];

if (!config || config.command !== "node" || !Array.isArray(config.args)) {
  throw new Error(".mcp.json must expose a multi-model-agents stdio server with command and args.");
}

const child = spawn(
  config.command,
  config.args.map((arg) => arg.replaceAll("${PLUGIN_ROOT}", pluginRoot.replace(/\\/g, "/"))),
  { cwd: pluginRoot, stdio: ["pipe", "pipe", "pipe"] }
);

let stdoutBuffer = "";
let stderrBuffer = "";
const responses = new Map();

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  stdoutBuffer += chunk;
  while (true) {
    const index = stdoutBuffer.indexOf("\n");
    if (index === -1) {
      return;
    }
    const raw = stdoutBuffer.slice(0, index).trim();
    stdoutBuffer = stdoutBuffer.slice(index + 1);
    if (!raw) {
      continue;
    }
    const message = JSON.parse(raw);
    if (message.id !== undefined) {
      responses.set(message.id, message);
    }
  }
});

child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => {
  stderrBuffer += chunk;
});

function send(id, method, params) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
}

async function waitFor(id, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (responses.has(id)) {
      return responses.get(id);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for response ${id}`);
}

try {
  send(1, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "api-smoke-test", version: pluginVersion },
  });
  const init = await waitFor(1, 10000);
  assertNoError(init, "initialize");
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const tests = [
    {
      label: "coder",
      tool: "multi_model_role_call",
      arguments: {
        role: "coder",
        task: "Reply with exactly: coder-ok",
        context: "This is a connectivity smoke test. No code changes.",
        max_output_tokens: 32,
      },
    },
    {
      label: "tester",
      tool: "multi_model_role_call",
      arguments: {
        role: "tester",
        task: "Reply with exactly: tester-ok",
        context: "This is a connectivity smoke test. No tests were run.",
        max_output_tokens: 32,
      },
    },
    {
      label: "custom",
      tool: "multi_model_role_call",
      arguments: {
        role: "custom",
        task: "Reply with exactly: custom-ok",
        context: "This is a connectivity smoke test.",
        max_output_tokens: 32,
      },
    },
  ];

  let id = 10;
  const results = [];
  for (const test of tests) {
    const requestId = id++;
    send(requestId, "tools/call", {
      name: test.tool,
      arguments: test.arguments,
    });
    const response = await waitFor(requestId);
    if (response.error) {
      results.push({
        role: test.label,
        ok: false,
        message: redact(response.error.message),
      });
    } else {
      results.push({
        role: test.label,
        ok: true,
        message: truncate(redact(response.result?.content?.[0]?.text || ""), 300),
      });
    }
  }

  console.log(JSON.stringify({ results }, null, 2));
  if (stderrBuffer.trim()) {
    console.error(redact(stderrBuffer.trim()));
  }
} finally {
  child.stdin.end();
  child.kill();
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 500))]);
}

function assertNoError(message, label) {
  if (message.error) {
    throw new Error(`${label} failed: ${redact(message.error.message)}`);
  }
}

function redact(value) {
  return String(value)
    .replace(/sk-[A-Za-z0-9._-]{8,}/g, "sk-[redacted]")
    .replace(/AIza[A-Za-z0-9._-]{8,}/g, "AIza[redacted]")
    .replace(/ya29\.[A-Za-z0-9._-]{8,}/g, "ya29.[redacted]");
}

function truncate(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
