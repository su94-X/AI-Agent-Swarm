#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ragGet, ragIngest, ragNote, ragSearch, ragStatus } from "../lib/rag.mjs";
import {
  arraySchema,
  booleanSchema,
  createStdioMcpServer,
  enumSchema,
  integerSchema,
  loadDotEnv,
  numberSchema,
  objectSchema,
  stringSchema,
  textResult,
} from "../lib/mcp.mjs";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnv(resolve(pluginRoot, ".env"));
const pluginManifest = readPluginManifest();

const serverInfo = {
  name: pluginManifest.name || "multi-model-agents",
  version: pluginManifest.version,
};

const tools = [
  {
    name: "multi_model_config_status",
    description:
      "Show Codex-only plugin status, exposed local tools, and RAG write configuration. Does not inspect external model API keys.",
    inputSchema: objectSchema({}, []),
  },
  {
    name: "multi_model_rag_status",
    description: "Show local RAG knowledge base status. Does not return stored knowledge text.",
    inputSchema: objectSchema({}, []),
  },
  {
    name: "multi_model_rag_ingest",
    description: "Ingest Codex-authorized local workspace files into the local RAG knowledge base.",
    inputSchema: objectSchema(
      {
        workspace_root: stringSchema("Absolute workspace root. All allowed_read_paths resolve under this root."),
        allowed_read_paths: arraySchema(
          stringSchema("Relative file path Codex authorized for RAG ingestion."),
          "Relative files to ingest."
        ),
        collection: stringSchema("RAG collection name. Defaults to default."),
        tags: arraySchema(stringSchema("Tag."), "Tags to attach."),
        source_note: stringSchema("Short source note for provenance."),
        confidence: numberSchema("Knowledge confidence from 0 to 1.", 0, 1),
        verified_by: stringSchema("Verifier identity, defaults to codex."),
        expires_at: stringSchema("Optional ISO timestamp after which the knowledge is hidden by default."),
        scope: arraySchema(stringSchema("Applicability scope such as project, package, or feature."), "Applicability scope."),
        aliases: arraySchema(stringSchema("Search alias or synonym."), "Aliases that improve lexical recall."),
        status: enumSchema(["active", "superseded", "deprecated"]),
      },
      ["workspace_root", "allowed_read_paths"]
    ),
  },
  {
    name: "multi_model_rag_note",
    description: "Store a Codex-verified knowledge note in the local RAG knowledge base.",
    inputSchema: objectSchema(
      {
        title: stringSchema("Verified note title."),
        body: stringSchema("Verified note body."),
        collection: stringSchema("RAG collection name. Defaults from type."),
        type: enumSchema(["bug", "decision", "command", "convention", "risk", "test_result", "workflow", "note"]),
        tags: arraySchema(stringSchema("Tag."), "Tags to attach."),
        evidence: stringSchema("Evidence showing this note is verified."),
        related_files: arraySchema(stringSchema("Related relative file path."), "Related files."),
        confidence: numberSchema("Knowledge confidence from 0 to 1.", 0, 1),
        verified_by: stringSchema("Verifier identity, defaults to codex."),
        expires_at: stringSchema("Optional ISO timestamp after which the knowledge is hidden by default."),
        scope: arraySchema(stringSchema("Applicability scope such as project, package, or feature."), "Applicability scope."),
        aliases: arraySchema(stringSchema("Search alias or synonym."), "Aliases that improve lexical recall."),
        status: enumSchema(["active", "superseded", "deprecated"]),
      },
      ["title", "body", "evidence"]
    ),
  },
  {
    name: "multi_model_rag_search",
    description: "Search the local RAG knowledge base using local lexical scoring. Does not call external models.",
    inputSchema: objectSchema(
      {
        query: stringSchema("Search query."),
        collection: stringSchema("Optional collection name."),
        tags: arraySchema(stringSchema("Required tag."), "Tags to filter by."),
        trusted_only: booleanSchema("When true, only trusted entries are returned. Defaults to true."),
        include_expired: booleanSchema("When true, include entries past expires_at. Defaults to false."),
        min_confidence: numberSchema("Minimum confidence from 0 to 1.", 0, 1),
        type: enumSchema(["file", "bug", "decision", "command", "convention", "risk", "test_result", "workflow", "note"]),
        status: enumSchema(["active", "superseded", "deprecated"]),
        scope: arraySchema(stringSchema("Required applicability scope."), "Required applicability scope values."),
        verified_by: stringSchema("Only return entries verified by this identity."),
        limit: integerSchema("Maximum number of results. Default 5, max 20."),
        max_chars: integerSchema("Maximum total returned text characters. Default 4000, max 12000."),
      },
      ["query"]
    ),
  },
  {
    name: "multi_model_rag_get",
    description: "Get a RAG chunk or document by id with bounded context.",
    inputSchema: objectSchema(
      {
        chunk_id: stringSchema("Chunk id to retrieve."),
        document_id: stringSchema("Document id to retrieve."),
        collection: stringSchema("Optional collection name."),
        max_chars: integerSchema("Maximum returned text characters. Default 4000, max 12000."),
        include_neighbors: booleanSchema("Include neighboring chunks when retrieving by chunk_id."),
        include_expired: booleanSchema("When true, include entries past expires_at. Defaults to false."),
        trusted_only: booleanSchema("When true, only trusted entries are returned. Defaults to true."),
        min_confidence: numberSchema("Minimum confidence from 0 to 1.", 0, 1),
        status: enumSchema(["active", "superseded", "deprecated"]),
      },
      []
    ),
  },
];

createStdioMcpServer({ serverInfo, tools, callTool });

async function callTool(params, mcpContext = {}) {
  const name = params.name;
  const args = params.arguments ?? {};
  const progress = createProgressReporter(mcpContext, name);
  progress("started");

  try {
    let result;
    switch (name) {
      case "multi_model_config_status":
        result = textResult(JSON.stringify(configStatus(), null, 2));
        break;
      case "multi_model_rag_status":
        result = textResult(JSON.stringify(ragStatus(), null, 2));
        break;
      case "multi_model_rag_ingest":
        result = textResult(JSON.stringify(ragIngest(args, { pluginVersion: serverInfo.version }), null, 2));
        break;
      case "multi_model_rag_note":
        result = textResult(JSON.stringify(ragNote(args, { pluginVersion: serverInfo.version }), null, 2));
        break;
      case "multi_model_rag_search":
        result = textResult(JSON.stringify(ragSearch(args), null, 2));
        break;
      case "multi_model_rag_get":
        result = textResult(JSON.stringify(ragGet(args), null, 2));
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    progress("completed");
    return result;
  } catch (error) {
    progress(`failed: ${error.message || error}`);
    throw error;
  }
}

function configStatus() {
  const rag = ragStatus();
  return {
    server: serverInfo,
    mode: "codex-only",
    externalModelToolsEnabled: false,
    exposedTools: tools.map((tool) => tool.name),
    rag: {
      ragRoot: rag.ragRoot,
      exists: rag.exists,
      writeEnabled: rag.writeEnabled,
      documentCount: rag.documentCount,
      chunkCount: rag.chunkCount,
      updatedAt: rag.updatedAt,
    },
    notes: [
      "Codex-only mode exposes local status and RAG tools only.",
      "Planning, implementation, review, test strategy, command execution, memory curation, and final decisions are handled by Codex or Codex Custom Agents.",
      "No external model tools are exposed by this MCP server, and no provider API key checks are performed.",
      "RAG is a local project memory layer controlled by Codex. Writes still use path boundaries and secret scanning.",
    ],
  };
}

function createProgressReporter(mcpContext, toolName) {
  return (message) => {
    if (localEnv("MMA_MCP_PROGRESS_NOTIFICATIONS", "true").toLowerCase() === "false") {
      return;
    }
    if (typeof mcpContext.notifyProgress === "function") {
      mcpContext.notifyProgress(`${toolName}: ${message}`);
    }
  };
}

function readPluginManifest() {
  const manifestPath = resolve(pluginRoot, ".codex-plugin", "plugin.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!manifest.version) {
    throw new Error("Plugin manifest must include a version.");
  }
  return manifest;
}

function localEnv(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}
