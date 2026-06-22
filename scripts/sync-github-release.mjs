#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { request } from "node:https";
import { fileURLToPath } from "node:url";
import { redactSecrets } from "../lib/redaction.mjs";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = readJson(join(pluginRoot, ".codex-plugin", "plugin.json"));
const version = manifest.version;
const tag = `v${version}`;
const owner = process.env.MMA_GITHUB_OWNER || "su94-X";
const repo = process.env.MMA_GITHUB_REPO || "AI-Agent-Swarm";
const outputDir = resolve(process.argv[2] || join(pluginRoot, "..", "..", "outputs"));
const zipPath = resolve(process.argv[3] || join(outputDir, `ai-agent-swarm-${version}.zip`));
const releaseNotePath = join(pluginRoot, "docs", `GITHUB_RELEASE_V${version}.md`);
const releaseName = `AI Agent Swarm V${version}`;
const assetName = basename(zipPath);
const defaultTokenPath = join(homedir(), ".codex", "multi-model-agents", "github-release-token");
const codexHomeTokenPath = process.env.CODEX_HOME
  ? join(resolvePath(process.env.CODEX_HOME), "multi-model-agents", "github-release-token")
  : "";

main().catch((error) => {
  console.error(`GitHub release sync failed: ${sanitizeError(error)}`);
  process.exitCode = 1;
});

async function main() {
  assertFile(zipPath, "release zip");
  assertFile(releaseNotePath, "release note");
  const token = readToken();
  const releaseBody = readFileSync(releaseNotePath, "utf8");

  await assertRemoteTagExists(token);
  const release = await createOrUpdateRelease(token, releaseBody);
  await uploadZipAsset(token, release);
  const verified = await verifyPublicRelease();

  console.log(`GitHub release synced: ${verified.html_url}`);
  const asset = verified.assets.find((candidate) => candidate.name === assetName);
  console.log(`Release asset synced: ${asset.browser_download_url}`);
}

function readToken() {
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken && envToken.trim()) {
    return envToken.trim();
  }

  const candidates = [
    process.env.MMA_GITHUB_TOKEN_FILE,
    codexHomeTokenPath,
    defaultTokenPath,
    join(tmpdir(), "github_release_token.txt"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const tokenPath = resolvePath(candidate);
    if (!existsSync(tokenPath)) {
      continue;
    }
    assertTokenPathOutsideRepo(tokenPath);
    const value = readFileSync(tokenPath, "utf8").trim();
    if (value) {
      return value;
    }
  }

  throw new Error(
    [
      "No GitHub token found.",
      "Set GITHUB_TOKEN/GH_TOKEN, or store a fine-grained release token at:",
      defaultTokenPath,
      "When CODEX_HOME is set, the script also checks CODEX_HOME/multi-model-agents/github-release-token.",
      "Do not put token files inside the plugin repository, workspace, output directory, .env, or .env.example.",
    ].join(" ")
  );
}

function assertTokenPathOutsideRepo(tokenPath) {
  const stats = statSync(tokenPath);
  if (!stats.isFile()) {
    throw new Error("GitHub token path must be a regular file.");
  }
  const forbiddenRoots = [
    ["plugin repository", pluginRoot],
    ["release output directory", outputDir],
    ["current workspace", process.cwd()],
  ];
  const realTokenPath = realpathSync(tokenPath);
  for (const [label, root] of forbiddenRoots) {
    const realRoot = realpathSync(resolve(root));
    const rel = relative(realRoot, realTokenPath);
    if (!rel || (!rel.startsWith("..") && !isAbsolute(rel))) {
      throw new Error(`Refusing to read a GitHub token file from inside the ${label}.`);
    }
  }
}

async function assertRemoteTagExists(token) {
  const response = await githubJson(token, "GET", `/repos/${owner}/${repo}/git/ref/tags/${encodeURIComponent(tag)}`);
  if (!response.object?.sha) {
    throw new Error(`Remote tag ${tag} was not found.`);
  }
}

async function createOrUpdateRelease(token, body) {
  const existing = await githubJson(token, "GET", `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`, null, {
    allow404: true,
  });

  const payload = {
    tag_name: tag,
    target_commitish: "main",
    name: releaseName,
    body,
    draft: false,
    prerelease: false,
    make_latest: "true",
  };

  if (existing?.id) {
    return githubJson(token, "PATCH", `/repos/${owner}/${repo}/releases/${existing.id}`, payload);
  }
  return githubJson(token, "POST", `/repos/${owner}/${repo}/releases`, payload);
}

async function uploadZipAsset(token, release) {
  const existingAsset = (release.assets || []).find((asset) => asset.name === assetName);
  if (existingAsset) {
    await githubJson(token, "DELETE", `/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, null, {
      allowEmpty: true,
    });
  }

  const uploadUrl = new URL(release.upload_url.replace(/\{.*$/, ""));
  uploadUrl.searchParams.set("name", assetName);
  const data = readFileSync(zipPath);
  await githubRaw(token, "POST", uploadUrl, data, {
    "Content-Type": "application/zip",
    "Content-Length": String(data.length),
  });
}

async function verifyPublicRelease() {
  const release = await githubJson(null, "GET", `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`);
  const asset = (release.assets || []).find((candidate) => candidate.name === assetName);
  if (!asset?.browser_download_url) {
    throw new Error(`Public release ${tag} is missing asset ${assetName}.`);
  }
  return release;
}

function githubJson(token, method, path, payload = null, options = {}) {
  const url = new URL(`https://api.github.com${path}`);
  const body = payload ? Buffer.from(JSON.stringify(payload), "utf8") : null;
  return new Promise((resolvePromise, rejectPromise) => {
    const req = request(
      url,
      {
        method,
        headers: githubHeaders(token, body ? { "Content-Type": "application/json", "Content-Length": String(body.length) } : {}),
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (options.allow404 && res.statusCode === 404) {
            resolvePromise(null);
            return;
          }
          if (options.allowEmpty && res.statusCode >= 200 && res.statusCode < 300 && !text) {
            resolvePromise({});
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            rejectPromise(new Error(`GitHub API ${method} ${path} returned ${res.statusCode}: ${truncate(text, 500)}`));
            return;
          }
          try {
            resolvePromise(text ? JSON.parse(text) : {});
          } catch (error) {
            rejectPromise(new Error(`GitHub API returned invalid JSON: ${error.message}`));
          }
        });
      }
    );
    req.on("error", rejectPromise);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function githubRaw(token, method, url, body, extraHeaders = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const req = request(
      url,
      {
        method,
        headers: githubHeaders(token, extraHeaders),
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode < 200 || res.statusCode >= 300) {
            rejectPromise(new Error(`GitHub upload returned ${res.statusCode}: ${truncate(text, 500)}`));
            return;
          }
          resolvePromise(text);
        });
      }
    );
    req.on("error", rejectPromise);
    req.write(body);
    req.end();
  });
}

function githubHeaders(token, extra = {}) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-agent-swarm-release-sync",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function assertFile(path, label) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function resolvePath(value) {
  const expanded = String(value)
    .replace(/^~(?=$|[/\\])/, homedir())
    .replace(/%USERPROFILE%/gi, homedir());
  return resolve(expanded);
}

function truncate(value, maxChars) {
  const text = String(value || "");
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function sanitizeError(error) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  let message = error?.message || String(error);
  if (token) {
    message = message.replaceAll(token, "[redacted]");
  }
  return redactSecrets(message);
}
