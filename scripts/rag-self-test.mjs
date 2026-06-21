#!/usr/bin/env node

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
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

const tempRoot = mkdtempSync(join(tmpdir(), "mma-rag-test-"));
const workspaceRoot = join(tempRoot, "workspace");
const ragRoot = join(tempRoot, "rag");
mkdirSync(workspaceRoot, { recursive: true });
writeFileSync(
  join(workspaceRoot, "notes.md"),
  [
    "# Packaging bug",
    "",
    "A previous package had unsafe localized manifest handling.",
    "The fix was ASCII-only JSON with Unicode escapes.",
  ].join("\n"),
  "utf8"
);
const fakeOpenAiKey = ["sk", "should-not-ingest-1234567890"].join("-");
const fakeGitHubToken = ["ghp", "abcdefghijklmnopqrstuvwxyz123456"].join("_");
writeFileSync(join(workspaceRoot, ".env"), `ANTHROPIC_API_KEY=${fakeOpenAiKey}\n`, "utf8");
writeFileSync(join(workspaceRoot, "secret.md"), `token = ${fakeGitHubToken}\n`, "utf8");

const child = spawn(
  config.command,
  config.args.map((arg) => arg.replaceAll("${PLUGIN_ROOT}", pluginRoot.replace(/\\/g, "/"))),
  {
    cwd: pluginRoot,
    env: {
      ...process.env,
      MMA_RAG_ROOT: ragRoot,
      MMA_RAG_WRITE_ENABLED: "true",
    },
    stdio: ["pipe", "pipe", "inherit"],
  }
);

let buffer = "";
const responses = new Map();

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

async function callTool(name, args) {
  const id = send("tools/call", { name, arguments: args });
  const response = await waitFor(id);
  if (response.error) {
    throw new Error(`${name} failed: ${response.error.message}`);
  }
  return JSON.parse(response.result.content[0].text);
}

async function expectToolError(name, args, pattern) {
  const id = send("tools/call", { name, arguments: args });
  const response = await waitFor(id);
  if (!response.error) {
    throw new Error(`${name} unexpectedly succeeded.`);
  }
  if (!pattern.test(response.error.message)) {
    throw new Error(`${name} error mismatch: ${response.error.message}`);
  }
}

try {
  const initId = send("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "rag-self-test", version: "0.1.0" },
  });
  const init = await waitFor(initId);
  if (init.error) {
    throw new Error(`initialize failed: ${init.error.message}`);
  }
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const status = await callTool("multi_model_rag_status", {});
  if (status.writeEnabled !== true || !String(status.ragRoot).includes("rag")) {
    throw new Error("Unexpected initial RAG status.");
  }

  const ingest = await callTool("multi_model_rag_ingest", {
    workspace_root: workspaceRoot,
    allowed_read_paths: ["notes.md"],
    collection: "bugs",
    tags: ["packaging", "plugin-json"],
    source_note: "self-test",
  });
  if (!ingest.ok || ingest.documents.length !== 1 || ingest.chunks.length < 1) {
    throw new Error("RAG ingest did not store expected document.");
  }

  const note = await callTool("multi_model_rag_note", {
    title: "ASCII manifest fix",
    body: "plugin.json must remain ASCII-only while parsing to Chinese display fields.",
    type: "decision",
    tags: ["manifest", "encoding"],
    evidence: "Verified by JSON.parse and nonAsciiChars == 0.",
    confidence: 0.97,
    verified_by: "codex-self-test",
    scope: ["plugin"],
    aliases: ["plugin manifest unicode escapes"],
  });
  if (!note.ok || note.collection !== "decisions") {
    throw new Error("RAG note did not store expected decision.");
  }
  if (note.document.confidence !== 0.97 || note.document.verifiedBy !== "codex-self-test") {
    throw new Error("RAG note did not preserve quality metadata.");
  }

  await callTool("multi_model_rag_note", {
    title: "Expired packaging workaround",
    body: "This obsolete workaround should be hidden from default search.",
    type: "decision",
    tags: ["manifest", "encoding"],
    evidence: "Self-test fixture.",
    confidence: 0.9,
    verified_by: "codex-self-test",
    expires_at: "2000-01-01T00:00:00Z",
    scope: ["plugin"],
    aliases: ["obsolete workaround"],
  });

  await callTool("multi_model_rag_note", {
    title: "Low confidence packaging guess",
    body: "This low confidence note should be filtered by min_confidence.",
    type: "decision",
    tags: ["manifest", "encoding"],
    evidence: "Self-test fixture.",
    confidence: 0.2,
    verified_by: "codex-self-test",
    scope: ["plugin"],
    aliases: ["low confidence guess"],
  });

  const deprecated = await callTool("multi_model_rag_note", {
    title: "Deprecated manifest convention",
    body: "This deprecated note should be hidden from default search and get.",
    type: "decision",
    tags: ["manifest", "encoding"],
    evidence: "Self-test fixture.",
    confidence: 0.9,
    verified_by: "codex-self-test",
    scope: ["plugin"],
    aliases: ["deprecated convention"],
    status: "deprecated",
  });

  const search = await callTool("multi_model_rag_search", {
    query: "plugin.json ASCII manifest",
    limit: 5,
    max_chars: 4000,
  });
  if (!search.results.some((result) => /ASCII|plugin\.json/i.test(result.text))) {
    throw new Error("RAG search did not find expected content.");
  }
  if (search.results.some((result) => /obsolete workaround/i.test(result.text))) {
    throw new Error("RAG search returned expired content by default.");
  }
  if (!search.results.every((result) => result.trusted === true && result.expired === false && result.status === "active")) {
    throw new Error("RAG search returned content that violates default quality filters.");
  }

  const fileSearch = await callTool("multi_model_rag_search", {
    query: "Packaging bug",
    type: "file",
    limit: 5,
    max_chars: 4000,
  });
  if (!fileSearch.results.some((result) => result.type === "file")) {
    throw new Error("RAG search did not support type=file.");
  }

  const aliasSearch = await callTool("multi_model_rag_search", {
    query: "unicode escapes",
    scope: ["plugin"],
    min_confidence: 0.9,
    verified_by: "codex-self-test",
    limit: 5,
    max_chars: 4000,
  });
  if (!aliasSearch.results.some((result) => result.confidence >= 0.9 && result.scope.includes("plugin"))) {
    throw new Error("RAG search did not filter by confidence, verifier, scope, and aliases.");
  }

  const expiredSearch = await callTool("multi_model_rag_search", {
    query: "obsolete workaround",
    include_expired: true,
    limit: 5,
    max_chars: 4000,
  });
  if (!expiredSearch.results.some((result) => result.expired === true)) {
    throw new Error("RAG search did not include expired content when requested.");
  }

  const lowConfidenceFiltered = await callTool("multi_model_rag_search", {
    query: "low confidence guess",
    min_confidence: 0.5,
    limit: 5,
    max_chars: 4000,
  });
  if (lowConfidenceFiltered.results.some((result) => /low confidence/i.test(result.text))) {
    throw new Error("RAG search did not filter low confidence content.");
  }

  const deprecatedDefaultSearch = await callTool("multi_model_rag_search", {
    query: "deprecated convention",
    limit: 5,
    max_chars: 4000,
  });
  if (deprecatedDefaultSearch.results.some((result) => result.status === "deprecated")) {
    throw new Error("RAG search returned deprecated content by default.");
  }

  const deprecatedExplicitSearch = await callTool("multi_model_rag_search", {
    query: "deprecated convention",
    status: "deprecated",
    limit: 5,
    max_chars: 4000,
  });
  if (!deprecatedExplicitSearch.results.some((result) => result.status === "deprecated")) {
    throw new Error("RAG search did not return deprecated content when explicitly requested.");
  }

  const chunkId = search.results[0].chunk_id;
  const getResult = await callTool("multi_model_rag_get", {
    chunk_id: chunkId,
    max_chars: 2000,
  });
  if (!getResult.chunks.length) {
    throw new Error("RAG get returned no chunks.");
  }

  const deprecatedGetDefault = await callTool("multi_model_rag_get", {
    document_id: deprecated.document.id,
    max_chars: 2000,
  });
  if (deprecatedGetDefault.chunks.length) {
    throw new Error("RAG get returned deprecated content by default.");
  }

  const deprecatedGetExplicit = await callTool("multi_model_rag_get", {
    document_id: deprecated.document.id,
    status: "deprecated",
    max_chars: 2000,
  });
  if (!deprecatedGetExplicit.chunks.some((chunk) => chunk.status === "deprecated")) {
    throw new Error("RAG get did not return deprecated content when explicitly requested.");
  }

  const forbidden = await callTool("multi_model_rag_ingest", {
    workspace_root: workspaceRoot,
    allowed_read_paths: [".env"],
    collection: "bugs",
  });
  if (forbidden.ok || !forbidden.skipped.some((item) => /\.env/.test(item.path))) {
    throw new Error("RAG ingest did not reject .env.");
  }

  const secret = await callTool("multi_model_rag_ingest", {
    workspace_root: workspaceRoot,
    allowed_read_paths: ["secret.md"],
    collection: "bugs",
  });
  if (secret.ok || !secret.skipped.some((item) => /sensitive/i.test(item.reason))) {
    throw new Error("RAG ingest did not reject secret-like content.");
  }

  await expectToolError("multi_model_rag_search", { query: "x", collection: "../bad" }, /Invalid RAG collection/);
  await expectToolError(
    "multi_model_rag_note",
    {
      title: "Bad scope",
      body: "bad",
      evidence: "self-test",
      scope: ["bad*scope"],
    },
    /Invalid RAG scope/
  );

  console.log("RAG self-test passed.");
} finally {
  child.stdin.end();
  child.kill();
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 500))]);
  rmSync(tempRoot, { recursive: true, force: true });
}
