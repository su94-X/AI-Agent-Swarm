# Security

AI Agent Swarm Codex-only keeps the default tool surface local: config status and RAG memory only.

## Boundaries

- Do not commit `.env`, release tokens, credentials, private logs, production data, or local RAG storage.
- RAG writes must be Codex-verified and secret-scanned.
- Release packages must exclude `.env`, `.local`, `.rag`, `.git`, `node_modules`, generated archives, and credential-like files.
- Custom Agents must not read or print real secrets.
- GitHub Release tokens must come from environment variables or user-level secret files outside the repository.

## Reporting

If you find a security issue, avoid publishing secret values. Report the affected file path, command, or behavior and the minimal reproduction details.
