# Codex 子代理编排骨架

## 核心目标

这套骨架面向当前仓库已有的四个子代理模板，提供一条稳定、可复用、可验证的编排链路，避免为了“补齐 planner / researcher / executor / reviewer”再引入职责重叠的新角色。

## 角色映射

- `oracle`：承担决策建议与方案取舍，对应规划阶段的关键判断。
- `librarian`：承担资料研究与上下文收集，对应研究阶段。
- `implementer`：承担小范围实现与直接验证，对应执行阶段。
- `momus`：承担可执行性审查与交付前阻塞检查，对应审查阶段。

## 四层结构

1. 规则层
   插件源码阶段会参考仓库根目录的 `AGENTS.md` 与 `README.md` 来约束目录放置、职责边界和交付流程；安装后的插件副本不应再写死指向某台开发机上的仓库绝对路径。
2. 角色层
   由 `.codex/agents/` 下的四个模板承载稳定职责，不额外制造重叠角色。
3. 状态模板层
   由 `.codex/templates/orchestration-plan-template.md` 和 `.codex/templates/orchestration-ledger-template.json` 显式记录计划、任务状态、证据和风险。
4. 验证层
   由 `scripts/validate-agents.mjs`、`scripts/validate-orchestration.mjs` 与 `tests/scripts/validate-orchestration.test.mjs` 负责做最小结构校验，保证仓库复制出去后仍然可用。

## 路径约定

- 插件内源码路径：当前仓库把 Owen 插件源码维护在 `<repo-root>/.codex/plugins/owen/`。
- 安装后目标路径：安装脚本会把完整插件导出到 `<home-root>/plugins/owen/`。
- 当前文档位置：源码内位于 `.codex/plugins/owen/assets/docs/codex-agent-orchestration.md`，安装后对应为 `<home-root>/plugins/owen/assets/docs/codex-agent-orchestration.md`。
- 路径引用原则：插件内文档、skill 和脚本应优先使用插件内相对路径，避免把仓库源码路径误当成安装后的运行时路径。

## 推荐流转

1. 先用计划模板明确目标、约束、角色分工和验证口径。
2. 需要外部资料或陌生上下文时，由 `librarian` 先补齐证据。
3. 进入实施后，由 `implementer` 只在目标范围内改动，并把验证结果写回台账。
4. 交付前由 `momus` 复核阻塞问题，必要时由 `oracle` 补充最终取舍建议。

## 为什么不新增 planner / researcher / executor / reviewer

当前仓库已经有一组单一职责的子代理模板。继续新增语义接近的新角色，会让使用者难以判断该选谁，也会弱化 starter 仓库“最小但清晰”的目标。因此这里选择通过文档、模板和校验把编排链路补齐，而不是再堆一组近义角色。
