# Security Policy

AI Agent Swarm is designed to keep Codex as the final authority for file writes, tests, review, and RAG writes. External models should receive only the narrow context explicitly authorized for a task.

## Supported Versions

| Version | Supported |
| --- | --- |
| 1.4.x | Yes |
| Earlier versions | Best effort |

## Reporting a Vulnerability

Use GitHub private vulnerability reporting if it is enabled for the repository:

https://github.com/su94-X/AI-Agent-Swarm/security

If private reporting is not available, open a GitHub issue with a high-level description only. Do not include API keys, `.env` contents, private logs, production data, or exploit payloads that expose secrets.

## Secret Handling Rules

- Never commit `.env` or local RAG data.
- Keep `.env.example` template-only.
- Do not paste API keys into issues, pull requests, prompts, logs, or screenshots.
- Do not send `.env`, private logs, credentials, or production data to external model roles.
- Keep `.codex-plugin/plugin.json` ASCII-only and parseable.

## Safety Boundaries

- `multi_model_coder_workspace_edit` must receive narrow `allowed_read_paths` and `allowed_write_paths`.
- External coder output must be reviewed by Codex before acceptance.
- Gemini tester output is a test plan or failure analysis, not proof that tests passed.
- RAG entries should be written only after Codex verification.
