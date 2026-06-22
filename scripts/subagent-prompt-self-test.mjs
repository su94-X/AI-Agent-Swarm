#!/usr/bin/env node

import { readFileSync } from "node:fs";

const files = {
  start: readText("docs/START_PROMPT.md"),
  skill: readText("skills/multi-model-agents/SKILL.md"),
  workflow: readText("docs/SUBAGENT_WORKFLOW.md"),
  install: readText("docs/INSTALL_PROMPT.md"),
  release: readText("docs/RELEASE_PROMPT.md"),
};

mustInclude(files.start, [
  "可见子智能体强制规则",
  "multi_agent_v1.spawn_agent",
  "必须先创建",
  "不得仅在 Main Orchestrator 主线程中直接调用 multi_model_coder_workspace_edit",
  "当前线程没有可见子智能体工具，降级为 Main Orchestrator 直接调用 MCP 工具",
]);

mustInclude(files.skill, [
  "V1.4.8",
  "默认强制使用可见角色子智能体工作流",
  "Main Orchestrator 不得用主线程直接调用 MCP 工具来替代应出现的",
  "降级时必须明确说明原因",
]);

mustInclude(files.workflow, [
  "非简单任务必须创建可见 Codex 子智能体活动记录",
  "强制创建规则",
  "Main Orchestrator 不得仅在主线程中直接调用",
  "非简单实现任务必须创建 Coder Subagent",
  "不得静默降级",
  "不得由 Main Orchestrator 静默独自完成非简单任务",
]);

mustInclude(files.install, [
  "检查当前线程是否暴露可见子智能体工具",
  "可见子智能体能力可用",
]);

mustInclude(files.release, [
  "发送 docs/START_PROMPT.md 做一次启动验收",
  "非简单任务必须先出现可见 Coder/Reviewer/Tester 子智能体",
]);

console.log("subagent prompt self-test passed.");

function readText(relPath) {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), "utf8");
}

function mustInclude(text, required) {
  for (const snippet of required) {
    if (!text.includes(snippet)) {
      throw new Error(`Missing required subagent prompt text: ${snippet}`);
    }
  }
}
