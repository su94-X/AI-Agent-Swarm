import { normalizeConfidence } from "./rag-metadata.mjs";

export const ragChunkDefaults = {
  chunkChars: 1600,
  overlapChars: 200,
};

export function chunkText(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const chunks = [];
  let current = [];
  let currentChars = 0;
  let startLine = 1;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const isHeading = /^\s{0,3}#{1,6}\s+/.test(line);
    if (current.length && (currentChars + line.length + 1 > ragChunkDefaults.chunkChars || (isHeading && currentChars > 400))) {
      chunks.push({ text: current.join("\n"), startLine, endLine: index });
      const overlap = overlapLines(current);
      current = overlap;
      currentChars = overlap.join("\n").length;
      startLine = Math.max(1, index - overlap.length + 1);
    }
    if (!current.length) {
      startLine = index + 1;
    }
    current.push(line);
    currentChars += line.length + 1;
  }
  if (current.length) {
    chunks.push({ text: current.join("\n"), startLine, endLine: lines.length });
  }
  return chunks
    .map((chunk) => ({ ...chunk, text: chunk.text.trim() }))
    .filter((chunk) => chunk.text)
    .map((chunk) => chunk.text.length <= ragChunkDefaults.chunkChars * 2 ? chunk : splitLargeChunk(chunk))
    .flat();
}

export function tokenizeSearchText(value) {
  const text = String(value || "").toLowerCase().normalize("NFKC");
  const latin = text.match(/[a-z0-9_./:-]{2,}/g) || [];
  const cjk = text.match(/[\p{Script=Han}]{2,}/gu) || [];
  const cjkBigrams = [];
  for (const segment of cjk) {
    for (let index = 0; index < segment.length - 1; index++) {
      cjkBigrams.push(segment.slice(index, index + 2));
    }
  }
  return [...new Set([...latin, ...cjk, ...cjkBigrams].filter((token) => token.length >= 2))];
}

export function scoreRagChunk(query, queryTokens, chunk) {
  const haystack = `${chunk.sourcePath || ""} ${(chunk.tags || []).join(" ")} ${(chunk.aliases || []).join(" ")} ${(chunk.scope || []).join(" ")} ${chunk.title || ""} ${chunk.type || ""} ${chunk.verifiedBy || ""} ${chunk.text || ""}`
    .toLowerCase()
    .normalize("NFKC");
  const queryText = String(query || "").toLowerCase().normalize("NFKC");
  let score = haystack.includes(queryText) ? 20 : 0;
  const chunkTokens = Array.isArray(chunk.tokens) ? chunk.tokens : tokenizeSearchText(haystack);
  const tokenSet = new Set(chunkTokens);
  for (const token of queryTokens) {
    if (tokenSet.has(token)) {
      score += 3;
    } else if (haystack.includes(token)) {
      score += 1;
    }
    if (String(chunk.sourcePath || "").toLowerCase().includes(token)) {
      score += 2;
    }
    if ((chunk.tags || []).some((tag) => String(tag).toLowerCase().includes(token))) {
      score += 4;
    }
    if ((chunk.aliases || []).some((alias) => String(alias).toLowerCase().includes(token))) {
      score += 5;
    }
    if ((chunk.scope || []).some((scope) => String(scope).toLowerCase().includes(token))) {
      score += 2;
    }
  }
  score += Math.round(normalizeConfidence(chunk.confidence, 1) * 2);
  return score;
}

function splitLargeChunk(chunk) {
  if (chunk.text.length <= ragChunkDefaults.chunkChars * 2) {
    return [chunk];
  }
  const pieces = [];
  for (let start = 0; start < chunk.text.length; start += ragChunkDefaults.chunkChars - ragChunkDefaults.overlapChars) {
    pieces.push({
      text: chunk.text.slice(start, start + ragChunkDefaults.chunkChars).trim(),
      startLine: chunk.startLine,
      endLine: chunk.endLine,
    });
  }
  return pieces.filter((piece) => piece.text);
}

function overlapLines(lines) {
  const result = [];
  let chars = 0;
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index];
    if (chars + line.length > ragChunkDefaults.overlapChars) {
      break;
    }
    result.unshift(line);
    chars += line.length + 1;
  }
  return result;
}
