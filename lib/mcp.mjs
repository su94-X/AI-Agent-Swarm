import { existsSync, readFileSync } from "node:fs";

export function createStdioMcpServer({ serverInfo, tools, callTool }) {
  let inputBuffer = "";
  const context = {
    notifyProgress(message) {
      sendNotification("notifications/message", {
        level: "info",
        logger: serverInfo.name || "multi-model-agents",
        data: String(message || ""),
      });
    },
  };

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    inputBuffer += chunk;
    drainInput();
  });

  process.stdin.on("end", () => {
    process.exit(0);
  });

  function drainInput() {
    while (true) {
      const separatorIndex = inputBuffer.indexOf("\n");
      if (separatorIndex === -1) {
        return;
      }
      const raw = inputBuffer.slice(0, separatorIndex).trim();
      inputBuffer = inputBuffer.slice(separatorIndex + 1);
      if (!raw) {
        continue;
      }
      let message;
      try {
        message = JSON.parse(raw);
      } catch (error) {
        sendError(null, -32700, `Parse error: ${error.message}`);
        continue;
      }
      handleMessage(message).catch((error) => {
        sendError(message.id ?? null, -32603, error.message || String(error));
      });
    }
  }

  async function handleMessage(message) {
    if (!message || typeof message !== "object") {
      sendError(null, -32600, "Invalid request.");
      return;
    }

    const { id, method, params } = message;
    if (!method) {
      sendError(id ?? null, -32600, "Missing method.");
      return;
    }

    switch (method) {
      case "initialize":
        sendResult(id, {
          protocolVersion: params?.protocolVersion ?? "2025-03-26",
          capabilities: {
            tools: {},
            logging: {},
          },
          serverInfo,
        });
        return;

      case "notifications/initialized":
        return;

      case "ping":
        sendResult(id, {});
        return;

      case "tools/list":
        sendResult(id, { tools });
        return;

      case "tools/call": {
        const result = await callTool(params ?? {}, context);
        sendResult(id, result);
        return;
      }

      default:
        sendError(id ?? null, -32601, `Method not found: ${method}`);
    }
  }

  return context;
}

export function textResult(text) {
  return {
    content: [
      {
        type: "text",
        text: String(text),
      },
    ],
  };
}

export function objectSchema(properties, required) {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

export function stringSchema(description) {
  return {
    type: "string",
    description,
  };
}

export function integerSchema(description) {
  return {
    type: "integer",
    description,
    minimum: 1,
  };
}

export function numberSchema(description, minimum, maximum) {
  return {
    type: "number",
    description,
    ...(minimum === undefined ? {} : { minimum }),
    ...(maximum === undefined ? {} : { maximum }),
  };
}

export function booleanSchema(description) {
  return {
    type: "boolean",
    description,
  };
}

export function arraySchema(items, description) {
  return {
    type: "array",
    description,
    items,
  };
}

export function enumSchema(values) {
  return {
    type: "string",
    enum: values,
  };
}

export function filesSchema() {
  return arraySchema(
    objectSchema(
      {
        path: stringSchema("File path."),
        content: stringSchema("File content."),
      },
      ["path", "content"]
    ),
    "Relevant file contents supplied by Codex."
  );
}

export function loadDotEnv(path) {
  if (!existsSync(path)) {
    return;
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseDotEnvLine(line);
    if (!parsed) {
      continue;
    }
    const [key, value] = parsed;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required string argument: ${name}`);
  }
  return value;
}

export function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}

function sendResult(id, result) {
  if (id === undefined || id === null) {
    return;
  }
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  });
}

function sendNotification(method, params) {
  send({
    jsonrpc: "2.0",
    method,
    params,
  });
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function parseDotEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  const index = trimmed.indexOf("=");
  if (index <= 0) {
    return null;
  }
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [key, value];
}
