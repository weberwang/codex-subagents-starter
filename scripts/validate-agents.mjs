import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * 校验子代理模板是否具备最小可复用结构，避免复制到真实项目后才发现字段缺失。
 */
const requiredFields = [
  "name",
  "description",
  "model",
  "model_reasoning_effort",
  "sandbox_mode",
  "developer_instructions",
];

const agentsDir = path.resolve(process.cwd(), ".codex", "agents");
const skillsDir = path.resolve(process.cwd(), ".agents", "skills");

/**
 * 这里只做最小字段检查，避免为了完整 TOML 语义解析引入额外复杂度。
 */
function hasField(content, fieldName) {
  const pattern = new RegExp(`^${fieldName}\\s*=`, "m");
  return pattern.test(content);
}

/**
 * skill 模板只要求最小 frontmatter 结构，避免为了 starter 仓库引入复杂解析逻辑。
 */
function hasSkillFrontmatterField(content, fieldName) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return false;
  }

  const pattern = new RegExp(`^${fieldName}:\\s*.+$`, "m");
  return pattern.test(frontmatterMatch[1]);
}

async function main() {
  const dirStat = await stat(agentsDir).catch(() => null);
  if (!dirStat || !dirStat.isDirectory()) {
    console.error(`[错误] 代理目录不存在: ${agentsDir}`);
    process.exit(1);
  }

  const entries = await readdir(agentsDir);
  const tomlFiles = entries.filter((entry) => entry.endsWith(".toml"));

  if (tomlFiles.length === 0) {
    console.error(`[错误] 未找到任何代理模板: ${agentsDir}`);
    process.exit(1);
  }

  let hasError = false;

  for (const fileName of tomlFiles) {
    const filePath = path.join(agentsDir, fileName);
    const content = await readFile(filePath, "utf8");

    if (!content.trim()) {
      console.error(`[错误] 代理文件为空: ${fileName}`);
      hasError = true;
      continue;
    }

    const missingFields = requiredFields.filter((field) => !hasField(content, field));

    if (missingFields.length > 0) {
      console.error(`[错误] ${fileName} 缺少字段: ${missingFields.join(", ")}`);
      hasError = true;
      continue;
    }

    console.log(`[通过] ${fileName}`);
  }

  const skillsStat = await stat(skillsDir).catch(() => null);
  if (!skillsStat || !skillsStat.isDirectory()) {
    console.error(`[错误] 技能目录不存在: ${skillsDir}`);
    process.exit(1);
  }

  const skillDirs = await readdir(skillsDir);
  if (skillDirs.length === 0) {
    console.error(`[错误] 未找到任何技能模板目录: ${skillsDir}`);
    process.exit(1);
  }

  for (const skillName of skillDirs) {
    const skillFilePath = path.join(skillsDir, skillName, "SKILL.md");
    const skillFileStat = await stat(skillFilePath).catch(() => null);

    if (!skillFileStat || !skillFileStat.isFile()) {
      console.error(`[错误] 缺少技能模板文件: ${skillName}/SKILL.md`);
      hasError = true;
      continue;
    }

    const content = await readFile(skillFilePath, "utf8");

    if (!content.trim()) {
      console.error(`[错误] 技能模板为空: ${skillName}/SKILL.md`);
      hasError = true;
      continue;
    }

    const missingFields = ["name", "description"].filter(
      (field) => !hasSkillFrontmatterField(content, field),
    );

    if (missingFields.length > 0) {
      console.error(`[错误] ${skillName}/SKILL.md 缺少 frontmatter 字段: ${missingFields.join(", ")}`);
      hasError = true;
      continue;
    }

    console.log(`[通过] ${skillName}/SKILL.md`);
  }

  if (hasError) {
    process.exit(1);
  }

  console.log("[完成] 所有子代理模板校验通过");
}

main().catch((error) => {
  console.error("[错误] 校验执行失败");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
