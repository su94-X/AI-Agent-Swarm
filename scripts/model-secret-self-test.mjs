#!/usr/bin/env node

import { getApiKeyInfo } from "../lib/model.mjs";
import { looksLikeSecret, redactSecrets } from "../lib/redaction.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const samples = [
  ["github_pat", ["github", "pat", "11BUYUIQY086abcdefghijklmnopqrstuvwxyz1234567890"].join("_")],
  ["ghp", ["ghp", "abcdefghijklmnopqrstuvwxyz123456"].join("_")],
  ["gho", ["gho", "abcdefghijklmnopqrstuvwxyz123456"].join("_")],
  ["ghu", ["ghu", "abcdefghijklmnopqrstuvwxyz123456"].join("_")],
  ["ghs", ["ghs", "abcdefghijklmnopqrstuvwxyz123456"].join("_")],
  ["ghr", ["ghr", "abcdefghijklmnopqrstuvwxyz123456"].join("_")],
];

for (const [label, sample] of samples) {
  assert(looksLikeSecret(sample), `looksLikeSecret did not detect ${label}.`);
  const keyInfo = getApiKeyInfo({ apiKeyEnv: sample });
  assert(keyInfo.displayName === "[redacted direct key in *_API_KEY_ENV]", `getApiKeyInfo leaked displayName for ${label}.`);
  assert(keyInfo.source === "direct-redacted" && keyInfo.hasApiKey, `getApiKeyInfo returned unexpected source for ${label}.`);
  assert(!redactSecrets(`token=${sample}`).includes(sample), `redactSecrets leaked ${label}.`);
}

assert(!looksLikeSecret("GITHUB_TOKEN"), "looksLikeSecret confused an env var name with a token.");

console.log("model secret self-test passed.");
