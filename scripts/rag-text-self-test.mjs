#!/usr/bin/env node

import { chunkText, ragChunkDefaults, scoreRagChunk, tokenizeSearchText } from "../lib/rag-text.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const tokens = tokenizeSearchText("Plugin JSON 修复 记忆库 RAG path src/index.ts");
for (const expected of ["plugin", "json", "修复", "记忆", "忆库", "src/index.ts"]) {
  assert(tokens.includes(expected), `Missing search token: ${expected}`);
}

const markdown = [
  "# Intro",
  "short intro",
  "",
  "## Packaging",
  "plugin.json must remain ASCII-only.",
  "",
  "## RAG",
  "本地项目记忆库使用 JSONL 和词法检索。",
].join("\n");
const chunks = chunkText(markdown);
assert(chunks.length >= 1, "chunkText returned no chunks.");
assert(chunks.every((chunk) => chunk.text.length <= ragChunkDefaults.chunkChars * 2), "chunkText produced oversized chunks.");

const largeText = Array.from({ length: 12 }, (_, index) => `## Section ${index}\n${"x".repeat(500)}`).join("\n");
const largeChunks = chunkText(largeText);
assert(largeChunks.length > 1, "chunkText did not split large markdown content.");
assert(largeChunks.every((chunk) => chunk.startLine >= 1 && chunk.endLine >= chunk.startLine), "chunkText line metadata is invalid.");

const query = "manifest unicode escapes";
const queryTokens = tokenizeSearchText(query);
const baseChunk = {
  text: "plugin.json uses Unicode escape sequences for Chinese manifest fields.",
  tags: ["manifest"],
  aliases: ["unicode escapes"],
  scope: ["plugin"],
  confidence: 0.95,
};
const weakChunk = {
  text: "unrelated testing note",
  tags: ["tests"],
  confidence: 0.1,
};
assert(scoreRagChunk(query, queryTokens, baseChunk) > scoreRagChunk(query, queryTokens, weakChunk), "scoreRagChunk did not rank the relevant chunk higher.");

const aliasScore = scoreRagChunk("unicode escapes", tokenizeSearchText("unicode escapes"), baseChunk);
const textOnlyScore = scoreRagChunk("unicode escapes", tokenizeSearchText("unicode escapes"), { ...baseChunk, aliases: [] });
assert(aliasScore > textOnlyScore, "scoreRagChunk did not reward aliases.");

console.log("RAG text self-test passed.");
