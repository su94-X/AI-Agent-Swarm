#!/usr/bin/env node

import {
  collectionForNoteType,
  isExpired,
  matchesRagFilters,
  normalizeAliases,
  normalizeCollection,
  normalizeConfidence,
  normalizeKnowledgeMetadata,
  normalizeKnowledgeScope,
  normalizeOptionalIsoDate,
  normalizeRagType,
  normalizeSearchFilters,
  normalizeStatus,
  normalizeTags,
  normalizeVerifiedBy,
  publicRagChunk,
  publicRagFilters,
} from "../lib/rag-metadata.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(normalizeCollection("bugs") === "bugs", "normalizeCollection changed a valid collection.");
assert(collectionForNoteType("bug") === "bugs", "bug notes should map to bugs collection.");
assert(collectionForNoteType("test_result") === "commands", "test_result notes should map to commands collection.");
assert(normalizeRagType("decision") === "decision", "normalizeRagType rejected a valid type.");
assert(normalizeConfidence("0.87654") === 0.877, "normalizeConfidence should round to three decimals.");
assert(normalizeVerifiedBy("codex/self-test") === "codex/self-test", "normalizeVerifiedBy rejected a valid value.");
assert(normalizeOptionalIsoDate("2030-01-02") === "2030-01-02T00:00:00.000Z", "normalizeOptionalIsoDate did not normalize date.");
assert(normalizeStatus("Deprecated") === "deprecated", "normalizeStatus should be case-insensitive.");

const tags = normalizeTags(["manifest", "manifest", "编码"]);
assert(tags.length === 2 && tags.includes("编码"), "normalizeTags did not dedupe or preserve valid CJK tags.");
const scope = normalizeKnowledgeScope(["plugin", "src/core"]);
assert(scope.includes("src/core"), "normalizeKnowledgeScope rejected valid scope.");
const aliases = normalizeAliases(["unicode escapes", "unicode escapes"]);
assert(aliases.length === 1, "normalizeAliases did not dedupe aliases.");

const metadata = normalizeKnowledgeMetadata({
  confidence: 0.8,
  verified_by: "codex",
  expires_at: "2999-01-01T00:00:00Z",
  scope: ["plugin"],
  aliases: ["manifest escapes"],
  status: "active",
});
assert(metadata.trusted === true && metadata.confidence === 0.8, "normalizeKnowledgeMetadata returned unexpected defaults.");

const filters = normalizeSearchFilters({
  min_confidence: 0.7,
  verified_by: "codex",
  scope: ["plugin"],
  type: "decision",
});
assert(publicRagFilters(filters).trusted_only === true, "publicRagFilters did not preserve trusted_only default.");

const activeChunk = {
  id: "chunk_1",
  documentId: "doc_1",
  collection: "decisions",
  sourcePath: "rag-note://decision/test",
  origin: "codex_verified_note",
  trusted: true,
  type: "decision",
  title: "Manifest convention",
  tags: ["manifest"],
  confidence: 0.9,
  verifiedBy: "codex",
  expiresAt: "2999-01-01T00:00:00.000Z",
  scope: ["plugin"],
  aliases: ["manifest escapes"],
  status: "active",
  startLine: 1,
  endLine: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  score: 12,
};
assert(matchesRagFilters(activeChunk, filters), "matchesRagFilters rejected a valid active chunk.");
assert(!matchesRagFilters({ ...activeChunk, confidence: 0.2 }, filters), "matchesRagFilters accepted low confidence content.");
assert(!matchesRagFilters({ ...activeChunk, trusted: false }, filters), "matchesRagFilters accepted untrusted content.");
assert(!matchesRagFilters({ ...activeChunk, expiresAt: "2000-01-01T00:00:00.000Z" }, filters), "matchesRagFilters accepted expired content.");
assert(!matchesRagFilters({ ...activeChunk, status: "deprecated" }, filters), "matchesRagFilters accepted deprecated content by default.");
assert(isExpired("2000-01-01T00:00:00.000Z"), "isExpired did not detect an old timestamp.");

const publicChunk = publicRagChunk(activeChunk, "public text");
assert(publicChunk.chunk_id === "chunk_1" && publicChunk.text === "public text", "publicRagChunk returned unexpected shape.");
assert(publicChunk.expired === false && publicChunk.status === "active", "publicRagChunk returned unexpected quality metadata.");

for (const [label, fn] of [
  ["collection", () => normalizeCollection("../bad")],
  ["tag", () => normalizeTags(["bad tag"])],
  ["confidence", () => normalizeConfidence(2)],
  ["scope", () => normalizeKnowledgeScope(["bad*scope"])],
  ["alias", () => normalizeAliases(["bad*alias"])],
  ["status", () => normalizeStatus("unknown")],
]) {
  try {
    fn();
    throw new Error(`${label} validation unexpectedly succeeded.`);
  } catch (error) {
    assert(!/unexpectedly/.test(error.message), error.message);
  }
}

console.log("RAG metadata self-test passed.");
