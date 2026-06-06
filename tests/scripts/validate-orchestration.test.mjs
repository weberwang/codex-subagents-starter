import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..", "..");

const requiredFiles = [
  ".codex/templates/orchestration-plan-template.md",
  ".codex/templates/orchestration-ledger-template.json",
  "docs/architecture/codex-agent-orchestration.md",
];

test("orchestration scaffold files should exist", () => {
  for (const file of requiredFiles) {
    assert.equal(existsSync(path.join(repoRoot, file)), true, `missing required file: ${file}`);
  }
});

test("orchestration validator should pass in current repository", () => {
  const result = spawnSync("node", ["./scripts/validate-orchestration.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Codex orchestration scaffold is valid\./);
});
