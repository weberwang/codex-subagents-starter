import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..", "..");
const pluginRoot = path.join(repoRoot, ".codex", "plugins", "owen");
const pythonCandidates = [
  ["py", ["-3"]],
  ["python", []],
  ["python3", []],
];

const requiredFiles = [
  ".codex/plugins/owen/.codex-plugin/plugin.json",
  ".codex/plugins/owen/README.md",
  ".codex/plugins/owen/skills/orchestrator/SKILL.md",
];

const requiredAssetFiles = [
  ".codex/plugins/owen/assets/agents/oracle.toml",
  ".codex/plugins/owen/assets/agents/librarian.toml",
  ".codex/plugins/owen/assets/agents/implementer.toml",
  ".codex/plugins/owen/assets/agents/momus.toml",
  ".codex/plugins/owen/assets/templates/orchestration-plan-template.md",
  ".codex/plugins/owen/assets/templates/orchestration-ledger-template.json",
  ".codex/plugins/owen/assets/docs/codex-agent-orchestration.md",
];

/** 读取 Owen 插件目录下的 UTF-8 文本文件。 */
function readOwenFile(...segments) {
  return readFileSync(path.join(pluginRoot, ...segments), "utf8");
}

/** 解析 Owen 插件目录下的绝对路径，避免测试里重复拼接。 */
function resolveOwenPath(...segments) {
  return path.join(pluginRoot, ...segments);
}

/** 执行命令并返回 UTF-8 输出，便于锁定脚本的可观察行为。 */
function runCommand(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
}

/** 探测可用 Python 解释器，避免安装测试写死单一命令名。 */
function findPythonCommand() {
  for (const [command, args] of pythonCandidates) {
    const probe = runCommand(command, [...args, "--version"], repoRoot);
    if (probe.status === 0) {
      return [command, args];
    }
  }

  return null;
}

test("owen 插件骨架文件应存在", () => {
  for (const file of requiredFiles) {
    assert.equal(existsSync(path.join(repoRoot, file)), true, `缺少插件文件: ${file}`);
  }
});

test("owen 插件运行资产应存在", () => {
  for (const file of requiredAssetFiles) {
    assert.equal(existsSync(path.join(repoRoot, file)), true, `缺少插件资产: ${file}`);
  }
});

test("owen plugin manifest 应满足后续校验基线", () => {
  const pluginJson = JSON.parse(readOwenFile(".codex-plugin", "plugin.json"));

  assert.equal(pluginJson.name, "owen");
  assert.match(pluginJson.version, /^\d+\.\d+\.\d+$/, "version 必须使用严格 semver");
  assert.equal(pluginJson.description.length > 0, true, "description 不能为空");
  assert.equal(pluginJson.author?.name?.length > 0, true, "author.name 不能为空");
  assert.equal(pluginJson.skills, "./skills/");
  assert.equal("hooks" in pluginJson, false, "plugin.json 不应包含 hooks 字段");

  // 这些字段是后续 validate_owen.py 的稳定基线，先在仓库测试里锁住。
  assert.equal(pluginJson.interface?.displayName, "Owen");
  assert.equal(pluginJson.interface?.shortDescription?.length > 0, true, "shortDescription 不能为空");
  assert.equal(pluginJson.interface?.longDescription?.length > 0, true, "longDescription 不能为空");
  assert.equal(pluginJson.interface?.developerName?.length > 0, true, "developerName 不能为空");
  assert.equal(pluginJson.interface?.category?.length > 0, true, "category 不能为空");
  assert.equal(Array.isArray(pluginJson.interface?.capabilities), true, "capabilities 必须是数组");
  assert.equal(pluginJson.interface.capabilities.length > 0, true, "capabilities 不能为空");
  assert.equal(Array.isArray(pluginJson.interface?.defaultPrompt), true, "defaultPrompt 必须是数组");
  assert.equal(pluginJson.interface.defaultPrompt.length > 0, true, "defaultPrompt 不能为空");
  assert.equal(pluginJson.interface.defaultPrompt.length <= 3, true, "defaultPrompt 最多保留 3 条");
  assert.match(pluginJson.interface.brandColor, /^#[0-9A-Fa-f]{6}$/, "brandColor 必须是 6 位十六进制颜色");
});

test("owen README 与入口 skill 应锁定统一编排入口边界", () => {
  const readme = readOwenFile("README.md");
  const skill = readOwenFile("skills", "orchestrator", "SKILL.md");
  const combinedContent = `${readme}\n${skill}`;

  // README 和 SKILL 必须用中文明确 Owen 的入口属性，不能退化成泛化执行器。
  assert.match(readme, /[\u4e00-\u9fff]/, "README 需要包含中文说明");
  assert.match(skill, /[\u4e00-\u9fff]/, "入口 SKILL 需要包含中文说明");
  assert.match(combinedContent, /统一编排入口|入口壳/, "必须明确 Owen 是统一编排入口或入口壳");
  assert.match(
    combinedContent,
    /不替代底层角色|不替代底层子代理本身的职责|不替代底层四个角色的原始职责|不假装拥有所有执行能力/,
    "必须明确 Owen 不替代执行层角色",
  );

  for (const role of ["librarian", "oracle", "implementer", "momus"]) {
    assert.match(combinedContent, new RegExp(`\\b${role}\\b`), `必须保留角色: ${role}`);
  }

  // 锁住入口 skill 的 frontmatter，避免入口名称被改成其他标识。
  assert.match(skill, /^---\s*\r?\nname:\s*"?(?:orchestrator)"?\s*\r?\n/m, "SKILL frontmatter 必须声明 name=orchestrator");
});

test("owen orchestrator skill 应引用插件内角色资产与模板", () => {
  const skill = readOwenFile("skills", "orchestrator", "SKILL.md");

  for (const role of ["oracle", "librarian", "implementer", "momus"]) {
    assert.match(skill, new RegExp(`assets/agents/${role}\\.toml`), `SKILL 必须引用角色资产: ${role}`);
  }

  assert.match(
    skill,
    /assets\/templates\/orchestration-plan-template\.md/,
    "SKILL 必须引用插件内计划模板",
  );
  assert.match(
    skill,
    /assets\/templates\/orchestration-ledger-template\.json/,
    "SKILL 必须引用插件内台账模板",
  );
  assert.match(
    skill,
    /assets\/docs\/codex-agent-orchestration\.md/,
    "SKILL 必须引用插件内编排说明文档",
  );
});

test("owen 资产文档不应包含仓库写死绝对路径", () => {
  const doc = readOwenFile("assets", "docs", "codex-agent-orchestration.md");

  assert.doesNotMatch(doc, /E:\/Git\/codex-subagents-starter/i, "资产文档不应写死当前仓库绝对路径");
  assert.doesNotMatch(doc, /\[[^\]]+\]\(\/[A-Za-z]:\//, "资产文档不应使用 Windows 绝对路径链接");
});

test("owen 插件包装验证脚本应在当前仓库通过", () => {
  const result = runCommand("node", ["./scripts/validate-owen-plugin.mjs"], repoRoot);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Owen plugin is valid\./);
});

test("owen 安装脚本应导出插件源码到 fake home 并 upsert marketplace", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "owen-plugin-install-"));
  const fakeHome = path.join(tempRoot, "home-root");
  const existingMarketplacePath = path.join(fakeHome, ".agents", "plugins", "marketplace.json");
  const pythonCommand = findPythonCommand();

  assert.notEqual(pythonCommand, null, "运行安装测试前必须存在可用 Python 解释器");

  mkdirSync(path.dirname(existingMarketplacePath), { recursive: true });
  writeFileSync(
    existingMarketplacePath,
    `${JSON.stringify(
      {
        name: "personal",
        interface: {
          displayName: "Personal",
        },
        plugins: [
          {
            name: "existing-plugin",
            source: {
              source: "local",
              path: "./plugins/existing-plugin",
            },
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const [command, args] = pythonCommand;
  const result = runCommand(
    command,
    [...args, resolveOwenPath("scripts", "install_owen.py"), "--home-root", fakeHome],
    repoRoot,
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(path.join(fakeHome, "plugins", "owen", ".codex-plugin", "plugin.json")), true);
  assert.equal(existsSync(path.join(fakeHome, "plugins", "owen", "scripts", "validate_owen.py")), true);

  const marketplace = JSON.parse(readFileSync(existingMarketplacePath, "utf8"));
  const pluginNames = marketplace.plugins.map((pluginEntry) => pluginEntry.name).sort();
  const owenEntry = marketplace.plugins.find((pluginEntry) => pluginEntry.name === "owen");

  assert.deepEqual(pluginNames, ["existing-plugin", "owen"]);
  assert.equal(owenEntry?.source?.source, "local");
  assert.equal(owenEntry?.source?.path, "./plugins/owen");
  assert.equal(owenEntry?.policy?.installation, "AVAILABLE");
  assert.equal(owenEntry?.policy?.authentication, "ON_INSTALL");
});
