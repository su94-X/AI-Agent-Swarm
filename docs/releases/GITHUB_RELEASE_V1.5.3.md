# AI Agent Swarm V1.5.3 Release Notes

AI Agent Swarm `V1.5.3` enables model-layer streaming by default.

This release addresses long Opus/Claude and Gemini calls that can appear to hang or hit gateway idle timeouts when using non-streaming responses with large contexts or long outputs.

## What Changed

- `MMA_MODEL_STREAMING` now defaults to `true`.
- `.env.example` now ships with `MMA_MODEL_STREAMING=true`.
- Anthropic, Gemini, and OpenAI-compatible providers continue to use the existing SSE aggregation path:
  - Anthropic: messages stream.
  - Gemini: `streamGenerateContent?alt=sse`.
  - OpenAI-compatible: chat completions stream.
- MCP tool return shape is unchanged. The server still aggregates streamed text and returns one final tool result.
- Gateways that do not support SSE can opt out with:

```text
MMA_MODEL_STREAMING=false
```

## Notes

Streaming reduces long no-output windows and gateway idle-timeout risk. It does not remove upstream model queue time, model generation time, provider hard limits, or Codex/MCP client outer timeouts.

## Verified

- Real large-context Opus/Claude role-call streaming probe passed locally.
- Real large-context Gemini role-call streaming probe passed locally.
- Real `multi_model_tester_plan` streaming probe passed locally with large diff context.

## Release Asset

```text
ai-agent-swarm-1.5.3.zip
```
