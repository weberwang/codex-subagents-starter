# 仓库说明

这是一个 Codex 子代理与技能模板仓库，不承载业务实现代码。

当前仓库同时承载两类资产：

- `.codex/agents/` 下的子代理模板
- `.agents/skills/` 下的技能模板

## 维护规则

- 所有子代理模板放在 `.codex/agents/`
- 所有技能模板放在 `.agents/skills/<name>/SKILL.md`
- 修改子代理职责时，必须同步更新 `README.md`
- 修改 skill 用途或流程时，同样必须同步更新 `README.md`
- Owen 插件源码统一维护在 `.codex/plugins/owen/`，这部分属于源码资产，不当作构建产物处理
- 修改 Owen 插件的安装链路、校验脚本接入方式或相关测试基线时，必须同步更新 `README.md`
- 修改完成后，必须运行 `npm run validate`
- 新增子代理时，必须保持单一职责，避免角色重叠
- 新增 skill 时，必须保持一技能一目录一文件结构
- 校验脚本只负责最小结构检查，不要把它扩展成复杂框架

## 角色设计约束

- `librarian` 负责研究，不直接承担业务修改
- `oracle` 负责顾问式建议，不直接承担落地实施
- `momus` 负责审查阻塞问题，不做完美主义评审
- `implementer` 负责小范围执行，不主动扩 scope
- `skills` 负责沉淀高频固定流程，不伪造宿主独有运行时能力

## 修改注意事项

- 新增字段前先确认它是否属于 Codex 子代理的稳定配置能力
- 对不确定的能力，优先放进 `developer_instructions`，而不是伪造配置字段
- 对 skill 中无法稳定迁移的行为，优先写成流程提示，而不是伪造运行时指令
- 每次调整模板后，都要重新运行验证命令确认结构完整
- 涉及 Owen 插件验证链路的改动，至少保持 `package.json` 的 `npm run validate` 与 `tests/scripts/validate-owen-plugin.test.mjs` 一致

## Codex 编排规则

- 多步骤任务优先使用 `.codex/templates/orchestration-plan-template.md` 明确目标、约束、角色分工和验证方式
- 需要外部资料、陌生代码线索或最佳实践时，优先让 `librarian` 先补证据
- 需要关键取舍、边界判断或方案定夺时，优先让 `oracle` 给出主推荐
- `implementer` 完成改动后，必须由 `momus` 复核阻塞问题、遗漏验证与残余风险
- 任务状态、证据、阻塞项优先同步到 `.codex/templates/orchestration-ledger-template.json` 的同构台账中
- 编排模板、架构文档或验证脚本有变更时，必须同步更新 `README.md`
