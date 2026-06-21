import { normalizeRelativePath } from "./workspace.mjs";

export function normalizeCollection(value) {
  const collection = String(value || "default").trim();
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(collection) || collection.includes("..")) {
    throw new Error(`Invalid RAG collection name: ${value}`);
  }
  return collection;
}

export function normalizeTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const tags = [...new Set(value.map((tag) => String(tag || "").trim()).filter(Boolean))]
    .map((tag) => tag.slice(0, 64));
  for (const tag of tags) {
    if (!/^[\p{L}\p{N}._:-]+$/u.test(tag)) {
      throw new Error("Invalid RAG tag value.");
    }
  }
  return tags;
}

export function normalizeRagType(value) {
  const type = String(value || "note");
  if (!["bug", "decision", "command", "convention", "risk", "test_result", "workflow", "note"].includes(type)) {
    throw new Error(`Invalid RAG note type: ${value}`);
  }
  return type;
}

export function collectionForNoteType(type) {
  switch (type) {
    case "bug":
      return "bugs";
    case "decision":
      return "decisions";
    case "command":
    case "test_result":
      return "commands";
    case "convention":
      return "conventions";
    case "risk":
      return "risks";
    default:
      return "default";
  }
}

export function normalizeOptionalRelatedFiles(paths) {
  if (!Array.isArray(paths)) {
    return [];
  }
  return paths.map(normalizeRelativePath);
}

export function normalizeKnowledgeMetadata(args, defaults = {}) {
  const confidence = normalizeConfidence(args.confidence, 1);
  const verifiedBy = normalizeVerifiedBy(args.verified_by ?? args.verifiedBy ?? "codex");
  const expiresAt = normalizeOptionalIsoDate(args.expires_at ?? args.expiresAt);
  const scope = normalizeKnowledgeScope(args.scope || []);
  const aliases = normalizeAliases(args.aliases || []);
  const status = normalizeStatus(args.status || "active");
  const trusted = args.trusted === undefined ? defaults.trusted !== false : args.trusted === true;
  return {
    confidence,
    verifiedBy,
    expiresAt,
    scope,
    aliases,
    status,
    trusted,
  };
}

export function normalizeConfidence(value, fallback = 1) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid RAG confidence value: ${value}`);
  }
  if (parsed < 0 || parsed > 1) {
    throw new Error("RAG confidence must be between 0 and 1.");
  }
  return Number(parsed.toFixed(3));
}

export function normalizeVerifiedBy(value) {
  const verifiedBy = String(value || "codex").trim();
  if (!/^[\p{L}\p{N} ._:@/-]{1,80}$/u.test(verifiedBy)) {
    throw new Error(`Invalid RAG verified_by value: ${value}`);
  }
  return verifiedBy;
}

export function normalizeOptionalIsoDate(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "";
  }
  const text = String(value).trim();
  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid RAG expires_at value: ${value}`);
  }
  return new Date(timestamp).toISOString();
}

export function normalizeKnowledgeScope(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const items = [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))]
    .map((item) => item.slice(0, 120));
  for (const item of items) {
    if (!/^[\p{L}\p{N} ._:/@-]+$/u.test(item)) {
      throw new Error("Invalid RAG scope value.");
    }
  }
  return items;
}

export function normalizeAliases(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const items = [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))]
    .map((item) => item.slice(0, 80));
  for (const item of items) {
    if (!/^[\p{L}\p{N} ._:/@-]+$/u.test(item)) {
      throw new Error("Invalid RAG alias value.");
    }
  }
  return items;
}

export function normalizeStatus(value) {
  const status = String(value || "active").trim().toLowerCase();
  if (!["active", "superseded", "deprecated"].includes(status)) {
    throw new Error(`Invalid RAG status: ${value}`);
  }
  return status;
}

export function normalizeSearchFilters(args) {
  return {
    trustedOnly: args.trusted_only === undefined ? true : args.trusted_only !== false,
    includeExpired: args.include_expired === true,
    minConfidence: normalizeConfidence(args.min_confidence, 0),
    type: args.type ? normalizeRagSearchType(args.type) : "",
    status: args.status ? normalizeStatus(args.status) : "active",
    scope: normalizeKnowledgeScope(args.scope || []),
    verifiedBy: args.verified_by ? normalizeVerifiedBy(args.verified_by) : "",
  };
}

export function normalizeRagSearchType(value) {
  const type = String(value || "");
  if (!["file", "bug", "decision", "command", "convention", "risk", "test_result", "workflow", "note"].includes(type)) {
    throw new Error(`Invalid RAG search type: ${value}`);
  }
  return type;
}

export function matchesRagFilters(chunk, filters) {
  if (filters.trustedOnly && chunk.trusted !== true) {
    return false;
  }
  if (!filters.includeExpired && isExpired(chunk.expiresAt || chunk.expires_at)) {
    return false;
  }
  if (normalizeConfidence(chunk.confidence, 1) < filters.minConfidence) {
    return false;
  }
  if (filters.type && chunk.type !== filters.type) {
    return false;
  }
  if (filters.status && normalizeStatus(chunk.status || "active") !== filters.status) {
    return false;
  }
  if (filters.scope.length) {
    const chunkScope = Array.isArray(chunk.scope) ? chunk.scope : [];
    if (!filters.scope.every((scope) => chunkScope.includes(scope))) {
      return false;
    }
  }
  if (filters.verifiedBy && chunk.verifiedBy !== filters.verifiedBy && chunk.verified_by !== filters.verifiedBy) {
    return false;
  }
  return true;
}

export function publicRagFilters(filters) {
  return {
    trusted_only: filters.trustedOnly,
    include_expired: filters.includeExpired,
    min_confidence: filters.minConfidence,
    type: filters.type,
    status: filters.status,
    scope: filters.scope,
    verified_by: filters.verifiedBy,
  };
}

export function isExpired(value, now = new Date()) {
  if (!value) {
    return false;
  }
  const timestamp = Date.parse(String(value));
  return Number.isFinite(timestamp) && timestamp < now.getTime();
}

export function publicRagChunk(chunk, text) {
  return {
    chunk_id: chunk.id,
    document_id: chunk.documentId,
    collection: chunk.collection,
    score: chunk.score,
    sourcePath: chunk.sourcePath,
    origin: chunk.origin,
    trusted: chunk.trusted,
    type: chunk.type,
    title: chunk.title,
    tags: chunk.tags || [],
    confidence: normalizeConfidence(chunk.confidence, 1),
    verifiedBy: chunk.verifiedBy || chunk.verified_by || "",
    expiresAt: chunk.expiresAt || chunk.expires_at || "",
    expired: isExpired(chunk.expiresAt || chunk.expires_at),
    scope: chunk.scope || [],
    aliases: chunk.aliases || [],
    status: normalizeStatus(chunk.status || "active"),
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    createdAt: chunk.createdAt,
    updatedAt: chunk.updatedAt,
    text,
  };
}
