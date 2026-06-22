#!/usr/bin/env node

import { readFileSync } from "node:fs";

const modelLayer = readFileSync(new URL("../lib/model.mjs", import.meta.url), "utf8");
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const environmentDocs = readFileSync(new URL("../docs/ENVIRONMENT.md", import.meta.url), "utf8");
const roadmap = readFileSync(new URL("../docs/ROADMAP.md", import.meta.url), "utf8");

if (!modelLayer.includes('env("MMA_MODEL_STREAMING", "true")')) {
  throw new Error("lib/model.mjs must default MMA_MODEL_STREAMING to true.");
}

if (!envExample.includes("MMA_MODEL_STREAMING=true")) {
  throw new Error(".env.example must default MMA_MODEL_STREAMING to true.");
}

if (!environmentDocs.includes("| `MMA_MODEL_STREAMING` | `true` |")) {
  throw new Error("docs/ENVIRONMENT.md must document MMA_MODEL_STREAMING default true.");
}

if (!roadmap.includes("默认使用流式")) {
  throw new Error("docs/ROADMAP.md must describe streaming as the default.");
}

console.log("streaming default self-test passed.");
