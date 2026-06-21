import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import {
  collectionForNoteType,
  isExpired,
  matchesRagFilters,
  normalizeCollection,
  normalizeConfidence,
  normalizeKnowledgeMetadata,
  normalizeRagType,
  normalizeOptionalRelatedFiles,
  normalizeSearchFilters,
  normalizeStatus,
  normalizeTags,
  publicRagChunk,
  publicRagFilters,
} from "./rag-metadata.mjs";
import {
  assertNoSecrets,
  ragForbiddenPatterns,
  safeRagOutput,
  sanitizeErrorMessage,
} from "./rag-security.mjs";
import { chunkText, ragChunkDefaults, scoreRagChunk, tokenizeSearchText } from "./rag-text.mjs";
import {
  assertNoSymlinkInExistingAbsolutePath,
  assertNotForbidden,
  assertPathInside,
  normalizePathList,
  readTextFile,
  resolveExistingWorkspacePath,
  resolveWorkspaceRoot,
} from "./workspace.mjs";

const ragDefaults = {
  chunkChars: ragChunkDefaults.chunkChars,
  overlapChars: ragChunkDefaults.overlapChars,
  defaultMaxResultChars: 4000,
  maxResultChars: 12000,
  defaultLimit: 5,
  maxLimit: 20,
};

export function ragStatus() {
  const root = ragRoot();
  const collections = listRagCollections();
  let documentCount = 0;
  let chunkCount = 0;
  let totalChars = 0;
  let updatedAt = "";
  let activeDocumentCount = 0;
  let defaultSearchVisibleDocumentCount = 0;
  let expiredDocumentCount = 0;
  let averageConfidence = null;
  let confidenceTotal = 0;
  let confidenceCount = 0;
  for (const collection of collections) {
    const documents = readJsonl(ragDocumentsPath(collection));
    const chunks = readJsonl(ragChunksPath(collection));
    documentCount += documents.length;
    chunkCount += chunks.length;
    totalChars += chunks.reduce((sum, chunk) => sum + String(chunk.text || "").length, 0);
    for (const document of documents) {
      const status = normalizeStatus(document.status || "active");
      const expired = isExpired(document.expiresAt || document.expires_at);
      if (status === "active" && !expired) {
        activeDocumentCount += 1;
        if (document.trusted === true) {
          defaultSearchVisibleDocumentCount += 1;
        }
      }
      if (expired) {
        expiredDocumentCount += 1;
      }
      const confidence = normalizeConfidence(document.confidence, 1);
      confidenceTotal += confidence;
      confidenceCount += 1;
    }
    for (const item of [...documents, ...chunks]) {
      if (item.updatedAt && item.updatedAt > updatedAt) {
        updatedAt = item.updatedAt;
      }
      if (item.createdAt && item.createdAt > updatedAt) {
        updatedAt = item.createdAt;
      }
    }
  }
  if (confidenceCount) {
    averageConfidence = Number((confidenceTotal / confidenceCount).toFixed(3));
  }
  return {
    ragRoot: root,
    exists: existsSync(root),
    writeEnabled: ragWriteEnabled(),
    collections,
    documentCount,
    activeDocumentCount,
    defaultSearchVisibleDocumentCount,
    expiredDocumentCount,
    chunkCount,
    totalChars,
    averageConfidence,
    updatedAt,
    notes: [
      "RAG 是 Codex 主控的本地项目记忆库（轻量 RAG），不会自动发送给外部模型。",
      "检索结果应由 Codex 筛选后再传给 Opus/Gemini。",
      "RAG 根目录不应提交、打包或发送给外部模型。",
    ],
  };
}

export function ragIngest(args, options = {}) {
  assertRagWriteEnabled();
  const collection = normalizeCollection(args.collection || "default");
  const tags = normalizeTags(args.tags || []);
  const sourceNote = typeof args.source_note === "string" ? args.source_note : "";
  const knowledgeMeta = normalizeKnowledgeMetadata(args, { origin: "local_file", trusted: true });
  const workspaceRoot = resolveWorkspaceRoot(args.workspace_root);
  const allowedReadPaths = normalizePathList(args.allowed_read_paths || []);
  if (allowedReadPaths.length === 0) {
    throw new Error("multi_model_rag_ingest requires at least one allowed_read_paths entry.");
  }

  const documents = [];
  const chunks = [];
  const skipped = [];
  const now = new Date().toISOString();
  for (const requestedPath of allowedReadPaths) {
    try {
      assertNotForbidden(requestedPath, ragForbiddenPatterns(), "ingest");
      const absolutePath = resolveExistingWorkspacePath(workspaceRoot, requestedPath, "ingest");
      if (!existsSync(absolutePath)) {
        throw new Error(`Allowed read path does not exist: ${requestedPath}`);
      }
      const stats = statSync(absolutePath);
      if (!stats.isFile()) {
        throw new Error(`Allowed read path is not a file: ${requestedPath}`);
      }
      const content = readTextFile(absolutePath, requestedPath);
      assertNoSecrets(content, `RAG ingest ${requestedPath}`);
      const contentHash = sha256(content);
      const documentId = `doc_${sha256(`${workspaceRoot}\n${requestedPath}\n${contentHash}`).slice(0, 24)}`;
      const documentChunks = chunkText(content, requestedPath).map((chunk, index) => ({
        id: `chk_${sha256(`${documentId}\n${index}\n${chunk.text}`).slice(0, 24)}`,
        documentId,
        collection,
        sourcePath: requestedPath,
        sourceNote,
        origin: "local_file",
        trusted: knowledgeMeta.trusted,
        type: "file",
        tags,
        confidence: knowledgeMeta.confidence,
        verifiedBy: knowledgeMeta.verifiedBy,
        expiresAt: knowledgeMeta.expiresAt,
        scope: knowledgeMeta.scope,
        aliases: knowledgeMeta.aliases,
        status: knowledgeMeta.status,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        text: chunk.text,
        tokens: tokenizeSearchText(`${requestedPath} ${tags.join(" ")} ${knowledgeMeta.aliases.join(" ")} ${chunk.text}`),
        contentHash,
        createdAt: now,
        updatedAt: now,
      }));
      const document = {
        id: documentId,
        collection,
        sourcePath: requestedPath,
        sourceNote,
        workspaceRootHash: sha256(workspaceRoot).slice(0, 24),
        origin: "local_file",
        trusted: knowledgeMeta.trusted,
        type: "file",
        tags,
        confidence: knowledgeMeta.confidence,
        verifiedBy: knowledgeMeta.verifiedBy,
        expiresAt: knowledgeMeta.expiresAt,
        scope: knowledgeMeta.scope,
        aliases: knowledgeMeta.aliases,
        status: knowledgeMeta.status,
        contentHash,
        createdAt: now,
        updatedAt: now,
        chunkCount: documentChunks.length,
      };
      documents.push(document);
      chunks.push(...documentChunks);
    } catch (error) {
      skipped.push({
        path: requestedPath,
        reason: sanitizeErrorMessage(error.message),
      });
    }
  }

  if (documents.length || chunks.length) {
    upsertRagEntries(collection, documents, chunks, options.pluginVersion);
  }
  return {
    ok: skipped.length === 0,
    collection,
    documents,
    chunks: chunks.map(({ text, tokens, ...chunk }) => chunk),
    skipped,
    warnings: skipped.length ? ["Some files were not ingested. Reasons are redacted and do not include secret values."] : [],
  };
}

export function ragNote(args, options = {}) {
  assertRagWriteEnabled();
  const type = normalizeRagType(args.type || "note");
  const collection = normalizeCollection(args.collection || collectionForNoteType(type));
  const title = requiredString(args.title, "title");
  const body = requiredString(args.body, "body");
  const evidence = requiredString(args.evidence, "evidence");
  const tags = normalizeTags(args.tags || []);
  const relatedFiles = normalizeOptionalRelatedFiles(args.related_files || []);
  const knowledgeMeta = normalizeKnowledgeMetadata(args, { origin: "codex_verified_note", trusted: true });
  const text = [`# ${title}`, "", body, "", "Evidence:", evidence].join("\n");
  assertNoSecrets(text, "RAG note");
  const now = new Date().toISOString();
  const contentHash = sha256(text);
  const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "note";
  const documentId = `doc_${sha256(`${type}\n${title}\n${contentHash}`).slice(0, 24)}`;
  const sourcePath = `rag-note://${type}/${slug || documentId}`;
  const documentChunks = chunkText(text, sourcePath).map((chunk, index) => ({
    id: `chk_${sha256(`${documentId}\n${index}\n${chunk.text}`).slice(0, 24)}`,
    documentId,
    collection,
    sourcePath,
    origin: "codex_verified_note",
    trusted: knowledgeMeta.trusted,
    type,
    title,
    evidence,
    relatedFiles,
    tags,
    confidence: knowledgeMeta.confidence,
    verifiedBy: knowledgeMeta.verifiedBy,
    expiresAt: knowledgeMeta.expiresAt,
    scope: knowledgeMeta.scope,
    aliases: knowledgeMeta.aliases,
    status: knowledgeMeta.status,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    text: chunk.text,
    tokens: tokenizeSearchText(`${title} ${type} ${tags.join(" ")} ${knowledgeMeta.aliases.join(" ")} ${body} ${evidence}`),
    contentHash,
    createdAt: now,
    updatedAt: now,
  }));
  const document = {
    id: documentId,
    collection,
    sourcePath,
    origin: "codex_verified_note",
    trusted: true,
    type,
    title,
    evidence,
    relatedFiles,
    tags,
    confidence: knowledgeMeta.confidence,
    verifiedBy: knowledgeMeta.verifiedBy,
    expiresAt: knowledgeMeta.expiresAt,
    scope: knowledgeMeta.scope,
    aliases: knowledgeMeta.aliases,
    status: knowledgeMeta.status,
    contentHash,
    createdAt: now,
    updatedAt: now,
    chunkCount: documentChunks.length,
  };
  upsertRagEntries(collection, [document], documentChunks, options.pluginVersion);
  return {
    ok: true,
    collection,
    document,
    chunks: documentChunks.map(({ text, tokens, ...chunk }) => chunk),
  };
}

export function ragSearch(args) {
  const query = requiredString(args.query, "query");
  assertNoSecrets(query, "RAG search query");
  const collections = args.collection ? [normalizeCollection(args.collection)] : listRagCollections();
  const tags = normalizeTags(args.tags || []);
  const filters = normalizeSearchFilters(args);
  const limit = boundedInteger(args.limit, ragDefaults.defaultLimit, 1, ragDefaults.maxLimit);
  const maxChars = boundedInteger(
    args.max_chars,
    Number(env("MMA_RAG_MAX_RESULT_CHARS", String(ragDefaults.defaultMaxResultChars))),
    1,
    ragDefaults.maxResultChars
  );
  const queryTokens = tokenizeSearchText(query);
  const results = [];
  for (const collection of collections) {
    const chunks = readJsonl(ragChunksPath(collection));
    for (const chunk of chunks) {
      if (tags.length && !tags.every((tag) => Array.isArray(chunk.tags) && chunk.tags.includes(tag))) {
        continue;
      }
      if (!matchesRagFilters(chunk, filters)) {
        continue;
      }
      const score = scoreRagChunk(query, queryTokens, chunk);
      if (score <= 0) {
        continue;
      }
      results.push({ ...chunk, score });
    }
  }
  results.sort((a, b) => b.score - a.score || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  let usedChars = 0;
  const boundedResults = [];
  for (const result of results.slice(0, limit)) {
    const text = safeRagOutput(result.text, `RAG result ${result.id}`);
    const remaining = maxChars - usedChars;
    if (remaining <= 0) {
      break;
    }
    const clipped = text.length > remaining ? `${text.slice(0, Math.max(0, remaining - 3))}...` : text;
    usedChars += clipped.length;
    boundedResults.push(publicRagChunk(result, clipped));
  }
  return {
    query,
    collections,
    tags,
    filters: publicRagFilters(filters),
    limit,
    max_chars: maxChars,
    results: boundedResults,
  };
}

export function ragGet(args) {
  const maxChars = boundedInteger(
    args.max_chars,
    Number(env("MMA_RAG_MAX_RESULT_CHARS", String(ragDefaults.defaultMaxResultChars))),
    1,
    ragDefaults.maxResultChars
  );
  const collections = args.collection ? [normalizeCollection(args.collection)] : listRagCollections();
  const includeNeighbors = args.include_neighbors !== false;
  const filters = normalizeSearchFilters(args);
  if (args.chunk_id && args.document_id) {
    throw new Error("multi_model_rag_get accepts chunk_id or document_id, not both.");
  }
  if (!args.chunk_id && !args.document_id) {
    throw new Error("multi_model_rag_get requires chunk_id or document_id.");
  }
  const matches = [];
  for (const collection of collections) {
    const chunks = readJsonl(ragChunksPath(collection));
    if (args.chunk_id) {
      const index = chunks.findIndex((chunk) => chunk.id === args.chunk_id);
      if (index !== -1) {
        const selected = includeNeighbors
          ? chunks.filter((chunk, chunkIndex) => chunk.documentId === chunks[index].documentId && Math.abs(chunkIndex - index) <= 1)
          : [chunks[index]];
        matches.push(...selected.filter((chunk) => matchesRagFilters(chunk, filters)));
      }
    } else {
      matches.push(...chunks.filter((chunk) => chunk.documentId === args.document_id && matchesRagFilters(chunk, filters)));
    }
  }
  let usedChars = 0;
  const chunks = [];
  for (const chunk of matches) {
    const text = safeRagOutput(chunk.text, `RAG get ${chunk.id}`);
    const remaining = maxChars - usedChars;
    if (remaining <= 0) {
      break;
    }
    const clipped = text.length > remaining ? `${text.slice(0, Math.max(0, remaining - 3))}...` : text;
    usedChars += clipped.length;
    chunks.push(publicRagChunk(chunk, clipped));
  }
  return {
    chunk_id: args.chunk_id || "",
    document_id: args.document_id || "",
    collections,
    max_chars: maxChars,
    include_neighbors: includeNeighbors,
    filters: publicRagFilters(filters),
    chunks,
  };
}

function ragRoot() {
  return resolve(env("MMA_RAG_ROOT", defaultRagRoot()));
}

function defaultRagRoot() {
  return resolve(env("CODEX_HOME", resolve(homedir(), ".codex")), "multi-model-agents", "rag");
}

function ragWriteEnabled() {
  return env("MMA_RAG_WRITE_ENABLED", "true").toLowerCase() !== "false";
}

function assertRagWriteEnabled() {
  if (!ragWriteEnabled()) {
    throw new Error("RAG writes are disabled by MMA_RAG_WRITE_ENABLED=false.");
  }
}

function ragManifestPath() {
  return resolveRagPath("manifest.json");
}

function ragCollectionDir(collection) {
  return resolveRagPath("collections", normalizeCollection(collection));
}

function ragDocumentsPath(collection) {
  return resolveRagPath("collections", normalizeCollection(collection), "documents.jsonl");
}

function ragChunksPath(collection) {
  return resolveRagPath("collections", normalizeCollection(collection), "chunks.jsonl");
}

function ragMetaPath(collection) {
  return resolveRagPath("collections", normalizeCollection(collection), "meta.json");
}

function resolveRagPath(...parts) {
  const root = ragRoot();
  const target = resolve(root, ...parts);
  assertPathInside(root, target, "RAG path escapes rag root.");
  assertNoSymlinkInExistingAbsolutePath(target, "RAG path");
  if (existsSync(root) && existsSync(target)) {
    const realRoot = realpathSync(root);
    const realTarget = realpathSync(target);
    assertPathInside(realRoot, realTarget, "Resolved RAG path escapes rag root.");
  }
  return target;
}

function listRagCollections() {
  const manifest = readJsonFile(ragManifestPath(), null);
  const fromManifest = Array.isArray(manifest?.collections) ? manifest.collections : [];
  const collections = new Set(fromManifest.map(normalizeCollection));
  for (const fallback of ["default", "bugs", "decisions", "commands", "conventions", "risks"]) {
    if (existsSync(ragCollectionDir(fallback))) {
      collections.add(fallback);
    }
  }
  return [...collections].sort();
}

function upsertRagEntries(collection, documents, chunks, pluginVersion = "0.0.0") {
  ensureRagCollection(collection);
  const existingDocuments = readJsonl(ragDocumentsPath(collection));
  const existingChunks = readJsonl(ragChunksPath(collection));
  const removeDocumentIds = new Set(documents.map((document) => document.id));
  const mergedDocuments = [
    ...existingDocuments.filter((document) => !removeDocumentIds.has(document.id)),
    ...documents,
  ];
  const mergedChunks = [
    ...existingChunks.filter((chunk) => !removeDocumentIds.has(chunk.documentId)),
    ...chunks,
  ];
  writeJsonlAtomic(ragDocumentsPath(collection), mergedDocuments);
  writeJsonlAtomic(ragChunksPath(collection), mergedChunks);
  const now = new Date().toISOString();
  writeJsonAtomic(ragMetaPath(collection), {
    schemaVersion: 1,
    collection,
    chunkChars: ragDefaults.chunkChars,
    overlapChars: ragDefaults.overlapChars,
    documentCount: mergedDocuments.length,
    chunkCount: mergedChunks.length,
    totalChars: mergedChunks.reduce((sum, chunk) => sum + String(chunk.text || "").length, 0),
    updatedAt: now,
  });
  updateRagManifest(collection, now, pluginVersion);
}

function ensureRagCollection(collection) {
  const dir = ragCollectionDir(collection);
  mkdirSync(dir, { recursive: true });
  assertNoSymlinkInExistingAbsolutePath(dir, "RAG collection");
}

function updateRagManifest(collection, now, pluginVersion) {
  const root = ragRoot();
  assertNoSymlinkInExistingAbsolutePath(root, "RAG root");
  mkdirSync(root, { recursive: true });
  assertNoSymlinkInExistingAbsolutePath(root, "RAG root");
  const manifest = readJsonFile(ragManifestPath(), {
    schemaVersion: 1,
    pluginVersion,
    createdAt: now,
    updatedAt: now,
    collections: [],
  });
  const collections = new Set(Array.isArray(manifest.collections) ? manifest.collections : []);
  collections.add(collection);
  writeJsonAtomic(ragManifestPath(), {
    ...manifest,
    schemaVersion: 1,
    pluginVersion,
    updatedAt: now,
    collections: [...collections].sort(),
  });
}

function readJsonl(path) {
  assertSafeRagStoragePath(path, "read");
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeJsonlAtomic(path, entries) {
  assertSafeRagStoragePath(path, "write");
  mkdirSync(dirname(path), { recursive: true });
  const text = entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : "");
  writeTextAtomic(path, text);
}

function readJsonFile(path, fallback) {
  assertSafeRagStoragePath(path, "read");
  if (!existsSync(path)) {
    return fallback;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJsonAtomic(path, value) {
  writeTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTextAtomic(path, text) {
  assertSafeRagStoragePath(path, "write");
  mkdirSync(dirname(path), { recursive: true });
  assertSafeRagStoragePath(dirname(path), "write");
  const tempPath = `${path}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  assertSafeRagStoragePath(tempPath, "write");
  writeFileSync(tempPath, text, { encoding: "utf8", flag: "wx" });
  assertSafeRagStoragePath(path, "write");
  renameSync(tempPath, path);
  assertSafeRagStoragePath(path, "write");
}

function assertSafeRagStoragePath(path, action) {
  const root = ragRoot();
  const absolutePath = resolve(path);
  assertPathInside(root, absolutePath, `RAG ${action} path escapes rag root.`);
  assertNoSymlinkInExistingAbsolutePath(absolutePath, `RAG ${action}`);
  if (existsSync(root) && existsSync(absolutePath)) {
    const realRoot = realpathSync(root);
    const realPath = realpathSync(absolutePath);
    assertPathInside(realRoot, realPath, `Resolved RAG ${action} path escapes rag root.`);
  }
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

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required string argument: ${name}`);
  }
  return value;
}

function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}
