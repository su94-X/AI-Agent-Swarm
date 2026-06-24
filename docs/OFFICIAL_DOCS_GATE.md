# Official Documentation Evidence Gate

当计划依赖第三方或外部事实时，必须记录证据，避免凭记忆实现。

## 何时必须运行

- 新增或升级第三方框架、插件、SDK、CLI、API 或云服务。
- 不确定方法名、配置键、命令参数、生命周期钩子或权限要求。
- 计划依赖外部事实，例如 API 限制、平台政策、发布时间、价格或兼容性。
- 测试失败显示外部接口行为与预期不一致。

## 何时可以跳过

- 仓库已经使用同版本、同 API surface 的工作代码。
- 工程设计文档已有当前版本的证据记录。
- 任务不触碰第三方行为或外部事实。

## 证据表格

```markdown
| Dependency/Surface | Version/Target | Claim | Official source | Checked date | Applies to step | Stale trigger | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

## 查询规则

1. 先查仓库本地已有实现、锁文件和文档。
2. 再查官方文档、官方仓库、官方 changelog 或官方 API reference。
3. 只有官方信息不足时，才使用社区材料作为线索，并明确标记低置信度。
4. 记录检查日期和 stale trigger。

## Reviewer 检查

`codex-reviewer` plan-review 应检查证据是否足以支持计划；不足时应提出 blocking finding 或 must-fix item。
