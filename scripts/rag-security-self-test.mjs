#!/usr/bin/env node

import {
  assertNoSecrets,
  ragForbiddenPatterns,
  safeRagOutput,
  sanitizeErrorMessage,
  scanSecrets,
} from "../lib/rag-security.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const patterns = ragForbiddenPatterns();
for (const expected of [".env", ".git/**", "node_modules/**", ".local/**", "*.pem", "credentials*"]) {
  assert(patterns.includes(expected), `Missing forbidden RAG pattern: ${expected}`);
}

const fakeOpenAiKey = ["sk", "should-not-be-stored-12345678901234567890"].join("-");
const fakeGoogleKey = ["AI", "zaabcdefghijklmnopqrstuvwxyz1234567890"].join("");
const fakeAwsKey = ["AKIA", "1234567890ABCDEF"].join("");
const fakeGitHubToken = ["ghp", "abcdefghijklmnopqrstuvwxyz123456"].join("_");
const fakeJwt = ["eyJabcdefghijklmnopqrstuvwxyz", "eyJabcdefghijklmnopqrstuvwxyz", "signature1234567890"].join(".");

const secretSamples = [
  ["openai_key", fakeOpenAiKey],
  ["google_key", fakeGoogleKey],
  ["aws_access_key", fakeAwsKey],
  ["github_token", fakeGitHubToken],
  ["jwt", fakeJwt],
  ["secret_assignment", "api_key = supersecretvalue12345"],
  ["database_url", "postgres://user:password@example.com/db"],
  ["private_key", "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----"],
];

for (const [name, sample] of secretSamples) {
  assert(scanSecrets(sample).includes(name), `scanSecrets did not detect ${name}.`);
}

assert(scanSecrets("ordinary project note without credentials").length === 0, "scanSecrets produced a false positive.");

try {
  assertNoSecrets("token = supersecretvalue12345", "test note");
  throw new Error("assertNoSecrets unexpectedly accepted a token assignment.");
} catch (error) {
  assert(/sensitive data/.test(error.message), `Unexpected assertNoSecrets error: ${error.message}`);
}

try {
  safeRagOutput(["sk", "should-not-leak-12345678901234567890"].join("-"), "search result");
  throw new Error("safeRagOutput unexpectedly returned secret-like content.");
} catch (error) {
  assert(/sensitive data/.test(error.message), `Unexpected safeRagOutput error: ${error.message}`);
}

const sanitized = sanitizeErrorMessage(`failed with ${["sk", "abcdefghi1234567890"].join("-")} and ${["AI", "zaabcdefghi1234567890"].join("")}`);
assert(!sanitized.includes(["sk", "abcdefghi"].join("-")), "sanitizeErrorMessage did not redact OpenAI-like key.");
assert(!sanitized.includes(["AI", "zaabcdefghi"].join("")), "sanitizeErrorMessage did not redact Google-like key.");

console.log("RAG security self-test passed.");
