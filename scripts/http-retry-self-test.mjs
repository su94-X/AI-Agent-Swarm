#!/usr/bin/env node

import { createServer } from "node:http";
import { callModel } from "../lib/model.mjs";

process.env.MMA_HTTP_MAX_ATTEMPTS = "3";
process.env.MMA_HTTP_RETRY_BASE_DELAY_MS = "0";
process.env.EXTERNAL_MODEL_API_KEY = "test-key";

let mode = "retry-json";
let requestCount = 0;
const server = createServer((request, response) => {
  requestCount += 1;
  request.resume();
  if (mode === "retry-json" && requestCount === 1) {
    response.writeHead(503, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: { message: "temporary overload" } }));
    return;
  }
  if (mode === "html") {
    response.writeHead(503, { "Content-Type": "text/html" });
    response.end("<!doctype html><html><body>gateway error</body></html>");
    return;
  }
  if (mode === "stream-openai") {
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.write('data: {"choices":[{"delta":{"content":"stream-"}}]}\n\n');
    response.write('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n');
    response.end("data: [DONE]\n\n");
    return;
  }
  if (mode === "stream-anthropic") {
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.write('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"anthropic-"}}\n\n');
    response.write('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n\n');
    response.end('event: message_stop\ndata: {"type":"message_stop"}\n\n');
    return;
  }
  if (mode === "stream-gemini") {
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.write('data: {"candidates":[{"content":{"parts":[{"text":"gemini-"}]}}]}\n\n');
    response.end('data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}\n\n');
    return;
  }
  if (mode === "stream-malformed") {
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.end("data: not-json\n\n");
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      choices: [
        {
          message: {
            content: "retry-ok",
          },
        },
      ],
    })
  );
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

const config = {
  provider: "openai-compatible",
  model: "local-retry-test",
  apiKeyEnv: "EXTERNAL_MODEL_API_KEY",
  baseUrl: `http://127.0.0.1:${port}`,
};
const prompt = {
  systemPrompt: "You are a local HTTP retry self-test.",
  userPrompt: "Reply with retry-ok.",
};

try {
  requestCount = 0;
  mode = "retry-json";
  const retryText = await callModel(config, prompt, { maxOutputTokens: 32 });
  if (!retryText.includes("retry-ok")) {
    throw new Error(`Retry response did not include expected model output: ${retryText}`);
  }
  if (requestCount !== 2) {
    throw new Error(`Expected one retry after 503 JSON response, got ${requestCount} requests.`);
  }

  requestCount = 0;
  mode = "html";
  let htmlFailed = false;
  try {
    await callModel(config, prompt, { maxOutputTokens: 32 });
  } catch (error) {
    htmlFailed = /returned HTML/i.test(error.message);
  }
  if (!htmlFailed) {
    throw new Error("HTML response was not rejected as HTML.");
  }
  if (requestCount !== 1) {
    throw new Error(`HTML response should not be retried, got ${requestCount} requests.`);
  }

  requestCount = 0;
  mode = "stream-openai";
  const streamText = await callModel(config, prompt, { maxOutputTokens: 32, stream: true });
  if (streamText !== "stream-ok") {
    throw new Error(`Stream response did not aggregate expected output: ${streamText}`);
  }
  if (requestCount !== 1) {
    throw new Error(`Stream response should complete in one request, got ${requestCount} requests.`);
  }

  requestCount = 0;
  mode = "stream-anthropic";
  const anthropicStreamText = await callModel(
    { ...config, provider: "anthropic", apiKeyEnv: "EXTERNAL_MODEL_API_KEY" },
    prompt,
    { maxOutputTokens: 32, stream: true }
  );
  if (anthropicStreamText !== "anthropic-ok") {
    throw new Error(`Anthropic stream response did not aggregate expected output: ${anthropicStreamText}`);
  }
  if (requestCount !== 1) {
    throw new Error(`Anthropic stream response should complete in one request, got ${requestCount} requests.`);
  }

  requestCount = 0;
  mode = "stream-gemini";
  const geminiStreamText = await callModel(
    { ...config, provider: "gemini", apiKeyEnv: "EXTERNAL_MODEL_API_KEY" },
    prompt,
    { maxOutputTokens: 32, stream: true }
  );
  if (geminiStreamText !== "gemini-ok") {
    throw new Error(`Gemini stream response did not aggregate expected output: ${geminiStreamText}`);
  }
  if (requestCount !== 1) {
    throw new Error(`Gemini stream response should complete in one request, got ${requestCount} requests.`);
  }

  requestCount = 0;
  mode = "stream-malformed";
  let malformedFailed = false;
  try {
    await callModel(config, prompt, { maxOutputTokens: 32, stream: true });
  } catch (error) {
    malformedFailed = /malformed SSE JSON/i.test(error.message);
  }
  if (!malformedFailed) {
    throw new Error("Malformed SSE response was not rejected.");
  }
  if (requestCount !== 1) {
    throw new Error(`Malformed SSE response should not be retried, got ${requestCount} requests.`);
  }

  console.log("HTTP retry self-test passed.");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
