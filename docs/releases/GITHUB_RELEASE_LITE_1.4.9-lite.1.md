# AI Agent Swarm Lite 1.4.9-lite.1 Release Notes

AI Agent Swarm Lite `1.4.9-lite.1` 同步主体版 V1.4.9 的发布自动化和凭据安全边界，同时保留 Lite 的核心定位：Codex 主控，Opus/Claude 只做外部审查、风险分析和 0-100 评分，不引入 Gemini tester 工作流。

## What Changed

- Added `scripts/sync-github-release.mjs` for Lite GitHub Release creation/update and zip asset upload.
- Added user-level GitHub Release token support.
- Added `lib/redaction.mjs` for shared GitHub token detection and redaction.
- Added `scripts/model-secret-self-test.mjs`.
- Extended RAG secret scan and direct `*_API_KEY_ENV` mistake detection to cover `github_pat_...` and `ghp_` / `gho_` / `ghu_` / `ghs_` / `ghr_` token forms.
- Kept Lite workflow unchanged: no Gemini tester tool, no default external coder role, Opus/Claude remains reviewer/scorer.

## Release Sync

Generate the Lite package:

```powershell
node scripts/package-release.mjs C:\path\to\outputs
```

Sync GitHub Release:

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
ai-agent-swarm-lite-1.4.9-lite.1.zip
```

The package must include:

- `scripts/sync-github-release.mjs`
- `scripts/model-secret-self-test.mjs`
- `lib/redaction.mjs`
- `docs/GITHUB_RELEASE_LITE_1.4.9-lite.1.md`

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
node scripts/reviewer-score-self-test.mjs
python C:/Users/su94/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py C:/Users/su94/plugins/multi-model-agents
$env:PYTHONUTF8='1'; python C:/Users/su94/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/su94/plugins/multi-model-agents/skills/multi-model-agents
node scripts/package-release.mjs C:/path/to/outputs
```
