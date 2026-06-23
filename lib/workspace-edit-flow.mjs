import { callModel } from "./model.mjs";
import {
  applyWorkspaceEditPlan,
  parseWorkspaceEditResponse,
  workspaceContext,
  workspaceEditJsonSchemaText,
  workspaceFilesBlock,
} from "./workspace.mjs";
import { requiredString, textResult, truncate } from "./mcp.mjs";

export async function coderWorkspaceEdit(args, options = {}) {
  const {
    resolveRoleConfig,
    createTokenProgressReporter = () => undefined,
    progress = () => {},
  } = options;
  if (typeof resolveRoleConfig !== "function") {
    throw new Error("coderWorkspaceEdit requires resolveRoleConfig.");
  }

  const context = workspaceContext(args);
  const prompt = buildWorkspaceEditPrompt(args, context);
  const config = resolveRoleConfig("coder", args);
  progress(`calling coder/${config.model} for workspace edit`);
  const rawText = await callModel(config, prompt, {
    maxOutputTokens: args.max_output_tokens,
    onProgress: createTokenProgressReporter(progress),
  });
  progress("validating workspace edit JSON");
  const editPlan = await parseOrRepairWorkspaceEditResponse({
    config,
    originalPrompt: prompt,
    rawText,
    args,
    progress,
    createTokenProgressReporter,
  });
  progress(args.dry_run ? "building dry-run diff" : "applying authorized workspace edit");
  const result = await applyOrRepairWorkspaceEditPlan({
    config,
    originalPrompt: prompt,
    rawText,
    args,
    context,
    editPlan,
    progress,
    createTokenProgressReporter,
  });
  return textResult(JSON.stringify({
    ...result,
    raw_model_output: result.ok ? undefined : rawText,
  }, null, 2));
}

export function buildWorkspaceEditPrompt(args, context) {
  const systemPrompt = [
    "You are the primary coder role in a Codex-orchestrated workflow.",
    "Codex has granted you scoped read/write authority for this task.",
    "You must return a single valid JSON object and no prose outside JSON.",
    "Only write files listed in allowed_write_paths or under allowed write directories.",
    "Do not request, expose, or infer secrets. Do not touch forbidden paths.",
    "Do not return markdown, comments, explanations, unified diffs, or trailing commas.",
  ].join(" ");

  const userPrompt = [
    `Task:\n${requiredString(args.task, "task")}`,
    args.plan ? `Plan from Codex orchestrator:\n${args.plan}` : "",
    `Workspace root:\n${context.workspaceRoot}`,
    context.allowedReadPaths.length
      ? `Allowed read paths:\n${context.allowedReadPaths.map((path) => `- ${path}`).join("\n")}`
      : "Allowed read paths: none supplied. Use the task, plan, and constraints only.",
    `Allowed write paths:\n${context.allowedWritePaths.map((path) => `- ${path}`).join("\n")}`,
    `Forbidden paths:\n${context.forbiddenPatterns.map((path) => `- ${path}`).join("\n")}`,
    args.constraints?.length ? `Constraints:\n${args.constraints.map((item) => `- ${item}`).join("\n")}` : "",
    workspaceFilesBlock(context.files),
    [
      "Return exactly this JSON shape:",
      "{",
      '  "summary": "brief implementation summary",',
      '  "files": [',
      '    { "path": "relative/path/from/workspace_root", "expected_sha256": "sha256 from the provided workspace file, or empty string for a new file", "content": "complete new file content" }',
      "  ],",
      '  "edits": [',
      '    { "path": "relative/path/from/workspace_root", "expected_sha256": "sha256 from the provided workspace file", "operation": "replace", "find": "exact existing text", "replace": "new text" },',
      '    { "path": "relative/path/from/workspace_root", "expected_sha256": "sha256 from the provided workspace file", "operation": "insert_after", "anchor": "exact existing text", "insert": "text to insert" },',
      '    { "path": "relative/path/from/workspace_root", "expected_sha256": "sha256 from the provided workspace file", "operation": "insert_before", "anchor": "exact existing text", "insert": "text to insert" }',
      "  ],",
      '  "tests": ["command to run"],',
      '  "risks": ["risk or assumption"]',
      "}",
      "Rules:",
      "- Return raw JSON only. Do not wrap it in markdown fences.",
      "- Prefer edits for small changes to existing files. Use files for new files or large rewrites.",
      "- For files entries, content must be the complete final file content.",
      "- For edits entries, find/anchor must match exactly once in the current file.",
      "- For any existing file shown in Workspace files, include expected_sha256 exactly as shown before the content.",
      "- For a new file that was not shown in Workspace files, use expected_sha256 as an empty string.",
      "- Escape newlines, quotes, and backslashes inside JSON strings correctly.",
      "- files and edits are optional arrays, but at least one should contain the proposed changes.",
      "- Do not touch the same path in both files and edits.",
      "- tests and risks must be arrays of strings.",
      "- If no safe edit is possible, return empty files/edits arrays and explain in risks.",
      "- Do not include markdown fences.",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}

async function parseOrRepairWorkspaceEditResponse({
  config,
  originalPrompt,
  rawText,
  args,
  progress = () => {},
  createTokenProgressReporter = () => undefined,
}) {
  try {
    return parseWorkspaceEditResponse(rawText);
  } catch (firstError) {
    progress(`repairing workspace edit JSON after parse error: ${firstError.message}`);
    const repairPrompt = buildWorkspaceEditRepairPrompt(originalPrompt, rawText, firstError);
    const repairedText = await callModel(config, repairPrompt, {
      maxOutputTokens: args.max_output_tokens,
      onProgress: createTokenProgressReporter(progress),
    });
    try {
      return parseWorkspaceEditResponse(repairedText);
    } catch (secondError) {
      throw new Error(
        [
          `Coder workspace edit returned invalid JSON and repair failed: ${secondError.message}`,
          `Initial parse error: ${firstError.message}`,
          `Initial model output: ${truncate(String(rawText || ""), 1200)}`,
          `Repair model output: ${truncate(String(repairedText || ""), 1200)}`,
        ].join("\n")
      );
    }
  }
}

async function applyOrRepairWorkspaceEditPlan({
  config,
  originalPrompt,
  rawText,
  args,
  context,
  editPlan,
  progress = () => {},
  createTokenProgressReporter = () => undefined,
}) {
  try {
    return applyWorkspaceEditPlan(args, context, editPlan);
  } catch (firstError) {
    if (!isRepairableWorkspaceApplyError(firstError)) {
      throw firstError;
    }
    progress(`repairing workspace edit after apply error: ${firstError.message}`);
    const repairPrompt = buildWorkspaceEditRepairPrompt(originalPrompt, rawText, firstError);
    const repairedText = await callModel(config, repairPrompt, {
      maxOutputTokens: args.max_output_tokens,
      onProgress: createTokenProgressReporter(progress),
    });
    let repairedPlan;
    try {
      repairedPlan = parseWorkspaceEditResponse(repairedText);
    } catch (parseError) {
      throw new Error(
        [
          `Coder workspace edit apply failed and repair returned invalid JSON: ${parseError.message}`,
          `Initial apply error: ${firstError.message}`,
          `Initial model output: ${truncate(String(rawText || ""), 1200)}`,
          `Repair model output: ${truncate(String(repairedText || ""), 1200)}`,
        ].join("\n")
      );
    }
    try {
      return applyWorkspaceEditPlan(args, context, repairedPlan);
    } catch (secondError) {
      throw new Error(
        [
          `Coder workspace edit apply failed and repair did not produce an applicable edit: ${secondError.message}`,
          `Initial apply error: ${firstError.message}`,
          `Initial model output: ${truncate(String(rawText || ""), 1200)}`,
          `Repair model output: ${truncate(String(repairedText || ""), 1200)}`,
        ].join("\n")
      );
    }
  }
}

function isRepairableWorkspaceApplyError(error) {
  const message = String(error?.message || error || "");
  return /requires exactly one (anchor )?match|requires exactly one match|found \d+|requires the file in allowed_read_paths|same file more than once|must include expected_sha256|must use an empty expected_sha256/i.test(message);
}

export function buildWorkspaceEditRepairPrompt(originalPrompt, rawText, error) {
  const systemPrompt = [
    "You repair malformed workspace edit output.",
    "Return one valid JSON object only.",
    "Do not include markdown fences, explanations, comments, unified diffs, or trailing commas.",
    "Preserve intended file paths, complete file contents, tests, risks, and summary from the malformed output.",
  ].join(" ");

  const userPrompt = [
    "The previous coder response could not be used as the required workspace edit JSON.",
    `Error:\n${error.message}`,
    "Required JSON schema:",
    workspaceEditJsonSchemaText(),
    "malformed-output conversion rules:",
    "If the malformed output is a unified diff, markdown, prose explanation, partial JSON, or a JSON-like object with the wrong top-level fields, convert the intended change into the required JSON object.",
    "Do not preserve markdown fences, prose labels, comments, diff headers, or unsupported fields.",
    "expected_sha256 rules:",
    "Copy expected_sha256 only from the sha256 line for that exact file in the original task prompt.",
    "Use an empty expected_sha256 only for a new file that was not present in Workspace files.",
    "Do not invent, guess, shorten, or recalculate hashes during repair.",
    "patch/edit rules:",
    "For replace edits, find must be an exact existing substring that appears exactly once in the current file.",
    "For insert_after and insert_before edits, anchor must be an exact existing substring that appears exactly once in the current file.",
    "If the parse error says found 0 or found more than 1 match, widen find/anchor with enough surrounding stable context from the original task prompt until it is unique.",
    "A one-line find/anchor such as return null;, }, or a common import is usually too ambiguous; include nearby function, class, or block context.",
    "Do not use regex, ellipses, fuzzy matching, line numbers, or placeholders in find/anchor.",
    "If you cannot make a patch edit uniquely match, switch that path to a files entry with complete final file content, or return empty files/edits with a risk explaining why repair is unsafe.",
    "Original task prompt:",
    originalPrompt.userPrompt,
    "Malformed model output to repair:",
    String(rawText || ""),
    "Return only corrected JSON. No prose.",
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}

export function __testBuildWorkspaceEditRepairPrompt(originalPrompt, rawText, error) {
  return buildWorkspaceEditRepairPrompt(originalPrompt, rawText, error);
}
