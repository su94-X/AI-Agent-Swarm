import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { looksLikeSecret } from "./redaction.mjs";

export async function callModel(config, prompt, options = {}) {
  switch (normalizeProvider(config.provider)) {
    case "openai":
    case "openai-compatible":
      return callOpenAICompatible(config, prompt, options);
    case "anthropic":
      return callAnthropic(config, prompt, options);
    case "gemini":
      return callGemini(config, prompt, options);
    case "codex-internal":
      throw new Error(
        "reviewer is configured as codex-internal. Use Codex itself or a Codex subagent for review, or configure an external reviewer provider."
      );
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

export function getApiKeyInfo(config) {
  const apiKeyEnv = String(config.apiKeyEnv || "");
  if (apiKeyEnv && process.env[apiKeyEnv]) {
    return {
      displayName: apiKeyEnv,
      hasApiKey: true,
      source: "environment",
      value: process.env[apiKeyEnv],
    };
  }
  if (looksLikeSecret(apiKeyEnv)) {
    return {
      displayName: "[redacted direct key in *_API_KEY_ENV]",
      hasApiKey: true,
      source: "direct-redacted",
      value: apiKeyEnv,
    };
  }
  return {
    displayName: apiKeyEnv || "(unset)",
    hasApiKey: false,
    source: "missing",
    value: "",
  };
}

export function normalizeProvider(provider) {
  return String(provider || "").toLowerCase();
}

export function defaultModelForProvider(provider) {
  switch (normalizeProvider(provider)) {
    case "anthropic":
      return "claude-opus-4-8";
    case "gemini":
      return "gemini-3.5-flash";
    case "openai":
    case "openai-compatible":
      return "gpt-5.5";
    default:
      return "external-model";
  }
}

export function defaultApiKeyEnvForProvider(provider) {
  switch (normalizeProvider(provider)) {
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    case "gemini":
      return "GEMINI_API_KEY";
    case "openai":
    case "openai-compatible":
      return "OPENAI_API_KEY";
    default:
      return "";
  }
}

export function defaultBaseUrlForProvider(provider) {
  switch (normalizeProvider(provider)) {
    case "anthropic":
      return "https://api.anthropic.com";
    case "gemini":
      return "https://generativelanguage.googleapis.com";
    case "openai":
    case "openai-compatible":
      return "https://api.openai.com/v1";
    default:
      return "";
  }
}

async function callOpenAICompatible(config, prompt, options) {
  const apiKey = requireApiKey(config);
  const baseUrl = stripTrailingSlash(config.baseUrl || "https://api.openai.com/v1");
  const body = {
    model: config.model,
    messages: [
      { role: "system", content: prompt.systemPrompt },
      { role: "user", content: prompt.userPrompt },
    ],
  };
  if (options.maxOutputTokens) {
    body.max_tokens = options.maxOutputTokens;
  }

  if (streamingEnabled(options)) {
    body.stream = true;
    const text = await httpSseText(
      openAIChatCompletionsUrl(baseUrl),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      },
      (event) => {
        if (!event.data || event.data.trim() === "[DONE]") {
          return "";
        }
        const payload = parseSseJson(event.data, "OpenAI-compatible stream");
        if (payload.error) {
          throw providerStreamError("OpenAI-compatible", payload.error);
        }
        const deltaContent = payload.choices?.[0]?.delta?.content;
        const messageContent = payload.choices?.[0]?.message?.content;
        if (typeof deltaContent === "string") {
          return deltaContent;
        }
        return typeof messageContent === "string" ? messageContent : "";
      }
    );
    return text;
  }

  const response = await httpJson(openAIChatCompletionsUrl(baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (typeof response === "string" && looksLikeHtml(response)) {
    throw new Error(
      `OpenAI-compatible endpoint returned HTML instead of JSON. Check base_url; expected an API endpoint such as ${baseUrl}/v1.`
    );
  }
  return JSON.stringify(response, null, 2);
}

async function callAnthropic(config, prompt, options) {
  const apiKey = requireApiKey(config);
  const baseUrl = stripTrailingSlash(config.baseUrl || "https://api.anthropic.com");
  const body = {
    model: config.model,
    max_tokens: options.maxOutputTokens || 4096,
    system: prompt.systemPrompt,
    messages: [{ role: "user", content: prompt.userPrompt }],
  };

  if (streamingEnabled(options)) {
    body.stream = true;
    const text = await httpSseText(
      anthropicMessagesUrl(baseUrl),
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": env("MMA_ANTHROPIC_VERSION", "2023-06-01"),
          "Content-Type": "application/json",
        },
        body,
      },
      (event) => {
        if (!event.data) {
          return "";
        }
        const payload = parseSseJson(event.data, "Anthropic stream");
        if (event.event === "error" || payload.type === "error" || payload.error) {
          throw providerStreamError("Anthropic", payload.error || payload);
        }
        if ((event.event === "content_block_delta" || payload.type === "content_block_delta") && payload.delta?.type === "text_delta") {
          return typeof payload.delta.text === "string" ? payload.delta.text : "";
        }
        return "";
      }
    );
    return text;
  }

  const response = await httpJson(anthropicMessagesUrl(baseUrl), {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": env("MMA_ANTHROPIC_VERSION", "2023-06-01"),
      "Content-Type": "application/json",
    },
    body,
  });

  const text = response.content
    ?.map((part) => (part?.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
  return text || JSON.stringify(response, null, 2);
}

async function callGemini(config, prompt, options) {
  const apiKey = requireApiKey(config);
  const baseUrl = stripTrailingSlash(config.baseUrl || "https://generativelanguage.googleapis.com");
  const model = encodeURIComponent(config.model);
  const useHeaderKey = env("MMA_GEMINI_API_KEY_IN_HEADER", "true").toLowerCase() !== "false";
  const body = {
    systemInstruction: {
      parts: [{ text: prompt.systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt.userPrompt }],
      },
    ],
  };
  if (options.maxOutputTokens) {
    body.generationConfig = { maxOutputTokens: options.maxOutputTokens };
  }

  const url = useHeaderKey
    ? `${baseUrl}/v1beta/models/${model}:generateContent`
    : `${baseUrl}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  if (streamingEnabled(options)) {
    const streamUrl = useHeaderKey
      ? `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse`
      : `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
    const text = await httpSseText(
      streamUrl,
      {
        method: "POST",
        headers: {
          ...(useHeaderKey ? { "x-goog-api-key": apiKey } : {}),
          "Content-Type": "application/json",
        },
        body,
      },
      (event) => {
        if (!event.data) {
          return "";
        }
        const payload = parseSseJson(event.data, "Gemini stream");
        if (payload.error) {
          throw providerStreamError("Gemini", payload.error);
        }
        return (
          payload.candidates
            ?.flatMap((candidate) => candidate.content?.parts ?? [])
            .map((part) => part.text || "")
            .filter(Boolean)
            .join("") || ""
        );
      }
    );
    return text;
  }
  const response = await httpJson(url, {
    method: "POST",
    headers: {
      ...(useHeaderKey ? { "x-goog-api-key": apiKey } : {}),
      "Content-Type": "application/json",
    },
    body,
  });

  const text = response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("\n");
  return text || JSON.stringify(response, null, 2);
}

async function httpSseText(url, options, onEvent) {
  const maxAttempts = boundedInteger(env("MMA_HTTP_MAX_ATTEMPTS", "3"), 3, 1, 5);
  const baseDelayMs = boundedInteger(env("MMA_HTTP_RETRY_BASE_DELAY_MS", "500"), 500, 0, 10000);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await httpSseTextOnce(url, options, onEvent);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableHttpError(error)) {
        if (attempt > 1 && error instanceof Error) {
          error.message = `${error.message} (after ${attempt} attempts)`;
        }
        throw error;
      }
      await sleep(retryDelayMs(attempt, baseDelayMs));
    }
  }

  throw lastError;
}

function httpSseTextOnce(url, options, onEvent) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "http:" ? httpRequest : httpsRequest;
    const bodyText = JSON.stringify(options.body ?? {});
    let output = "";
    let buffer = "";
    let settled = false;
    let request;

    const rejectOnce = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (output) {
        error.retryable = false;
      }
      reject(error);
      request?.destroy();
    };

    const resolveOnce = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(output);
    };

    request = client(
      parsed,
      {
        method: options.method || "GET",
        headers: {
          "Content-Length": Buffer.byteLength(bodyText),
          ...options.headers,
        },
      },
      (response) => {
        response.setEncoding("utf8");

        if (response.statusCode < 200 || response.statusCode >= 300) {
          let errorBody = "";
          response.on("data", (chunk) => {
            errorBody += chunk;
          });
          response.on("end", () => {
            let payload;
            try {
              payload = errorBody ? JSON.parse(errorBody) : {};
            } catch {
              payload = errorBody;
            }
            if (typeof payload === "string" && looksLikeHtml(payload)) {
              const error = new Error(`HTTP ${response.statusCode} from ${parsed.hostname} returned HTML, not model JSON.`);
              error.statusCode = response.statusCode;
              error.retryable = false;
              rejectOnce(error);
              return;
            }
            const error = new Error(
              `HTTP ${response.statusCode} from ${parsed.hostname}: ${truncate(JSON.stringify(payload), 2000)}`
            );
            error.statusCode = response.statusCode;
            error.retryable = isRetryableStatus(response.statusCode);
            rejectOnce(error);
          });
          response.on("error", rejectOnce);
          return;
        }

        response.on("data", (chunk) => {
          buffer += chunk;
          try {
            buffer = processSseBuffer(buffer, (event) => {
              const text = onEvent(event);
              if (typeof text === "string" && text) {
                output += text;
                if (typeof options.onProgress === "function") {
                  options.onProgress(text);
                }
              }
            });
          } catch (error) {
            error.retryable = false;
            rejectOnce(error);
          }
        });
        response.on("end", () => {
          if (settled) {
            return;
          }
          if (buffer.trim()) {
            try {
              processSseBuffer(`${buffer}\n\n`, (event) => {
                const text = onEvent(event);
                if (typeof text === "string" && text) {
                  output += text;
                  if (typeof options.onProgress === "function") {
                    options.onProgress(text);
                  }
                }
              });
            } catch (error) {
              error.retryable = false;
              rejectOnce(error);
              return;
            }
          }
          resolveOnce();
        });
        response.on("error", rejectOnce);
      }
    );

    request.on("error", rejectOnce);
    request.setTimeout(boundedInteger(env("MMA_HTTP_TIMEOUT_MS", "120000"), 120000, 1000, 3600000), () => {
      const error = new Error("Model request timed out.");
      error.retryable = !output;
      request.destroy(error);
    });
    request.write(bodyText);
    request.end();
  });
}

async function httpJson(url, options) {
  const maxAttempts = boundedInteger(env("MMA_HTTP_MAX_ATTEMPTS", "3"), 3, 1, 5);
  const baseDelayMs = boundedInteger(env("MMA_HTTP_RETRY_BASE_DELAY_MS", "500"), 500, 0, 10000);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await httpJsonOnce(url, options);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableHttpError(error)) {
        if (attempt > 1 && error instanceof Error) {
          error.message = `${error.message} (after ${attempt} attempts)`;
        }
        throw error;
      }
      await sleep(retryDelayMs(attempt, baseDelayMs));
    }
  }

  throw lastError;
}

function httpJsonOnce(url, options) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "http:" ? httpRequest : httpsRequest;
    const bodyText = JSON.stringify(options.body ?? {});
    const request = client(
      parsed,
      {
        method: options.method || "GET",
        headers: {
          "Content-Length": Buffer.byteLength(bodyText),
          ...options.headers,
        },
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          let payload;
          try {
            payload = data ? JSON.parse(data) : {};
          } catch {
            payload = data;
          }
          if (typeof payload === "string" && looksLikeHtml(payload)) {
            const error = new Error(`HTTP ${response.statusCode} from ${parsed.hostname} returned HTML, not model JSON.`);
            error.statusCode = response.statusCode;
            error.retryable = false;
            reject(error);
            return;
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = new Error(
              `HTTP ${response.statusCode} from ${parsed.hostname}: ${truncate(JSON.stringify(payload), 2000)}`
            );
            error.statusCode = response.statusCode;
            error.retryable = isRetryableStatus(response.statusCode);
            reject(error);
            return;
          }
          resolve(payload);
        });
      }
    );
    request.on("error", reject);
    request.setTimeout(boundedInteger(env("MMA_HTTP_TIMEOUT_MS", "120000"), 120000, 1000, 3600000), () => {
      const error = new Error("Model request timed out.");
      error.retryable = true;
      request.destroy(error);
    });
    request.write(bodyText);
    request.end();
  });
}

function requireApiKey(config) {
  const keyInfo = getApiKeyInfo(config);
  if (!keyInfo.value) {
    throw new Error(
      `Missing API key environment variable ${keyInfo.displayName} for ${config.provider}/${config.model}. ` +
        "Set it in your Codex environment or plugin MCP config before calling this tool."
    );
  }
  return keyInfo.value;
}

function streamingEnabled(options) {
  if (typeof options.stream === "boolean") {
    return options.stream;
  }
  return env("MMA_MODEL_STREAMING", "false").toLowerCase() === "true";
}

function processSseBuffer(buffer, onEvent) {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const events = normalized.split("\n\n");
  const remainder = events.pop() ?? "";
  for (const block of events) {
    const event = parseSseEvent(block);
    if (event) {
      onEvent(event);
    }
  }
  return remainder;
}

function parseSseEvent(block) {
  const data = [];
  const event = { event: "message", data: "" };
  for (const rawLine of String(block || "").split("\n")) {
    if (!rawLine || rawLine.startsWith(":")) {
      continue;
    }
    const separator = rawLine.indexOf(":");
    const field = separator >= 0 ? rawLine.slice(0, separator) : rawLine;
    let value = separator >= 0 ? rawLine.slice(separator + 1) : "";
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }
    if (field === "event") {
      event.event = value || "message";
    } else if (field === "data") {
      data.push(value);
    }
  }
  event.data = data.join("\n");
  return event.data || event.event !== "message" ? event : null;
}

function parseSseJson(data, label) {
  try {
    return JSON.parse(data);
  } catch {
    const error = new Error(`${label} returned malformed SSE JSON: ${truncate(data, 1000)}`);
    error.retryable = false;
    throw error;
  }
}

function providerStreamError(provider, payload) {
  const message =
    typeof payload?.message === "string"
      ? payload.message
      : typeof payload?.error?.message === "string"
        ? payload.error.message
        : JSON.stringify(payload);
  const error = new Error(`${provider} stream error: ${truncate(message, 1000)}`);
  error.retryable = false;
  return error;
}

function isRetryableStatus(statusCode) {
  return [408, 429, 500, 502, 503, 504].includes(Number(statusCode));
}

function isRetryableHttpError(error) {
  if (!error || looksLikeHtml(error.message || "")) {
    return false;
  }
  if (error.retryable === false) {
    return false;
  }
  if (error.retryable === true || isRetryableStatus(error.statusCode)) {
    return true;
  }
  return ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED"].includes(error.code);
}

function retryDelayMs(attempt, baseDelayMs) {
  if (baseDelayMs <= 0) {
    return 0;
  }
  const exponential = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.floor(Math.random() * Math.min(250, baseDelayMs));
  return Math.min(10000, exponential + jitter);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function openAIChatCompletionsUrl(baseUrl) {
  if (/\/v\d+(?:\/)?$/i.test(baseUrl)) {
    return `${baseUrl}/chat/completions`;
  }
  return `${baseUrl}/v1/chat/completions`;
}

function anthropicMessagesUrl(baseUrl) {
  if (/\/v\d+(?:\/)?$/i.test(baseUrl)) {
    return `${baseUrl}/messages`;
  }
  return `${baseUrl}/v1/messages`;
}

function looksLikeHtml(value) {
  return /^\s*<!doctype html/i.test(value) || /^\s*<html[\s>]/i.test(value);
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.isInteger(value) ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return Math.min(max, Math.max(min, fallback));
  }
  return Math.min(max, Math.max(min, parsed));
}

function truncate(value, maxLength) {
  const text = String(value || "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
}

function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}
