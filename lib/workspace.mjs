import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { redactSecrets } from "./redaction.mjs";

export function workspaceContext(args) {
  const workspaceRoot = resolveWorkspaceRoot(args.workspace_root);
  const forbiddenPatterns = [
    ".env",
    ".env.*",
    ".git",
    ".git/**",
    ".npmrc",
    ".ssh",
    ".ssh/**",
    ".aws",
    ".aws/**",
    ".azure",
    ".azure/**",
    ".gcloud",
    ".gcloud/**",
    ".kube",
    ".kube/**",
    "node_modules",
    "node_modules/**",
    "dist",
    "dist/**",
    "build",
    "build/**",
    "coverage",
    "coverage/**",
    ".local",
    ".local/**",
    ".rag",
    ".rag/**",
    "*.pem",
    "*.key",
    ...(Array.isArray(args.forbidden_paths) ? args.forbidden_paths : []),
  ];
  const allowedReadPaths = normalizePathList(args.allowed_read_paths || []);
  const allowedWritePaths = normalizePathList(args.allowed_write_paths || []);
  if (allowedWritePaths.length === 0) {
    throw new Error("multi_model_coder_workspace_edit requires at least one allowed_write_paths entry.");
  }
  for (const requestedPath of allowedWritePaths) {
    assertNotForbidden(requestedPath, forbiddenPatterns, "write");
  }
  const files = [];
  for (const requestedPath of allowedReadPaths) {
    assertNotForbidden(requestedPath, forbiddenPatterns, "read");
    const absolutePath = resolveExistingWorkspacePath(workspaceRoot, requestedPath, "read");
    if (!existsSync(absolutePath)) {
      throw new Error(`Allowed read path does not exist: ${requestedPath}`);
    }
    const stats = statSync(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`Allowed read path is not a file: ${requestedPath}`);
    }
    const content = readTextFile(absolutePath, requestedPath);
    files.push({ path: requestedPath, content, sha256: sha256(content) });
  }
  return {
    workspaceRoot,
    forbiddenPatterns,
    allowedReadPaths,
    allowedWritePaths,
    files,
  };
}

export function resolveWorkspaceRoot(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("workspace_root must be an absolute path.");
  }
  if (!isAbsolute(value)) {
    throw new Error("workspace_root must be an absolute path.");
  }
  const root = resolve(value);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`workspace_root does not exist or is not a directory: ${root}`);
  }
  if (lstatSync(root).isSymbolicLink()) {
    throw new Error(`workspace_root must not be a symlink: ${root}`);
  }
  return root;
}

export function normalizePathList(paths) {
  if (!Array.isArray(paths)) {
    return [];
  }
  return paths.map(normalizeRelativePath);
}

export function normalizeRelativePath(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Workspace paths must be non-empty strings.");
  }
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized || normalized === "." || normalized.includes("\0")) {
    throw new Error(`Invalid workspace path: ${value}`);
  }
  if (isAbsolute(value) || normalized.split("/").includes("..")) {
    throw new Error(`Workspace path escapes root: ${value}`);
  }
  return normalized;
}

export function resolveWorkspacePath(workspaceRoot, relativePath) {
  const absolutePath = resolve(workspaceRoot, relativePath);
  const rel = relative(workspaceRoot, absolutePath);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Resolved path escapes workspace root: ${relativePath}`);
  }
  return absolutePath;
}

export function resolveExistingWorkspacePath(workspaceRoot, relativePath, action) {
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Workspace path does not exist for ${action}: ${relativePath}`);
  }
  assertNoSymlinkSegments(workspaceRoot, relativePath, action);
  const realRoot = realpathSync(workspaceRoot);
  const realPath = realpathSync(absolutePath);
  assertPathInside(realRoot, realPath, `Resolved real path escapes workspace root during ${action}: ${relativePath}`);
  return absolutePath;
}

export function readTextFile(absolutePath, displayPath) {
  const buffer = readFileSync(absolutePath);
  if (buffer.includes(0)) {
    throw new Error(`Refusing to read binary file: ${displayPath}`);
  }
  const text = buffer.toString("utf8");
  if (text.length > boundedInteger(env("MMA_WORKSPACE_FILE_CHAR_LIMIT", "200000"), 200000, 1, 20000000)) {
    throw new Error(`Refusing to read oversized file: ${displayPath}`);
  }
  return text;
}

export function workspaceFilesBlock(files) {
  if (!files.length) {
    return "";
  }
  return [
    "Workspace files:",
    ...files.map((file) =>
      [
        `--- ${file.path} ---`,
        `sha256: ${file.sha256}`,
        file.content,
        `--- end ${file.path} ---`,
      ].join("\n")
    ),
  ].join("\n\n");
}

export function parseWorkspaceEditResponse(rawText) {
  const text = String(rawText || "").trim();
  const jsonText = extractJsonObject(text);
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Coder workspace edit did not return valid JSON: ${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || (!Array.isArray(parsed.files) && !Array.isArray(parsed.edits))) {
    throw new Error('Coder workspace edit JSON must contain a "files" or "edits" array.');
  }
  validateWorkspaceEditPlanShape(parsed);
  return parsed;
}

export function workspaceEditJsonSchemaText() {
  return [
    "{",
    '  "summary": "brief implementation summary",',
    '  "files": [',
    '    { "path": "relative/path/from/workspace_root", "expected_sha256": "sha256 from the provided workspace file, or empty string for a new file", "content": "complete new file content" }',
    "  ],",
    '  "edits": [',
    '    { "path": "relative/path/from/workspace_root", "expected_sha256": "sha256 from the provided workspace file", "operation": "replace", "find": "exact existing text", "replace": "new text" }',
    "  ],",
    '  "tests": ["command to run"],',
    '  "risks": ["risk or assumption"]',
    "}",
  ].join("\n");
}

export function applyWorkspaceEditPlan(args, context, editPlan) {
  const dryRun = Boolean(args.dry_run);
  const changedFiles = [];
  const changedFileDetails = [];
  const changedFileOutputs = [];
  const diffs = [];
  const suppliedHashes = new Map(context.files.map((file) => [file.path, file.sha256]));
  const changes = [];

  assertUniquePlanPaths(editPlan);

  const fileEdits = Array.isArray(editPlan.files) ? editPlan.files : [];
  for (const fileEdit of fileEdits) {
    changes.push(buildFullFileChange(context, suppliedHashes, fileEdit));
  }

  const patchEditsByPath = groupPatchEditsByPath(editPlan.edits || []);
  for (const [relativePath, edits] of patchEditsByPath) {
    changes.push(buildPatchEditChange(context, suppliedHashes, relativePath, edits));
  }

  for (const change of changes) {
    recordWorkspaceChange({ context, change, dryRun, changedFiles, changedFileDetails, changedFileOutputs, diffs });
  }

  return {
    ok: true,
    dry_run: dryRun,
    summary: typeof editPlan.summary === "string" ? editPlan.summary : "",
    changed_files: changedFiles,
    changed_file_details: changedFileDetails,
    written_files: dryRun ? [] : changedFileOutputs,
    proposed_files: dryRun ? changedFileOutputs : [],
    diff: diffs.join("\n"),
    tests: Array.isArray(editPlan.tests) ? editPlan.tests.filter((item) => typeof item === "string") : [],
    risks: Array.isArray(editPlan.risks) ? editPlan.risks.filter((item) => typeof item === "string") : [],
  };
}

function buildFullFileChange(context, suppliedHashes, fileEdit) {
  if (!fileEdit || typeof fileEdit !== "object") {
    throw new Error("Each workspace edit file entry must be an object.");
  }
  const relativePath = normalizeRelativePath(fileEdit.path);
  assertNotForbidden(relativePath, context.forbiddenPatterns, "write");
  assertAllowedWrite(relativePath, context.allowedWritePaths);
  if (typeof fileEdit.content !== "string") {
    throw new Error(`Workspace edit content must be a string: ${relativePath}`);
  }
  const absolutePath = resolveSafeWorkspaceWritePath(context.workspaceRoot, relativePath);
  const existsBefore = existsSync(absolutePath);
  const before = existsBefore ? readTextFile(absolutePath, relativePath) : "";
  const beforeHash = existsBefore ? sha256(before) : "";
  const expectedHash = typeof fileEdit.expected_sha256 === "string" ? fileEdit.expected_sha256.trim() : "";
  const suppliedHash = suppliedHashes.get(relativePath);
  assertExpectedHashState({ relativePath, existsBefore, expectedHash, beforeHash, suppliedHash, allowNewFile: true });
  return {
    path: relativePath,
    absolutePath,
    before,
    after: fileEdit.content,
    expectedHash,
    beforeHash,
    mode: "full_file",
    created: !existsBefore,
  };
}

function buildPatchEditChange(context, suppliedHashes, relativePath, edits) {
  assertNotForbidden(relativePath, context.forbiddenPatterns, "write");
  assertAllowedWrite(relativePath, context.allowedWritePaths);
  const absolutePath = resolveExistingWorkspacePath(context.workspaceRoot, relativePath, "patch edit");
  const before = readTextFile(absolutePath, relativePath);
  const beforeHash = sha256(before);
  const suppliedHash = suppliedHashes.get(relativePath);
  if (!suppliedHash) {
    throw new Error(`Workspace patch edit for ${relativePath} requires the file in allowed_read_paths.`);
  }
  let after = before;
  for (const edit of edits) {
    const expectedHash = edit.expected_sha256.trim();
    assertExpectedHashState({
      relativePath,
      existsBefore: true,
      expectedHash,
      beforeHash,
      suppliedHash,
      allowNewFile: false,
    });
    after = applyPatchEditOperation(relativePath, after, edit);
  }
  return {
    path: relativePath,
    absolutePath,
    before,
    after,
    expectedHash: beforeHash,
    beforeHash,
    mode: "patch_edit",
    created: false,
    editCount: edits.length,
  };
}

function recordWorkspaceChange({ context, change, dryRun, changedFiles, changedFileDetails, changedFileOutputs, diffs }) {
  if (change.before === change.after) {
    return;
  }
  const afterHash = sha256(change.after);
  diffs.push(buildUnifiedDiff(change.path, change.before, change.after));
  changedFiles.push(change.path);
  changedFileDetails.push({
    path: change.path,
    mode: change.mode,
    expected_sha256: change.expectedHash,
    before_sha256: change.beforeHash,
    after_sha256: afterHash,
    created: change.created,
    ...(change.editCount ? { edit_count: change.editCount } : {}),
  });
  let outputContent = change.after;
  let readbackHash = "";
  if (!dryRun) {
    writeWorkspaceTextAtomic(context.workspaceRoot, change.path, change.absolutePath, change.after);
    outputContent = readTextFile(change.absolutePath, change.path);
    readbackHash = sha256(outputContent);
    if (readbackHash !== afterHash) {
      throw new Error(`Workspace write verification failed for ${change.path}: readback hash does not match planned content.`);
    }
  }
  changedFileOutputs.push({
    path: change.path,
    mode: change.mode,
    created: change.created,
    applied: !dryRun,
    write_verified: !dryRun,
    expected_sha256: change.expectedHash,
    before_sha256: change.beforeHash,
    after_sha256: afterHash,
    ...(readbackHash ? { readback_sha256: readbackHash } : {}),
    content_chars: outputContent.length,
    ...boundedWorkspaceEditContent(outputContent),
  });
}

function assertExpectedHashState({ relativePath, existsBefore, expectedHash, beforeHash, suppliedHash, allowNewFile }) {
  if (existsBefore && !expectedHash) {
    throw new Error(`Workspace edit for existing file ${relativePath} must include expected_sha256. Include the file in allowed_read_paths and retry.`);
  }
  if (!existsBefore && expectedHash) {
    throw new Error(`Workspace edit for new file ${relativePath} must use an empty expected_sha256.`);
  }
  if (!existsBefore && !allowNewFile) {
    throw new Error(`Workspace patch edit cannot create new file: ${relativePath}`);
  }
  if (suppliedHash && expectedHash !== suppliedHash) {
    throw new Error(`Workspace edit for ${relativePath} used an expected_sha256 that does not match the file content provided to coder.`);
  }
  if (expectedHash && expectedHash !== beforeHash) {
    throw new Error(
      `Stale workspace edit for ${relativePath}: expected_sha256 does not match current file content. Re-read the file and retry.`
    );
  }
}

function assertUniquePlanPaths(editPlan) {
  const filePaths = new Set();
  for (const fileEdit of Array.isArray(editPlan.files) ? editPlan.files : []) {
    if (!fileEdit || typeof fileEdit !== "object" || typeof fileEdit.path !== "string") {
      continue;
    }
    const relativePath = normalizeRelativePath(fileEdit.path);
    if (filePaths.has(relativePath)) {
      throw new Error(`Workspace edit touches the same file more than once across files/edits: ${relativePath}`);
    }
    filePaths.add(relativePath);
  }
  for (const edit of Array.isArray(editPlan.edits) ? editPlan.edits : []) {
    if (!edit || typeof edit !== "object" || typeof edit.path !== "string") {
      continue;
    }
    const relativePath = normalizeRelativePath(edit.path);
    if (filePaths.has(relativePath)) {
      throw new Error(`Workspace edit touches the same file more than once across files/edits: ${relativePath}`);
    }
  }
}

function groupPatchEditsByPath(edits) {
  const groups = new Map();
  for (const edit of edits) {
    const relativePath = normalizeRelativePath(edit.path);
    if (!groups.has(relativePath)) {
      groups.set(relativePath, []);
    }
    groups.get(relativePath).push(edit);
  }
  return groups;
}

function applyPatchEditOperation(relativePath, current, edit) {
  const operation = edit.operation;
  if (operation === "replace") {
    return replaceUnique(relativePath, current, edit.find, edit.replace);
  }
  if (operation === "insert_after") {
    return insertNearUnique(relativePath, current, edit.anchor, edit.insert, "after");
  }
  if (operation === "insert_before") {
    return insertNearUnique(relativePath, current, edit.anchor, edit.insert, "before");
  }
  throw new Error(`Unsupported workspace edit operation for ${relativePath}: ${operation}`);
}

function replaceUnique(relativePath, current, findText, replaceText) {
  if (typeof findText !== "string" || findText === "") {
    throw new Error(`Workspace replace edit for ${relativePath} requires a non-empty find string.`);
  }
  if (typeof replaceText !== "string") {
    throw new Error(`Workspace replace edit for ${relativePath} requires string replace.`);
  }
  const occurrences = countOccurrences(current, findText);
  if (occurrences !== 1) {
    throw new Error(`Workspace replace edit for ${relativePath} requires exactly one match, found ${occurrences}.`);
  }
  return current.replace(findText, replaceText);
}

function insertNearUnique(relativePath, current, anchor, insert, position) {
  if (typeof anchor !== "string" || anchor === "") {
    throw new Error(`Workspace ${position} insert edit for ${relativePath} requires a non-empty anchor string.`);
  }
  if (typeof insert !== "string") {
    throw new Error(`Workspace ${position} insert edit for ${relativePath} requires string insert.`);
  }
  const occurrences = countOccurrences(current, anchor);
  if (occurrences !== 1) {
    throw new Error(`Workspace ${position} insert edit for ${relativePath} requires exactly one anchor match, found ${occurrences}.`);
  }
  const index = current.indexOf(anchor);
  if (position === "after") {
    return `${current.slice(0, index + anchor.length)}${insert}${current.slice(index + anchor.length)}`;
  }
  return `${current.slice(0, index)}${insert}${current.slice(index)}`;
}

function countOccurrences(value, needle) {
  let count = 0;
  let index = 0;
  while (true) {
    index = value.indexOf(needle, index);
    if (index === -1) {
      return count;
    }
    count += 1;
    index += needle.length;
  }
}

export function assertNotForbidden(relativePath, patterns, action) {
  for (const pattern of patterns) {
    const normalized = normalizeForbiddenPattern(pattern);
    if (matchesForbiddenPattern(relativePath, normalized)) {
      throw new Error(`Refusing to ${action} forbidden path: ${relativePath}`);
    }
  }
}

export function assertPathInside(root, value, message) {
  const rel = relative(root, value);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(message);
  }
}

export function assertNoSymlinkInExistingAbsolutePath(absolutePath, label) {
  let current = resolve(absolutePath);
  const ancestors = [];
  while (true) {
    ancestors.push(current);
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  for (const ancestor of ancestors.reverse()) {
    if (existsSync(ancestor) && lstatSync(ancestor).isSymbolicLink()) {
      throw new Error(`Refusing to use symlinked ${label}: ${ancestor}`);
    }
  }
}

function resolveSafeWorkspaceWritePath(workspaceRoot, relativePath) {
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  if (existsSync(absolutePath)) {
    return resolveExistingWorkspacePath(workspaceRoot, relativePath, "write");
  }
  assertSafeWorkspaceParent(workspaceRoot, relativePath);
  return absolutePath;
}

function assertNoSymlinkSegments(workspaceRoot, relativePath, action) {
  const parts = normalizeRelativePath(relativePath).split("/");
  let current = workspaceRoot;
  for (const part of parts) {
    current = resolve(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`Refusing to ${action} symlink path: ${relativePath}`);
    }
  }
}

function assertSafeWorkspaceParent(workspaceRoot, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const parts = normalized.split("/").slice(0, -1);
  let current = workspaceRoot;
  let deepestExisting = workspaceRoot;
  for (const part of parts) {
    current = resolve(current, part);
    if (!existsSync(current)) {
      continue;
    }
    if (lstatSync(current).isSymbolicLink()) {
      throw new Error(`Refusing to write through symlink parent path: ${relativePath}`);
    }
    const stats = statSync(current);
    if (!stats.isDirectory()) {
      throw new Error(`Workspace write parent is not a directory: ${relativePath}`);
    }
    deepestExisting = current;
  }
  const realRoot = realpathSync(workspaceRoot);
  const realParent = realpathSync(deepestExisting);
  assertPathInside(realRoot, realParent, `Resolved write parent escapes workspace root: ${relativePath}`);
}

function writeWorkspaceTextAtomic(workspaceRoot, relativePath, absolutePath, text) {
  const parent = dirname(absolutePath);
  assertSafeWorkspaceParent(workspaceRoot, relativePath);
  mkdirSync(parent, { recursive: true });
  assertSafeWorkspaceParent(workspaceRoot, relativePath);
  if (existsSync(absolutePath)) {
    resolveExistingWorkspacePath(workspaceRoot, relativePath, "write");
  }
  const tempPath = resolve(parent, `.${relativePath.split("/").pop()}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
  const tempRel = relative(workspaceRoot, tempPath).replace(/\\/g, "/");
  if (!tempRel || tempRel.startsWith("..") || isAbsolute(tempRel)) {
    throw new Error(`Temporary write path escapes workspace root: ${relativePath}`);
  }
  writeFileSync(tempPath, text, { encoding: "utf8", flag: "wx" });
  if (existsSync(absolutePath)) {
    resolveExistingWorkspacePath(workspaceRoot, relativePath, "write");
  } else {
    assertSafeWorkspaceParent(workspaceRoot, relativePath);
  }
  renameSync(tempPath, absolutePath);
  resolveExistingWorkspacePath(workspaceRoot, relativePath, "write");
}

function validateWorkspaceEditPlanShape(plan) {
  if (plan.summary !== undefined && typeof plan.summary !== "string") {
    throw new Error('Coder workspace edit JSON field "summary" must be a string when present.');
  }
  if (plan.files !== undefined && !Array.isArray(plan.files)) {
    throw new Error('Coder workspace edit JSON field "files" must be an array when present.');
  }
  if (plan.edits !== undefined && !Array.isArray(plan.edits)) {
    throw new Error('Coder workspace edit JSON field "edits" must be an array when present.');
  }
  const files = Array.isArray(plan.files) ? plan.files : [];
  const edits = Array.isArray(plan.edits) ? plan.edits : [];
  for (const [index, file] of files.entries()) {
    if (!file || typeof file !== "object") {
      throw new Error(`Coder workspace edit file entry ${index} must be an object.`);
    }
    if (typeof file.path !== "string" || file.path.trim() === "") {
      throw new Error(`Coder workspace edit file entry ${index} must include a non-empty string path.`);
    }
    if (typeof file.content !== "string") {
      throw new Error(`Coder workspace edit file entry ${index} must include string content.`);
    }
    if (typeof file.expected_sha256 !== "string") {
      throw new Error(`Coder workspace edit file entry ${index} must include string expected_sha256.`);
    }
  }
  for (const [index, edit] of edits.entries()) {
    if (!edit || typeof edit !== "object") {
      throw new Error(`Coder workspace edit patch entry ${index} must be an object.`);
    }
    if (typeof edit.path !== "string" || edit.path.trim() === "") {
      throw new Error(`Coder workspace edit patch entry ${index} must include a non-empty string path.`);
    }
    if (typeof edit.expected_sha256 !== "string") {
      throw new Error(`Coder workspace edit patch entry ${index} must include string expected_sha256.`);
    }
    if (!["replace", "insert_after", "insert_before"].includes(edit.operation)) {
      throw new Error(`Coder workspace edit patch entry ${index} must use operation replace, insert_after, or insert_before.`);
    }
    if (edit.operation === "replace") {
      if (typeof edit.find !== "string" || edit.find === "") {
        throw new Error(`Coder workspace edit replace entry ${index} must include non-empty string find.`);
      }
      if (typeof edit.replace !== "string") {
        throw new Error(`Coder workspace edit replace entry ${index} must include string replace.`);
      }
    } else {
      if (typeof edit.anchor !== "string" || edit.anchor === "") {
        throw new Error(`Coder workspace edit insert entry ${index} must include non-empty string anchor.`);
      }
      if (typeof edit.insert !== "string") {
        throw new Error(`Coder workspace edit insert entry ${index} must include string insert.`);
      }
    }
  }
  if (plan.tests !== undefined && !arrayOfStrings(plan.tests)) {
    throw new Error('Coder workspace edit JSON field "tests" must be an array of strings when present.');
  }
  if (plan.risks !== undefined && !arrayOfStrings(plan.risks)) {
    throw new Error('Coder workspace edit JSON field "risks" must be an array of strings when present.');
  }
}

function arrayOfStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function extractJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in coder response.");
  }
  return candidate.slice(start, end + 1);
}

function assertAllowedWrite(relativePath, allowedWritePaths) {
  for (const allowed of allowedWritePaths) {
    if (relativePath === allowed || relativePath.startsWith(`${allowed}/`)) {
      return;
    }
  }
  throw new Error(`Coder attempted to write outside allowed_write_paths: ${relativePath}`);
}

function normalizeForbiddenPattern(pattern) {
  return String(pattern || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function matchesForbiddenPattern(relativePath, pattern) {
  if (!pattern) {
    return false;
  }
  const pathValue = relativePath.toLowerCase();
  const patternValue = pattern.toLowerCase();
  if (patternValue.endsWith("/**")) {
    const prefix = patternValue.slice(0, -3);
    return pathValue === prefix || pathValue.startsWith(`${prefix}/`);
  }
  if (patternValue.startsWith("*")) {
    return pathValue.endsWith(patternValue.slice(1));
  }
  if (patternValue.endsWith("*")) {
    return pathValue.startsWith(patternValue.slice(0, -1));
  }
  return pathValue === patternValue || pathValue.startsWith(`${patternValue}/`);
}

function buildUnifiedDiff(path, before, after) {
  const beforeLines = splitDiffLines(before);
  const afterLines = splitDiffLines(after);
  return [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
    ...beforeLines.map((line) => `-${line}`),
    ...afterLines.map((line) => `+${line}`),
  ].join("\n");
}

function splitDiffLines(value) {
  if (value === "") {
    return [];
  }
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.isInteger(value) ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return Math.min(max, Math.max(min, fallback));
  }
  return Math.min(max, Math.max(min, parsed));
}

function boundedWorkspaceEditContent(value) {
  const limit = boundedInteger(env("MMA_WORKSPACE_EDIT_RETURN_FILE_CHARS", "6000"), 6000, 0, 100000);
  const safeValue = redactSecrets(value);
  if (limit === 0) {
    return {
      content: "",
      content_truncated: safeValue.length > 0,
      content_return_limit: 0,
    };
  }
  return {
    content: safeValue.length > limit ? safeValue.slice(0, limit) : safeValue,
    content_truncated: safeValue.length > limit,
    content_return_limit: limit,
  };
}

function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}
