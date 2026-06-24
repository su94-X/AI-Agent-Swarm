import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

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

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.isInteger(value) ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return Math.min(max, Math.max(min, fallback));
  }
  return Math.min(max, Math.max(min, parsed));
}

function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}
