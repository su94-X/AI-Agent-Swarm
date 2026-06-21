export function ragForbiddenPatterns() {
  return [
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
    "*.p12",
    "*.pfx",
    "*.crt",
    "*.cer",
    "*.sqlite",
    "*.db",
    "*.kdbx",
    "credentials*",
    "secrets*",
    "id_rsa*",
  ];
}

export function scanSecrets(value) {
  const text = String(value || "");
  const patterns = [
    ["private_key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/i],
    ["openai_key", /\bsk-[A-Za-z0-9._-]{20,}\b/],
    ["google_key", /\bAIza[A-Za-z0-9._-]{20,}\b/],
    ["oauth_token", /\bya29\.[A-Za-z0-9._-]{20,}\b/],
    ["aws_access_key", /\bAKIA[0-9A-Z]{16}\b/],
    ["github_token", /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
    ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
    ["secret_assignment", /\b(password|passwd|secret|token|api[_-]?key)\b\s*[:=]\s*['"]?[^'"\s]{12,}/i],
    ["database_url", /\b(postgres|postgresql|mysql|mongodb|redis):\/\/[^/\s:]+:[^@\s]+@/i],
  ];
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

export function assertNoSecrets(value, label) {
  const matches = scanSecrets(value);
  if (matches.length) {
    throw new Error(`${label} appears to contain sensitive data: ${[...new Set(matches)].join(", ")}`);
  }
}

export function safeRagOutput(value, label) {
  assertNoSecrets(value, label);
  return String(value || "");
}

export function sanitizeErrorMessage(message) {
  return String(message || "").replace(/sk-[A-Za-z0-9._-]{8,}/g, "sk-[redacted]").replace(/AIza[A-Za-z0-9._-]{8,}/g, "AIza[redacted]");
}
