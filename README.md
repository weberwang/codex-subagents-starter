# codex-subagents-starter

一个用于演示和复用 Codex 子代理与技能配置的最小模板仓库。

## 项目目标

这个仓库不承载业务代码，只提供一组边界清晰的 Codex 子代理模板和技能模板，方便你复制到真实项目中继续扩展。

当前包含：

- `librarian`：外部文档、开源仓库、最佳实践研究
- `oracle`：复杂架构权衡与疑难问题顾问
- `momus`：计划可执行性审查与阻塞问题识别
- `implementer`：边界明确的小任务执行器

## Skills 模板

当前还包含 6 个高价值的 Codex skills 模板：

- `publish`
- `pre-publish-review`
- `remove-deadcode`
- `security-research`
- `work-with-pr`
- `github-triage`

它们代表的是“高频固定流程”，适合直接复制到真实项目中做二次调整。

## 模型分层

这个模板按职责复杂度做了模型分层，而不是让所有子代理都固定使用同一个模型。

- `oracle`：`gpt-5.5`
  负责最复杂的架构权衡和高难度推理，保留最高档模型。
- `momus`：`gpt-5.4`
  负责计划审查和阻塞问题识别，强调质量，但不需要始终使用最高成本模型。
- `implementer`：`gpt-5.4-mini`
  负责边界明确的小任务执行，优先兼顾成本、速度和编码能力。
- `librarian`：`gpt-5.4-mini`
  负责研究、整理、归纳，适合更轻量的子代理模型。

这样配置的目的是让模板更接近真实团队使用方式，而不是统一模型的演示基线。

## 目录结构

```text
.
├─ .agents/
│  └─ skills/
│     ├─ github-triage/
│     ├─ pre-publish-review/
│     ├─ publish/
│     ├─ remove-deadcode/
│     ├─ security-research/
│     └─ work-with-pr/
├─ .codex/
│  └─ agents/
│     ├─ implementer.toml
│     ├─ librarian.toml
│     ├─ momus.toml
│     └─ oracle.toml
├─ scripts/
│  └─ validate-agents.mjs
├─ AGENTS.md
├─ README.md
└─ package.json
```

## 使用方式

1. 将 `.codex/agents/*.toml` 复制到你的项目。
2. 将 `.agents/skills/*/SKILL.md` 复制到你的项目。
3. 根据项目实际需要调整 `developer_instructions` 和 skill 正文。
4. 在复制后的项目中保留一份类似的校验脚本，避免模板被误改坏。

## 本地校验

```bash
npm run validate
```

这个命令会同时扫描：

- `.codex/agents/*.toml`
- `.agents/skills/*/SKILL.md`

其中 agent 模板会检查以下核心字段：

- `name`
- `description`
- `model`
- `model_reasoning_effort`
- `sandbox_mode`
- `developer_instructions`

skill 模板会检查：

- 文件存在
- 文件非空
- frontmatter 中存在 `name`
- frontmatter 中存在 `description`

## 设计原则

- 模板优先表达职责边界，不追求一次性覆盖所有高级能力。
- 不复刻外部编排框架的全部运行时语义，只保留对 Codex 最有价值的角色分工。
- 每个子代理保持单一职责，避免两个模板处理同一类问题。
- 模型选择按任务复杂度分层，而不是默认所有角色都使用最高档模型。
- 技能模板优先沉淀高频固定流程，而不是宿主特有的复杂运行时行为。

## 复制到真实项目的建议

- 先保留 3 到 4 个核心角色，不要一开始堆太多子代理。
- 优先把 `librarian`、`oracle`、`implementer` 用起来，再按需要增加其他角色。
- 如果项目里已经有自己的计划流，可以把 `momus` 作为计划审查器，而不是主执行器。
- 对技能模板，优先迁移发布、审查、安全、PR 处理这类高频固定流程。
