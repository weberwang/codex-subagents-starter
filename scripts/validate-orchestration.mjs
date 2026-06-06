import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const requiredFiles = [
  ".codex/templates/orchestration-plan-template.md",
  ".codex/templates/orchestration-ledger-template.json",
  "docs/architecture/codex-agent-orchestration.md",
];

/**
 * 统一把仓库内相对路径解析成绝对路径，避免脚本在不同调用目录下误判。
 */
function resolveRepoPath(relativePath) {
  return path.resolve(rootDir, relativePath);
}

/**
 * 只做最小存在性校验，保持 starter 仓库验证逻辑简单可迁移。
 */
function assertFileExists(relativePath) {
  const filePath = resolveRepoPath(relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`missing required orchestration file: ${relativePath}`);
  }
}

/**
 * 针对模板关键片段做轻量检查，避免空文件或错误占位内容通过校验。
 */
function assertFileIncludes(relativePath, snippets) {
  const content = readFileSync(resolveRepoPath(relativePath), "utf8");

  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      throw new Error(`${relativePath} is missing required snippet: ${snippet}`);
    }
  }
}

/**
 * JSON 模板只校验稳定字段，避免把 starter 仓库校验脚本做成业务规则引擎。
 */
function assertLedgerTemplate(relativePath) {
  const ledger = JSON.parse(readFileSync(resolveRepoPath(relativePath), "utf8"));

  if (ledger.status !== "planning") {
    throw new Error("orchestration ledger default status must be planning");
  }

  if (!Array.isArray(ledger.tasks) || ledger.tasks.length === 0) {
    throw new Error("orchestration ledger must include at least one task");
  }

  const [firstTask] = ledger.tasks;
  const requiredTaskFields = ["id", "title", "owner", "status", "evidence", "blockers"];

  for (const field of requiredTaskFields) {
    if (!(field in firstTask)) {
      throw new Error(`orchestration ledger first task is missing field: ${field}`);
    }
  }
}

function main() {
  for (const file of requiredFiles) {
    assertFileExists(file);
  }

  assertFileIncludes(".codex/templates/orchestration-plan-template.md", [
    "## 角色分工",
    "`oracle`",
    "`librarian`",
    "`implementer`",
    "`momus`",
  ]);

  assertLedgerTemplate(".codex/templates/orchestration-ledger-template.json");

  assertFileIncludes("docs/architecture/codex-agent-orchestration.md", [
    "## 角色映射",
    "## 四层结构",
    "## 推荐流转",
  ]);

  console.log("Codex orchestration scaffold is valid.");
}

main();
