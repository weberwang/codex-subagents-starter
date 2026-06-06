import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..");
const validatorPath = path.join(repoRoot, ".codex", "plugins", "owen", "scripts", "validate_owen.py");
const pluginRoot = path.join(repoRoot, ".codex", "plugins", "owen");
const pythonCandidates = [
  ["py", ["-3"]],
  ["python", []],
  ["python3", []],
];

/** 探测可用 Python 解释器，避免包装器依赖单一命令名。 */
function findPythonCommand() {
  for (const [command, args] of pythonCandidates) {
    const probe = spawnSync(command, [...args, "--version"], { encoding: "utf8" });
    if (probe.status === 0) {
      return [command, args];
    }
  }

  return null;
}

/** 统一透传校验脚本输出，让仓库级调用保留原始错误上下文。 */
function runValidator(command, args) {
  return spawnSync(command, [...args, validatorPath, "--plugin-root", pluginRoot], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
}

const pythonCommand = findPythonCommand();

if (pythonCommand === null) {
  console.error("No Python runtime found for Owen plugin validation.");
  process.exit(1);
}

const [command, args] = pythonCommand;
const result = runValidator(command, args);

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

process.exit(result.status ?? 1);
