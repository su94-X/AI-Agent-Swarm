# 主体版工程闸门实现计划

## design_version

v6

## previous_version_changes

- v6 解决 M1：为 `skills/multi-model-agents/agents/openai.yaml` 和 `docs/ROADMAP.md` 补充修改理由。
- v6 解决 M2：增加将 draft checklist 升级为最终 gate_exit_checklist 的步骤。
- v6 解决 M3：强化 boundaries evidence，要求 allowed_write_set 每项都有覆盖理由。

## revision_history

- v5 解决 B1：最终动作改为本地提交准备；不自动 push main。推送需要用户后续明确授权。
- v5 解决 B2：将 checklist 标记为 draft_gate_exit_checklist，过审后再生成最终 gate_exit_checklist。
- v5 解决 M1：把历史说明改名为 revision_history。
- v5 解决 M2：明确 allowed_write_set。
- v4 解决 B1：验证方法同时提供当前 Windows PowerShell 命令和 POSIX 等价命令；gate_exit_checklist 不再用单平台命令冒充跨平台验证。
- v4 解决 B2：Gate 0 记录直接 JSON-RPC 调用 `multi_model_config_status` 和 `multi_model_rag_status` 成功；plan-review 已通过 `multi_model_role_call` 真实完成多轮调用。
- v4 解决 B3/M2：最终步骤明确为“用户本轮已要求执行，因此验证通过后可提交并推送；若验证失败、出现阻塞项或用户撤销授权则停止”。对通用文档规则仍建议 feature branch/PR。
- v4 精简 previous_version_changes，只保留相对 v3 的变化。
- v3 解决 B1：gate_exit_checklist 不再提前声明通过，增加 Gate 0 实际预检结果并等待本轮 plan-review。
- v3 解决 B2：增加 `gate_0_precheck_results`，记录非密钥工具和角色状态。
- v3 解决 B3：测试证据主体版先交给 Gemini 做 test-review/failure analysis，Opus/Claude 仅作为高风险额外审查。
- v3 解决 M1：验证命令改成精确可运行命令。
- v3 解决 M2：提交和推送基于用户本轮“执行”授权；若最终验证失败则不推送。
- 解决 B1：增加 Gate 0 预检，要求在正式设计前检查 `multi_model_config_status`、`multi_model_rag_status`、plan-review 工具和必要角色 key 状态。
- 解决 B2：增加 `gate_exit_checklist`，用结构化布尔值和 evidence 取代 Codex 自我声明。
- 解决 B3：增加 `design_version` 和 `previous_version_changes`，每轮 plan-review 修订必须递增版本。
- 解决 B4：定义外部 plan-review 重试规则：最多 3 次，建议 2/4/8 秒退避，单次不超过 120 秒。
- 解决 M1：增加 data flow、prompt injection surface、credential handling、external network scope。
- 解决 M2：增加 diff-review 自动触发 rubric。
- 解决 M3/M4/M5：增加 amended plan 规则、失败计数重置规则和 blocking report 的 `estimated_resolution`。

## goals

- 把朋友建议的工程闸门吸收到主体版 AI Agent Swarm。
- 保留主体版原始角色边界：Codex 主控，Opus/Claude primary coder，Gemini tester，Codex internal reviewer 默认审查。
- 让非简单任务在正式编码前必须完成设计文档、开发计划和 Opus/Claude plan-review。
- 让高风险 diff 和真实测试结果进入审查路径，减少计划漂移和无证据完成声明。

## non_goals

- 不移除 Gemini tester。
- 不把主体版改成 Lite 工作流。
- 不新增 npm 依赖。
- 不改变 `.mcp.json` 入口。
- 不要求 MCP server 强制阻止所有未过闸门的调用；本次先把闸门写入 skill、docs、prompt 和发布规范。

## current_state_and_files

- 当前分支：`main`。
- 计划开始时版本：`1.4.5`；本次目标版本：`1.4.6`。
- 需要修改：
  - `.codex-plugin/plugin.json`：版本升到 `1.4.6`，描述增加 engineering gate。
  - `docs/ENGINEERING_GATE.md`：新增主体版工程闸门规范。
  - `docs/ENGINEERING_GATE_IMPLEMENTATION_PLAN.md`：记录本次实现计划。
  - `README.md`：加入工程闸门说明和版本 badge。
  - `skills/multi-model-agents/SKILL.md`：把工程闸门写入默认流程。
  - `skills/multi-model-agents/agents/openai.yaml`：同步 skill UI 简短描述，避免插件 UI 仍只展示旧流程。
  - `docs/STARTUP_PROMPT.md`、`docs/PROJECT_START_PROMPT.md`、`docs/SUBAGENT_WORKFLOW.md`、`docs/SUBAGENT_START_PROMPT.md`、`docs/roles/*`：同步角色流程。
  - `docs/PACKAGE_INSTALL_PROMPT.md`、`docs/FIRST_INSTALL_PROMPT.md`、`docs/GITHUB_RELEASE_V1.4.6.md`、`CHANGELOG.md`、`scripts/package-release.mjs`：同步版本、打包必需文件和验证说明。
  - `docs/ROADMAP.md`：记录工程闸门已落地，并把更强的状态机/强制执行留作后续路线图。
  - allowed_write_set 的 21 个文件均属于插件 metadata、工程闸门文档、skill/角色同步、prompt docs、release notes、roadmap、changelog 或 release tooling。

## allowed_write_set

- `.codex-plugin/plugin.json`
- `README.md`
- `CHANGELOG.md`
- `skills/multi-model-agents/SKILL.md`
- `skills/multi-model-agents/agents/openai.yaml`
- `docs/ENGINEERING_GATE.md`
- `docs/ENGINEERING_GATE_IMPLEMENTATION_PLAN.md`
- `docs/STARTUP_PROMPT.md`
- `docs/PROJECT_START_PROMPT.md`
- `docs/SUBAGENT_WORKFLOW.md`
- `docs/SUBAGENT_START_PROMPT.md`
- `docs/FIRST_INSTALL_PROMPT.md`
- `docs/PACKAGE_INSTALL_PROMPT.md`
- `docs/GITHUB_RELEASE_V1.4.6.md`
- `docs/ROADMAP.md`
- `docs/roles/CODER_SUBAGENT_PROMPT.md`
- `docs/roles/TESTER_SUBAGENT_PROMPT.md`
- `docs/roles/REVIEWER_SUBAGENT_PROMPT.md`
- `docs/roles/TEST_RUNNER_SUBAGENT_PROMPT.md`
- `docs/roles/RAG_CURATOR_SUBAGENT_PROMPT.md`
- `scripts/package-release.mjs`

## gate_0_precheck_results

- `multi_model_config_status`：已通过 `node scripts/mcp-smoke-test.mjs` 间接调用成功。
- `multi_model_rag_status`：已通过 `node scripts/mcp-smoke-test.mjs` 间接调用成功。
- `multi_model_config_status`：已通过直接 JSON-RPC `tools/call` 调用成功。
- `multi_model_rag_status`：已通过直接 JSON-RPC `tools/call` 调用成功。
- `multi_model_role_call`：已通过直接 JSON-RPC `tools/call` 多次调用 Opus/Claude 完成 plan-review。
- Coder：provider `anthropic`，model `claude-opus-4-8`，apiKeyEnv `ANTHROPIC_API_KEY`，hasApiKey true。
- Reviewer：provider `codex-internal`，model `gpt-5.5`，不需要外部 API key；如需外部第二意见，可通过 role_call 临时指定 Anthropic-compatible reviewer。
- Tester：provider `gemini`，model `gemini-3.5-flash`，apiKeyEnv `GEMINI_API_KEY`，hasApiKey true。
- Custom：provider `openai-compatible`，apiKeyEnv `EXTERNAL_MODEL_API_KEY`，hasApiKey true。
- 未打印任何真实 API key。

## role_split

- Codex：执行 Gate 0、写设计、授权文件范围、整合 Opus/Gemini/Codex reviewer 反馈、应用补丁、运行真实测试、最终决策。
- Opus/Claude coder：在批准计划和授权路径内通过 `multi_model_coder_workspace_edit` 执行主要编码；正式编码前可通过 `multi_model_coder_patch` 或 `multi_model_role_call` 做 plan-review。
- Gemini tester：通过 `multi_model_tester_plan` 提供测试策略、建议命令、边界用例和失败日志分析；不声称测试已运行。
- Codex reviewer：默认执行 diff-review；高风险任务可额外请求 Opus/Claude 外部第二意见。
- RAG Curator：只整理候选知识，最终写入仍由 Codex 调用 RAG 工具。

## read_write_boundaries

- 只修改插件文档、skill、manifest、release package 脚本和必要测试文档。
- 不读取、不打印、不提交 `.env`。
- 不修改 `.mcp.json`。
- 不修改真实 RAG 数据或 `.local`。
- 不改 GitHub release 资产，除非后续用户明确要求。

## data_flow

- Codex 读取本地 repo 文件。
- Codex 将设计文档摘要发送给 Opus/Claude 做 plan-review。
- Codex 本地修改文档和 manifest。
- Codex 本地运行离线 self-test、plugin validation、skill validation 和 package-release。
- 测试证据先发送给 Gemini 做 test-review/failure analysis；高风险时可额外发送给 Opus/Claude 做 test-review。
- 不向外部模型发送 `.env`、API key、RAG 数据或私有日志。

## prompt_injection_surface

- 外部模型只看到工程设计、diff、测试摘要和允许共享的文档片段。
- 不把仓库无关文件、密钥、`.env`、私有日志发送给外部模型。
- 外部模型输出只作为建议；Codex 必须过滤无证据、通用或越界建议。

## credential_handling

- 不读取 `.env` 内容。
- 调用外部模型时仅设置 provider/model/api_key_env/base_url，不打印 key。
- `multi_model_config_status` 只允许显示 `hasApiKey` 和 API key 环境变量名。

## external_network_scope

- plan-review/test-review 可能调用 Anthropic-compatible Opus/Claude endpoint。
- 离线验证不调用真实外部 API。
- release package 不包含 `.env`、RAG 数据或密钥。

## implementation_plan

1. 完成并通过主体版 plan-review。
2. 将 `draft_gate_exit_checklist` 升级为最终 `gate_exit_checklist`：将 `candidate_design_version` 改为 `approved_design_version: "v6"`，将 `no_open_blocking_items.ok` 改为 `true`，evidence 引用本轮 plan-review 结论。
3. 更新主体版工程闸门文档和实现计划。
4. 更新 `plugin.json` 版本到 `1.4.6`，保持 ASCII-only。
5. 更新 README、SKILL、STARTUP/PROJECT/SUBAGENT 文档，写入工程闸门默认规则。
6. 更新角色提示词：Coder 必须等 plan-review 通过后编码；Tester 必须基于真实日志分析；Reviewer 负责 diff-review；Test Runner 记录 command/exit/stdout/stderr。
7. 更新 release notes、CHANGELOG、PACKAGE_INSTALL_PROMPT、package-release required docs。
8. 运行离线验证和打包。
9. 将测试证据交给 Gemini 做 test-review/failure analysis；高风险时再交给 Opus/Claude 做额外 test-review。
10. Codex 自审 diff。最终验证和 test-review 通过后可准备本地提交；不自动 push `main`。推送需要用户后续明确授权，或按公开协作规则走 feature branch/PR。

## alternatives

- 只更新 README，不改 skill：拒绝，因为默认工作流不会生效。
- 在 MCP server 强制 gate 状态机：暂不做，风险和复杂度较高，且需要持久状态设计。
- 删除 Gemini tester：拒绝，主体版应保留完整工作流。

## risks_and_rollback

- 风险：文档规则过重，影响简单任务效率。缓解：明确简单任务可跳过。
- 风险：Opus plan-review 不可用导致流程卡住。缓解：阻塞报告或用户批准 Codex-only 降级。
- 风险：版本/打包文件遗漏。缓解：package-release 验证 required 文件。
- 回退：如果文档规则不合适，可 revert 本次提交；不影响 MCP server 核心工具。

## validation_method_windows

- `Get-ChildItem -Recurse -Path . -Include *.mjs | ForEach-Object { node --check $_.FullName }`
- `node scripts/mcp-smoke-test.mjs`
- `node scripts/http-retry-self-test.mjs`
- `node scripts/rag-self-test.mjs`
- `node scripts/rag-metadata-self-test.mjs`
- `node scripts/rag-security-self-test.mjs`
- `node scripts/rag-text-self-test.mjs`
- `node scripts/workspace-edit-json-self-test.mjs`
- `node scripts/workspace-edit-repair-self-test.mjs`
- `node scripts/tester-prompt-self-test.mjs`
- `python C:/Users/su94/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py C:/Users/su94/plugins/multi-model-agents`
- `$env:PYTHONUTF8='1'; python C:/Users/su94/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/su94/plugins/multi-model-agents/skills/multi-model-agents`
- `node scripts/package-release.mjs C:/Users/su94/Documents/Codex/2026-06-20/multi-model-agents-plugin-multi-model-2/outputs`
- `node -e "const fs=require('fs');const s=fs.readFileSync('.codex-plugin/plugin.json','utf8');JSON.parse(s);const n=[...s].filter(c=>c.charCodeAt(0)>127).length;if(n)throw new Error('non-ascii '+n);"`

## validation_method_posix_equivalent

- `find . -name "*.mjs" -exec node --check {} \;`
- `node scripts/mcp-smoke-test.mjs`
- `node scripts/http-retry-self-test.mjs`
- `node scripts/rag-self-test.mjs`
- `node scripts/rag-metadata-self-test.mjs`
- `node scripts/rag-security-self-test.mjs`
- `node scripts/rag-text-self-test.mjs`
- `node scripts/workspace-edit-json-self-test.mjs`
- `node scripts/workspace-edit-repair-self-test.mjs`
- `node scripts/tester-prompt-self-test.mjs`
- `PYTHONUTF8=1 python /path/to/plugin-creator/scripts/validate_plugin.py /path/to/multi-model-agents`
- `PYTHONUTF8=1 python /path/to/skill-creator/scripts/quick_validate.py /path/to/multi-model-agents/skills/multi-model-agents`
- `node scripts/package-release.mjs /path/to/outputs`
- `node -e "const fs=require('fs');const s=fs.readFileSync('.codex-plugin/plugin.json','utf8');JSON.parse(s);const n=[...s].filter(c=>c.charCodeAt(0)>127).length;if(n)throw new Error('non-ascii '+n);"`

## gate_exit_checklist

```json
{
  "approved_design_version": "v6",
  "boundaries_documented": {
    "ok": true,
    "evidence": "allowed_write_set covers 21 files; each serves plugin metadata, engineering gate docs, skill/role sync, prompt docs, release notes, roadmap, changelog, or release tooling as justified in current_state_and_files and implementation_plan"
  },
  "verification_path_runnable": {
    "ok": true,
    "evidence": "validation_method_windows lists commands for the current Windows PowerShell environment; validation_method_posix_equivalent gives portable equivalents for other systems"
  },
  "no_open_blocking_items": {
    "ok": true,
    "evidence": "plan-review v6 returned zero blocking_findings and conditional approval; M1/M2/M3 were resolved by adding file rationales and finalizing this checklist"
  },
  "rollback_or_recovery_defined": {
    "ok": true,
    "evidence": "risks_and_rollback section defines revert path and service-unavailable blocking behavior"
  }
}
```
