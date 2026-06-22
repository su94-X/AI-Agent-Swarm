export const GITHUB_TOKEN_PATTERN = /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/;
const GITHUB_TOKEN_REDACTION_PATTERN = /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g;

export function looksLikeSecret(value) {
  const text = String(value || "");
  return (
    /^(sk-|sk_|AIza|ya29\.|xai-|claude-|anthropic-|key-)[A-Za-z0-9._-]{12,}$/.test(text) ||
    /^(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})$/.test(text)
  );
}

export function redactSecrets(value) {
  return String(value || "")
    .replace(/sk-[A-Za-z0-9._-]{8,}/g, "sk-[redacted]")
    .replace(/AIza[A-Za-z0-9._-]{8,}/g, "AIza[redacted]")
    .replace(GITHUB_TOKEN_REDACTION_PATTERN, "[redacted-github-token]");
}
