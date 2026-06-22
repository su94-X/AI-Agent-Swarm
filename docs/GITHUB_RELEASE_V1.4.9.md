# AI Agent Swarm V1.4.9 Release Notes

AI Agent Swarm V1.4.9 是 GitHub Release 同步和凭据边界增强版本。它保留 V1.4.8 的强制可见子智能体启动契约，并新增无 npm 依赖的 GitHub Release 同步脚本，方便维护者长期发布版本。

## What Changed in V1.4.9

- Added `scripts/sync-github-release.mjs`.
- Added support for user-level GitHub Release token storage.
- Added `lib/redaction.mjs` for shared token detection and redaction helpers.
- Added `scripts/model-secret-self-test.mjs`.
- Extended RAG secret scan and error redaction to detect `github_pat_...` and `ghp_` / `gho_` / `ghu_` / `ghs_` / `ghr_` token forms.
- Extended direct `*_API_KEY_ENV` mistake detection so GitHub tokens are redacted if mistakenly placed where an environment variable name should be used.

## Release Sync

Generate the release package first:

```powershell
node scripts/package-release.mjs C:\path\to\outputs
```

Then sync GitHub Release and zip asset:

```powershell
node scripts/sync-github-release.mjs C:\path\to\outputs
```

The sync script reads GitHub tokens from:

1. `GITHUB_TOKEN` or `GH_TOKEN`.
2. `MMA_GITHUB_TOKEN_FILE`.
3. `$CODEX_HOME\multi-model-agents\github-release-token`, when `CODEX_HOME` is set.
4. `%USERPROFILE%\.codex\multi-model-agents\github-release-token`.
5. `%TEMP%\github_release_token.txt` for backward compatibility.

Token files inside the plugin repository, current workspace, or output directory are rejected.

## Security Notes

- Do not put GitHub Release tokens in `.env`, `.env.example`, README, release notes, RAG, workspace files, screenshots, issues, PRs, prompts, or chat messages.
- Use a fine-grained GitHub token limited to `su94-X/AI-Agent-Swarm`.
- If a token was ever pasted into chat, logs, screenshots, issues, PRs, or prompts, revoke it and create a new one.
- Tokens are sent only with `Authorization: Bearer <token>`, not through URL query strings.

## Package

```text
ai-agent-swarm-1.4.9.zip
```

The package must include:

- `scripts/sync-github-release.mjs`
- `scripts/model-secret-self-test.mjs`
- `lib/redaction.mjs`
- `docs/GITHUB_RELEASE_V1.4.9.md`

The package must exclude:

- `.env`
- GitHub token files
- `.local/rag`
- `.rag`
- `.git`
- `node_modules`
- credential/token-like files
- local absolute paths

## Verification

```powershell
Get-ChildItem -Recurse -Path . -Include *.mjs | ForEach-Object { node --check $_.FullName }
node scripts/mcp-smoke-test.mjs
node scripts/http-retry-self-test.mjs
node scripts/model-secret-self-test.mjs
node scripts/rag-self-test.mjs
node scripts/rag-metadata-self-test.mjs
node scripts/rag-security-self-test.mjs
node scripts/rag-text-self-test.mjs
node scripts/workspace-edit-json-self-test.mjs
node scripts/workspace-edit-repair-self-test.mjs
node scripts/tester-prompt-self-test.mjs
node scripts/subagent-prompt-self-test.mjs
python C:/Users/su94/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py C:/Users/su94/plugins/multi-model-agents
$env:PYTHONUTF8='1'; python C:/Users/su94/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/su94/plugins/multi-model-agents/skills/multi-model-agents
node scripts/package-release.mjs C:/path/to/outputs
```
