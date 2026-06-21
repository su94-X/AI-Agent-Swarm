#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(process.argv[2] || join(pluginRoot, "..", "..", "outputs"));
const manifest = readManifest();
const version = manifest.version;
const releaseNotePath = `docs/GITHUB_RELEASE_V${version}.md`;
const zipPath = join(outputDir, `ai-agent-swarm-${version}.zip`);
const stageRoot = join(outputDir, `.ai-agent-swarm-${version}-stage`);

const includeRoots = [
  ".codex-plugin",
  "assets",
  "docs",
  "lib",
  "scripts",
  "skills",
  ".env.example",
  ".mcp.json",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "NOTICE",
  "README.md",
  "SECURITY.md",
];

const forbiddenEntries = [
  ".env",
  ".local",
  ".local/",
  ".rag",
  ".rag/",
  "rag/",
  "node_modules/",
  ".git/",
];

const forbiddenExtensions = new Set([
  ".key",
  ".pem",
  ".p12",
  ".pfx",
  ".kdbx",
  ".sqlite",
  ".db",
]);

function main() {
  validateSource();
  rmSync(stageRoot, { recursive: true, force: true });
  mkdirSync(stageRoot, { recursive: true });

  for (const entry of includeRoots) {
    const source = join(pluginRoot, entry);
    if (!existsSync(source)) {
      throw new Error(`Required release entry missing: ${entry}`);
    }
    copyIncluded(source, join(stageRoot, entry));
  }

  validateStage();
  mkdirSync(outputDir, { recursive: true });
  rmSync(zipPath, { force: true });
  createZip(stageRoot, zipPath);
  validateZip(zipPath);
  rmSync(stageRoot, { recursive: true, force: true });
  console.log(`Release package created: ${zipPath}`);
}

function validateSource() {
  const manifestText = readText(join(pluginRoot, ".codex-plugin", "plugin.json"));
  const manifest = JSON.parse(manifestText);
  if (manifest.version !== version) {
    throw new Error(`Manifest version changed during packaging: started with ${version}, found ${manifest.version}`);
  }
  const nonAscii = [...manifestText].filter((char) => char.charCodeAt(0) > 127).length;
  if (nonAscii !== 0) {
    throw new Error(`plugin.json must be ASCII-only, found ${nonAscii} non-ASCII characters.`);
  }
  const mcp = JSON.parse(readText(join(pluginRoot, ".mcp.json")));
  const server = (mcp.mcpServers || {})["multi-model-agents"];
  const args = Array.isArray(server?.args) ? server.args : [];
  if (!args.includes("./scripts/multi-model-agents-mcp.mjs")) {
    throw new Error(".mcp.json must use ./scripts/multi-model-agents-mcp.mjs");
  }
  const mcpText = readText(join(pluginRoot, ".mcp.json"));
  if (/C:[/\\]Users|[A-Za-z]:[/\\]/.test(mcpText)) {
    throw new Error(".mcp.json must not contain hardcoded absolute Windows paths.");
  }
}

function validateStage() {
  const files = listFiles(stageRoot);
  for (const file of files) {
    const rel = toPosix(relative(stageRoot, file));
    assertSafeReleasePath(rel);
    if (rel === ".env") {
      throw new Error("Release package must not contain .env.");
    }
  }
  const required = [
    ".codex-plugin/plugin.json",
    ".mcp.json",
    ".env.example",
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "NOTICE",
    "SECURITY.md",
    "docs/PACKAGE_INSTALL_PROMPT.md",
    "docs/FIRST_INSTALL_PROMPT.md",
    "docs/STARTUP_PROMPT.md",
    "docs/PROJECT_START_PROMPT.md",
    "docs/EXISTING_PROJECT_HANDOFF_PROMPT.md",
    "docs/NEW_PROJECT_BOOTSTRAP_PROMPT.md",
    "docs/ENVIRONMENT.md",
    "docs/ENGINEERING_GATE.md",
    "docs/ENGINEERING_GATE_IMPLEMENTATION_PLAN.md",
    releaseNotePath,
    "docs/RAG.md",
    "docs/ROADMAP.md",
    "docs/SUBAGENT_START_PROMPT.md",
    "docs/SUBAGENT_WORKFLOW.md",
    "docs/roles/CODER_SUBAGENT_PROMPT.md",
    "docs/roles/TESTER_SUBAGENT_PROMPT.md",
    "docs/roles/REVIEWER_SUBAGENT_PROMPT.md",
    "docs/roles/TEST_RUNNER_SUBAGENT_PROMPT.md",
    "docs/roles/RAG_CURATOR_SUBAGENT_PROMPT.md",
    "lib/mcp.mjs",
    "lib/model.mjs",
    "lib/rag-metadata.mjs",
    "lib/rag.mjs",
    "lib/rag-security.mjs",
    "lib/rag-text.mjs",
    "lib/workspace-edit-flow.mjs",
    "lib/workspace.mjs",
    "scripts/multi-model-agents-mcp.mjs",
    "scripts/mcp-smoke-test.mjs",
    "scripts/rag-self-test.mjs",
    "scripts/rag-metadata-self-test.mjs",
    "scripts/rag-security-self-test.mjs",
    "scripts/rag-text-self-test.mjs",
    "scripts/http-retry-self-test.mjs",
    "scripts/workspace-edit-json-self-test.mjs",
    "scripts/workspace-edit-repair-self-test.mjs",
    "scripts/tester-prompt-self-test.mjs",
    "scripts/package-release.mjs",
    "skills/multi-model-agents/SKILL.md",
  ];
  for (const rel of required) {
    if (!existsSync(join(stageRoot, ...rel.split("/")))) {
      throw new Error(`Release package missing required file: ${rel}`);
    }
  }
}

function validateZip(path) {
  if (!existsSync(path)) {
    throw new Error(`Zip was not created: ${path}`);
  }
  const zip = readZip(path);
  for (const entry of zip.entries) {
    if (entry.name.includes("\\")) {
      throw new Error(`Zip entry must use forward slashes, found: ${entry.name}`);
    }
    assertSafeReleasePath(toPosix(entry.name));
  }
  const manifestText = extractZipStoredFile(zip, ".codex-plugin/plugin.json").toString("utf8");
  const manifest = JSON.parse(manifestText);
  const nonAscii = [...manifestText].filter((char) => char.charCodeAt(0) > 127).length;
  if (manifest.version !== version || nonAscii !== 0) {
    throw new Error("Packaged plugin.json failed version or ASCII validation.");
  }
  const mcpText = extractZipStoredFile(zip, ".mcp.json").toString("utf8");
  if (!mcpText.includes("./scripts/multi-model-agents-mcp.mjs") || /C:[/\\]Users|[A-Za-z]:[/\\]/.test(mcpText)) {
    throw new Error("Packaged .mcp.json failed relative path validation.");
  }
}

function copyIncluded(source, destination) {
  const stats = statSync(source);
  const rel = toPosix(relative(pluginRoot, source));
  assertSafeReleasePath(rel);
  if (stats.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source)) {
      copyIncluded(join(source, name), join(destination, name));
    }
    return;
  }
  mkdirSync(dirname(destination), { recursive: true });
  const data = readFileSync(source);
  writeFileSync(destination, data);
}

function listFiles(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      out.push(...listFiles(path));
    } else {
      out.push(path);
    }
  }
  return out;
}

function assertSafeReleasePath(relPath) {
  const rel = toPosix(relPath).replace(/^\.\//, "");
  const base = basename(rel).toLowerCase();
  if (!rel || rel.includes("../") || rel.startsWith("/")) {
    throw new Error(`Unsafe release path: ${relPath}`);
  }
  for (const forbidden of forbiddenEntries) {
    const pattern = forbidden.toLowerCase();
    const value = rel.toLowerCase();
    if (pattern.endsWith("/")) {
      const prefix = pattern.slice(0, -1);
      if (value === prefix || value.startsWith(pattern)) {
        throw new Error(`Forbidden release path: ${relPath}`);
      }
    } else if (value === pattern || value.startsWith(`${pattern}/`)) {
      throw new Error(`Forbidden release path: ${relPath}`);
    }
  }
  if (base.startsWith("credentials") || base.startsWith("secrets") || base.startsWith("id_rsa")) {
    throw new Error(`Forbidden credential-like release path: ${relPath}`);
  }
  if (forbiddenExtensions.has(extname(base))) {
    throw new Error(`Forbidden credential/data file extension in release path: ${relPath}`);
  }
}

function createZip(sourceDir, targetZip) {
  const files = listFiles(sourceDir).sort((a, b) => toPosix(relative(sourceDir, a)).localeCompare(toPosix(relative(sourceDir, b))));
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  for (const file of files) {
    const name = toPosix(relative(sourceDir, file));
    if (name.includes("\\")) {
      throw new Error(`Internal zip entry still contains backslash: ${name}`);
    }
    const data = readFileSync(file);
    const nameBuffer = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const { time, date } = dosTimestamp(statSync(file).mtime);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    chunks.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralDirectory.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  writeFileSync(targetZip, Buffer.concat([...chunks, ...centralDirectory, end]));
}

function readZip(path) {
  const buffer = readFileSync(path);
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (centralOffset + centralSize > buffer.length) {
    throw new Error("Zip central directory is outside file bounds.");
  }
  const entries = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid zip central directory header at offset ${offset}.`);
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const crc = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString(flags & 0x0800 ? "utf8" : "latin1", offset + 46, offset + 46 + nameLength);
    entries.push({
      name,
      method,
      crc,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { buffer, entries };
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 22 - 0xffff);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("Zip end of central directory record was not found.");
}

function extractZipStoredFile(zip, relPath) {
  const entry = zip.entries.find((candidate) => candidate.name === relPath);
  if (!entry) {
    throw new Error(`Zip is missing required entry: ${relPath}`);
  }
  if (entry.method !== 0) {
    throw new Error(`Zip entry is not stored and cannot be validated without decompression: ${relPath}`);
  }
  const { buffer } = zip;
  const offset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error(`Invalid zip local header for entry: ${relPath}`);
  }
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) {
    throw new Error(`Zip entry data is outside file bounds: ${relPath}`);
  }
  const data = buffer.subarray(dataStart, dataEnd);
  if (data.length !== entry.uncompressedSize || crc32(data) !== entry.crc) {
    throw new Error(`Zip entry failed size or CRC validation: ${relPath}`);
  }
  return data;
}

function readManifest() {
  return JSON.parse(readText(join(pluginRoot, ".codex-plugin", "plugin.json")));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function toPosix(value) {
  return String(value || "").split(sep).join("/").replace(/\\/g, "/");
}

function dosTimestamp(value) {
  const date = value instanceof Date ? value : new Date();
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

main();
