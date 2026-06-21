#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  callModel,
  defaultApiKeyEnvForProvider,
  defaultBaseUrlForProvider,
  defaultModelForProvider,
  getApiKeyInfo,
  normalizeProvider,
} from "../lib/model.mjs";
import { ragGet, ragIngest, ragNote, ragSearch, ragStatus } from "../lib/rag.mjs";
import { coderWorkspaceEdit } from "../lib/workspace-edit-flow.mjs";
import {
  arraySchema,
  booleanSchema,
  createStdioMcpServer,
  enumSchema,
  env,
  filesSchema,
  integerSchema,
  loadDotEnv,
  numberSchema,
  objectSchema,
  requiredString,
  stringSchema,
  textResult,
  truncate,
} from "../lib/mcp.mjs";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnv(resolve(pluginRoot, ".env"));
const pluginManifest = readPluginManifest();

const serverInfo = {
  name: pluginManifest.name || "multi-model-agents",
  version: pluginManifest.version,
};

const defaultConfig = {
  coder: {
    provider: env("MMA_CODER_PROVIDER", "anthropic"),
    model: env("MMA_CODER_MODEL", "claude-opus-4-8"),
    apiKeyEnv: env("MMA_CODER_API_KEY_ENV", "ANTHROPIC_API_KEY"),
    baseUrl: env("MMA_CODER_BASE_URL", "https://api.anthropic.com"),
  },
  reviewer: {
    provider: env("MMA_REVIEWER_PROVIDER", "anthropic"),
    model: env("MMA_REVIEWER_MODEL", "claude-opus-4-8"),
    apiKeyEnv: env("MMA_REVIEWER_API_KEY_ENV", "ANTHROPIC_API_KEY"),
    baseUrl: env("MMA_REVIEWER_BASE_URL", "https://api.anthropic.com"),
  },
  custom: {
    provider: env("MMA_CUSTOM_PROVIDER", "openai-compatible"),
    model: env("MMA_CUSTOM_MODEL", "gpt-5.5"),
    apiKeyEnv: env("MMA_CUSTOM_API_KEY_ENV", "EXTERNAL_MODEL_API_KEY"),
    baseUrl: env("MMA_CUSTOM_BASE_URL", "https://api.openai.com/v1"),
  },
};

const tools = [
  {
    name: "multi_model_coder_patch",
    description:
      "Ask the configured coder model to propose a unified diff for a bounded coding task. The tool never edits files.",
    inputSchema: objectSchema(
      {
        task: stringSchema("Implementation task."),
        plan: stringSchema("Plan or constraints from the orchestrating Codex agent."),
        files: filesSchema(),
        allowed_write_paths: arraySchema(
          stringSchema("Path the coder may modify in the proposed patch."),
          "Files or directories the coder may touch."
        ),
        constraints: arraySchema(stringSchema("Implementation constraint."), "Additional constraints."),
        max_output_tokens: integerSchema("Maximum model output tokens."),
      },
      ["task", "files"]
    ),
  },
  {
    name: "multi_model_coder_workspace_edit",
    description:
      "Let the configured coder model perform scoped workspace edits. Codex must provide workspace_root and allowed paths; this tool validates boundaries, writes only allowed text files, and returns a diff.",
    inputSchema: objectSchema(
      {
        task: stringSchema("Implementation task."),
        workspace_root: stringSchema("Absolute workspace root. All read/write paths are resolved under this root."),
        plan: stringSchema("Plan or constraints from the orchestrating Codex agent."),
        allowed_read_paths: arraySchema(
          stringSchema("Relative file path the coder may read."),
          "Relative files the coder may read."
        ),
        allowed_write_paths: arraySchema(
          stringSchema("Relative file or directory path the coder may write."),
          "Relative files or directories the coder may write."
        ),
        forbidden_paths: arraySchema(
          stringSchema("Relative path or simple glob pattern the coder must not read or write."),
          "Additional forbidden paths. Defaults always apply."
        ),
        constraints: arraySchema(stringSchema("Implementation constraint."), "Additional constraints."),
        dry_run: booleanSchema("When true, return the proposed diff without writing files."),
        max_output_tokens: integerSchema("Maximum model output tokens."),
      },
      ["task", "workspace_root", "allowed_write_paths"]
    ),
  },
  {
    name: "multi_model_reviewer_findings",
    description:
      "Ask the configured reviewer model, usually Opus/Claude in Lite mode, to review a plan and diff. The tool returns findings only and never edits files.",
    inputSchema: objectSchema(
      {
        task: stringSchema("Original task."),
        plan: stringSchema("Implementation plan or context."),
        diff: stringSchema("Unified diff to review."),
        files: filesSchema(),
        focus: arraySchema(
          enumSchema(["correctness", "security", "regression", "performance", "tests", "maintainability"]),
          "Review focus areas."
        ),
        severity_threshold: enumSchema(["low", "medium", "high"]),
        max_output_tokens: integerSchema("Maximum model output tokens."),
      },
      ["task", "diff"]
    ),
  },
  {
    name: "multi_model_reviewer_score",
    description:
      "Ask the configured reviewer model, usually Opus/Claude in Lite mode, to score a plan, diff, test evidence, or final decision gate.",
    inputSchema: objectSchema(
      {
        review_stage: enumSchema(["plan", "diff", "test", "final"]),
        task: stringSchema("Original task."),
        plan: stringSchema("Implementation plan or context."),
        diff: stringSchema("Unified diff or patch summary."),
        changed_files: arraySchema(stringSchema("Changed file path."), "Changed files."),
        test_evidence: objectSchema(
          {
            command: stringSchema("Command that Codex actually ran."),
            exit_code: nonNegativeIntegerSchema("Process exit code reported by Codex. Zero means success."),
            stdout: stringSchema("Captured stdout."),
            stderr: stringSchema("Captured stderr."),
            summary: stringSchema("Codex summary of what changed and what the command proves."),
          },
          []
        ),
        rubric: arraySchema(
          enumSchema(["correctness", "security", "regression", "maintainability", "scope_control", "tests"]),
          "Scoring rubric dimensions."
        ),
        max_output_tokens: integerSchema("Maximum model output tokens."),
      },
      ["task"]
    ),
  },
  {
    name: "multi_model_role_call",
    description:
      "Call a configured or explicit external model role with a structured prompt. Use this for nonstandard roles or troubleshooting.",
    inputSchema: objectSchema(
      {
        role: enumSchema(["coder", "reviewer", "custom"]),
        task: stringSchema("Task for the external model role."),
        context: stringSchema("Relevant context to provide to the role."),
        provider: enumSchema(["openai", "anthropic", "gemini", "openai-compatible"]),
        model: stringSchema("Provider model name."),
        api_key_env: stringSchema("Environment variable that contains the API key."),
        base_url: stringSchema("Provider base URL."),
        system_prompt: stringSchema("Override system prompt."),
        max_output_tokens: integerSchema("Maximum model output tokens."),
      },
      ["role", "task"]
    ),
  },
  {
    name: "multi_model_config_status",
    description:
      "Show configured providers, model names, endpoint URLs, and whether required API key environment variables are present.",
    inputSchema: objectSchema({}, []),
  },
  {
    name: "multi_model_rag_status",
    description:
      "Show local RAG knowledge base status. Does not return stored knowledge text.",
    inputSchema: objectSchema({}, []),
  },
  {
    name: "multi_model_rag_ingest",
    description:
      "Ingest Codex-authorized local workspace files into the local RAG knowledge base.",
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
    description:
      "Store a Codex-verified knowledge note in the local RAG knowledge base.",
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
    description:
      "Search the local RAG knowledge base using local lexical scoring. Does not call external models.",
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
    description:
      "Get a RAG chunk or document by id with bounded context.",
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

      case "multi_model_coder_patch":
        result = await modelTextResult("coder", buildCoderPrompt(args), args, progress);
        break;

      case "multi_model_coder_workspace_edit":
        result = await coderWorkspaceEdit(args, { resolveRoleConfig, createTokenProgressReporter, progress });
        break;

      case "multi_model_reviewer_findings":
        result = await modelTextResult("reviewer", buildReviewerPrompt(args), args, progress);
        break;

      case "multi_model_reviewer_score":
        result = await modelTextResult("reviewer", buildReviewerScorePrompt(args), args, progress);
        break;

      case "multi_model_role_call": {
        const role = args.role ?? "custom";
        const systemPrompt = args.system_prompt || defaultSystemPrompt(role);
        const userPrompt = [
          `Task:\n${args.task}`,
          args.context ? `Context:\n${args.context}` : "",
          "Return concise, structured output. Include assumptions, evidence, risks, and next actions where relevant.",
        ]
          .filter(Boolean)
          .join("\n\n");
        result = await modelTextResult(role, { systemPrompt, userPrompt }, args, progress);
        break;
      }

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

async function modelTextResult(role, prompt, args, progress = () => {}) {
  const config = resolveRoleConfig(role, args);
  progress(`calling ${role}/${config.model}`);
  const text = await callModel(config, prompt, {
    maxOutputTokens: args.max_output_tokens,
    onProgress: createTokenProgressReporter(progress),
  });
  return textResult(text);
}

function createProgressReporter(mcpContext, toolName) {
  return (message) => {
    if (env("MMA_MCP_PROGRESS_NOTIFICATIONS", "true").toLowerCase() === "false") {
      return;
    }
    if (typeof mcpContext.notifyProgress === "function") {
      mcpContext.notifyProgress(`${toolName}: ${message}`);
    }
  };
}

function createTokenProgressReporter(progress) {
  let buffered = "";
  let lastEmit = 0;
  return (text) => {
    buffered += text;
    const now = Date.now();
    if (buffered.length < 160 && now - lastEmit < 750) {
      return;
    }
    const snippet = buffered.replace(/\s+/g, " ").trim();
    buffered = "";
    lastEmit = now;
    if (snippet) {
      progress(`stream: ${truncate(snippet, 240)}`);
    }
  };
}

function buildCoderPrompt(args) {
  const systemPrompt = [
    "You are the coder role in a Codex-orchestrated multi-model workflow.",
    "Return a unified diff only when enough context is provided to make a concrete patch.",
    "Do not claim that you edited files, ran tests, or inspected paths that were not provided.",
    "Stay within allowed_write_paths. If the task is underspecified, return questions or a patch plan instead of inventing files.",
  ].join(" ");

  const userPrompt = [
    `Task:\n${requiredString(args.task, "task")}`,
    args.plan ? `Plan from orchestrator:\n${args.plan}` : "",
    args.allowed_write_paths?.length
      ? `Allowed write paths:\n${args.allowed_write_paths.map((path) => `- ${path}`).join("\n")}`
      : "",
    args.constraints?.length ? `Constraints:\n${args.constraints.map((item) => `- ${item}`).join("\n")}` : "",
    filesBlock(args.files),
    [
      "Output format:",
      "1. Summary",
      "2. Unified diff in a fenced diff block, or explain why a diff is not safe",
      "3. Tests to run",
      "4. Risks and assumptions",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}

function buildReviewerPrompt(args) {
  const systemPrompt = [
    "You are the reviewer role in a Codex-orchestrated multi-model workflow.",
    "Review for concrete bugs, regressions, security issues, missing tests, and maintainability risks.",
    "Do not rewrite the patch. Do not list generic advice. Only report actionable findings grounded in provided evidence.",
  ].join(" ");

  const userPrompt = [
    `Task:\n${requiredString(args.task, "task")}`,
    args.plan ? `Plan:\n${args.plan}` : "",
    args.focus?.length ? `Focus:\n${args.focus.join(", ")}` : "",
    args.severity_threshold ? `Minimum severity:\n${args.severity_threshold}` : "",
    args.diff ? `Diff:\n${args.diff}` : "",
    filesBlock(args.files),
    [
      "Output findings in this structure:",
      "- severity: low | medium | high",
      "- file/line or diff hunk",
      "- issue",
      "- why it matters",
      "- suggested fix",
      "If there are no actionable findings, say so and list residual risks.",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}

function buildReviewerScorePrompt(args) {
  const reviewStage = args.review_stage || "final";
  if (reviewStage === "test" && !hasTestEvidence(args.test_evidence)) {
    throw new Error("test-review requires test_evidence with command, exit_code, stdout/stderr, or summary.");
  }
  const systemPrompt = [
    "You are the external Opus/Claude review-and-scoring role in a Codex-orchestrated Lite workflow.",
    "Codex remains the orchestrator and final decision maker.",
    "Score the provided plan, diff, test evidence, or final decision gate using only the supplied evidence.",
    "Valid review_stage values are plan, diff, test, and final. They correspond to plan-review, diff-review, test-review, and final-review.",
    "Do not claim that you edited files or ran tests.",
    "Avoid generic advice that is not tied to the current task, plan, diff, or changed files.",
  ].join(" ");

  const userPrompt = [
    `Review stage:\n${reviewStage}`,
    `Task:\n${requiredString(args.task, "task")}`,
    args.plan ? `Plan:\n${args.plan}` : "",
    args.diff ? `Diff:\n${args.diff}` : "",
    args.changed_files?.length ? `Changed files:\n${args.changed_files.map((path) => `- ${path}`).join("\n")}` : "",
    testEvidenceBlock(args.test_evidence),
    args.rubric?.length ? `Rubric:\n${args.rubric.map((item) => `- ${item}`).join("\n")}` : "",
    [
      "Output:",
      "1. overall_score: integer 0-100.",
      "2. dimension_scores: correctness, security, regression, maintainability, scope_control, tests; use null when evidence is missing.",
      "3. blocking_findings: only concrete issues that should block acceptance.",
      "4. non_blocking_findings: useful issues that do not block acceptance.",
      "5. must_fix_items: required changes before Codex may continue; empty array when none.",
      "6. approved_to_continue: boolean. Use false for blocking findings, must-fix items, missing critical evidence, or unsafe scope.",
      "7. evidence: cite the exact supplied evidence behind each score or finding.",
      "8. recommended_codex_actions: what Codex should inspect, test, or decide next.",
      "9. stage_specific_review:",
      "   - plan-review: confirm design completeness, step size, scope boundaries, fallback behavior, and validation path.",
      "   - diff-review: confirm diff matches approved plan, no unrelated changes, no boundary expansion, and tests are adequate.",
      "   - test-review: review command, exit code, stdout, stderr, and change summary; do not claim you ran tests.",
      "   - final-review: confirm unresolved risk and whether Codex has enough evidence to accept.",
      "10. not_claimed: explicitly state that Opus/Claude did not run tests and did not edit files.",
      "If overall_score is below 80, default approved_to_continue to false unless you clearly explain why no blocking or must-fix issue exists.",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}

function nonNegativeIntegerSchema(description) {
  return {
    type: "integer",
    description,
    minimum: 0,
  };
}

function testEvidenceBlock(testEvidence) {
  if (!testEvidence || typeof testEvidence !== "object") {
    return "";
  }
  return [
    "Test evidence from Codex:",
    testEvidence.command ? `Command: ${testEvidence.command}` : "",
    testEvidence.exit_code !== undefined ? `Exit code: ${testEvidence.exit_code}` : "",
    testEvidence.stdout ? `Stdout:\n${testEvidence.stdout}` : "",
    testEvidence.stderr ? `Stderr:\n${testEvidence.stderr}` : "",
    testEvidence.summary ? `Change/test summary:\n${testEvidence.summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function hasTestEvidence(testEvidence) {
  if (!testEvidence || typeof testEvidence !== "object") {
    return false;
  }
  return ["command", "exit_code", "stdout", "stderr", "summary"].some((key) => testEvidence[key] !== undefined && testEvidence[key] !== "");
}

function resolveRoleConfig(role, args) {
  const base = defaultConfig[role] ?? {};
  const provider = args.provider || base.provider;
  if (role === "reviewer" && normalizeProvider(provider) === "codex-internal") {
    throw new Error(
      "AI Agent Swarm Lite requires an external reviewer/scorer. Set MMA_REVIEWER_PROVIDER=anthropic, MMA_REVIEWER_MODEL=claude-opus-4-8, and MMA_REVIEWER_API_KEY_ENV=ANTHROPIC_API_KEY."
    );
  }
  return {
    provider,
    model: args.model || base.model || defaultModelForProvider(provider),
    apiKeyEnv: args.api_key_env || base.apiKeyEnv || defaultApiKeyEnvForProvider(provider),
    baseUrl: args.base_url || base.baseUrl || defaultBaseUrlForProvider(provider),
  };
}

function configStatus() {
  const roles = {};
  for (const [role, config] of Object.entries(defaultConfig)) {
    const keyInfo = getApiKeyInfo(config);
    roles[role] = {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      apiKeyEnv: keyInfo.displayName,
      apiKeySource: keyInfo.source,
      hasApiKey: keyInfo.hasApiKey,
    };
  }
  return {
    server: serverInfo,
    roles,
    notes: [
      "模型角色通过 MMA_* 环境变量配置，也可以由插件根目录 .env 自动加载。",
      "Lite 默认使用外部 Opus/Claude reviewer/scorer；如果沿用完整版 .env，请确认 MMA_REVIEWER_PROVIDER 不是 codex-internal。",
      "multi_model_coder_workspace_edit 只是显式授权的兼容能力，只能读取和写入 Codex 当前任务授权的 workspace 路径。",
      "外部模型输出、评分和 workspace 写入结果必须经过 Codex 审查和真实本地测试后才能接受。",
    ],
  };
}

function defaultSystemPrompt(role) {
  if (role === "coder") {
    return "You are a bounded coding assistant. Return concrete patches or implementation guidance, and never claim to have edited files.";
  }
  if (role === "reviewer") {
    return "You are an external Opus/Claude review-and-scoring assistant. Return evidence-bound findings and a 0-100 score; do not edit files or claim tests ran.";
  }
  return "You are an external model role in a Codex-orchestrated workflow. Be concise, structured, and evidence-driven.";
}

function filesBlock(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return "";
  }
  return [
    "Provided files:",
    ...files.map((file) => {
      const path = file?.path || "(unknown path)";
      const content = typeof file?.content === "string" ? file.content : "";
      return `--- ${path} ---\n${content}\n--- end ${path} ---`;
    }),
  ].join("\n\n");
}

function readPluginManifest() {
  const manifestPath = resolve(pluginRoot, ".codex-plugin", "plugin.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!manifest.version) {
    throw new Error("Plugin manifest must include a version.");
  }
  return manifest;
}
