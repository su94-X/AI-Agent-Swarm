#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const pluginRoot = fileURLToPath(new URL("../", import.meta.url));
const mcpConfigPath = fileURLToPath(new URL("../.mcp.json", import.meta.url));
const mcpConfig = JSON.parse(await readFile(mcpConfigPath, "utf8"));
const servers = mcpConfig.mcpServers ?? mcpConfig.mcp_servers ?? mcpConfig;
const config = servers["multi-model-agents"];

const tempRoot = mkdtempSync(join(tmpdir(), "mma-workspace-malformed-"));
const workspaceRoot = join(tempRoot, "workspace");
mkdirSync(workspaceRoot, { recursive: true });
writeFileSync(join(workspaceRoot, "a.txt"), "before\n", "utf8");

let modelCalls = 0;
const server = createServer(async (request, response) => {
  let body = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    body += chunk;
  });
  await once(request, "end");
  modelCalls += 1;
  const parsed = JSON.parse(body);
  const userText = parsed.messages?.find((message) => message.role === "user")?.content || "";

  let content;
  if (modelCalls === 1) {
    content = [
      "I changed the file as a patch instead of JSON.",
      "```diff",
      "--- a/a.txt",
      "+++ b/a.txt",
      "@@ -1 +1 @@",
      "-before",
      "+after",
      "```",
    ].join("\n");
  } else {
    content = JSON.stringify({
      summary: "repaired malformed output",
      files: [
        {
          path: "a.txt",
          expected_sha256: extractSha256(userText),
          content: "after\n",
        },
      ],
      tests: [],
      risks: [],
    });
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ choices: [{ message: { content } }] }));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;

const child = spawn(
  config.command,
  config.args.map((arg) => arg.replaceAll("${PLUGIN_ROOT}", pluginRoot.replace(/\\/g, "/"))),
  {
    cwd: pluginRoot,
    env: {
      ...process.env,
      MMA_CODER_PROVIDER: "openai-compatible",
      MMA_CODER_MODEL: "workspace-malformed-test-model",
      MMA_CODER_API_KEY_ENV: "WORKSPACE_MALFORMED_TEST_API_KEY",
      WORKSPACE_MALFORMED_TEST_API_KEY: "test-key",
      MMA_CODER_BASE_URL: `http://127.0.0.1:${port}`,
      MMA_HTTP_MAX_ATTEMPTS: "1",
      MMA_MODEL_STREAMING: "false",
      MMA_MCP_PROGRESS_NOTIFICATIONS: "true",
    },
    stdio: ["pipe", "pipe", "inherit"],
  }
);

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

let nextId = 1;

function send(method, params) {
  const id = nextId++;
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  return id;
}

async function waitFor(id, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (responses.has(id)) {
      return responses.get(id);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for response ${id}`);
}

try {
  const initId = send("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "workspace-edit-malformed-repair-self-test", version: "0.1.0" },
  });
  const init = await waitFor(initId);
  if (init.error) {
    throw new Error(`initialize failed: ${init.error.message}`);
  }
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const callId = send("tools/call", {
    name: "multi_model_coder_workspace_edit",
    arguments: {
      task: "Replace the file content with after.",
      workspace_root: workspaceRoot,
      allowed_read_paths: ["a.txt"],
      allowed_write_paths: ["a.txt"],
      dry_run: false,
    },
  });
  const response = await waitFor(callId, 10000);
  if (response.error) {
    throw new Error(`workspace edit failed: ${response.error.message}`);
  }
  const result = JSON.parse(response.result.content[0].text);
  if (readFileSync(join(workspaceRoot, "a.txt"), "utf8") !== "after\n") {
    throw new Error("Malformed-response repair did not write expected disk content.");
  }
  if (result.written_files?.[0]?.content !== "after\n") {
    throw new Error("Malformed-response repair did not return written file content.");
  }
  if (modelCalls !== 2) {
    throw new Error(`Expected one malformed call and one repair call, got ${modelCalls}.`);
  }
  if (!notifications.some((message) => /repairing workspace edit JSON after parse error/.test(String(message.params?.data || "")))) {
    throw new Error("Missing parse-error repair progress notification.");
  }
  console.log("workspace edit malformed repair self-test passed.");
} finally {
  child.stdin.end();
  child.kill();
  server.close();
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 500))]);
  rmSync(tempRoot, { recursive: true, force: true });
}

function extractSha256(text) {
  const match = String(text || "").match(/sha256:\s*([a-f0-9]{64})/i);
  if (!match) {
    throw new Error("Repair prompt did not include sha256 from original workspace file.");
  }
  return match[1];
}
