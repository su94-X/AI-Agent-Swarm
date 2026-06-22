# AI Agent Swarm Lite 1.5.2-lite.1 Release Notes

AI Agent Swarm Lite `1.5.2-lite.1` enables model-layer streaming by default for Opus/Claude reviewer/scorer calls.

This release addresses long external review/scoring calls that can appear to hang or hit gateway idle timeouts when using non-streaming responses with large contexts or long outputs.

## What Changed

- `MMA_MODEL_STREAMING` now defaults to `true`.
- `.env.example` now ships with `MMA_MODEL_STREAMING=true`.
- Anthropic and OpenAI-compatible providers continue to use the existing SSE aggregation path:
  - Anthropic: messages stream.
  - OpenAI-compatible: chat completions stream.
- MCP tool return shape is unchanged. The server still aggregates streamed text and returns one final tool result.
- Gateways that do not support SSE can opt out with:

```text
MMA_MODEL_STREAMING=false
```

## Lite Boundary

Lite remains Codex-led:

- Codex plans, edits, runs real commands, writes verified RAG notes, and makes final decisions.
- Opus/Claude reviews and scores plans, diffs, test evidence, and final summaries through MCP.
- Gemini tester workflow remains intentionally removed.

## Runtime Notes

Streaming reduces long no-output windows and gateway idle-timeout risk. It does not remove upstream model queue time, model generation time, provider hard limits, or Codex/MCP client outer timeouts.

## Release Asset

```text
ai-agent-swarm-lite-1.5.2-lite.1.zip
```
