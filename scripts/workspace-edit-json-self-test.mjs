#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyWorkspaceEditPlan,
  assertNotForbidden,
  parseWorkspaceEditResponse,
  workspaceContext,
} from "../lib/workspace.mjs";

const workspaceEditFlowText = readFileSync(new URL("../lib/workspace-edit-flow.mjs", import.meta.url), "utf8");
for (const required of [
  "If the parse error says found 0 or found more than 1 match",
  "If the malformed output is a unified diff",
  "widen find/anchor with enough surrounding stable context",
  "Do not use regex, ellipses, fuzzy matching, line numbers, or placeholders",
  "switch that path to a files entry with complete final file content",
]) {
  if (!workspaceEditFlowText.includes(required)) {
    throw new Error(`Workspace edit repair prompt is missing required guidance: ${required}`);
  }
}

const valid = parseWorkspaceEditResponse(
  [
    "Here is the edit:",
    "```json",
    "{",
    '  "summary": "ok",',
    '  "files": [{ "path": "src/a.js", "expected_sha256": "abc123", "content": "console.log(1);\\n" }],',
    '  "tests": ["npm test"],',
    '  "risks": []',
    "}",
    "```",
  ].join("\n")
);

if (valid.files[0].path !== "src/a.js") {
  throw new Error("Failed to parse fenced JSON workspace edit.");
}

if (valid.files[0].expected_sha256 !== "abc123") {
  throw new Error("Failed to preserve expected_sha256.");
}

const proseWrapped = parseWorkspaceEditResponse(
  'Before text {"summary":"ok","files":[],"tests":[],"risks":["none"]} after text'
);

if (proseWrapped.risks[0] !== "none") {
  throw new Error("Failed to parse prose-wrapped JSON workspace edit.");
}

assertParseFails('{"summary":"bad","files":[{"path":"a"}]}', /string content/);
assertParseFails('{"summary":"bad","files":[{"path":"a","expected_sha256":123,"content":""}]}', /expected_sha256/);
assertParseFails('{"summary":"bad","files":[{"path":"a","content":""}]}', /expected_sha256/);

const patchWrapped = parseWorkspaceEditResponse(
  '{"summary":"patch","edits":[{"path":"a.txt","expected_sha256":"abc","operation":"replace","find":"old","replace":"new"}],"tests":[],"risks":[]}'
);
if (patchWrapped.edits[0].operation !== "replace") {
  throw new Error("Failed to parse patch edit operation.");
}
assertParseFails('{"summary":"bad","edits":[{"path":"a","expected_sha256":"x","operation":"replace","replace":""}]}', /find/);
assertParseFails('{"summary":"bad","edits":[{"path":"a","expected_sha256":"x","operation":"delete","find":"x","replace":""}]}', /operation/);

for (const blocked of [".local/rag/chunks.jsonl", ".rag/index.json"]) {
  let blockedFailed = false;
  try {
    assertNotForbidden(blocked, defaultForbiddenPatterns(), "write");
  } catch (error) {
    blockedFailed = /forbidden path/.test(error.message);
  }
  if (!blockedFailed) {
    throw new Error(`Forbidden workspace path was not rejected: ${blocked}`);
  }
}

const workspaceRoot = mkdtempSync(join(tmpdir(), "mma-workspace-edit-"));
try {
  writeFileSync(join(workspaceRoot, "a.txt"), "before\n", "utf8");
  const context = workspaceContext({
    workspace_root: workspaceRoot,
    allowed_read_paths: ["a.txt"],
    allowed_write_paths: ["a.txt", "new.txt"],
  });
  const beforeHash = context.files.find((file) => file.path === "a.txt")?.sha256;
  if (!beforeHash) {
    throw new Error("workspaceContext did not include sha256 for allowed read file.");
  }

  const dryRunResult = applyWorkspaceEditPlan(
    { dry_run: true },
    context,
    {
      summary: "dry run",
      files: [{ path: "a.txt", expected_sha256: beforeHash, content: "after\n" }],
      tests: [],
      risks: [],
    }
  );
  if (!dryRunResult.diff.includes("-before") || !dryRunResult.diff.includes("+after")) {
    throw new Error("Dry-run edit did not return expected diff.");
  }
  if (dryRunResult.written_files.length !== 0 || dryRunResult.proposed_files[0]?.content !== "after\n") {
    throw new Error("Dry-run edit did not return proposed file content without written files.");
  }
  if (readFileSync(join(workspaceRoot, "a.txt"), "utf8") !== "before\n") {
    throw new Error("Dry-run edit wrote to disk.");
  }

  const writeResult = applyWorkspaceEditPlan(
    { dry_run: false },
    context,
    {
      summary: "write",
      files: [{ path: "a.txt", expected_sha256: beforeHash, content: "after\n" }],
      tests: [],
      risks: [],
    }
  );
  if (readFileSync(join(workspaceRoot, "a.txt"), "utf8") !== "after\n") {
    throw new Error("Workspace edit did not write expected content.");
  }
  if (
    writeResult.proposed_files.length !== 0 ||
    writeResult.written_files[0]?.content !== "after\n" ||
    writeResult.written_files[0]?.write_verified !== true ||
    writeResult.written_files[0]?.readback_sha256 !== writeResult.written_files[0]?.after_sha256
  ) {
    throw new Error("Workspace edit did not return verified written file content.");
  }

  const afterContext = workspaceContext({
    workspace_root: workspaceRoot,
    allowed_read_paths: ["a.txt"],
    allowed_write_paths: ["a.txt", "new.txt"],
  });
  const afterHash = afterContext.files.find((file) => file.path === "a.txt")?.sha256;
  const patchDryRun = applyWorkspaceEditPlan(
    { dry_run: true },
    afterContext,
    {
      summary: "patch replace dry run",
      edits: [{ path: "a.txt", expected_sha256: afterHash, operation: "replace", find: "after\n", replace: "patched\n" }],
      tests: [],
      risks: [],
    }
  );
  if (!patchDryRun.changed_file_details[0] || patchDryRun.changed_file_details[0].mode !== "patch_edit") {
    throw new Error("Patch dry-run did not report patch_edit mode.");
  }
  if (readFileSync(join(workspaceRoot, "a.txt"), "utf8") !== "after\n") {
    throw new Error("Patch dry-run wrote to disk.");
  }

  applyWorkspaceEditPlan(
    { dry_run: false },
    afterContext,
    {
      summary: "patch insert",
      edits: [
        { path: "a.txt", expected_sha256: afterHash, operation: "insert_after", anchor: "after", insert: " plus" },
        { path: "a.txt", expected_sha256: afterHash, operation: "insert_before", anchor: "\n", insert: " done" },
      ],
      tests: [],
      risks: [],
    }
  );
  if (readFileSync(join(workspaceRoot, "a.txt"), "utf8") !== "after plus done\n") {
    throw new Error("Patch insert edits did not write expected content.");
  }

  let staleFailed = false;
  try {
    applyWorkspaceEditPlan(
      { dry_run: false },
      context,
      {
        summary: "stale",
        files: [{ path: "a.txt", expected_sha256: beforeHash, content: "stale\n" }],
        tests: [],
        risks: [],
      }
    );
  } catch (error) {
    staleFailed = /Stale workspace edit/.test(error.message);
  }
  if (!staleFailed) {
    throw new Error("Stale workspace edit was not rejected.");
  }

  writeFileSync(join(workspaceRoot, "dupe.txt"), "x\nx\n", "utf8");
  const duplicateContext = workspaceContext({
    workspace_root: workspaceRoot,
    allowed_read_paths: ["dupe.txt"],
    allowed_write_paths: ["dupe.txt"],
  });
  const duplicateHash = duplicateContext.files.find((file) => file.path === "dupe.txt")?.sha256;
  let duplicateFailed = false;
  try {
    applyWorkspaceEditPlan(
      { dry_run: false },
      duplicateContext,
      {
        summary: "duplicate",
        edits: [{ path: "dupe.txt", expected_sha256: duplicateHash, operation: "replace", find: "x", replace: "y" }],
        tests: [],
        risks: [],
      }
    );
  } catch (error) {
    duplicateFailed = /exactly one match/.test(error.message);
  }
  if (!duplicateFailed) {
    throw new Error("Patch edit with duplicate match was not rejected.");
  }

  let unreadFailed = false;
  try {
    applyWorkspaceEditPlan(
      { dry_run: false },
      {
        ...context,
        allowedWritePaths: ["a.txt"],
        files: [],
      },
      {
        summary: "unread patch",
        edits: [{ path: "a.txt", expected_sha256: beforeHash, operation: "replace", find: "after", replace: "bad" }],
        tests: [],
        risks: [],
      }
    );
  } catch (error) {
    unreadFailed = /requires the file in allowed_read_paths/.test(error.message);
  }
  if (!unreadFailed) {
    throw new Error("Patch edit without allowed_read_paths file was not rejected.");
  }

  let duplicatePathFailed = false;
  try {
    applyWorkspaceEditPlan(
      { dry_run: false },
      afterContext,
      {
        summary: "same path twice",
        files: [{ path: "a.txt", expected_sha256: afterHash, content: "again\n" }],
        edits: [{ path: "a.txt", expected_sha256: afterHash, operation: "replace", find: "after", replace: "again" }],
        tests: [],
        risks: [],
      }
    );
  } catch (error) {
    duplicatePathFailed = /same file more than once/.test(error.message);
  }
  if (!duplicatePathFailed) {
    throw new Error("Plan touching the same path in files and edits was not rejected.");
  }

  applyWorkspaceEditPlan(
    { dry_run: false },
    context,
    {
      summary: "new file",
      files: [{ path: "new.txt", expected_sha256: "", content: "created\n" }],
      tests: [],
      risks: [],
    }
  );
  if (readFileSync(join(workspaceRoot, "new.txt"), "utf8") !== "created\n") {
    throw new Error("Workspace edit did not create expected file.");
  }
} finally {
  rmSync(workspaceRoot, { recursive: true, force: true });
}

console.log("workspace edit JSON self-test passed.");

function assertParseFails(raw, pattern) {
  let failed = false;
  try {
    parseWorkspaceEditResponse(raw);
  } catch (error) {
    failed = pattern.test(error.message);
  }
  if (!failed) {
    throw new Error(`Invalid workspace edit shape was not rejected: ${raw}`);
  }
}

function defaultForbiddenPatterns() {
  return [
    ".env",
    ".env.*",
    ".git",
    ".git/**",
    ".local",
    ".local/**",
    ".rag",
    ".rag/**",
  ];
}
